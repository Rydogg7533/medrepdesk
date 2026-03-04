#!/usr/bin/env node

/**
 * Delete duplicate global surgeons, keeping only the first record
 * for each unique (full_name, specialty) combination.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) { console.error('Missing .env.local'); process.exit(1); }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
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

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('Fetching global surgeon IDs...');

  // Paginate through all global surgeons, selecting only what we need
  const PAGE_SIZE = 1000;
  let offset = 0;
  const seen = new Map(); // "full_name|specialty" -> first id
  const dupeIds = [];

  while (true) {
    const { data, error } = await supabase
      .from('surgeons')
      .select('id, full_name, specialty')
      .eq('is_global', true)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      const key = `${(row.full_name || '').toLowerCase()}|${(row.specialty || '').toLowerCase()}`;
      if (seen.has(key)) {
        dupeIds.push(row.id);
      } else {
        seen.set(key, row.id);
      }
    }

    offset += data.length;
    if (offset % 50000 === 0) {
      console.log(`  Scanned ${offset} rows, ${dupeIds.length} duplicates found...`);
    }
  }

  console.log(`Scanned ${offset} total global surgeons`);
  console.log(`Found ${dupeIds.length} duplicates to delete`);
  console.log(`Keeping ${seen.size} unique surgeons`);

  if (dupeIds.length === 0) {
    console.log('No duplicates found.');
    return;
  }

  // Delete in batches
  const BATCH = 100;
  let deleted = 0;
  for (let i = 0; i < dupeIds.length; i += BATCH) {
    const batch = dupeIds.slice(i, i + BATCH);
    const { error } = await supabase.from('surgeons').delete().in('id', batch);
    if (error) {
      console.error(`  Delete error at ${i}: ${error.message}`);
    } else {
      deleted += batch.length;
    }
    if (deleted % 10000 === 0 && deleted > 0) {
      console.log(`  Deleted ${deleted}/${dupeIds.length}...`);
    }
    await sleep(100);
  }

  console.log(`Deleted ${deleted} duplicate surgeons`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
