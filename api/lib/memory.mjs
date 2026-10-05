// The same storage interface as dynamo.mjs, in memory: for the tests.
export function memoryStore() {
  const rows = new Map(), key = (pk, sk) => `${pk}\u0000${sk}`, copy = x => x && structuredClone(x);
  return {
    rows,
    async get(pk, sk) { return copy(rows.get(key(pk, sk))) || null; },
    async put(item) { rows.set(key(item.pk, item.sk), copy(item)); },
    async putNew(item) { if (rows.has(key(item.pk, item.sk))) return false; rows.set(key(item.pk, item.sk), copy(item)); return true; },
    async del(pk, sk) { rows.delete(key(pk, sk)); },
    async query(pk, prefix) { return [...rows.values()].filter(r => r.pk === pk && r.sk.startsWith(prefix)).sort((a, b) => a.sk < b.sk ? -1 : 1).map(copy); },
    // no awaits before the change, so each call is atomic, like DynamoDB's conditional update
    async reserve(pk, sk, ttl, limit) { const r = rows.get(key(pk, sk)) || { pk, sk, n: 0 }; if (r.n >= limit) return false; r.n++; rows.set(key(pk, sk), r); return true; },
    async release(pk, sk) { const r = rows.get(key(pk, sk)); if (r && r.n > 0) r.n--; },
  };
}
