import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const events = JSON.parse(readFileSync(join(__dirname, '../data/timeline-events.json'), 'utf8'));

const router = Router();
router.get('/', (_, res) => res.json(events));
export default router;
