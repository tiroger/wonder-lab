/* ============ Home: a living sky over the campus (docs/design.md, section 16) ============ */
// The map follows the real clock and calendar: morning light, a sunset glow, fireflies at night, and trees that change
// with the seasons. Clouds drift over with their shadows; tap one and it rains (snows in winter), leaving puddles to
// splash, and a rainbow comes out after a daytime shower. Now and then a cloud rains on its own.
const Sky = { fake: null, clouds: [], puddles: [], rainbowT: -99, splashT: -99, autoT: null, lastLeaf: 0 };
Sky.now = () => Sky.fake || new Date();
// 0 by day, 1 at night, easing through dusk and dawn
Sky.night = () => { const d = Sky.now(), h = d.getHours() + d.getMinutes() / 60; return h >= 21 || h < 5.5 ? 1 : h >= 19 ? (h - 19) / 2 : h < 7 ? (7 - h) / 1.5 : 0; };
const glowAround = (h, at, w) => clamp(1 - Math.abs(h - at) / w, 0, 1);
Sky.season = () => ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][Sky.now().getMonth()];
const AUTUMN = ['#E8933A', '#D9574A', '#E8B84A', '#C9702E'];

function skyLayout(L) {
  const wide = L.cols !== 1, r = seeded(11);
  Sky.clouds = (wide ? [[150, 80], [900, 40], [1300, L.h * .68]] : [[80, 60], [380, L.h * .45], [200, L.h * .8]]).map(([x, y]) => ({ x, y, s: wide ? 1.3 : 1.1, v: 6 + r() * 5, rainT: -99, snow: false }));
  Sky.puddles = []; Sky.fireflies = Array.from({ length: wide ? 16 : 10 }, () => ({ x: r() * L.w, y: L.h * (.35 + r() * .6), p: r() * TAU }));
}
const cloudX = (k, t) => { const span = Home.L.w + 260; return ((k.x + (RM ? 0 : t * k.v)) % span + span) % span - 130; };
const raining = (k, t) => t - k.rainT < 5;
function cloudAt(x, y, t = Loop.t) { return Sky.clouds.find(k => { const cx = cloudX(k, t) + 30 * k.s; return Math.abs(x - cx) < 66 * k.s && Math.abs(y - k.y + 4 * k.s) < 40 * k.s; }); }
function makeRain(k, t) { k.rainT = t; k.snow = Sky.season() === 'winter'; if (!k.snow) Sound.rain(); else Sound.sparkle(); }
// taps on the sky come first (clouds float over everything); puddles and fireflies come last
function skyTap(x, y, low) {
  const t = Loop.t;
  if (!low) { const k = cloudAt(x, y); if (!k) return false; if (!raining(k, t)) makeRain(k, t); else Sound.drip(); return true; }
  const p = Sky.puddles.find(q => ((x - q.x) / q.r) ** 2 + ((y - q.y) / (q.r * .45)) ** 2 < 1.4);
  if (p) { p.splashT = t; Sky.splashT = t; Sound.splash(); return true; }
  return false;
}
// what the clock says, and what the weather is doing; called once a frame
function skyStep(t) {
  for (const k of Sky.clouds) {
    if (!raining(k, t) && k.rainT > 0 && !k.done && !k.snow) {   // a shower just ended: puddles where it fell, and a rainbow by day
      k.done = true; const cx = cloudX(k, t) + 30 * k.s;
      const spots = []; for (let x = 40; x < Home.L.w; x += 30) for (let y = 40; y < Home.L.h; y += 30) spots.push({ x, y, d: dist(x, y, cx, k.y + 200) });
      spots.sort((a, b) => a.d - b.d); let n = 0;   // the two nearest patches of open lawn
      for (const q of spots) { if (n === 2 || q.d > 600) break; if (openGrass(q.x, q.y, 45)) { Sky.puddles.push({ x: q.x, y: q.y, r: rand(28, 38), t0: t, splashT: -99 }); n++; } }
      if (Sky.night() < .5) Sky.rainbowT = t;
    }
    if (raining(k, t)) k.done = false;
  }
  Sky.puddles = Sky.puddles.filter(p => t - p.t0 < 45);
  // now and then a cloud rains by itself, once a visit at most
  if (Sky.autoT != null && t > Sky.autoT) { Sky.autoT = null; const k = Sky.clouds[0]; if (k && !raining(k, t)) makeRain(k, t); }
  // autumn: a leaf drifts down from a tree every few seconds
  if (!RM && Sky.season() === 'autumn' && t - Sky.lastLeaf > 3.5 && Home.L.trees.length) {
    Sky.lastLeaf = t; const tr = Home.L.trees[Math.floor(Math.random() * Home.L.trees.length)];
    Grounds.leaves.push({ x: tr.x + rand(-26, 26) * tr.s, y: tr.cy, gy: tr.y + rand(36, 50) * tr.s, t0: t, rot: rand(0, 360), dir: 1, color: AUTUMN[Math.floor(Math.random() * 4)] });
  }
}
// a spot of plain lawn: not on a building, the trail, the pond, the bed, a piece or another puddle
function openGrass(x, y, r) {
  const L = Home.L; if (x < r || x > L.w - r || y < r || y > L.h - r || (x < 160 && y > L.h - 160)) return false;   // the bottom-left corner stays plain grass
  if (L.lots.some(p => Math.abs(x - p.x) < 150 * L.scale + r && y > p.y - 190 * L.scale - r && y < p.y + 140 + r)) return false;
  if (nearTrail(x, y) >= 0 || dist(x, y, L.gate.x, L.gate.y) < 120) return false;
  if (L.pond && (((x - L.pond.x) / (L.pond.rx + r)) ** 2 + ((y - L.pond.y) / (L.pond.ry + r)) ** 2 < 1)) return false;
  if (L.bed && Math.abs(x - L.bed.x) < L.bed.w / 2 + r && Math.abs(y - L.bed.y + 40) < 70 + r) return false;
  if (L.rock && dist(x, y, L.rock.x + 40, L.rock.y) < 110 + r) return false;
  if ([...(L.garden || []), ...(L.landmarks || [])].some(g => Math.abs(x - g.x) < 70 + r && y > g.y - 160 && y < g.y + 30 + r)) return false;
  if (L.trees.some(tr => dist(x, y, tr.x, tr.y) < 60 + r)) return false;
  if (Sky.clouds.some(k => Math.abs(y - k.y) < 80 * k.s + r)) return false;   // clouds drift along their row: keep puddles out from under them
  return !Sky.puddles.some(q => dist(x, y, q.x, q.y) < q.r + r + 10);
}
// the tree's canopy color and decoration for the season
function seasonTree(x) {
  const s = Sky.season(); if (s === 'autumn') return { fill: AUTUMN[Math.abs(Math.round(x / 97)) % 4] };
  if (s === 'spring') return { fill: C.leaf, blossom: true }; if (s === 'winter') return { fill: '#3E8A4F', snow: true }; return { fill: C.leaf };
}
// on the lawn, under everything: the rainbow after a shower, and puddles
function drawSkyGround(c, t) {
  const L = Home.L, rb = t - Sky.rainbowT;
  if (rb < 14) {
    const a = Math.min(1, rb / 1.5, (14 - rb) / 2) * .5, wide = L.cols !== 1, cx = L.w * .5, cy = (L.pond ? L.pond.y : L.h) + (wide ? 200 : 140), R = wide ? 520 : 250, lw = wide ? 18 : 12;
    c.save(); c.globalAlpha = a; c.lineWidth = lw;
    ['#E04B4B', '#F2994A', '#F2D04A', '#5DBB4C', '#5BB8E8', '#9B7FE0'].forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(cx, cy, R - i * lw, PI, TAU); c.stroke(); });
    c.restore();
  }
  for (const p of Sky.puddles) {
    const a = clamp((45 - (t - p.t0)) / 6, 0, 1); c.save(); c.globalAlpha = a;
    c.fillStyle = '#9FD3E8'; c.strokeStyle = 'rgba(36,54,40,.5)'; c.lineWidth = 3; c.beginPath(); c.ellipse(p.x, p.y, p.r, p.r * .42, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(p.x - p.r * .3, p.y - p.r * .12, p.r * .3, 4, 0, 0, TAU); c.fill();
    const e = t - p.splashT; if (e < .6 && !RM) { c.fillStyle = '#9FD3E8'; c.strokeStyle = C.ink; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const a2 = -PI * (i + .5) / 6, d = e * 90; c.beginPath(); c.arc(p.x + Math.cos(a2) * d, p.y + Math.sin(a2) * d * .8 + e * e * 120, 4 * (1 - e), 0, TAU); c.fill(); c.stroke(); } }
    c.restore();
  }
}
// over the buildings, under little Pip: the light of the hour, cloud shadows and fireflies
function drawSkyLight(c, t) {
  const L = Home.L, d = Sky.now(), h = d.getHours() + d.getMinutes() / 60, n = Sky.night(), sunset = glowAround(h, 19, 1.8), dawn = glowAround(h, 6.5, 1.3);
  for (const k of Sky.clouds) { c.fillStyle = 'rgba(36,54,40,.08)'; c.beginPath(); c.ellipse(cloudX(k, t) + 40 * k.s, k.y + 120, 70 * k.s, 22 * k.s, 0, 0, TAU); c.fill(); }
  if (dawn) { c.fillStyle = `rgba(255,190,150,${.16 * dawn})`; c.fillRect(0, 0, L.w, L.h); }
  if (sunset) { c.fillStyle = `rgba(255,140,60,${.2 * sunset})`; c.fillRect(0, 0, L.w, L.h); }
  if (n) { c.fillStyle = `rgba(18,28,72,${.42 * n})`; c.fillRect(0, 0, L.w, L.h); }
  if (n > .4) for (const f of Sky.fireflies) {
    const x = f.x + (RM ? 0 : Math.sin(t * .5 + f.p) * 30), y = f.y + (RM ? 0 : Math.cos(t * .4 + f.p * 2) * 18), on = RM ? 1 : .5 + .5 * Math.sin(t * 2.4 + f.p * 3);
    if (on < .15) continue; const g = c.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, `rgba(255,246,150,${on * n})`); g.addColorStop(1, 'rgba(255,246,150,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 16, 0, TAU); c.fill(); c.fillStyle = `rgba(255,255,220,${on})`; c.beginPath(); c.arc(x, y, 2.5, 0, TAU); c.fill();
  }
}
// on top of everything: the rainbow, the rain or snow, and the clouds
function drawSkyAbove(c, t) {
  const n = Sky.night();
  for (const k of Sky.clouds) {
    const x = cloudX(k, t), rain = raining(k, t), e = t - k.rainT;
    if (rain && !RM) {
      if (k.snow) { c.fillStyle = '#fff'; c.strokeStyle = 'rgba(36,54,40,.35)'; c.lineWidth = 1; for (let i = 0; i < 26; i++) { const u = ((e * .35 + i / 26) % 1), sx = x + 30 * k.s + ((i * 37) % 120 - 60) * k.s + Math.sin(e * 2 + i) * 8, sy = k.y + 20 + u * 200; c.beginPath(); c.arc(sx, sy, 3.5, 0, TAU); c.fill(); c.stroke(); } }
      else { c.strokeStyle = 'rgba(91,150,220,.75)'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 30; i++) { const u = ((e * 1.6 + i / 30) % 1), sx = x + 30 * k.s + ((i * 41) % 120 - 60) * k.s - u * 10, sy = k.y + 20 + u * 190; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 3, sy + 14); c.stroke(); } }
    }
    // a rain cloud turns grey, and clouds dim at night
    c.save(); cloud(c, x, k.y, k.s, .92);
    if (rain || n) { c.globalAlpha = rain ? .45 + .2 * n : .45 * n; c.translate(x, k.y); c.scale(k.s, k.s); c.fillStyle = rain ? '#7F8C99' : '#2A3560'; c.beginPath(); for (const [cx, cy, r] of [[0, 0, 24], [28, -14, 31], [60, -4, 25], [32, 8, 24], [8, 8, 18]]) { c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, TAU); } c.fill(); }
    c.restore();
  }
}
