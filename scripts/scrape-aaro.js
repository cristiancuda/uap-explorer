/**
 * scrape-aaro.js
 *
 * Fetches public UAP case data from aaro.mil and writes it to
 * server/data/aaro-scraped.json.
 *
 * Usage:
 *   npm run scrape:aaro
 *
 * Notes:
 * - AARO's public case portal is JavaScript-rendered; this scraper targets the
 *   static HTML endpoints that carry table data. If AARO updates their site
 *   structure the URL constants below may need to be adjusted.
 * - The manually-curated server/data/aaro-cases.json (6 highlighted cases for
 *   the easter egg) is NOT modified by this script.
 * - New AARO cases are merged into server/data/aaro-scraped.json, keyed by
 *   case ID so duplicates are skipped on subsequent runs.
 * - server/routes/stats.js prefers counts from aaro-scraped.json when present.
 *
 * After a successful run the server must be restarted to pick up the new count.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const DATA_DIR    = join(__dirname, '../server/data');
const OUT_PATH    = join(DATA_DIR, 'aaro-scraped.json');
const META_PATH   = join(DATA_DIR, 'metadata.json');

// Candidate URLs to try in order. AARO has restructured their site a few times;
// adjust these if the scraper stops finding data.
const CANDIDATE_URLS = [
  'https://aaro.mil/Portals/0/Documents/UAP_Reports/FY2023_Consolidated_Annual_Report_UAP_Vol1.pdf',
  'https://aaro.mil/UAP-Reports-Trend-Data/',
  'https://aaro.mil/All-Domain-Anomaly-Resolution-Office/Case-Reporting/',
  'https://aaro.mil/About-AARO/Case-Portal/',
  'https://aaro.mil/AARO-Cases/',
];

// The AARO case portal URL — primary target for tabular case data
const CASE_PORTAL_URL = 'https://aaro.mil/UAP-Reports-Trend-Data/';

// ── helpers ──────────────────────────────────────────────────────────────────

function loadJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

function saveJson(path, data, pretty = false) {
  writeFileSync(path, pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data));
}

function stripHtml(str) {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g,  "'")
    .trim();
}

// ── HTTP fetch with timeout ───────────────────────────────────────────────────

async function fetchPage(url) {
  process.stdout.write(`  GET ${url} … `);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (UAP-Explorer portfolio project; aaro-scraper)',
        'Accept':     'text/html,application/json,*/*',
      },
      signal: AbortSignal.timeout(20_000),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      console.log(`HTTP ${res.status} — skipping`);
      return null;
    }
    // Skip PDF and binary responses
    if (contentType.includes('pdf') || contentType.includes('octet-stream')) {
      console.log(`binary (${contentType}) — skipping`);
      return null;
    }
    const body = await res.text();
    console.log(`OK (${(body.length / 1024).toFixed(0)} KB)`);
    return { body, contentType };
  } catch (e) {
    console.log(`error: ${e.message}`);
    return null;
  }
}

// ── JSON embedded in page ─────────────────────────────────────────────────────

/**
 * Some government sites embed JSON data in <script> tags or as window.__DATA__.
 * Try to extract an array of case objects.
 */
function extractEmbeddedJson(html) {
  // Look for JSON arrays that could be case data
  const patterns = [
    /window\.__(?:DATA|CASES|STATE)__\s*=\s*(\[[\s\S]+?\]);/,
    /var\s+cases\s*=\s*(\[[\s\S]+?\]);/i,
    /<script[^>]*type="application\/json"[^>]*>([\s\S]+?)<\/script>/i,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      try { return JSON.parse(m[1]); } catch { /* not valid JSON */ }
    }
  }
  return null;
}

// ── HTML table parsing ────────────────────────────────────────────────────────

/**
 * Extract all HTML tables from a page and return rows as arrays of strings.
 */
function parseTables(html) {
  const tables = [];
  const tableRe = /<table[\s\S]*?>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRe.exec(html)) !== null) {
    const rows = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;

    while ((trMatch = trRe.exec(tableMatch[1])) !== null) {
      const cells = [];
      // Match both <th> and <td>
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRe.exec(trMatch[1])) !== null) {
        cells.push(stripHtml(cellMatch[1]));
      }
      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length > 1) tables.push(rows); // at least header + 1 data row
  }

  return tables;
}

/**
 * Try to interpret table rows as AARO case records.
 * Looks for columns containing date/year, location/state, description/summary.
 */
