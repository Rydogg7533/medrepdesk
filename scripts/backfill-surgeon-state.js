#!/usr/bin/env node

/**
 * Backfill city and state on existing global surgeons from the NPI CSV.
 *
 * Phase 1: Stream the NPI file, build full_name → { city, state } lookup.
 * Phase 2: Page through global surgeons with NULL state, batch-update 1000
 *          at a time via the batch_update_surgeon_location RPC.
 *
 * Usage:
 *   node scripts/backfill-surgeon-state.js
 *   node scripts/backfill-surgeon-state.js --dry-run   # preview without writing
 *
 * Requires env vars (reads from .env.local automatically):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createReadStream, existsSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load .env.local ──────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) {
    console.error('Missing .env.local');
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const dryRun = process.argv.slice(2).includes('--dry-run');
const NPI_CSV = resolve(ROOT, 'npi_data/npidata_pfile_20050523-20260208.csv');

// ── Taxonomy filtering (same as seed script) ─────────────────────
const SURGICAL_TAXONOMY_MAP = {
  '207X': 'hip', '207T': 'spine', '208C': 'gyn_surgical', '2086': 'trauma',
  '207V': 'gyn_surgical', '207R': 'cardiac_implants', '207N': 'reconstructive',
  '207L': 'intrathecal_pumps', '204E': 'maxillofacial', '2085': 'reconstructive',
  '207W': 'intraocular_lenses', '207Y': 'cochlear_implants', '208G': 'cardiac_implants',
  '2088': 'urological_implants', '2082': 'trauma',
};
const SKIP_PREFIXES = ['2084', '207U', '207K'];
const SURGICAL_PREFIXES = Object.keys(SURGICAL_TAXONOMY_MAP);
const SPECIFIC_207R = ['207RI0011X'];
const SPECIFIC_207N = ['207ND0101X', '207NI0002X'];
const SPECIFIC_207L = ['207LP2900X'];

function isSurgicalTaxonomy(taxonomyCode) {
  if (!taxonomyCode) return false;
  const code = taxonomyCode.trim();
  for (const skip of SKIP_PREFIXES) { if (code.startsWith(skip)) return false; }
  if (code.startsWith('207R') && !SPECIFIC_207R.includes(code)) return false;
  if (code.startsWith('207N') && !SPECIFIC_207N.includes(code)) return false;
  if (code.startsWith('207L') && !SPECIFIC_207L.includes(code)) return false;
  for (const prefix of SURGICAL_PREFIXES) { if (code.startsWith(prefix)) return true; }
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ═════════════════════════════════════════════════════════════════
// PHASE 1: Build name → location lookup from NPI CSV
// ═════════════════════════════════════════════════════════════════
async function buildNpiLookup() {
  console.log('\n── Phase 1: Building NPI lookup ──────────────────');

  if (!existsSync(NPI_CSV)) {
    console.error(`NPI CSV not found: ${NPI_CSV}`);
    process.exit(1);
  }

  const lookup = new Map(); // full_name → { city, state }
  let headers = null;
  let processed = 0;
  let matched = 0;
  let skipped = 0;

  const rl = createInterface({
    input: createReadStream(NPI_CSV, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  const { parse: parseSync } = await import('csv-parse/sync');

  for await (const line of rl) {
    if (!headers) {
      const parsed = parseSync(line, { columns: false });
      headers = parsed[0];
      continue;
    }

    processed++;
    if (processed % 500000 === 0) {
      console.log(`  Processed ${(processed / 1000000).toFixed(1)}M rows, ${matched} matched...`);
    }

    let parsed;
    try {
      parsed = parseSync(line, { columns: false, relax_column_count: true });
    } catch {
      skipped++;
      continue;
    }
    const record = parsed[0];
    if (!record || record.length < 48) { skipped++; continue; }

    if (record[1] !== '1') continue;
    if (record[39]?.trim()) continue;
    if (record[33]?.trim() !== 'US') continue;
    if (!isSurgicalTaxonomy(record[47]?.trim())) continue;

    const prefix = (record[8] || '').trim();
    const firstName = (record[6] || '').trim();
    const lastName = (record[5] || '').trim();
    if (!firstName || !lastName) continue;

    const fullName = prefix
      ? `${prefix} ${firstName} ${lastName}`
      : `${firstName} ${lastName}`;

    const city = (record[30] || '').trim() || null;
    const state = (record[31] || '').trim() || null;

    if (!city && !state) continue;

    matched++;
    if (!lookup.has(fullName)) {
      lookup.set(fullName, { city, state });
    }
  }

  console.log(`  Total processed: ${(processed / 1000000).toFixed(1)}M rows`);
  console.log(`  Matched: ${matched} surgical providers with location data`);
  console.log(`  Unique names in lookup: ${lookup.size}`);
  console.log(`  Skipped (parse errors): ${skipped}`);

  return lookup;
}

// ═════════════════════════════════════════════════════════════════
// PHASE 2: Fetch global surgeons missing state → batch RPC update
// ═════════════════════════════════════════════════════════════════
async function backfillSurgeons(lookup) {
  console.log('\n── Phase 2: Backfilling surgeons ─────────────────');

  const FETCH_SIZE = 1000;
  const RPC_BATCH = 1000;
  let totalFetched = 0;
  let totalMatched = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // We re-fetch from offset 0 each iteration because successful updates
  // remove rows from the "state IS NULL" result set.
  while (true) {
    const { data: surgeons, error } = await supabase
      .from('surgeons')
      .select('id, full_name')
      .eq('is_global', true)
      .is('state', null)
      .limit(FETCH_SIZE)
      .order('id');

    if (error) {
      console.error(`  Fetch error: ${error.message}`);
      break;
    }

    if (!surgeons || surgeons.length === 0) break;

    totalFetched += surgeons.length;

    // Build { id: { city, state } } JSONB payload
    const updates = {};
    let batchMatched = 0;

    for (const surgeon of surgeons) {
      const loc = lookup.get(surgeon.full_name);
      if (!loc) {
        totalSkipped++;
        continue;
      }
      batchMatched++;
      updates[surgeon.id] = { city: loc.city, state: loc.state };

      if (Object.keys(updates).length >= RPC_BATCH) {
        totalMatched += Object.keys(updates).length;
        if (!dryRun) {
          const count = await flushRpc(updates);
          totalUpdated += count;
          if (count === 0) totalErrors++;
        } else {
          totalUpdated += Object.keys(updates).length;
        }
        // Clear for next sub-batch
        for (const k of Object.keys(updates)) delete updates[k];
        await sleep(200);
      }
    }

    // Flush remainder
    const remaining = Object.keys(updates).length;
    if (remaining > 0) {
      totalMatched += remaining;
      if (!dryRun) {
        const count = await flushRpc(updates);
        totalUpdated += count;
        if (count === 0) totalErrors++;
      } else {
        totalUpdated += remaining;
      }
      await sleep(200);
    }

    console.log(`  Fetched ${totalFetched}, matched ${totalMatched}, updated ${totalUpdated}, skipped ${totalSkipped}...`);

    // If nothing matched in this page, every remaining surgeon has no NPI match.
    // Advance past them by fetching with offset to avoid infinite loop.
    if (batchMatched === 0) {
      // All surgeons in this page had no NPI match and still have NULL state.
      // Fetch next page with offset to skip them.
      let skipOffset = FETCH_SIZE;
      let foundMore = false;
      while (true) {
        const { data: nextPage, error: nextErr } = await supabase
          .from('surgeons')
          .select('id, full_name')
          .eq('is_global', true)
          .is('state', null)
          .range(skipOffset, skipOffset + FETCH_SIZE - 1)
          .order('id');

        if (nextErr || !nextPage || nextPage.length === 0) break;

        totalFetched += nextPage.length;
        let pageMatched = 0;

        for (const surgeon of nextPage) {
          const loc = lookup.get(surgeon.full_name);
          if (!loc) {
            totalSkipped++;
            continue;
          }
          pageMatched++;
          updates[surgeon.id] = { city: loc.city, state: loc.state };

          if (Object.keys(updates).length >= RPC_BATCH) {
            totalMatched += Object.keys(updates).length;
            if (!dryRun) {
              const count = await flushRpc(updates);
              totalUpdated += count;
            } else {
              totalUpdated += Object.keys(updates).length;
            }
            for (const k of Object.keys(updates)) delete updates[k];
            await sleep(200);
          }
        }

        const rem = Object.keys(updates).length;
        if (rem > 0) {
          totalMatched += rem;
          if (!dryRun) {
            const count = await flushRpc(updates);
            totalUpdated += count;
          } else {
            totalUpdated += rem;
          }
          for (const k of Object.keys(updates)) delete updates[k];
          await sleep(200);
        }

        console.log(`  Fetched ${totalFetched}, matched ${totalMatched}, updated ${totalUpdated}, skipped ${totalSkipped}...`);

        if (pageMatched > 0) { foundMore = true; break; }
        if (nextPage.length < FETCH_SIZE) break;
        skipOffset += FETCH_SIZE;
      }
      // If we exhausted all offset pages with no matches, we're done
      if (!foundMore) break;
    }

    if (totalErrors > 5) {
      console.error('  Too many RPC errors, aborting.');
      break;
    }
  }

  console.log(`\n  Total fetched:  ${totalFetched}`);
  console.log(`  Total matched:  ${totalMatched}`);
  console.log(`  Total updated:  ${totalUpdated}${dryRun ? ' (dry run)' : ''}`);
  console.log(`  Total skipped:  ${totalSkipped} (no NPI match)`);
}

async function flushRpc(updates) {
  const { data, error } = await supabase.rpc('batch_update_surgeon_location', {
    updates,
  });
  if (error) {
    console.error(`  RPC error: ${error.message}`);
    return 0;
  }
  return data || 0;
}

// ═════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════
async function main() {
  console.log('MedRepDesk Surgeon State/City Backfill');
  console.log(`Supabase: ${SUPABASE_URL}`);
  if (dryRun) console.log('** DRY RUN — no writes will be made **');

  const lookup = await buildNpiLookup();
  await backfillSurgeons(lookup);

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
