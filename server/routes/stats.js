import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDataset, datasetExists } from '../lib/dataset.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const aaroCases = JSON.parse(
  readFileSync(join(__dirname, '../data/aaro-cases.json'), 'utf8')
);

const router = Router();

router.get('/', (_, res) => {
  // AARO counts are always available (curated JSON)
  const aaroCount = aaroCases.length;
  const unresolvedCount = aaroCases.filter((c) => c.classification === 'UNRESOLVED').length;

  if (!datasetExists()) {
    return res.status(503).json({
      total: null,
      minYear: null,
      maxYear: null,
      dataSpanYears: null,
      aaroCount,
      unresolvedCount,
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
    datasetReady: true,
  });
});

export default router;
