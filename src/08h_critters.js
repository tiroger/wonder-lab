/* ============ Home: the critter hunt (docs/design.md, section 16) ============ */
// Six critters hide in the grounds, each one shown by playing with its hiding place. Tap one while it's out to find it;
// Pip names it and shares a fact. The Critter hunt strip under the map shows what's left (tap one for a hint), and
// finding all six earns the Explorer badge, kept in the Trophy Hall's Campus case.
const CRITTERS = [
  { id: 'ladybug', name: 'Ladybug', found: 'You found a <b>ladybug</b>! Ladybugs help gardens by eating tiny bugs that hurt plants.', tip: 'Hint: ladybugs love flowers. Tap the flower buds to make them all bloom!' },
  { id: 'snail', name: 'Snail', found: 'You found a <b>snail</b>! A snail carries its shell everywhere, like a little house.', tip: 'Hint: snails like wet places. Tap the tall reeds by the pond!' },
  { id: 'pillbug', name: 'Pill bug', found: 'You found a <b>pill bug</b>! It rolls into a ball to stay safe.', tip: 'Hint: some critters hide under rocks. Try flipping the rock over!' },
  { id: 'owl', name: 'Owl', found: 'You found an <b>owl</b>! Most owls sleep in the day and hunt at night.', tip: 'Hint: an owl is napping in a tree. Give the trees a shake, or look again at night!' },
  { id: 'worm', name: 'Earthworm', found: 'You found an <b>earthworm</b>! Worms dig tunnels that help air and water get into the soil.', tip: 'Hint: worms live in the soil. Try tapping the dirt in the flower bed!' },
  { id: 'fish', name: 'Fish', found: 'You found a <b>fish</b>! Fish breathe with <b>gills</b>. Gills work like underwater lungs that pull oxygen out of the water.', tip: 'Hint: something is swimming in the pond. Tap the water a few times!' },
];
const EXPLORER = { badge: { id: 'b.explorer', name: 'Explorer', desc: 'You found every critter hiding on the map!', how: 'Not yet! Find all six critters hiding on the map. Tap one in the <b>Critter hunt</b> for a hint.' } };
const CAMPUS_BADGES = [{ ...EXPLORER.badge, icon: 'critter' }];
const Critters = { reedT: -99, wormT: -99, wormX: 0, fishT: -99, fishAt: null, water: 0 };
const critterFound = id => !!(Store.data.critters || {})[id];

// where each critter is right now, if it's out (logical map coordinates), or null
function critterSpots(t = Loop.t) {
  const L = Home.L, G = Grounds, out = {}; if (!L || !L.pond) return out;
  if (G.bloom[2] && t - G.bloom[2] > .5) { const f = L.flowers[2]; out.ladybug = { x: f.x + 7, y: f.y - 5 }; }
  const P = L.pond, reed = { x: P.x + .82 * P.rx, y: P.y - P.ry * .2 };
  if (t - Critters.reedT < 7) out.snail = { x: reed.x - 4 + Math.min(1, (t - Critters.reedT) / 1.2) * 26, y: reed.y + 6 };
  if (G.rock.open && rockAt(t).o > .9) out.pillbug = { x: L.rock.x, y: L.rock.y + 4 };
  const ti = owlTree(), tr = L.trees[ti]; if (tr && (t - (G.shake[ti] ?? -99) < 6 || Sky.night() > .5)) out.owl = { x: tr.x + 12 * tr.s, y: tr.cy - 4 * tr.s, s: tr.s };
  if (t - Critters.wormT < 7) out.worm = { x: Critters.wormX, y: L.bed.y + 2 };
  if (Critters.fishAt && t - Critters.fishT < 6) { const e = Math.min(1, (t - Critters.fishT) / 1), a = Critters.fishAt; out.fish = { x: a.x + e * 50, y: a.y - Math.sin(PI * e) * 60, jump: e < 1 }; }
  return out;
}
// the owl naps in the tree farthest down the map
const owlTree = () => { const T = Home.L.trees; let best = 0; T.forEach((tr, i) => { if (tr.y > T[best].y) best = i; }); return best; };

