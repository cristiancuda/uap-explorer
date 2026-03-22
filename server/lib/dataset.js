/**
 * Shared lazy-loader for the NUFORC dataset.
 * The JSON is parsed once per server process and held in memory.
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_PATH = join(__dirname, '../data/nuforc-cleaned.json');

let _dataset = null;

export function getDataset() {
  if (_dataset) return _dataset;
  if (!existsSync(DATA_PATH)) return null;
  try {
    _dataset = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    console.log(`[dataset] Loaded ${_dataset.length.toLocaleString()} sightings`);
    return _dataset;
  } catch (err) {
    console.error('[dataset] Failed to parse nuforc-cleaned.json:', err.message);
    return null;
  }
}

export function datasetExists() {
  return existsSync(DATA_PATH);
}
