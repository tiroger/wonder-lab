/* ============ Home: life on the campus grounds (docs/design.md, section 16) ============ */
// Things to poke between the buildings: trees drop leaves (and sometimes a bird), a pond with a frog, a flower bed
// that blooms and calls a bee, a rock with a pill bug under it. Little Pip walks wherever you tap the trail, and
// tapping him gets a fact from an activity you've played. It's all decoration: the buildings' links carry the meaning.
const PIP_TICKLE = 'Hee hee, that tickles! Tap a building to start exploring.';
const BED_COLORS = [C.petal, C.sun, '#9B7FE0', C.carrot, '#5BB8E8'];
const Grounds = { shake: {}, taps: {}, leaves: [], birds: [], ripples: [], frog: { pad: 1, from: 1, t0: -9, landed: true },
  bloom: [0, 0, 0, 0, 0], wig: [0, 0, 0, 0, 0], bee: null, rock: { open: false, t0: -9 }, curlT: -9, pokeT: -9, craneT: -9, seen: new Set() };

// a garden strip under the buildings: the pond, the flower bed, the rock and a few more trees
function groundsLayout(L) {
  const y = L.h;
  if (L.cols === 1) {
    Object.assign(L, { pond: { x: 300, y: y + 100, rx: 200, ry: 78 }, bed: { x: 232, y: y + 290, w: 330 }, rock: { x: 455, y: y + 280 } });
    L.trees.push({ x: 520, y: y + 380, s: .8 }); L.h = y + 460;
  } else {
    Object.assign(L, { pond: { x: 380, y: y + 120, rx: 220, ry: 88 }, bed: { x: 860, y: y + 160, w: 380 }, rock: { x: 1250, y: y + 170 } });
    L.trees.push({ x: 1470, y: y + 90, s: 1 }, { x: 650, y: y + 60, s: .85 }); L.h = y + 290;
  }
  const P = L.pond; L.pads = [[-.5, .1], [-.05, -.42], [.42, .18]].map(([u, v]) => ({ x: P.x + u * P.rx, y: P.y + v * P.ry }));
  L.flowers = BED_COLORS.map((_, i) => ({ x: L.bed.x - L.bed.w / 2 + 38 + i * (L.bed.w - 76) / 4, y: L.bed.y - 70 }));
  L.trees.forEach(tr => { tr.cy = tr.y - 8 * tr.s; });
}

// --- what's under a tap ---
const frogAt = t => { const F = Grounds.frog, L = Home.L, a = L.pads[F.from], b = L.pads[F.pad], e = RM ? 1 : clamp((t - F.t0) / .55, 0, 1);
  return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) - 8 - Math.sin(PI * e) * 55, e }; };
const rockAt = t => { const R = Grounds.rock, L = Home.L, k = RM ? 1 : easeOut(clamp((t - R.t0) / .4, 0, 1)), o = R.open ? k : 1 - k;
  return { x: L.rock.x + o * 78, y: L.rock.y - o * 6, rot: o * .5, o }; };
const inPond = (x, y) => { const P = Home.L.pond; return ((x - P.x) / P.rx) ** 2 + ((y - P.y) / P.ry) ** 2 < 1; };
const nearTrail = (x, y) => { let best = -1, bd = 30; Home.samples.forEach((s, i) => { const d = dist(x, y, s.x, s.y); if (d < bd) { bd = d; best = i; } }); return best; };
function groundsHit(x, y, t = Loop.t) {
  const L = Home.L; if (!L || !L.pond) return null;
  const f = frogAt(t); if (dist(x, y, f.x, f.y) < 34) return { kind: 'frog' };
  if (Grounds.rock.open && rockAt(t).o > .9 && dist(x, y, L.rock.x, L.rock.y + 4) < 26) return { kind: 'bug' };
  const r = rockAt(t); if (dist(x, y, r.x, r.y) < 48) return { kind: 'rock' };
  const fi = L.flowers.findIndex(p => Math.abs(x - p.x) < 30 && y > p.y - 34 && y < L.bed.y + 16); if (fi >= 0) return { kind: 'flower', i: fi };
  const ti = L.trees.findIndex(tr => dist(x, y, tr.x, tr.cy) < 42 * tr.s); if (ti >= 0) return { kind: 'tree', i: ti };
  if (inPond(x, y)) return { kind: 'water' };
  const s = nearTrail(x, y); if (s >= 0) return { kind: 'trail', i: s };
  return null;
}

