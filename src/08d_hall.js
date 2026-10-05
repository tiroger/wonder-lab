/* ============ The Trophy Hall (docs/design.md, section 16) ============ */
// A building at the end of the campus trail, and a room with one display case per topic: its badges on shelves
// behind glass and its big trophy on top. Tapping a badge, Pip says how you earned it, or how to earn it.
const HALL_HELLO = 'Welcome to the <b>Trophy Hall</b>! Tap any badge to hear about it.';
const hallBadges = tp => [...tp.activities.map(a => ({ ...a.badge, icon: a.icon })), { ...tp.master, trophy: true }];
// every badge in the hall: each topic's, then the campus ones (the Explorer badge, src/08h_critters.js)
const hallAll = () => [...TOPICS.flatMap(hallBadges), ...CAMPUS_BADGES];
// a badge earned since the last visit to the hall makes the building sparkle on the map
function hallNew() { const seen = Store.data.hallSeen || {}; return hallAll().some(b => Store.data.badges[b.id] && !seen[b.id]); }

// the building: columns, steps, a gold trophy on the roof (base center at 0,0; about 220x180)
function drawTrophyHall(c, t) {
  c.save(); c.translate(-110, -165); c.lineJoin = 'round'; c.strokeStyle = C.ink;
  c.fillStyle = 'rgba(36,54,40,.18)'; c.beginPath(); c.ellipse(110, 168, 96, 8, 0, 0, TAU); c.fill();
  const cup = new Path2D('M98 30 L122 30 Q122 48 110 50 Q98 48 98 30 Z'); c.fillStyle = C.sun; c.fill(cup); c.lineWidth = 3; c.stroke(cup);
  c.fillRect(104, 50, 12, 6); c.strokeRect(104, 50, 12, 6);
  const roof = new Path2D('M30 92 L110 56 L190 92 Z'); c.fillStyle = '#FFF4D6'; c.fill(roof); c.lineWidth = 4; c.stroke(roof);
  const star = new Path2D('M110 70 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z'); c.fillStyle = C.sun; c.fill(star); c.lineWidth = 2; c.stroke(star);
  c.fillStyle = '#FFFDF5'; c.lineWidth = 4; c.fillRect(36, 92, 148, 12); c.strokeRect(36, 92, 148, 12);
  c.lineWidth = 3.5; for (const x of [46, 78, 126, 158]) { c.fillRect(x, 104, 16, 46); c.strokeRect(x, 104, 16, 46); }
  const door = new Path2D('M98 150 V122 A12 12 0 0 1 122 122 V150 Z'); c.fillStyle = '#B4500F'; c.fill(door); c.stroke(door);
  c.fillStyle = '#E6DCC4'; for (const [x, y, w] of [[28, 150, 164], [20, 160, 180]]) { c.fillRect(x, y, w, 10); c.strokeRect(x, y, w, 10); }
  if (hallNew()) for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + (RM ? 0 : t * .8); sparkle(c, 110 + Math.cos(a) * 46, 40 + Math.sin(a) * 26, 6 + (RM ? 2 : Math.abs(Math.sin(t * 4 + i)) * 4)); }
  c.restore();
}
// pennants strung across the top of the room
function drawGarland(cv) {
  const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const sag = x => 8 + Math.sin(x / w * PI * 2 % PI) * 22;
  c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= w; x += 8) x ? c.lineTo(x, sag(x)) : c.moveTo(0, sag(0)); c.stroke();
  const cols = [C.petal, C.sun, C.sky, C.leafLight, C.carrot, '#C9CEF5'];
  for (let x = 30, i = 0; x < w - 20; x += 58, i++) {
    const y = sag(x), y2 = sag(x + 26); c.fillStyle = cols[i % cols.length]; c.lineWidth = 2.5; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 26, y2); c.lineTo(x + 12, (y + y2) / 2 + 30); c.closePath(); c.fill(); c.stroke();
  }
}
// a pedestal under a cloth, for topics still to come
function drawClothPedestal(cv) {
  const c = cv.getContext('2d'); cv.width = 340; cv.height = 300; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 170, 150);
  c.strokeStyle = C.ink; c.lineJoin = 'round';
  const cloth = new Path2D('M30 112 Q26 52 85 26 Q144 52 140 112 Q120 104 108 114 Q96 104 85 114 Q74 104 62 114 Q50 104 30 112 Z');
  c.fillStyle = '#E7D7F3'; c.fill(cloth); c.lineWidth = 3.5; c.stroke(cloth);
  c.globalAlpha = .35; c.lineWidth = 2; c.beginPath(); c.moveTo(85, 26); c.quadraticCurveTo(84, 60, 74, 104); c.moveTo(85, 26); c.quadraticCurveTo(96, 64, 108, 112); c.stroke(); c.globalAlpha = 1;
  c.fillStyle = '#FFFDF5'; c.beginPath(); c.arc(85, 70, 15, 0, TAU); c.fill(); c.lineWidth = 2.5; c.stroke();
  label(c, '?', 85, 71, { size: 22, weight: 700, stroke: null });
  c.fillStyle = '#C9955A'; c.lineWidth = 4; c.fillRect(22, 112, 126, 28); c.strokeRect(22, 112, 126, 28);
}

