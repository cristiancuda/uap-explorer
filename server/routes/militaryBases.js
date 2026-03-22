import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../data/cache');
const CACHE_PATH = join(CACHE_DIR, 'military-bases.json');
const FALLBACK_PATH = join(__dirname, '../data/military-bases.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_QUERY = `
[out:json][timeout:60];
(
  node["military"="airfield"]["name"];
  node["military"="base"]["name"];
  node["military"="naval_base"]["name"];
  node["military"="air_base"]["name"];
  way["military"="airfield"]["name"];
  way["military"="base"]["name"];
  way["military"="naval_base"]["name"];
  way["military"="air_base"]["name"];
);
out center tags;
`.trim();

function inferBranch(tags) {
  const combined = [tags.name, tags.operator, tags.official_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/air force|usaf|afb/.test(combined)) return 'USAF';
  if (/navy|naval|nas /.test(combined)) return 'US Navy';
  if (/marine|usmc/.test(combined)) return 'USMC';
  if (/army|fort /.test(combined)) return 'US Army';
  if (/cia|nsa|dod/.test(combined)) return 'DoD';
  return tags.operator || 'Military';
}

function transformOverpassResult(elements) {
  return elements
    .map((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!lat || !lon) return null;
      const tags = el.tags || {};
      const name = tags.name || tags.official_name;
      if (!name) return null;
      return { name, lat, lon, branch: inferBranch(tags), osmId: el.id };
    })
    .filter(Boolean);
}

async function fetchFromOverpass() {
  const body = new URLSearchParams({ data: OVERPASS_QUERY });
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(70_000),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const json = await res.json();
  return transformOverpassResult(json.elements || []);
}

function readCache() {
  if (!existsSync(CACHE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function readFallback() {
  try {
    const bases = JSON.parse(readFileSync(FALLBACK_PATH, 'utf8'));
    return { bases, source: 'fallback' };
  } catch {
    return { bases: [], source: 'fallback' };
  }
}

const router = Router();

router.get('/', async (_, res) => {
  // Try valid cache first
  const cache = readCache();
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return res.json({ bases: cache.bases, source: 'cache', count: cache.bases.length });
  }

  // Attempt live Overpass fetch
  try {
    console.log('[military-bases] Fetching from Overpass API…');
    const bases = await fetchFromOverpass();
    console.log(`[military-bases] Got ${bases.length} installations from Overpass`);

    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify({ fetchedAt: Date.now(), bases }));

    return res.json({ bases, source: 'live', count: bases.length });
  } catch (err) {
    console.warn('[military-bases] Overpass fetch failed:', err.message);

    // Serve stale cache if available
    if (cache) {
      console.log('[military-bases] Serving stale cache');
      return res.json({ bases: cache.bases, source: 'stale', count: cache.bases.length });
    }

    // Last resort: static fallback file
    return res.json(readFallback());
  }
});

export default router;
