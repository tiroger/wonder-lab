// The QR encoder (src/08i_qr.js) against an independent decoder: every code must scan back to its text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import jsQR from 'jsqr';

const ctx = { TextEncoder }; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../src/08i_qr.js', import.meta.url), 'utf8') + '; this.qrMatrix = qrMatrix;', ctx);

function scan(text, px = 4) {
  const m = ctx.qrMatrix(text), q = 4, n = (m.length + 2 * q) * px, rgba = new Uint8ClampedArray(n * n * 4).fill(255);
  m.forEach((row, y) => row.forEach((dark, x) => {
    if (!dark) return;
    for (let dy = 0; dy < px; dy++) for (let dx = 0; dx < px; dx++) { const i = (((y + q) * px + dy) * n + (x + q) * px + dx) * 4; rgba[i] = rgba[i + 1] = rgba[i + 2] = 0; }
  }));
  return { size: m.length, read: jsQR(rgba, n, n)?.data };
}

test('join links scan back exactly', () => {
  for (const t of ['https://wonderlab.camp/#/join/maple-otter-pond-42', 'https://wonderlab.camp/#/join/dragonfly-hedgehog-chipmunk-07'])
    assert.equal(scan(t).read, t);
});
test('every version from 1 to 10 scans', () => {
  const sizes = new Set();
  for (let len = 1; len <= 210; len += 7) { const t = 'x'.repeat(len - 1) + String(len % 10), r = scan(t); assert.equal(r.read, t, `length ${len}`); sizes.add(r.size); }
  assert.ok(sizes.has(21) && sizes.has(57), 'covers version 1 (21x21) through version 10 (57x57)');
});
test('text past the limit is refused', () => { assert.throws(() => ctx.qrMatrix('x'.repeat(300))); });
