/**
 * scrape-nuforc.js
 *
 * Fetches recent sighting reports from nuforc.org/webreports and appends
 * new records to server/data/nuforc-cleaned.json.
 *
 * Usage:
 *   npm run scrape:nuforc              # scrapes current + previous month
 *   npm run scrape:nuforc -- --months 4  # scrapes last 4 months
 *
 * Geocoding: city+state → lat/lon via Nominatim (1 req/sec, free, no API key).
 * Results are cached in server/data/geocode-cache.json to avoid re-fetching.
 * State centroids are used as fallback when Nominatim returns no result.
 *
 * Deduplication: composite key of datetime|city|state|shape. Records already
 * in nuforc-cleaned.json are skipped.
 *
 * After a successful run the server must be restarted to reload the dataset.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = join(__dirname, '../server/data');
const OUT_PATH   = join(DATA_DIR, 'nuforc-cleaned.json');
const CACHE_PATH = join(DATA_DIR, 'geocode-cache.json');
const META_PATH  = join(DATA_DIR, 'metadata.json');

// US state centroids — fallback when Nominatim returns no result
const STATE_CENTROIDS = {
  al:[32.8067,-86.7913], ak:[61.3707,-152.4044], az:[33.7298,-111.4312],
  ar:[34.9697,-92.3731], ca:[36.1162,-119.6816], co:[39.0598,-105.3111],
  ct:[41.5978,-72.7554], de:[39.3185,-75.5071],  fl:[27.7663,-81.6868],
  ga:[33.0406,-83.6431], hi:[21.0943,-157.4983],  id:[44.2405,-114.4788],
  il:[40.3495,-88.9861], in:[39.8494,-86.2583],   ia:[42.0116,-93.2105],
  ks:[38.5266,-96.7265], ky:[37.6681,-84.6701],   la:[31.1700,-91.8678],
  me:[44.6940,-69.3819], md:[39.0639,-76.8021],   ma:[42.2302,-71.5301],
  mi:[43.3266,-84.5361], mn:[45.6945,-93.9002],   ms:[32.7416,-89.6787],
  mo:[38.4561,-92.2884], mt:[46.9219,-110.4544],  ne:[41.1254,-98.2681],
  nv:[38.3135,-117.0554],nh:[43.4525,-71.5639],   nj:[40.2989,-74.5210],
  nm:[34.8405,-106.2485],ny:[42.1657,-74.9481],   nc:[35.6301,-79.8064],
  nd:[47.5289,-99.7840], oh:[40.3888,-82.7649],   ok:[35.5653,-96.9289],
  or:[44.5720,-122.0709],pa:[40.5908,-77.2097],   ri:[41.6809,-71.5118],
  sc:[33.8569,-80.9450], sd:[44.2998,-99.4388],   tn:[35.7478,-86.6923],
  tx:[31.0545,-97.5635], ut:[40.1500,-111.8624],  vt:[44.0459,-72.7107],
  va:[37.7693,-78.1700], wa:[47.4009,-121.4905],  wv:[38.4913,-80.9545],
  wi:[44.2685,-89.6165], wy:[42.7560,-107.3025],  dc:[38.8974,-77.0268],
};

// ── helpers ──────────────────────────────────────────────────────────────────

function loadJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

function saveJson(path, data) {
  writeFileSync(path, JSON.stringify(data));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── HTML parsing ──────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and decode common entities from a cell string.
 */
function stripHtml(str) {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#44;/g,  ',')
    .replace(/&#39;/g,  "'")
    .trim();
}

/**
 * Parse all <td> cells in a single <tr> match.
 */
function parseCells(trContent) {
  const cells = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = re.exec(trContent)) !== null) {
    cells.push(stripHtml(m[1]));
  }
  return cells;
}

/**
 * Extract rows from a NUFORC monthly index page.
 *
 * Expected table columns (0-indexed):
 *   0 Date/Time  1 City  2 State  3 Shape  4 Duration  5 Summary  6 Images  7 Posted
 */
function parseNuforcTable(html) {
  const rows = [];

  // Find the first <table> block
  const tableMatch = html.match(/<table[\s\S]*?>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rows;

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  let isHeader = true;

  while ((trMatch = trRe.exec(tableMatch[1])) !== null) {
    if (isHeader) { isHeader = false; continue; } // skip header row

    const cells = parseCells(trMatch[1]);
    if (cells.length < 6) continue;

    rows.push({
      datetime: cells[0],
      city:     cells[1],
      state:    cells[2],
      shape:    cells[3] || 'unknown',
      duration: cells[4],
      summary:  cells[5].slice(0, 500),
    });
  }

  return rows;
}

/**
 * Convert NUFORC date/time strings to normalised form.
 * Input examples:  "1/15/25 22:00"  "12/3/2024 06:00"  "1/1/25 Hmph"
 * Output: "2025-01-15 22:00"  or  null if unparseable.
 */
function normaliseDateTime(raw) {
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}:\d{2})/);
  if (!m) return null;
  let [, mo, day, yr, time] = m;
  if (yr.length === 2) yr = '20' + yr;
  return `${yr}-${mo.padStart(2, '0')}-${day.padStart(2, '0')} ${time}`;
}