// --- tapping ---
function groundsTap(x, y) {
  const h = groundsHit(x, y), t = Loop.t, G = Grounds, L = Home.L; if (!h) return false;
  if (h.kind === 'frog') {
    const F = G.frog; if (!RM && t - F.t0 < .55) return true;
    F.from = F.pad; F.pad = (F.pad + 1 + Math.floor(Math.random() * 2)) % 3; F.t0 = t; F.landed = false; Sound.croak();
  } else if (h.kind === 'bug') { G.curlT = t; Sound.hop(); }
  else if (h.kind === 'rock') { G.rock.open = !G.rock.open; G.rock.t0 = t; Sound.plunk(); Sound.fwip(); if (G.rock.open) G.curlT = t; }
  else if (h.kind === 'flower') {
    if (!G.bloom[h.i]) { G.bloom[h.i] = t; Sound.pop(); Sound.tap(h.i + 3); if (G.bloom.every(Boolean) && !G.bee) G.bee = { t0: t + .8 }; }
    else { G.wig[h.i] = t; Sound.tap(h.i + 5); }
  } else if (h.kind === 'tree') {
    const tr = L.trees[h.i]; G.shake[h.i] = t; G.taps[h.i] = (G.taps[h.i] || 0) + 1; Sound.fwip(); Sound.tap(1);
    if (!RM) for (let k = 0; k < 2; k++) G.leaves.push({ x: tr.x + rand(-26, 26) * tr.s, y: tr.cy + rand(-14, 10), gy: tr.y + rand(36, 50) * tr.s, t0: t, rot: rand(0, 360), dir: Math.sign(rand(-1, 1)) || 1, color: seasonTree(tr.x).fill });
    if (G.taps[h.i] % 3 === 0) { G.birds.push({ x: tr.x, y: tr.cy - 20, t0: t, dir: tr.x > L.w / 2 ? 1 : -1 }); Sound.chirp(.1); }
  } else if (h.kind === 'water') { G.ripples.push({ x, y, t0: t }); Sound.drip(); }
  else if (h.kind === 'trail') strollTo(h.i);
  return true;
}
// tapping little Pip (his own button, so it works over a building's link and with the keyboard)
function pokePip() { Sound.ensure(); Grounds.pokeT = Loop.t; Sound.babble(3); say(pipFact(), { lock: false }); }
// the button follows him around the map
function placePipBtn(x, y) {
  const L = Home.L, b = $('#pipBtn'), w = 70, h = 76, st = { left: (x - w / 2) / L.w * 100 + '%', top: (y - h * .55) / L.h * 100 + '%', width: w / L.w * 100 + '%', height: h / L.h * 100 + '%' };
  for (const k in st) if (b.style[k] !== st[k]) b.style[k] = st[k];
}
// Pip shares a fact from an activity you've played, a different one each time until they've all been said
function pipFact() {
  const pool = TOPICS.flatMap(tp => tp.activities).filter(a => a.facts && a.stars.some(s => Store.data.stars[s.id])).flatMap(a => a.facts);
  if (!pool.length) return PIP_TICKLE;
  let fresh = pool.filter(f => !Grounds.seen.has(f)); if (!fresh.length) { Grounds.seen.clear(); fresh = pool; }
  const f = fresh[Math.floor(Math.random() * fresh.length)]; Grounds.seen.add(f); return f;
}
// where little Pip is along the trail right now (a sample index), walking or standing
function pipIdxNow(t = Loop.t) { const w = Home.walk; return w ? lerp(w.from, w.to, ease(clamp((t - w.t0) / w.dur, 0, 1))) : Home.pipIdx; }
function strollTo(i) {
  const from = pipIdxNow(); Sound.hop();
  if (RM) { Home.walk = null; Home.pipIdx = i; return; }
  Home.walk = { from, to: i, t0: Loop.t, dur: clamp(.3 + Math.abs(i - from) / 70, .3, 1.3), href: null };
}

