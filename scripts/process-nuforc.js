/**
 * process-nuforc.js
 *
 * Converts the raw NUFORC CSV from Kaggle into a cleaned JSON file
 * consumed by the Express server.
 *
 * Usage:
 *   1. Download the CSV from https://www.kaggle.com/datasets/camnugent/ufo-sightings-around-the-world
 *   2. Place it at: server/data/raw/scrubbed.csv  (or update CSV_PATH below)
 *   3. Run: npm run process
 *   4. Output: server/data/nuforc-cleaned.json
 *
 * Expected CSV columns (Kaggle format):
 *   datetime, city, state, country, shape, duration (seconds), duration (hours/min),
 *   comments, date posted, latitude, longitude
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '../server/data/raw/scrubbed.csv');
const OUT_PATH = join(__dirname, '../server/data/nuforc-cleaned.json');
const OUT_DIR = join(__dirname, '../server/data');
const META_PATH = join(__dirname, '../server/data/metadata.json');

if (!existsSync(CSV_PATH)) {
  console.error(`CSV not found at: ${CSV_PATH}`);
  console.error('Download from: https://www.kaggle.com/datasets/camnugent/ufo-sightings-around-the-world');
  console.error('Place the file at: server/data/raw/scrubbed.csv');
  process.exit(1);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const rl = createInterface({ input: createReadStream(CSV_PATH), crlfDelay: Infinity });

let headers = null;
let id = 0;
const sightings = [];
let skipped = 0;

function parseRow(line) {
  // Basic CSV parser — handles quoted fields with commas
  const result = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  result.push(field.trim());
  return result;
}

// Column-name aliases so both CSV variants work:
//   scrubbed.csv (old Kaggle):  datetime, state, shape, duration (seconds/hours/min), comments
//   ufo_sighting_data.csv (new): Date_time, state/province, UFO_shape, length_of_encounter_seconds, described_duration_of_encounter, description
const HEADER_ALIASES = {
  'date_time':                       'datetime',
  'state/province':                  'state',
  'ufo_shape':                       'shape',
  'length_of_encounter_seconds':     'duration (seconds)',
  'described_duration_of_encounter': 'duration (hours/min)',
  'description':                     'comments',
  'date_documented':                 'date posted',
};

rl.on('line', (line) => {
  if (!headers) {
    headers = parseRow(line).map((h) => {
      const norm = h.toLowerCase().trim();
      return HEADER_ALIASES[norm] ?? norm;
    });
    return;
  }

  const cols = parseRow(line);
  const get = (name) => cols[headers.indexOf(name)] ?? '';

  const lat = parseFloat(get('latitude'));
  const lon = parseFloat(get('longitude') || get(' longitude'));

  // Skip rows with invalid coordinates
  if (!isFinite(lat) || !isFinite(lon) || lat === 0 || lon === 0) {
    skipped++;
    return;
  }

  const rawDatetime = get('datetime');
  // Support both ISO (YYYY-MM-DD HH:MM) and US (MM/DD/YYYY HH:MM) formats
  let datetime = rawDatetime;
  let year;
  const isoMatch = rawDatetime?.match(/^(\d{4})[-\/]/);
  const usMatch  = rawDatetime?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1]);
  } else if (usMatch) {
    year = parseInt(usMatch[3]);
    // Normalise to ISO so stored datetimes are consistent
    datetime = `${usMatch[3]}-${usMatch[1].padStart(2,'0')}-${usMatch[2].padStart(2,'0')} ${usMatch[4]}`;
  }
  if (!year || year < 1900 || year > 2030) {
    skipped++;
    return;
  }

  const shape = get('shape')?.toLowerCase() || 'unknown';
  const duration = get('duration (hours/min)') || get('duration (seconds)');
  const comments = get('comments')
    ?.replace(/&#44/g, ',')
    ?.replace(/&amp;/g, '&')
    ?.slice(0, 500) || '';

  sightings.push({
    id: ++id,
    datetime,
    year,
    city: get('city'),
    state: get('state'),
    country: get('country'),
    shape,
    duration,
    comments,
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
  });
});

rl.on('close', () => {
  console.log(`Processed: ${sightings.length.toLocaleString()} sightings`);
  console.log(`Skipped (invalid coords/date): ${skipped.toLocaleString()}`);

  writeFileSync(OUT_PATH, JSON.stringify(sightings));
  console.log(`Output written to: ${OUT_PATH}`);
  console.log(`File size: ${(Buffer.byteLength(JSON.stringify(sightings)) / 1024 / 1024).toFixed(1)} MB`);

  // Write metadata so the stats bar can show "last updated"
  let meta = {};
  try { meta = JSON.parse(readFileSync(META_PATH, 'utf8')); } catch { /* first run */ }
  meta.nuforc = { lastUpdated: new Date().toISOString(), source: 'kaggle-csv', count: sightings.length };
  writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`Metadata written to: ${META_PATH}`);

  console.log('\nDone! Start the server with: npm run server');
});
