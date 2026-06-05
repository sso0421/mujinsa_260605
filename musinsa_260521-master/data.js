import { DATA_URL } from './config.js';
import { normalizeDataset } from './utils.js';

let cache = null;

export async function loadData(){
  if (cache) return cache;
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load db.json');
  const raw = await res.json();
  cache = normalizeDataset(raw);
  return cache;
}
