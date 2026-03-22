import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(__dirname, '../data/aaro-cases.json'), 'utf8'));

const router = Router();
router.get('/', (_, res) => res.json(cases));
export default router;
