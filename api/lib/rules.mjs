// What the API accepts, how codes and tokens are made, and how progress merges.
import { randomBytes, randomInt, createHash } from 'node:crypto';
import { WORDS } from './words.mjs';

export const KINDS = { family: { maxKids: 10, pictures: false }, class: { maxKids: 40, pictures: true } };
export const MAX_GROUPS = 20;
// a kid's Pip color, and the 9 pictures a picture password is made from
export const LOOKS = ['leaf', 'sun', 'sky', 'petal', 'carrot', 'grape', 'berry', 'sea'];
export const PICTURES = ['frog', 'sun', 'rocket', 'apple', 'fish', 'star', 'leaf', 'moon', 'bee'];
// what syncs: maps of id -> when it was earned or seen (ms), or 1 for older saves without a time
export const PROGRESS_KEYS = ['stars', 'badges', 'critters', 'gardenSeen', 'hallSeen'];
const MAX_ENTRIES = 2000;

export const newId = () => randomBytes(9).toString('base64url');
export const newCode = () => `${[0, 1, 2].map(() => WORDS[randomInt(WORDS.length)]).join('-')}-${String(randomInt(100)).padStart(2, '0')}`;
export const newPictures = () => { const a = randomInt(PICTURES.length); let b = randomInt(PICTURES.length - 1); if (b >= a) b++; return [PICTURES[a], PICTURES[b]]; };
export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = t => createHash('sha256').update(t).digest('base64url');
// codes are typed by kids: forgive case, spaces and odd dashes
export const normalCode = c => String(c || '').toLowerCase().trim().replace(/[\s_–—]+/g, '-').replace(/-+/g, '-');
export const validCode = c => /^[a-z]{2,12}-[a-z]{2,12}-[a-z]{2,12}-\d{2}$/.test(c);

export function cleanName(s, max) {
  const v = String(s ?? '').replace(/\s+/g, ' ').trim();
  return v.length >= 1 && v.length <= max && /^[\p{L}\p{N} .,'’&()!:#-]+$/u.test(v) ? v : null;
}
export const cleanNick = s => cleanName(s, 24);
export const cleanGroupName = s => cleanName(s, 40);

// progress only grows: keep every id from both sides, with the earliest time
export function mergeProgress(a = {}, b = {}) {
  const out = {};
  for (const k of PROGRESS_KEYS) {
    const m = { ...(a[k] || {}) };
    for (const [id, v] of Object.entries(b[k] || {})) m[id] = id in m ? earliest(m[id], v) : v;
    out[k] = m;
  }
  return out;
}
const earliest = (x, y) => (x > 1 && y > 1 ? Math.min(x, y) : Math.max(x, y));
// a progress upload: known keys only, sensible ids, numbers only, not too big
export function cleanProgress(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const out = {};
  for (const k of PROGRESS_KEYS) {
    const m = p[k]; if (m == null) { out[k] = {}; continue; }
    if (typeof m !== 'object' || Array.isArray(m)) return null;
    const entries = Object.entries(m); if (entries.length > MAX_ENTRIES) return null;
    out[k] = {};
    for (const [id, v] of entries) {
      if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(id)) return null;
      const n = v === true ? 1 : Number(v); if (!Number.isFinite(n) || n < 0) return null;
      out[k][id] = Math.round(n);
    }
  }
  return out;
}
