import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDataset, datasetExists } from '../lib/dataset.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const aaroCases = JSON.parse(
  readFileSync(join(__dirname, '../data/aaro-cases.json'), 'utf8')
);
const militaryBases = JSON.parse(
  readFileSync(join(__dirname, '../data/military-bases.json'), 'utf8')
);

// Haversine distance in km
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Module-level cache — computed once per server process
let _computed = null;

function computeInsights(data) {
  const total = data.length;
  const ORB_SHAPES = new Set(['light', 'sphere', 'circle', 'orb']);

  let orbCount = 0;
  const annualCounts = {};

  for (const r of data) {
    const shape = r.shape?.toLowerCase();
    if (ORB_SHAPES.has(shape)) orbCount++;
    if (r.year) annualCounts[r.year] = (annualCounts[r.year] || 0) + 1;
  }

  // Orb/light dominance
  const orbDominancePct = (orbCount / total) * 100;

  // Decade surge: avg annual sightings 2001–2014 vs 1990–2000
  const avg = (startYr, endYr) => {
    let sum = 0;
    let count = 0;
    for (let y = startYr; y <= endYr; y++) {
      sum += annualCounts[y] || 0;
      count++;
    }
    return count > 0 ? sum / count : 0;
  };
  const preAvg = avg(1990, 2000);
  const postAvg = avg(2001, 2014);
  const decadeSurgeFactor = preAvg > 0 ? postAvg / preAvg : null;

  // Military proximity — check each sighting against the static base list
  // O(n × m): ~147k × 20 bases ≈ 3M haversine checks, runs in ~100ms
  console.log('[insights] Computing military proximity…');
  const start = Date.now();
  let nearCount = 0;
  for (const r of data) {
    if (!r.lat || !r.lon) continue;
    for (const base of militaryBases) {
      if (distanceKm(r.lat, r.lon, base.lat, base.lon) <= 80) {
        nearCount++;
        break; // only count once per sighting
      }
    }
  }
  const militaryProximityPct = (nearCount / total) * 100;
  console.log(`[insights] Proximity done in ${Date.now() - start}ms`);

  // AARO unresolved
  const aaroUnresolvedCount = aaroCases.filter((c) => c.classification === 'UNRESOLVED').length;

  return {
    militaryProximityPct: +militaryProximityPct.toFixed(1),
    decadeSurgeFactor: decadeSurgeFactor !== null ? +decadeSurgeFactor.toFixed(1) : null,
    orbDominancePct: +orbDominancePct.toFixed(1),
    aaroUnresolvedCount,
    computed: true,
  };
}

const router = Router();

router.get('/', (_, res) => {
  if (!datasetExists()) {
    return res.status(503).json({
      militaryProximityPct: null,
      decadeSurgeFactor: null,
      orbDominancePct: null,
      aaroUnresolvedCount: aaroCases.filter((c) => c.classification === 'UNRESOLVED').length,
      computed: false,
    });
  }

  const data = getDataset();
  if (!data) return res.status(503).json({ computed: false });

  if (!_computed) {
    _computed = computeInsights(data);
  }

  res.json(_computed);
});

export default router;
