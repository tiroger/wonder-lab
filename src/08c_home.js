/* ============ Home: the Lab campus map (docs/design.md, section 16) ============ */
// Each topic is a building on a map of the Lab's grounds, joined by a trail. The map is a picture on a canvas;
// each building's link is real HTML on top of it, so keyboard and screen readers work.
const HOME_HELLO = 'Welcome to <b>Wonder Lab</b>! Tap a building to start exploring.';
const HOME_BACK = 'Where should we explore today?';
const HOME_NEXT = 'Where should we explore next?';
const HOME_SOON = 'That lab is still being built. Come back soon!';
const PIP_HELLO = "I'm <b>Pip</b>, a bean seed."; // recorded as its own piece (voice/lines.py)
const Home = { cv: null, g: null, L: null, lots: [], hover: -1, pipIdx: 0, walk: null, cols: 0 };

// buildings sit in lots along a winding trail: rows of three on a wide screen, one per row on a phone
function campusLayout(cols, count) {
  if (cols === 1) {
    const w = 600, lots = Array.from({ length: count }, (_, i) => ({ x: i % 2 ? 400 : 200, y: 330 + i * 300 }));
    const gate = { x: 300, y: 125 };
    const trees = lots.map(l => ({ x: l.x === 200 ? 480 : 120, y: l.y - 70, s: .9 }));
    return { cols, w, h: lots[count - 1].y + 140, scale: .95, lots, gate, trail: [gate, ...lots.map(l => ({ x: l.x, y: l.y + 45 }))], trees };
  }
  const w = 1600, xs = [400, 848, 1296], top = 330, row = 430, lots = [], trees = [];
  for (let i = 0; i < count; i++) { const r = Math.floor(i / 3), k = i % 3; lots.push({ x: r % 2 ? xs[2 - k] : xs[k], y: top + r * row }); }
  const gate = { x: 110, y: top + 45 }, trail = [gate, { x: 250, y: top + 15 }];
  lots.forEach((l, i) => {
    if (i && i % 3 === 0) { const side = (i / 3 - 1) % 2 ? 70 : 1530; trail.push({ x: side, y: lots[i - 1].y + 45 }, { x: side, y: l.y + 45 }); }
    trail.push({ x: l.x, y: l.y + 45 });
    // between two buildings in a row the trail rises and dips, so it winds instead of running straight (clear of the name pills)
    if (i % 3 < 2 && i + 1 < count) { trail.push({ x: (l.x + lots[i + 1].x) / 2, y: l.y + (i % 2 ? 72 : 2) }); trees.push({ x: (l.x + lots[i + 1].x) / 2, y: l.y - 190, s: 1 }); }
  });
  trees.push({ x: 120, y: top - 150, s: 1.1 }, { x: 1500, y: top - 170, s: 1 });
  return { cols, w, h: lots[count - 1].y + 150, scale: 1.3, lots, gate, trail, trees };
}
// the trail is drawn as a smooth curve through its points; walking samples the same curve
function trailSamples(P) {
  const out = [P[0]]; let cur = P[0];
  for (let i = 1; i < P.length - 1; i++) {
    const mid = { x: (P[i].x + P[i + 1].x) / 2, y: (P[i].y + P[i + 1].y) / 2 };
    for (let u = .1; u <= 1.001; u += .1) { const [x, y] = qpt([cur.x, cur.y], [P[i].x, P[i].y], [mid.x, mid.y], u); out.push({ x, y }); }
    cur = mid;
  }
  const last = P[P.length - 1]; for (let u = .25; u <= 1.001; u += .25) out.push({ x: lerp(cur.x, last.x, u), y: lerp(cur.y, last.y, u) });
  return out;
}
function trailPath(P) {
  const p = new Path2D(); p.moveTo(P[0].x, P[0].y);
  for (let i = 1; i < P.length - 1; i++) p.quadraticCurveTo(P[i].x, P[i].y, (P[i].x + P[i + 1].x) / 2, (P[i].y + P[i + 1].y) / 2);
  const last = P[P.length - 1]; p.lineTo(last.x, last.y); return p;
}