// taps that wake a critter, or find one; runs before the grounds' own taps
function critterTap(x, y) {
  const t = Loop.t, L = Home.L; if (!L || !L.pond) return false;
  const spots = critterSpots(t);
  for (const cr of CRITTERS) { const p = spots[cr.id]; if (p && dist(x, y, p.x, p.y) < 24) { findCritter(cr, p); return true; } }
  const P = L.pond, rx = P.x + .82 * P.rx, ry = P.y - P.ry * .2;
  if (Math.abs(x - rx) < 34 && y > ry - 80 && y < ry + 14) { Critters.reedT = t; Sound.fwip(); return true; }   // the reeds part
  const B = L.bed; if (Math.abs(x - B.x) < B.w / 2 && y > B.y - 12 && y < B.y + 22) { Critters.wormT = t; Critters.wormX = clamp(x, B.x - B.w / 2 + 20, B.x + B.w / 2 - 20); Sound.squish(); return true; }
  return false;
}
// every third splash in the pond, a fish jumps (called from the grounds' water tap)
function critterWater(x, y) { if (++Critters.water % 3 === 0) { Critters.fishT = Loop.t; Critters.fishAt = { x: x - 25, y }; setTimeout(() => Sound.splash(), 900); } }
// after a shower, a worm comes up in the flower bed
function critterRain() { const B = Home.L && Home.L.bed; if (B) { Critters.wormT = Loop.t; Critters.wormX = B.x + B.w * .3; } }
function findCritter(cr) {
  const first = !critterFound(cr.id); Sound.sparkle(); Sound.tap(6); if (cr.id === 'pillbug') Grounds.curlT = Loop.t;
  if (first) { (Store.data.critters = Store.data.critters || {})[cr.id] = Date.now(); Store.save(); renderCritters(cr.id); }
  if (first && CRITTERS.every(c => critterFound(c.id)) && !Store.data.badges[EXPLORER.badge.id]) {
    Store.data.badges[EXPLORER.badge.id] = Date.now(); Store.save(); renderHome(); say(cr.found, { lock: false }); App.toastQ.push(CAMPUS_BADGES[0]); nextToast(); return;
  }
  say(cr.found, { lock: false });
}

// the Critter hunt strip under the map
function renderCritters(fresh) {
  const box = $('#critterRow'); if (!box) return; box.innerHTML = '';
  const n = CRITTERS.filter(c => critterFound(c.id)).length; $('#critterCount').textContent = `${n} of ${CRITTERS.length}`;
  for (const cr of CRITTERS) {
    const got = critterFound(cr.id), b = document.createElement('button'); b.type = 'button'; b.className = 'critter' + (got ? ' got' : '') + (fresh === cr.id ? ' hop' : '');
    b.setAttribute('aria-label', got ? cr.name : "A critter you haven't found yet. Tap for a hint.");
    b.innerHTML = `<canvas width="120" height="120" aria-hidden="true"></canvas><span>${got ? cr.name : '?'}</span>`;
    b.onclick = () => { Sound.ensure(); Sound.tap(3 + CRITTERS.indexOf(cr)); b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop'); say(got ? cr.found : cr.tip, { lock: false }); };
    box.appendChild(b);
    const c = b.querySelector('canvas').getContext('2d'); c.setTransform(1.2, 0, 0, 1.2, 0, 0); c.translate(50, 56); drawCritter(c, cr.id, Loop.t, 1.6);
    if (!got) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = 'rgba(36,54,40,.28)'; c.fillRect(0, 0, 120, 120); c.globalCompositeOperation = 'source-over'; }
  }
}

