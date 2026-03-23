import { Router } from 'express';
import { getDataset } from '../lib/dataset.js';

const router = Router();

router.get('/', (_, res) => {
  const data = getDataset();
  if (!data) {
    return res.status(503).json({ error: 'Dataset not available. Run `npm run process` first.' });
  }

  const counts = {};
  for (const r of data) {
    if (r.year) counts[r.year] = (counts[r.year] || 0) + 1;
  }

  const result = Object.entries(counts)
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => a.year - b.year);

  res.json(result);
});

export default router;
