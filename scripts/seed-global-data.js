#!/usr/bin/env node

/**
 * Seed global hospitals and surgeons from CMS and NPI data files.
 *
 * Usage:
 *   node scripts/seed-global-data.js                  # seed both
 *   node scripts/seed-global-data.js --hospitals-only  # hospitals only
 *   node scripts/seed-global-data.js --surgeons-only   # surgeons only
 *
 * WARNING: This script does NOT check for existing records. Running it
 * multiple times will create duplicates. Either truncate the target tables
 * first or run the dedup script (scripts/dedup-surgeons.js) afterwards.
 *
 * Requires env vars (reads from .env.local automatically):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (add to .env.local)
 */

import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { parse } from 'csv-parse';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

// ── CLI flags ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const hospitalsOnly = args.includes('--hospitals-only');
const surgeonsOnly = args.includes('--surgeons-only');
const runHospitals = !surgeonsOnly;
const runSurgeons = !hospitalsOnly;

// ── File paths ───────────────────────────────────────────────────
const HOSPITAL_CSV = resolve(ROOT, 'Hospital_General_Information.csv');
const NPI_CSV = resolve(ROOT, 'npi_data/npidata_pfile_20050523-20260208.csv');

// ── Taxonomy → specialty mapping ─────────────────────────────────
const SURGICAL_TAXONOMY_MAP = {
  '207X': 'hip',              // Orthopaedic Surgery (generic, refined below)
  '207T': 'spine',            // Neurological Surgery
  '208C': 'gyn_surgical',     // Colon & Rectal Surgery → closest match
  '2086': 'trauma',           // Surgery (general)
  '207V': 'gyn_surgical',     // Obstetrics & Gynecology
  '207R': 'cardiac_implants', // Internal Medicine (interventional cardiology)
  '207N': 'reconstructive',   // Dermatologic Surgery
  '207L': 'intrathecal_pumps',// Anesthesiology — Pain Medicine
  '204E': 'maxillofacial',    // Oral & Maxillofacial Surgery
  '2085': 'reconstructive',   // Plastic Surgery
  '207W': 'intraocular_lenses', // Ophthalmology
  '207Y': 'cochlear_implants',  // Otolaryngology
  '208G': 'cardiac_implants',   // Thoracic Surgery
  '2088': 'urological_implants',// Urology
  '2082': 'trauma',             // Surgery (208200)
};

// More specific ortho subspecialty mappings
const ORTHO_SUBSPECIALTY_MAP = {
  '207XS0114X': 'hip',            // Adult Reconstructive
  '207XS0106X': 'shoulder',       // Hand Surgery
  '207XS0117X': 'sports_medicine',// Sports Medicine
  '207XX0004X': 'ankle',          // Foot and Ankle
  '207XP3100X': 'knee',           // Pediatric Ortho → knee as fallback
  '207XX0801X': 'spine',          // Spine Surgery
  '207XT0002X': 'trauma',         // Ortho Trauma
};

// Prefixes to SKIP (not surgical)
const SKIP_PREFIXES = ['2084', '207U', '207K'];

// Surgical taxonomy prefixes to include
const SURGICAL_PREFIXES = Object.keys(SURGICAL_TAXONOMY_MAP);

// Specific codes for 207R (only interventional cardiology)
const SPECIFIC_207R = ['207RI0011X'];
// Specific codes for 207N (only surgical dermatology)
const SPECIFIC_207N = ['207ND0101X', '207NI0002X'];
// Specific codes for 207L (only pain medicine)
const SPECIFIC_207L = ['207LP2900X'];

function getTaxonomySpecialty(taxonomyCode) {
  if (!taxonomyCode) return null;
  const code = taxonomyCode.trim();

  // Skip non-surgical
  for (const skip of SKIP_PREFIXES) {
    if (code.startsWith(skip)) return null;
  }

  // Specific code checks for filtered prefixes
  if (code.startsWith('207R') && !SPECIFIC_207R.includes(code)) return null;
  if (code.startsWith('207N') && !SPECIFIC_207N.includes(code)) return null;
  if (code.startsWith('207L') && !SPECIFIC_207L.includes(code)) return null;

  // Ortho subspecialties
  if (code.startsWith('207X')) {
    return ORTHO_SUBSPECIALTY_MAP[code] || SURGICAL_TAXONOMY_MAP['207X'];
  }

  // Match by prefix
  for (const prefix of SURGICAL_PREFIXES) {
    if (code.startsWith(prefix)) {
      return SURGICAL_TAXONOMY_MAP[prefix];
    }
  }

  return null;
}

// ── Helpers ──────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function insertWithRetry(table, batch, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.from(table).insert(batch);
    if (!error) return { ok: true, count: batch.length };
    if (attempt < maxRetries) {
      const delay = 200 * Math.pow(2, attempt); // 200, 400, 800, 1600ms
      console.error(`  Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${error.message}`);
      await sleep(delay);
    } else {
      return { ok: false, error };
    }
  }
}

async function batchInsert(table, rows, batchSize = 100) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const result = await insertWithRetry(table, batch);
    if (result.ok) {
      inserted += result.count;
    } else {
      console.error(`  Batch insert error at rows ${i}-${i + batch.length}: ${result.error.message}`);
      // Try one by one for this batch
      for (const row of batch) {
        const { error: singleErr } = await supabase.from(table).insert(row);
        if (!singleErr) inserted++;
      }
    }
    if (i + batchSize < rows.length) await sleep(200);
  }
  return inserted;
}