// the lots: one per topic, then "coming soon" sites, and the Trophy Hall at the end of the trail
function homeLots(cols) {
  const lots = TOPICS.map(tp => ({ tp, href: `#/${tp.id}`, draw: tp.building }));
  const soon = cols === 1 ? 1 : clamp((3 - (lots.length + 1) % 3) % 3, 1, 2);
  for (let i = 0; i < soon; i++) lots.push({ soon: true, draw: drawConstruction });
  lots.push({ hall: true, href: '#/trophies', draw: drawTrophyHall });
  return lots;
}
function topicStars(tp) { const st = Store.data.stars, all = tp.activities.flatMap(a => a.stars); return [all.filter(s => st[s.id]).length, all.length]; }

function renderHome() {
  const box = $('#campus'), cssW = box.clientWidth; if (!cssW) return;
  const cols = cssW < 600 ? 1 : 3;
  Home.lots = homeLots(cols); Home.cols = cols; const L = Home.L = campusLayout(cols, Home.lots.length); groundsLayout(L); gardenLayout(L); skyLayout(L);
  Home.samples = trailSamples(L.trail);
  Home.doors = L.lots.map(p => { let best = 0, bd = 1e9; Home.samples.forEach((s, i) => { const d = dist(s.x, s.y, p.x, p.y + 45); if (d < bd) { bd = d; best = i; } }); return best; });
  const last = lastPlace(), li = Home.lots.findIndex(l => l.tp && l.tp.id === last.topic);
  if (!Home.walk) Home.pipIdx = li >= 0 ? Home.doors[li] : 0;
  const dpr = Math.min(2, devicePixelRatio || 1);
  Home.cv.style.aspectRatio = `${L.w} / ${L.h}`; Home.cv.width = Math.round(cssW * dpr); Home.cv.height = Math.round(cssW * dpr * L.h / L.w);
  // the links, one per lot: the whole building plus its name pill
  const lotsEl = $('#lots'); lotsEl.innerHTML = '';
  Home.lots.forEach((lot, i) => {
    const p = L.lots[i], bw = 230 * L.scale, top = p.y - 180 * L.scale, bottom = p.y + (cols === 1 ? 118 : 130);
    const el = document.createElement(lot.soon ? 'button' : 'a'); el.className = 'lot' + (lot.soon ? ' soon' : lot.hall ? ' trophy-lot' : '');
    Object.assign(el.style, { left: (p.x - bw / 2) / L.w * 100 + '%', width: bw / L.w * 100 + '%', top: top / L.h * 100 + '%', height: (bottom - top) / L.h * 100 + '%' });
    if (lot.tp) {
      const [have, total] = topicStars(lot.tp); el.href = `#/${lot.tp.id}`; el.dataset.topic = lot.tp.id;
      el.innerHTML = `<span class="name">${lot.tp.name}${have || last.topic === lot.tp.id ? `${STAR_SVG(true)}<small>${have}/${total}</small>` : '<span class="new">NEW!</span>'}</span>`;
      el.onclick = e => { e.preventDefault(); enterLot(i); };
    } else if (lot.hall) {
      const n = hallAll().filter(b => Store.data.badges[b.id]).length;
      el.href = lot.href; el.dataset.hall = '1';
      el.innerHTML = `<span class="name">Trophy Hall<small>${n} badge${n === 1 ? '' : 's'}</small></span>`;
      el.onclick = e => { e.preventDefault(); enterLot(i); };
    } else {
      el.type = 'button'; el.innerHTML = '<span class="name">Coming soon</span>';
      el.onclick = () => { Sound.tap(1); Sound.hop(); Grounds.craneT = Loop.t; say(HOME_SOON, { lock: false }); };
    }
    el.onpointerenter = el.onfocus = () => { if (Home.hover !== i) Sound.tone(PENTA[(i + 2) % 10] * 2, .05, 'sine', .04); Home.hover = i; };
    el.onpointerleave = el.onblur = () => { if (Home.hover === i) Home.hover = -1; };
    lotsEl.appendChild(el);
  });
  renderKeepGoing();
}
function renderKeepGoing() {
  const el = $('#keepGoing'), l = lastPlace(), tp = TOPICS.find(t => t.id === l.topic), a = tp && tp.activities.find(x => x.id === l.activity);
  el.hidden = !a; if (!a) return;
  const n = a.stars.filter(s => Store.data.stars[s.id]).length;
  el.href = `#/${tp.id}/${a.id}`;
  el.innerHTML = `<canvas width="120" height="120" aria-hidden="true"></canvas><span class="kg-text"><span class="kicker">Keep going</span><b>${a.name}</b><small>${tp.name} · ${n} of ${a.stars.length} stars</small></span><span class="btn">Jump back in<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4l12 8-12 8z" fill="#243628"/></svg></span>`;
  drawIcon(el.querySelector('canvas'), a.icon);
  el.onclick = () => Sound.pop();
}
// tapping a building: a door sound, little Pip walks along the trail to it, then it opens
function enterLot(i) {
  if (Home.walk && Home.walk.href) return;
  const href = Home.lots[i].href; Sound.ensure(); Sound.plunk(); setTimeout(() => Sound.pop(), 120);
  const from = pipIdxNow(), to = Home.doors[i];  // a stroll along the trail turns toward the building
  if (RM || from === to) { Home.pipIdx = to; go(href); return; }
  Home.walk = { from, to, t0: Loop.t, dur: clamp(.35 + Math.abs(to - from) / 70, .5, 1.3), href };
}