function interpretCaseTable(rows) {
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const dateIdx     = header.findIndex((h) => /date|year|time/i.test(h));
  const locationIdx = header.findIndex((h) => /location|state|place|site/i.test(h));
  const shapeIdx    = header.findIndex((h) => /shape|type|form/i.test(h));
  const summaryIdx  = header.findIndex((h) => /summary|description|notes|details/i.test(h));
  const statusIdx   = header.findIndex((h) => /status|resolution|class/i.test(h));

  // Need at least a date or summary column to make sense
  if (dateIdx === -1 && summaryIdx === -1) return [];

  const cases = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => !c)) continue; // skip empty rows

    const c = {
      id:       `AARO-scraped-${i}`,
      date:     dateIdx     !== -1 ? row[dateIdx]     : '',
      location: locationIdx !== -1 ? row[locationIdx] : '',
      shape:    shapeIdx    !== -1 ? row[shapeIdx]    : '',
      summary:  summaryIdx  !== -1 ? row[summaryIdx]  : row.join(' — '),
      status:   statusIdx   !== -1 ? row[statusIdx]   : '',
      source:   'aaro-scrape',
    };

    if (c.date || c.summary) cases.push(c);
  }
  return cases;
}

// ── merge with existing scraped data ─────────────────────────────────────────

function mergeCases(existing, incoming) {
  const byId = new Map(existing.map((c) => [c.id, c]));
  let added = 0;

  for (const c of incoming) {
    if (!byId.has(c.id)) {
      byId.set(c.id, c);
      added++;
    }
  }

  return { merged: [...byId.values()], added };
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== AARO Scraper ===\n');

  const existing = loadJson(OUT_PATH, { fetchedAt: null, count: 0, cases: [] });
  console.log(`Existing scraped cases : ${existing.cases.length}`);

  let found   = [];
  let success = false;

  // Try the case portal first, then fallbacks
  const urlsToTry = [CASE_PORTAL_URL, ...CANDIDATE_URLS.filter((u) => u !== CASE_PORTAL_URL)];

  for (const url of urlsToTry) {
    // Skip PDF links
    if (url.endsWith('.pdf')) {
      console.log(`  Skipping PDF: ${url}`);
      continue;
    }

    const result = await fetchPage(url);
    if (!result) continue;

    const { body } = result;

    // 1. Try embedded JSON first (fastest)
    const jsonData = extractEmbeddedJson(body);
    if (jsonData && Array.isArray(jsonData) && jsonData.length > 0) {
      console.log(`  Found embedded JSON: ${jsonData.length} items`);
      found = jsonData.map((item, i) => ({
        id:       item.id || item.caseId || item.case_id || `AARO-scraped-${i + 1}`,
        date:     item.date || item.eventDate || item.year || '',
        location: item.location || item.state || item.site || '',
        shape:    item.shape || item.type || '',
        summary:  item.summary || item.description || item.notes || '',
        status:   item.status || item.resolution || item.classification || '',
        source:   'aaro-scrape',
      }));
      success = true;
      break;
    }

    // 2. Try HTML tables
    const tables = parseTables(body);
    if (tables.length > 0) {
      console.log(`  Found ${tables.length} table(s) in HTML`);
      for (const table of tables) {
        const cases = interpretCaseTable(table);
        if (cases.length > 0) {
          console.log(`  Interpreted ${cases.length} case rows`);
          found = cases;
          success = true;
          break;
        }
      }
      if (success) break;
    }

    // 3. Check if the page is obviously JavaScript-rendered (no table content)
    const hasContent = body.includes('<table') || body.includes('<tr');
    if (!hasContent) {
      console.log(`  Page appears to be JavaScript-rendered — no static table found`);
    }
  }

  // ── update metadata regardless of outcome ────────────────────────────────

  const meta = loadJson(META_PATH, {});

  if (!success || found.length === 0) {
    console.log(`
⚠️  No AARO case data could be extracted from the public site.
   AARO's case portal (aaro.mil) is primarily JavaScript-rendered and may
   require a headless browser (e.g. Playwright) for full scraping.

   Manual options:
     1. Download the AARO annual report PDF from aaro.mil and extract cases.
     2. Use the AARO public API if/when one becomes available.
     3. Manually add cases to server/data/aaro-cases.json.

   The existing server/data/aaro-scraped.json is unchanged.
`);

    meta.aaro = {
      lastChecked:  new Date().toISOString(),
      lastUpdated:  existing.fetchedAt || null,
      count:        existing.cases.length,
      note:         'Site requires JS rendering; manual update needed',
    };
    writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
    return;
  }

  const { merged, added } = mergeCases(existing.cases, found);
  const output = {
    fetchedAt: new Date().toISOString(),
    count:     merged.length,
    cases:     merged,
  };

  saveJson(OUT_PATH, output, true);

  console.log(`\nAAR cases: ${merged.length} total (+${added} new)`);
  console.log(`Written to: ${OUT_PATH}`);

  meta.aaro = {
    lastChecked:  new Date().toISOString(),
    lastUpdated:  output.fetchedAt,
    count:        merged.length,
    newInLastRun: added,
    source:       'aaro-scrape',
  };
  saveJson(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`Metadata updated: ${META_PATH}`);

  console.log('\nDone! Restart the server to reload AARO case counts.');
}

main().catch((e) => { console.error(e); process.exit(1); });