function renderHall() {
  const B = Store.data.badges, seen = Store.data.hallSeen || {}, cases = $('#cases'); cases.innerHTML = '';
  const btn = (b, tp, trophy) => {
    const got = !!B[b.id], el = document.createElement('button'); el.type = 'button';
    el.className = 'hb' + (trophy ? ' trophy' : '') + (got ? '' : ' locked') + (got && !seen[b.id] ? ' fresh' : '');
    el.dataset.id = b.id; el.setAttribute('aria-label', `${b.name}: ${got ? 'earned' : 'not earned yet'}`);
    el.innerHTML = `<span class="disc">${got || trophy ? '<canvas width="120" height="120" aria-hidden="true"></canvas>' : '?'}</span>${trophy ? '' : `<b>${b.name}</b>`}`;
    el.onclick = () => hallTap(el, b, tp);
    return el;
  };
  for (const tp of TOPICS) {
    const list = hallBadges(tp), master = list.pop(), have = list.filter(b => B[b.id]).length;
    const box = document.createElement('div'); box.className = 'case';
    const ped = document.createElement('div'); ped.className = 'pedestal'; ped.appendChild(btn(master, tp, true));
    const plaque = document.createElement('div'); plaque.className = 'plaque'; plaque.textContent = `${master.name} · ${have} of ${list.length}`; ped.appendChild(plaque);
    const body = document.createElement('div'); body.className = 'case-body';
    body.innerHTML = `<h2 class="nameplate" style="background:${tp.accent.plate}">${tp.name}</h2>`; // white text: plate colors keep 4.5:1
    const glass = document.createElement('div'); glass.className = 'glass'; list.forEach(b => glass.appendChild(btn(b, tp, false)));
    body.appendChild(glass); box.append(ped, body); cases.appendChild(box);
  }
  // the campus case: badges for exploring the map itself
  { const box = document.createElement('div'), body = document.createElement('div'); box.className = 'case campus-case'; body.className = 'case-body';
    body.innerHTML = '<h2 class="nameplate" style="background:#4A6355">Campus</h2>'; const glass = document.createElement('div'); glass.className = 'glass';
    CAMPUS_BADGES.forEach(b => glass.appendChild(btn(b, null, false))); body.appendChild(glass); box.appendChild(body); cases.appendChild(box); }
  const soon = document.createElement('div'); soon.className = 'soon-case'; soon.innerHTML = '<canvas aria-label="A covered pedestal for a topic still to come" role="img"></canvas><span>Coming soon</span>';
  cases.appendChild(soon); drawClothPedestal(soon.querySelector('canvas'));
  cases.querySelectorAll('.hb canvas').forEach(cv => { const b = hallAll().find(x => x.id === cv.closest('.hb').dataset.id); drawIcon(cv, b.icon); });
  // totals
  const all = hallAll(), masters = TOPICS.map(t => t.master), stars = TOPICS.flatMap(t => t.activities.flatMap(a => a.stars));
  const n = (list) => list.filter(b => B[b.id]).length;
  $('#hallTotals').innerHTML = `<span>${STAR_SVG(true)}${stars.filter(s => Store.data.stars[s.id]).length} of ${stars.length} stars</span><span>${n(all.filter(b => !masters.some(m => m.id === b.id)))} of ${all.length - masters.length} badges</span><span>${n(masters)} of ${masters.length} trophies</span>`;
  drawGarland($('#garland'));
}
// tapping a badge: a sound, a hop, and Pip says how it was earned (a recorded badge line) or how to earn it
function hallTap(el, b) {
  if (inputLocked()) { const r = el.getBoundingClientRect(); return nudge(r.left + r.width / 2, r.top + 10); }
  Sound.tap(3 + (b.id.length % 5)); el.classList.remove('hop', 'fresh'); void el.offsetWidth; el.classList.add('hop');
  say(Store.data.badges[b.id] ? earnedLine(b) : b.how);
}
function showHall() {
  leaveActivity(); App.view = 'hall'; App.topic = null; App.act = null; applyAccent(null);
  const root = document.documentElement; root.classList.remove('at-home', 'in-topic', 'at-grownups', 'at-privacy'); root.classList.add('at-hall');
  $('#crumbTopic').textContent = 'Trophy Hall';
  renderHall(); refresh();
  // everything earned so far is now seen; the map stops sparkling
  Store.data.hallSeen = Object.fromEntries(hallAll().filter(b => Store.data.badges[b.id]).map(b => [b.id, 1])); Store.save();
  App.greeted = true; say(HALL_HELLO, { lock: false });
}
addEventListener('resize', () => { if (App.view === 'hall') drawGarland($('#garland')); });