// ═════════════════════════════════════════════════════════════════
// HOSPITALS
// ═════════════════════════════════════════════════════════════════
async function seedHospitals() {
  console.log('\n── Seeding Hospitals ──────────────────────────────');

  if (!existsSync(HOSPITAL_CSV)) {
    console.error(`Hospital CSV not found: ${HOSPITAL_CSV}`);
    return;
  }

  const rows = [];
  const seen = new Set();
  let skipped = 0;

  const parser = createReadStream(HOSPITAL_CSV).pipe(
    parse({ columns: true, skip_empty_lines: true, relax_column_count: true })
  );

  for await (const row of parser) {
    const hospitalType = row['Hospital Type'] || '';

    // Skip psychiatric, children's
    if (/psychiatric|children/i.test(hospitalType)) {
      skipped++;
      continue;
    }

    const name = (row['Facility Name'] || '').trim();
    const state = (row['State'] || '').trim();
    if (!name || !state) { skipped++; continue; }

    // Deduplicate by name + state
    const key = `${name.toLowerCase()}|${state.toLowerCase()}`;
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);

    // Clean phone: "(334) 793-8701" → "3347938701"
    const rawPhone = (row['Telephone Number'] || '').replace(/\D/g, '');
    const phone = rawPhone.length === 10
      ? `(${rawPhone.slice(0, 3)}) ${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
      : rawPhone || null;

    rows.push({
      is_global: true,
      account_id: null,
      name,
      facility_type: 'hospital',
      address: (row['Address'] || '').trim() || null,
      city: (row['City/Town'] || '').trim() || null,
      state,
      phone,
      is_active: true,
    });
  }

  console.log(`  Parsed: ${rows.length} hospitals (${skipped} skipped)`);

  if (rows.length === 0) return;

  const inserted = await batchInsert('facilities', rows);
  console.log(`  Inserted: ${inserted} hospitals`);
}

// ═════════════════════════════════════════════════════════════════
// SURGEONS (streaming — 10GB file)
// ═════════════════════════════════════════════════════════════════
async function seedSurgeons() {
  console.log('\n── Seeding Surgeons ──────────────────────────────');

  if (!existsSync(NPI_CSV)) {
    console.error(`NPI CSV not found: ${NPI_CSV}`);
    return;
  }

  // Stream parse the massive CSV
  let headers = null;
  let processed = 0;
  let matched = 0;
  let inserted = 0;
  let skipped = 0;
  let batch = [];
  const BATCH_SIZE = 500;

  const rl = createInterface({
    input: createReadStream(NPI_CSV, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  // Use csv-parse in sync mode for individual lines
  const { parse: parseSync } = await import('csv-parse/sync');

  for await (const line of rl) {
    if (!headers) {
      // Parse header row
      const parsed = parseSync(line, { columns: false });
      headers = parsed[0];
      continue;
    }

    processed++;
    if (processed % 500000 === 0) {
      console.log(`  Processed ${(processed / 1000000).toFixed(1)}M rows, ${matched} surgeons matched, ${inserted} inserted...`);
    }

    // Quick pre-filter: check if line contains entity type "1" (individual)
    // This avoids parsing every line
    let parsed;
    try {
      parsed = parseSync(line, { columns: false, relax_column_count: true });
    } catch {
      skipped++;
      continue;
    }
    const record = parsed[0];
    if (!record || record.length < 48) { skipped++; continue; }

    // Build a map from headers
    const entityType = record[1]; // Entity Type Code
    if (entityType !== '1') continue;

    // NPI Deactivation Date (column index 39) — must be empty
    const deactivationDate = record[39]?.trim();
    if (deactivationDate) continue;

    // Practice location country (column index 33) — must be US
    const country = record[33]?.trim();
    if (country !== 'US') continue;

    // Check taxonomy code_1 (column index 47)
    const taxonomyCode = record[47]?.trim();
    const specialty = getTaxonomySpecialty(taxonomyCode);
    if (!specialty) continue;

    // Extract name fields
    const prefix = (record[8] || '').trim();  // Provider Name Prefix Text
    const firstName = (record[6] || '').trim(); // Provider First Name
    const lastName = (record[5] || '').trim();  // Provider Last Name (Legal Name)

    if (!firstName || !lastName) continue;

    const fullName = prefix
      ? `${prefix} ${firstName} ${lastName}`
      : `${firstName} ${lastName}`;

    // Practice location
    const city = (record[30] || '').trim() || null;  // Practice Location City
    const state = (record[31] || '').trim() || null;  // Practice Location State
    const rawPhone = (record[34] || '').replace(/\D/g, ''); // Practice Location Phone
    const phone = rawPhone.length === 10
      ? `(${rawPhone.slice(0, 3)}) ${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
      : rawPhone.length > 0 ? rawPhone : null;

    matched++;

    batch.push({
      is_global: true,
      account_id: null,
      full_name: fullName,
      specialty,
      city,
      state,
      phone,
      is_active: true,
    });

    // Flush batch
    if (batch.length >= BATCH_SIZE) {
      const count = await batchInsert('surgeons', batch);
      inserted += count;
      batch = [];
    }
  }

  // Final batch
  if (batch.length > 0) {
    const count = await batchInsert('surgeons', batch);
    inserted += count;
  }

  console.log(`  Total processed: ${(processed / 1000000).toFixed(1)}M rows`);
  console.log(`  Matched: ${matched} surgeons`);
  console.log(`  Inserted: ${inserted} surgeons`);
  console.log(`  Skipped (parse errors): ${skipped}`);
}

// ═════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════
async function main() {
  console.log('MedRepDesk Global Data Seeder');
  console.log(`Supabase: ${SUPABASE_URL}`);

  if (runHospitals) await seedHospitals();
  if (runSurgeons) await seedSurgeons();

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