// --- drawing: under the trail (pond, bed, rock), the trees' shake, and things in the air on top ---
function drawGroundsUnder(c, t) {
  const L = Home.L, G = Grounds, P = L.pond; if (!P) return;
  // the pond, with reeds and lily pads
  c.save(); c.lineWidth = 4; c.strokeStyle = C.ink;
  c.fillStyle = 'rgba(36,54,40,.12)'; c.beginPath(); c.ellipse(P.x, P.y + 10, P.rx + 6, P.ry + 4, 0, 0, TAU); c.fill();
  c.fillStyle = '#7FCBE6'; c.beginPath(); c.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(P.x - P.rx * .3, P.y - P.ry * .45, P.rx * .3, 8, -.1, 0, TAU); c.fill();
  for (const [u, h] of [[.82, 70], [.9, 54], [.74, 46]]) {
    const rx = P.x + u * P.rx, ry = P.y - P.ry * .2, sw = RM ? 0 : Math.sin(t * 1.4 + u * 9) * 3;
    c.strokeStyle = C.leafDeep; c.lineWidth = 4; c.beginPath(); c.moveTo(rx, ry); c.quadraticCurveTo(rx + sw / 2, ry - h / 2, rx + sw, ry - h); c.stroke();
    const tip = ellipse(rx + sw, ry - h + 10, 6, 13); c.fillStyle = '#8A5E33'; c.fill(tip); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke(tip);
  }
  G.ripples = G.ripples.filter(r => t - r.t0 < 1.4);
  for (const r of G.ripples) { const e = (t - r.t0) / 1.4; if (RM) continue; c.strokeStyle = `rgba(255,255,255,${.8 * (1 - e)})`; c.lineWidth = 3; for (const k of [1, .6]) { c.beginPath(); c.ellipse(r.x, r.y, 46 * e * k, 18 * e * k, 0, 0, TAU); c.stroke(); } }
  for (const p of L.pads) {
    c.fillStyle = C.leaf; c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x, p.y); c.ellipse(p.x, p.y, 30, 14, 0, -1.2, TAU - 1.6); c.closePath(); c.fill(); c.stroke();
  }
  // the frog: sitting on a lily pad, or hopping to the next one (a ripple where it lands)
  const f = frogAt(t), F = G.frog; if (f.e >= 1 && !F.landed) { F.landed = true; G.ripples.push({ x: f.x, y: f.y + 10, t0: t }); }
  drawFrog(c, f.x, f.y, t, t - F.t0 < .9);
  // the flower bed
  const B = L.bed, soil = rrect(B.x - B.w / 2, B.y - 14, B.w, 34, 14);
  c.fillStyle = '#8A5A3A'; c.fill(soil); c.strokeStyle = C.ink; c.lineWidth = 4; c.stroke(soil);
  c.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(B.x - B.w / 2 + 22 + i * (B.w - 44) / 8, B.y + 4 + (i % 2) * 6, 4, 0, TAU); c.fill(); }
  L.flowers.forEach((p, i) => {
    const k = G.bloom[i] ? (RM ? 1 : easeOut(clamp((t - G.bloom[i]) / .45, 0, 1))) : 0, wig = !RM && t - G.wig[i] < .6 ? Math.sin((t - G.wig[i]) * 30) * 6 * (1 - (t - G.wig[i]) / .6) : 0;
    const sw = (RM ? 0 : Math.sin(t * 1.3 + i) * 2) + wig, hx = p.x + sw;
    c.strokeStyle = C.leafDeep; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x, B.y - 8); c.quadraticCurveTo(p.x, B.y - 40, hx, p.y); c.stroke();
    c.strokeStyle = C.stem; c.lineWidth = 3.5; c.stroke();
    drawLeaf(c, p.x, B.y - 26, -150, .2); drawLeaf(c, p.x, B.y - 34, -30, .2);
    if (k > 0) {
      c.save(); c.translate(hx, p.y); c.rotate(RM ? 0 : t * .3 + i); c.fillStyle = BED_COLORS[i]; c.strokeStyle = C.ink; c.lineWidth = 2.5;
      for (let j = 0; j < 5; j++) { c.rotate(TAU / 5); const pe = ellipse(0, -13 * k, 8 * k, 12 * k); c.fill(pe); c.stroke(pe); }
      c.restore(); c.fillStyle = BED_COLORS[i] === C.sun ? C.carrot : C.sun; c.strokeStyle = C.ink; c.lineWidth = 2.5; c.beginPath(); c.arc(hx, p.y, 8 * k, 0, TAU); c.fill(); c.stroke();
    }
    if (k < 1) { // the bud, opening
      const bud = ellipse(hx, p.y + 2, 9 * (1 - k), 14 * (1 - k)); c.fillStyle = C.leaf; c.fill(bud); c.strokeStyle = C.ink; c.lineWidth = 2.5; if (k < .9) c.stroke(bud);
      c.fillStyle = BED_COLORS[i]; c.beginPath(); c.arc(hx, p.y - 10 * (1 - k), 4 * (1 - k), 0, TAU); c.fill();
    }
  });
  // the rock, and the damp spot under it where a pill bug lives
  const R = rockAt(t), bx = L.rock.x, by = L.rock.y + 4;
  c.fillStyle = '#6B4A2E'; c.beginPath(); c.ellipse(bx, by, 44, 20, 0, 0, TAU); c.fill();
  if (R.o > .2) drawPillBug(c, bx, by, t);
  c.save(); c.translate(R.x, R.y); c.rotate(R.rot);
  c.fillStyle = 'rgba(36,54,40,.15)'; c.beginPath(); c.ellipse(0, 22, 44, 8, 0, 0, TAU); c.fill();
  const rock = new Path2D('M-44 18 C-50 -6 -30 -30 -4 -30 C20 -32 46 -18 46 6 C48 22 30 26 0 26 C-20 26 -40 26 -44 18 Z');
  c.fillStyle = '#A8A8A0'; c.fill(rock); c.strokeStyle = C.ink; c.lineWidth = 4; c.stroke(rock);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-14, -16, 14, 6, -.3, 0, TAU); c.fill();
  c.fillStyle = 'rgba(36,54,40,.18)'; for (const [sx, sy] of [[12, -4], [24, 8], [-6, 10]]) { c.beginPath(); c.arc(sx, sy, 3, 0, TAU); c.fill(); }
  c.restore();
  c.restore();
}
function drawFrog(c, x, y, t, croaking) {
  const blink = !RM && (t % 4) < .12;
  c.save(); c.translate(x, y); c.strokeStyle = C.ink; c.lineWidth = 3;
  if (croaking && !RM) { const k = .6 + .4 * Math.abs(Math.sin(t * 12)); c.fillStyle = '#F4F0C8'; c.beginPath(); c.ellipse(0, 6, 12 * k, 9 * k, 0, 0, TAU); c.fill(); c.stroke(); }
  const body = ellipse(0, 0, 22, 15); c.fillStyle = '#5DBB4C'; c.fill(body); c.stroke(body);
  for (const ex of [-10, 10]) {
    c.fillStyle = '#5DBB4C'; c.beginPath(); c.arc(ex, -13, 8, 0, TAU); c.fill(); c.stroke();
    if (blink) { c.beginPath(); c.moveTo(ex - 4, -13); c.lineTo(ex + 4, -13); c.stroke(); }
    else { c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, -13, 5, 0, TAU); c.fill(); c.fillStyle = C.ink; c.beginPath(); c.arc(ex + 1, -13, 2.6, 0, TAU); c.fill(); }
  }
  c.lineWidth = 2.5; c.beginPath(); c.arc(0, -2, 9, .3, PI - .3); c.stroke();
  c.fillStyle = C.petal; c.globalAlpha = .5; for (const cx of [-14, 14]) { c.beginPath(); c.arc(cx, 0, 3.5, 0, TAU); c.fill(); }
  c.restore();
}
// a pill bug rolls into a ball when it's bothered, then uncurls and wanders
function drawPillBug(c, x, y, t) {
  const curled = t - Grounds.curlT < 1.6, wx = curled || RM ? 0 : Math.sin(t * .7) * 14;
  c.save(); c.translate(x + wx, y); c.scale(1.4, 1.4); c.strokeStyle = C.ink; c.lineWidth = 2.5;
  if (curled) {
    c.fillStyle = '#7C8590'; c.beginPath(); c.arc(0, -2, 12, 0, TAU); c.fill(); c.stroke();
    c.lineWidth = 1.5; for (const a of [-.6, 0, .6]) { c.beginPath(); c.arc(0, -2, 12, -PI / 2 + a - .5, -PI / 2 + a + .5); c.stroke(); c.beginPath(); c.moveTo(Math.sin(a) * 12, -2 - Math.cos(a) * 12); c.lineTo(Math.sin(a) * 4, -2); c.stroke(); }
  } else {
    if (Math.cos(t * .7) < 0 && !RM) c.scale(-1, 1);
    const legs = RM ? 0 : Math.sin(t * 16) * 2; c.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 5, 4); c.lineTo(i * 5 + legs * (i % 2 ? 1 : -1), 9); c.stroke(); }
    const body = ellipse(0, 0, 16, 8); c.fillStyle = '#7C8590'; c.fill(body); c.lineWidth = 2.5; c.stroke(body);
    c.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 5, -7); c.lineTo(i * 5, 6); c.stroke(); }
    c.beginPath(); c.moveTo(15, -3); c.quadraticCurveTo(22, -10, 25, -7); c.moveTo(15, -1); c.quadraticCurveTo(23, -4, 26, 0); c.stroke();
  }
  c.restore();
}
function treeShake(i, t) { const t0 = Grounds.shake[i]; if (RM || t0 == null || t - t0 > .8) return 0; const e = t - t0; return Math.sin(e * 40) * 7 * (1 - e / .8); }
function drawGroundsAbove(c, t) {
  const G = Grounds, L = Home.L;
  // falling leaves: they flutter down, rest on the grass, then fade
  G.leaves = G.leaves.filter(l => t - l.t0 < 3);
  for (const l of G.leaves) {
    const e = t - l.t0, f = clamp(e / 1.6, 0, 1), x = l.x + Math.sin(e * 5) * 12 * (1 - f) + l.dir * f * 18, y = lerp(l.y, l.gy, f);
    c.save(); c.globalAlpha = clamp(3 - e, 0, 1); drawLeaf(c, x, y, l.rot + Math.sin(e * 6) * 40 * (1 - f), .16, l.color || C.leaf); c.restore();
  }
  // birds fly up and away
  G.birds = G.birds.filter(b => t - b.t0 < 2.2);
  for (const b of G.birds) { const e = t - b.t0; drawBird(c, b.x + b.dir * e * 240, b.y - e * 150 - Math.sin(e * 6) * 10, t, b.dir); }
  // the bee visits each flower once they've all bloomed, then flies off
  if (G.bee && L.flowers) {
    const e = t - G.bee.t0, F = L.flowers, hop = 1.3, n = F.length, end = (n + 1) * hop;
    if (e > end) { G.bee = null; Sound.buzz(false); }
    else if (e > 0) {
      if (!Sound.buzzNode) Sound.buzz(true);
      const pts = [{ x: L.w + 40, y: F[0].y - 80 }, ...F.map(p => ({ x: p.x + 14, y: p.y - 26 })), { x: L.w + 60, y: F[0].y - 200 }];
      const k = Math.min(n, Math.floor(e / hop)), u = clamp((e - k * hop) / (hop * .55), 0, 1), a = pts[k], b2 = pts[k + 1];
      const x = RM ? F[2].x + 14 : lerp(a.x, b2.x, ease(u)), y = (RM ? F[2].y - 26 : lerp(a.y, b2.y, ease(u))) + (RM ? 0 : Math.sin(t * 9) * 4);
      bee(c, x, y, t, .7, { pollen: k > 1, flip: b2.x < a.x });
    }
  }
}
function drawBird(c, x, y, t, dir) {
  const flap = RM ? 0 : Math.sin(t * 22) * 10;
  c.save(); c.translate(x, y); c.scale(dir, 1); c.strokeStyle = C.ink; c.lineWidth = 2.5;
  c.fillStyle = '#5BB8E8'; c.beginPath(); c.moveTo(-4, -2); c.lineTo(-16, -12 - flap); c.lineTo(4, -6); c.closePath(); c.fill(); c.stroke();
  const body = ellipse(0, 0, 12, 9); c.fill(body); c.stroke(body);
  c.fillStyle = C.carrot; c.beginPath(); c.moveTo(11, -2); c.lineTo(18, 0); c.lineTo(11, 3); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = C.ink; c.beginPath(); c.arc(5, -3, 1.8, 0, TAU); c.fill();
  c.restore();
}