function dedupKey(datetime, city, state, shape) {
  return `${datetime}|${(city  || '').toLowerCase()}|${(state || '').toLowerCase()}|${(shape || '').toLowerCase()}`;
}

// ── geocoding ─────────────────────────────────────────────────────────────────

let _lastGeoAt = 0;

async function geocode(city, state, cache) {
  const key = `${(city  || '').toLowerCase()}|${(state || '').toLowerCase()}`;
  if (cache[key]) return cache[key];

  // Nominatim rate-limit: 1 req / sec
  const wait = 1100 - (Date.now() - _lastGeoAt);
  if (wait > 0) await sleep(wait);
  _lastGeoAt = Date.now();

  const query = state ? `${city}, ${state}, United States` : city;
  const url   = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'UAP-Explorer/1.0 (portfolio; nuforc-scraper)' },
      signal:  AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    if (data.length > 0) {
      const result = {
        lat: Math.round(parseFloat(data[0].lat) * 10_000) / 10_000,
        lon: Math.round(parseFloat(data[0].lon) * 10_000) / 10_000,
      };
      cache[key] = result;
      return result;
    }
  } catch { /* fall through */ }

  // Fallback: state centroid
  const centroid = STATE_CENTROIDS[state?.toLowerCase()];
  if (centroid) {
    const result = { lat: centroid[0], lon: centroid[1] };
    cache[key] = result;
    return result;
  }

  return null;
}

// ── fetch page ────────────────────────────────────────────────────────────────

async function fetchMonthPage(year, month) {
  const ym  = `${year}${String(month).padStart(2, '0')}`;
  const url = `https://nuforc.org/webreports/ndxe${ym}.html`;
  process.stdout.write(`  GET ${url} … `);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (UAP-Explorer portfolio project)' },
      signal:  AbortSignal.timeout(20_000),
    });
    if (!res.ok) { console.log(`HTTP ${res.status} — skipping`); return null; }
    console.log('OK');
    return await res.text();
  } catch (e) {
    console.log(`error: ${e.message}`);
    return null;
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Parse --months flag
  const monthsArg = process.argv.indexOf('--months');
  const numMonths = monthsArg !== -1 ? parseInt(process.argv[monthsArg + 1]) || 2 : 2;

  console.log(`=== NUFORC Scraper (last ${numMonths} month(s)) ===\n`);

  const existing = loadJson(OUT_PATH, []);
  console.log(`Existing records : ${existing.length.toLocaleString()}`);

  const dedupSet = new Set(
    existing.map((r) => dedupKey(r.datetime, r.city, r.state, r.shape))
  );

  const geocache    = loadJson(CACHE_PATH, {});
  const newSightings = [];

  // Build list of months to scrape
  const now = new Date();
  for (let i = 0; i < numMonths; i++) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year  = d.getFullYear();
    const month = d.getMonth() + 1;
    console.log(`\nScraping ${year}-${String(month).padStart(2, '0')} …`);

    const html = await fetchMonthPage(year, month);
    if (!html) continue;

    const rows = parseNuforcTable(html);
    console.log(`  Parsed ${rows.length} rows`);

    let added = 0, skipped = 0;
    for (const row of rows) {
      const datetime = normaliseDateTime(row.datetime);
      if (!datetime) { skipped++; continue; }

      const parsedYear = parseInt(datetime.slice(0, 4));
      if (!parsedYear || parsedYear < 1900 || parsedYear > 2030) { skipped++; continue; }

      const key = dedupKey(datetime, row.city, row.state, row.shape);
      if (dedupSet.has(key)) { skipped++; continue; }
      dedupSet.add(key);

      const coords = (row.city || row.state)
        ? await geocode(row.city, row.state, geocache)
        : null;

      if (!coords) { skipped++; continue; } // map requires coordinates

      newSightings.push({
        id:       existing.length + newSightings.length + 1,
        datetime,
        year:     parsedYear,
        city:     row.city,
        state:    row.state,
        country:  'us',
        shape:    (row.shape || 'unknown').toLowerCase(),
        duration: row.duration,
        comments: row.summary,
        lat:      coords.lat,
        lon:      coords.lon,
        source:   'nuforc-scrape',
      });
      added++;
    }
    console.log(`  Added ${added}, skipped ${skipped}`);
  }

  // Persist geocode cache regardless of whether new sightings were found
  saveJson(CACHE_PATH, geocache);

  if (newSightings.length === 0) {
    console.log('\nNo new sightings found — dataset unchanged.');
  } else {
    const updated = [...existing, ...newSightings];
    saveJson(OUT_PATH, updated);
    console.log(`\nDataset updated: ${updated.length.toLocaleString()} total sightings (+${newSightings.length})`);

    // Update metadata
    const meta = loadJson(META_PATH, {});
    meta.nuforc = {
      lastUpdated:  new Date().toISOString(),
      source:       'nuforc-scrape',
      count:        updated.length,
      newInLastRun: newSightings.length,
    };
    writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
    console.log(`Metadata updated: ${META_PATH}`);
  }

  console.log('\nDone! Restart the server to reload the dataset.');
}

main().catch((e) => { console.error(e); process.exit(1); });
