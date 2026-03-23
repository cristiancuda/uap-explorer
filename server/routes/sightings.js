import { Router } from 'express';
import { getDataset } from '../lib/dataset.js';

const router = Router();

// Decade string → year range, e.g. "1990s" → [1990, 1999]
function decadeToRange(decade) {
  const match = decade?.match(/^(\d{4})s$/);
  if (!match) return null;
  const start = parseInt(match[1]);
  return [start, start + 9];
}

router.get('/', (req, res) => {
  const data = getDataset();

  if (!data) {
    return res.status(503).json({
      error: 'Dataset not available. Run `npm run process` first.',
      sightings: [],
      total: 0,
    });
  }

  const { shape, decade, year, country, limit = 50000, offset = 0 } = req.query;
  const decadeRange = decadeToRange(decade);
  const yearInt = year ? parseInt(year) : null;

  let filtered = data;

  if (shape) {
    const s = shape.toLowerCase();
    filtered = filtered.filter((r) => r.shape?.toLowerCase() === s);
  }

  // year takes precedence over decade when both are set
  if (yearInt && !isNaN(yearInt)) {
    filtered = filtered.filter((r) => r.year === yearInt);
  } else if (decadeRange) {
    const [start, end] = decadeRange;
    filtered = filtered.filter((r) => {
      const y = r.year || new Date(r.datetime).getFullYear();
      return y >= start && y <= end;
    });
  }

  if (country) {
    const c = country.toLowerCase();
    filtered = filtered.filter((r) => r.country?.toLowerCase() === c);
  }

  const total = filtered.length;
  const page = filtered.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ sightings: page, total, filtered: total });
});

export default router;