// --- the critters, drawn around (0, 0) ---
function drawCritter(c, id, t, s = 1) {
  c.save(); c.scale(s, s); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.lineJoin = 'round'; c.lineCap = 'round';
  if (id === 'ladybug') {
    c.fillStyle = C.ink; c.beginPath(); c.arc(9, 0, 5, 0, TAU); c.fill();
    const body = ellipse(0, 0, 10, 9); c.fillStyle = '#E04B4B'; c.fill(body); c.stroke(body);
    c.beginPath(); c.moveTo(0, -9); c.lineTo(0, 9); c.stroke(); c.fillStyle = C.ink; for (const [x, y] of [[-5, -4], [4, -5], [-4, 4], [5, 3]]) { c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill(); }
  } else if (id === 'snail') {
    const body = new Path2D('M-16 6 C-16 0 12 0 18 2 L24 -6 L22 4 C20 8 -10 9 -16 6 Z'); c.fillStyle = '#C9B98F'; c.fill(body); c.stroke(body);
    c.fillStyle = '#C98A4E'; c.beginPath(); c.arc(-2, -6, 12, 0, TAU); c.fill(); c.stroke();
    c.lineWidth = 2; c.beginPath(); for (let a = 0; a < 10; a += .3) { const r = 10 - a; c.lineTo(-2 + Math.cos(a) * r, -6 + Math.sin(a) * r); } c.stroke();
    c.beginPath(); c.moveTo(20, -1); c.lineTo(22, -10); c.moveTo(22, 0); c.lineTo(27, -8); c.stroke(); c.fillStyle = C.ink; for (const [x, y] of [[22, -10], [27, -8]]) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
  } else if (id === 'pillbug') {
    c.fillStyle = '#7C8590'; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.stroke();
    c.lineWidth = 1.5; for (const a of [-.6, 0, .6]) { c.beginPath(); c.moveTo(Math.sin(a) * 11, -Math.cos(a) * 11); c.lineTo(Math.sin(a) * 4, 0); c.stroke(); }
  } else if (id === 'owl') {
    const body = ellipse(0, 4, 12, 15); c.fillStyle = '#A87445'; c.fill(body); c.stroke(body);
    c.beginPath(); c.moveTo(-11, -6); c.lineTo(-9, -15); c.lineTo(-3, -9); c.moveTo(11, -6); c.lineTo(9, -15); c.lineTo(3, -9); c.fill(); c.stroke();
    const night = Sky.night() > .5; for (const ex of [-5, 5]) { c.fillStyle = '#FFF4D6'; c.beginPath(); c.arc(ex, -2, 5, 0, TAU); c.fill(); c.stroke(); c.fillStyle = night ? C.ink : C.ink; if (night || (t % 3) > .2) { c.beginPath(); c.arc(ex, -2, 2.4, 0, TAU); c.fill(); } else { c.beginPath(); c.moveTo(ex - 3, -2); c.lineTo(ex + 3, -2); c.stroke(); } }
    c.fillStyle = C.carrot; c.beginPath(); c.moveTo(-2, 3); c.lineTo(2, 3); c.lineTo(0, 7); c.closePath(); c.fill();
  } else if (id === 'worm') {
    const w = RM ? 0 : Math.sin(t * 6) * 3; c.strokeStyle = C.ink; c.lineWidth = 9; c.beginPath(); c.moveTo(-6, 8); c.quadraticCurveTo(-8 + w, -6, 2, -14); c.stroke();
    c.strokeStyle = '#E79A9A'; c.lineWidth = 5.5; c.stroke(); c.fillStyle = C.ink; c.beginPath(); c.arc(3, -14, 1.3, 0, TAU); c.fill();
  } else if (id === 'fish') {
    const body = new Path2D('M-14 0 C-8 -10 8 -10 14 0 C8 10 -8 10 -14 0 Z'); c.fillStyle = '#F2994A'; c.fill(body); c.stroke(body);
    c.beginPath(); c.moveTo(-13, 0); c.lineTo(-22, -7); c.lineTo(-22, 7); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = C.ink; c.beginPath(); c.arc(7, -2, 1.8, 0, TAU); c.fill();
  }
  c.restore();
}
// on the map: whichever critters are out
function drawCritters(c, t) {
  const spots = critterSpots(t);
  for (const cr of CRITTERS) {
    const p = spots[cr.id]; if (!p || cr.id === 'pillbug') continue;   // the pill bug is drawn with its rock
    c.save(); c.translate(p.x, p.y);
    if (cr.id === 'fish' && p.jump) c.rotate(-.6 + (t - Critters.fishT) * 1.2);
    drawCritter(c, cr.id, t, cr.id === 'owl' ? 1.2 * (p.s || 1) : 1.3); c.restore();
  }
}
