import { Router } from 'express';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDataset, datasetExists } from '../lib/dataset.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const aaroCases = JSON.parse(
  readFileSync(join(__dirname, '../data/aaro-cases.json'), 'utf8')
);

function loadMeta() {
  const p = join(__dirname, '../data/metadata.json');
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; }
}

function loadAaroScraped() {
  const p = join(__dirname, '../data/aaro-scraped.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

const router = Router();

router.get('/', (_, res) => {
  const meta        = loadMeta();
  const aaroScraped = loadAaroScraped();

  // Prefer scraped AARO count when available; fall back to curated cases
  const aaroCount       = aaroScraped?.count ?? aaroCases.length;
  const unresolvedCount = aaroCases.filter((c) => c.classification === 'UNRESOLVED').length;
  const lastUpdated     = meta.nuforc?.lastUpdated ?? null;

  if (!datasetExists()) {
    return res.status(503).json({
      total: null,
      minYear: null,
      maxYear: null,
      dataSpanYears: null,
      aaroCount,
      unresolvedCount,
      lastUpdated,
      datasetReady: false,
    });
  }

  const data = getDataset();
  if (!data) {
    return res.status(503).json({
      total: null,
      minYear: null,
      maxYear: null,
      dataSpanYears: null,
      aaroCount,
      unresolvedCount,
      lastUpdated,
      datasetReady: false,
    });
  }

  let minYear = Infinity;
  let maxYear = -Infinity;
  for (const r of data) {
    if (r.year < minYear) minYear = r.year;
    if (r.year > maxYear) maxYear = r.year;
  }

  res.json({
    total: data.length,
    minYear,
    maxYear,
    dataSpanYears: maxYear - minYear,
    aaroCount,
    unresolvedCount,
    lastUpdated,
    datasetReady: true,
  });
});

export default router;