function homeDraw(t) {
  const L = Home.L; if (!L || App.view !== 'home') return;
  const c = Home.g, k = Home.cv.width / L.w; c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, L.w, L.h); skyStep(t);
  // lawn
  c.fillStyle = '#CDEBAE'; c.fillRect(0, 0, L.w, L.h);
  const r = seeded(5); c.fillStyle = '#B8DF93'; for (let i = 0; i < L.w * L.h / 12000; i++) { c.beginPath(); c.arc(r() * L.w, r() * L.h, 3 + r() * 4, 0, TAU); c.fill(); }
  drawSkyGround(c, t); drawGroundsUnder(c, t);
  // trail
  const P = trailPath(L.trail); c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = C.ink; c.lineWidth = 40; c.stroke(P); c.strokeStyle = '#F1DDB0'; c.lineWidth = 32; c.stroke(P);
  c.setLineDash([14, 18]); c.strokeStyle = '#FFFDF5'; c.lineWidth = 5; c.stroke(P); c.setLineDash([]);
  L.trees.forEach((tr, i) => campusTree(c, tr.x, tr.y, tr.s, t, treeShake(i, t)));
  drawGarden(c, t); drawCritters(c, t);
  campusGate(c, L.gate.x, L.gate.y, L.cols === 1);
  // buildings
  Home.lots.forEach((lot, i) => {
    const p = L.lots[i]; c.save(); c.translate(p.x, p.y); c.scale(L.scale, L.scale);
    if (Home.hover === i) { c.translate(0, RM ? 0 : -Math.abs(Math.sin(t * 7)) * 4); glowOn(c); }
    lot.draw(c, t, lot.tp ? topicStars(lot.tp)[0] / topicStars(lot.tp)[1] : 0); c.restore();
  });
  // little Pip, walking to a building that was tapped or to a spot on the trail
  let idx = Home.pipIdx, hop = 0;
  if (Home.walk) {
    const w = Home.walk, e = clamp((t - w.t0) / w.dur, 0, 1); idx = lerp(w.from, w.to, ease(e)); hop = Math.abs(Math.sin(e * w.dur * 14)) * 10;
    if (e >= 1) { Home.pipIdx = w.to; Home.walk = null; if (w.href) go(w.href); }
  }
  drawSkyLight(c, t);
  const S = Home.samples, s0 = S[Math.floor(idx)], s1 = S[Math.min(S.length - 1, Math.ceil(idx))], f = idx % 1, sc = L.cols === 1 ? .5 : .55;
  const px = lerp(s0.x, s1.x, f), py = lerp(s0.y, s1.y, f) - 30 * sc; Home.pipAt = { x: px, y: py }; placePipBtn(px, py);
  c.save(); c.translate(px, py); c.scale(sc, sc); pipFigure(c, t, { hop, poke: t - Grounds.pokeT < .7 }); c.restore();
  drawGroundsAbove(c, t); drawSkyAbove(c, t);
}
function campusTree(c, x, y, s, t, shake = 0) {
  const look = seasonTree(x);
  const sw = (RM ? 0 : Math.sin(t * 1.2 + x) * 2) + shake;
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = C.ink; c.lineWidth = 4;
  c.fillStyle = 'rgba(36,54,40,.15)'; c.beginPath(); c.ellipse(0, 48, 34, 7, 0, 0, TAU); c.fill();
  c.fillStyle = C.soil; c.fillRect(-7, 6, 14, 42); c.strokeRect(-7, 6, 14, 42);
  c.fillStyle = look.fill; c.beginPath(); c.arc(sw, -8, 36, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(sw - 12, -22, 12, 7, -.5, 0, TAU); c.fill();
  if (look.blossom) { c.fillStyle = '#F8C8DC'; for (const [bx, by] of [[-14, -24], [12, -30], [20, -4], [-20, 2], [2, 10], [-2, -14]]) { c.beginPath(); c.arc(sw + bx, by, 4.5, 0, TAU); c.fill(); } }
  if (look.snow) { c.fillStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(sw - 33, -18); c.quadraticCurveTo(sw - 20, -50, sw, -44); c.quadraticCurveTo(sw + 22, -50, sw + 33, -18); c.quadraticCurveTo(sw + 16, -30, sw, -26); c.quadraticCurveTo(sw - 16, -30, sw - 33, -18); c.fill(); c.stroke(); c.lineWidth = 4; }
  c.fillStyle = C.petal; c.strokeStyle = C.ink; c.lineWidth = 2; for (const [fx, fy] of [[-40, 44], [44, 40]]) { c.beginPath(); c.arc(fx, fy, 6, 0, TAU); c.fill(); c.stroke(); }
  c.restore();
}
function campusGate(c, x, y, small) {
  c.save(); c.translate(x, y); if (small) c.scale(.9, .9);
  c.strokeStyle = C.ink; c.lineWidth = 4; c.fillStyle = '#C9955A';
  for (const px of [-62, 40]) { c.fillRect(px, -64, 22, 64); c.strokeRect(px, -64, 22, 64); }
  const sign = rrect(-78, -100, 156, 40, 12); c.fillStyle = '#FFFDF5'; c.fill(sign); c.stroke(sign);
  c.font = `700 22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const wW = c.measureText('Wonder ').width, wL = c.measureText('Lab').width, x0 = -(wW + wL) / 2;
  c.textAlign = 'left'; c.fillStyle = '#2A7340'; c.fillText('Wonder ', x0, -79); c.fillStyle = C.carrot; c.fillText('Lab', x0 + wW, -79);
  c.restore();
}
// the "coming soon" lot: a fence, a crane and a sign with a question mark
function drawConstruction(c, t) {
  c.save(); c.translate(-100, -150);
  c.fillStyle = 'rgba(36,54,40,.1)'; c.beginPath(); c.ellipse(100, 150, 88, 12, 0, 0, TAU); c.fill();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const crane = new Path2D('M150 150 V30 M150 32 H66'); c.strokeStyle = C.ink; c.lineWidth = 12; c.stroke(crane); c.strokeStyle = C.sun; c.lineWidth = 6; c.stroke(crane);
  const e = t - Grounds.craneT, sw = RM ? 0 : Math.sin(t * 1.5) * 4 + (e < 2.5 ? Math.sin(e * 5) * 22 * (1 - e / 2.5) : 0); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(80, 32); c.lineTo(80 + sw, 62); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.arc(80 + sw, 68, 6, -PI / 2, PI * .9); c.stroke();
  c.fillStyle = '#E6C48E'; c.lineWidth = 2.5; for (const [bx, by, bh] of [[20, 100, 50], [44, 96, 54], [68, 100, 50], [92, 96, 54], [116, 100, 50]]) { const b = rrect(bx, by, 20, bh, 3); c.fill(b); c.stroke(b); }
  const sign = rrect(36, 56, 56, 40, 6); c.fillStyle = '#FFFDF5'; c.fill(sign); c.lineWidth = 3; c.stroke(sign);
  label(c, '?', 64, 77, { size: 30, weight: 700, stroke: null });
  c.restore();
}

function homeInit() {
  Home.cv = $('#campusCanvas'); Home.g = Home.cv.getContext('2d');
  new ResizeObserver(() => { if (App.view === 'home') renderHome(); }).observe($('#campus'));
  // a tap on the grounds pokes whatever is there (src/08e_grounds.js); plain grass plays a note
  const at = e => { const r = Home.cv.getBoundingClientRect(), L = Home.L; return [(e.clientX - r.left) / r.width * L.w, (e.clientY - r.top) / r.height * L.h]; };
  Home.cv.addEventListener('pointerdown', e => { if (!Home.L) return; Sound.ensure(); const [x, y] = at(e); if (!skyTap(x, y) && !critterTap(x, y) && !gardenTap(x, y) && !groundsTap(x, y) && !skyTap(x, y, true)) Sound.tap(Math.floor(x / Home.L.w * 8)); });
  $('#pipBtn').onclick = pokePip;
  Home.cv.addEventListener('pointermove', e => { if (Home.L) Home.cv.style.cursor = cloudAt(...at(e)) || gardenHit(...at(e)) || groundsHit(...at(e)) ? 'pointer' : ''; });
  Loop.add(homeDraw);
}
// Home: Pip greets you; a first visit gets his hello, a return a welcome back. Short reactions don't hold taps.
function showHome() {
  leaveActivity(); App.view = 'home'; App.topic = null; App.act = null; applyAccent(null);
  document.documentElement.classList.add('at-home'); document.documentElement.classList.remove('in-topic', 'at-hall', 'at-grownups', 'at-privacy');
  renderHome(); renderCritters(); refresh(); Sky.autoT = Math.random() < .2 ? Loop.t + rand(6, 14) : null;   // now and then, a shower
  // something new in the Badge Garden or a new landmark: it sparkles, and Pip points it out once
  if (Home.L) {
    const grown = [...Home.L.garden, ...Home.L.landmarks].map(g => g.id), seen = Store.data.gardenSeen || {};
    Home.fresh = new Set(grown.filter(id => !seen[id])); Store.data.gardenSeen = Object.fromEntries(grown.map(id => [id, 1])); Store.save();
  }
  const news = Home.fresh && Home.fresh.size ? GARDEN_NEW : null;
  let line = news || HOME_NEXT;
  if (!App.greeted) {
    App.greeted = true; const n = explorerName(), first = !lastPlace().topic && !Object.keys(Store.data.stars).length;
    line = first ? `Hi${n ? ' ' + n : ''}! ${PIP_HELLO} ${HOME_HELLO}` : `Welcome back${n ? ', ' + n : ''}! ${news || HOME_BACK}`;
  }
  say(line, { lock: false });
}
