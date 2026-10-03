/* ============ topics: add new ones here ============ */
const TOPICS = [
  { id: 'plants', name: 'Plants & Seeds', building: drawGreenhouse, activities: [A_parts, A_seed, A_flower, A_grow, A_travel, A_quiz],
    master: { id: 'b.botanist', name: 'Botanist', icon: 'trophy', desc: 'You earned every plant badge! A botanist is a scientist who studies plants.' } }
];
const App = { view: '', topic: null, act: null, inst: null, greeted: false, toastQ: [], toastOn: false, current: '', sayQ: [] };
// queued lines start only after Pip has finished and taken a breath
Loop.add(() => { if (App.sayQ.length && ready()) say(App.sayQ.shift()); });

/* ============ Pip the seed ============ */
const Pip = { talkUntil: 0, wowUntil: 0, pokeT: -9 };
function drawPip(c, t) {
  c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 108, 108);
  // eyes follow your finger on the stage
  const st = App.inst && App.inst.stage;
  const look = st && st.p.inside ? [clamp((st.p.x / W - .5) * 5, -2.5, 2.5), clamp((st.p.y / H - .2) * 3, -2, 2.5)] : null;
  c.save(); c.translate(54, 64); pipFigure(c, t, { talking: t < Pip.talkUntil, wow: t < Pip.wowUntil, poke: t - Pip.pokeT < .6, look }); c.restore();
}
// Pip at the origin (body center; feet near y 29, shadow at y 36). Used by the guide and on the campus map.
function pipFigure(c, t, { talking = false, wow = false, poke = false, look = null, hop = 0 } = {}) {
  const bob = RM ? 0 : Math.sin(t * 2.2) * 2 - (talking ? Math.abs(Math.sin(t * 10)) * 3 : 0) - (wow || poke ? Math.abs(Math.sin(t * 12)) * 6 : 0) - hop;
  c.save();
  c.fillStyle = 'rgba(36,54,40,.15)'; c.beginPath(); c.ellipse(0, 36, Math.max(10, 26 - bob), 5, 0, 0, TAU); c.fill();
  c.translate(0, bob);
  const sw = RM ? 0 : Math.sin(t * 1.7) * 6;
  c.strokeStyle = C.leafDeep; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(3, -24); c.quadraticCurveTo(1, -36, 3 + sw * .4, -44); c.stroke();
  drawLeaf(c, 3 + sw * .4, -44, -150 + sw, .22); drawLeaf(c, 3 + sw * .4, -44, -30 + sw, .24);
  c.save(); c.rotate(-.1 + (poke ? Math.sin(t * 30) * .08 : 0)); const body = kidney(70, 56); const g = c.createLinearGradient(0, -28, 0, 28); g.addColorStop(0, '#F8E6AE'); g.addColorStop(1, '#E3C27A');
  c.fillStyle = g; c.fill(body); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(body); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-16, -16, 12, 5, -.4, 0, TAU); c.fill(); c.restore();
  const lx = look ? look[0] : Math.sin(t * .7) * 1.5, ly = look ? look[1] : 0;
  const blink = (t % 3.7) < .12;
  for (const ex of [-12, 12]) {
    c.fillStyle = '#fff'; c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.ellipse(ex, -4, 8, blink ? 1 : 9, 0, 0, TAU); c.fill(); c.stroke();
    if (!blink) { c.fillStyle = C.ink; c.beginPath(); c.arc(ex + lx, -3 + ly, wow ? 5 : 4, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + lx + 1.5, -5 + ly, 1.4, 0, TAU); c.fill(); }
  }
  c.fillStyle = 'rgba(242,102,139,.45)'; for (const ex of [-22, 22]) { c.beginPath(); c.ellipse(ex, 8, 5, 3.5, 0, 0, TAU); c.fill(); }
  c.fillStyle = '#8A3A3A'; c.strokeStyle = C.ink; c.lineWidth = 2;
  if (wow) { c.beginPath(); c.ellipse(0, 13, 4.5, 5.5, 0, 0, TAU); c.fill(); c.stroke(); }
  else if (talking) { const o = 2 + Math.abs(Math.sin(t * 14)) * 4.5; c.beginPath(); c.ellipse(0, 12, 6, o, 0, 0, TAU); c.fill(); c.stroke(); }
  else { c.beginPath(); c.arc(0, 7, 7, .15 * PI, .85 * PI); c.stroke(); }
  c.fillStyle = '#D9B866'; c.strokeStyle = C.ink; for (const fx of [-11, 11]) { c.beginPath(); c.ellipse(fx, 29, 7, 4, 0, 0, TAU); c.fill(); c.stroke(); }
  c.restore();
}

/* ============ confetti + flying stars ============ */
const FX = { c: null, g: null, parts: [], dpr: 1, dirty: false };
function fxInit() {
  FX.c = $('#fx'); FX.g = FX.c.getContext('2d');
  const rs = () => { FX.dpr = Math.min(2, devicePixelRatio || 1); FX.c.width = innerWidth * FX.dpr; FX.c.height = innerHeight * FX.dpr; FX.dirty = true; }; rs(); addEventListener('resize', rs);
  Loop.add((t, dt) => {
    if (!FX.parts.length && !FX.dirty) return; const g = FX.g; g.setTransform(FX.dpr, 0, 0, FX.dpr, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight); FX.dirty = FX.parts.length > 0;
    for (const p of FX.parts) {
      p.life -= dt; p.vy += 520 * dt; p.vx *= .99; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = clamp(p.life, 0, 1); g.fillStyle = p.col;
      if (p.leaf) { g.scale(.14, .14 * Math.abs(Math.cos(p.r * 2)) + .03); g.fill(LEAF); } else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
      g.restore();
    }
    FX.parts = FX.parts.filter(p => p.life > 0 && p.y < innerHeight + 50);
  });
}
function confetti(x, y, n = 60, spread = 1) {
  if (RM) n = Math.min(n, 12);
  for (let i = 0; i < n; i++) FX.parts.push({ x, y, vx: rand(-280, 280) * spread, vy: rand(-560, -200) * Math.max(.6, spread), r: rand(0, 6), vr: rand(-8, 8), w: rand(7, 12), h: rand(5, 9), life: rand(1.3, 2.3), col: pick([C.sun, C.petal, C.leaf, C.carrot, '#8D6CD9', C.water]), leaf: Math.random() < .35 });
  FX.dirty = true;
}
function flyStar(cx, cy) {
  const pill = $('#starPill'), tr = pill.getBoundingClientRect(), tx = tr.left + 24, ty = tr.top + tr.height / 2;
  if (cx == null) { const r = $('#stage').getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
  confetti(cx, cy, 12, .45);
  const done = () => { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); Sound.pop(); };
  const el = document.createElement('div'); el.className = 'flystar'; el.innerHTML = STAR_SVG(true); document.body.appendChild(el);
  if (RM || !el.animate) { el.remove(); done(); return; }
  const mx = (cx + tx) / 2, my = Math.min(cy, ty) - 110;
  const a = el.animate([
    { transform: `translate(${cx}px,${cy}px) scale(.4) rotate(0deg)` },
    { transform: `translate(${cx}px,${cy - 50}px) scale(1.6) rotate(90deg)`, offset: .25 },
    { transform: `translate(${mx}px,${my}px) scale(1.2) rotate(220deg)`, offset: .6 },
    { transform: `translate(${tx}px,${ty}px) scale(.6) rotate(360deg)` }], { duration: 1050, easing: 'ease-in-out' });
  a.onfinish = () => { el.remove(); done(); };
}

/* ============ talking, stars, badges ============ */
// Pip is "calm" when he isn't talking, nothing is waiting for the kid to listen, and he finished at least `gap` seconds ago
function calm(gap = .9) { return !Voice.speaking && !Listen.on && Loop.t - (Voice.endT || -99) > gap && Loop.t - (App.sayT || -99) > gap; }
function readTime(html) { return Math.max(4, plainText(html || '').split(' ').length * .4); }
// ready for queued news: Pip is calm and, when he isn't reading out loud, the last line has had time to be read
function ready() { return calm(.9) && (Voice.auto && Sound.unlocked || Loop.t - (App.sayT || -99) > readTime(App.current)); }
// the explorer's name, without anything that would break the bubble or split Pip's sentences
function explorerName() { return (Store.data.name || '').replace(/[<>&"().!?…]/g, '').replace(/\s+/g, ' ').trim(); }
// say(html, opts)
//   polite: a reminder; skipped (returns false) unless Pip is calm and the last line had time to be read
//   queue:  news that waits its turn instead of cutting Pip off
//   lock:   make the kid listen before tapping again; default: any line of 8+ words that isn't polite
function say(html, { polite = false, queue = false, lock } = {}) {
  if (queue && (!ready() || App.sayQ.length)) { App.sayQ.push(html); return 'queued'; }
  if (polite && (!calm(2) || App.sayQ.length || Loop.t - (App.sayT || -99) < readTime(App.current))) return false;
  // tapping the same thing again while Pip is still saying it doesn't restart the line
  if (html === App.current && (Voice.speaking || Listen.on)) { const b = $('#bubble'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); return true; }
  App.sayT = Loop.t;
  const p = $('#say'); p.innerHTML = html; App.current = html; const b = $('#bubble'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  const words = plainText(html).split(' ').length; Pip.talkUntil = Loop.t + Math.min(3.5, .6 + words * .12);
  if (Voice.auto && Sound.unlocked) Voice.speak(html); else Sound.babble(Math.min(6, 2 + Math.floor(words / 6)));
  App.currentLocks = lock ?? (!polite && words >= 8); // hearOpening needs to know
  if (App.currentLocks) startListening(html);
  return true;
}

/* ============ Listen first: while Pip explains, the activity waits ============ */
// Taps on the activity and its buttons are held while Pip explains something, with a gentle nudge,
// and stars earned during the explanation fly in when he finishes. Parents can turn it off in Settings.
const Listen = { on: false, t0: 0, dur: 0, voice: false, pending: [], nudgeT: -9 };
function waitForPip() { return Store.data.waitForPip !== false; }
function inputLocked() { return Listen.on; }
function narrationSeconds(html) { // roughly how long the recording runs (packs are 56 kbps, about 7 kB a second)
  const P = Voice.pieces(html), map = Voice.map, bytes = P.reduce((n, p) => n + (p.key && map[p.key] ? map[p.key][1] : 0), 0);
  return bytes ? bytes / 7000 + .4 * P.length : plainText(html).split(' ').length * .38;
}
function startListening(html) {
  if (!waitForPip()) return;
  const voice = Voice.auto && Sound.unlocked, words = plainText(html).split(' ').length;
  Object.assign(Listen, { on: true, t0: Loop.t, voice, dur: voice ? narrationSeconds(html) + .6 : clamp(words * .3, 2.5, 9) });
  document.body.classList.add('listening');
}
function stopListening() {
  if (!Listen.on) return; Listen.on = false; document.body.classList.remove('listening'); $('#listenBar').style.width = '0';
  const p = Listen.pending.splice(0); p.forEach(([id, cx, cy], i) => setTimeout(() => celebrate(id, cx, cy), i * 250));
  if (!p.length) { Sound.tone(PENTA[2], .12, 'sine', .05); Sound.tone(PENTA[4], .16, 'sine', .05, .1); } // "your turn"
}
Loop.add(() => {
  if (!Listen.on) return;
  const el = Loop.t - Listen.t0;
  const done = Listen.voice ? el > .8 && !Voice.speaking && Loop.t - (Voice.endT || -99) > .35 : el > Listen.dur;
  $('#listenBar').style.width = (done ? 100 : Math.min(97, el / Listen.dur * 100)) + '%';
  if (done || el > Math.max(12, Listen.dur * 2)) stopListening();
});
function nudge(cx, cy) {
  if (Loop.t - Listen.nudgeT < .7) return; Listen.nudgeT = Loop.t;
  Pip.pokeT = Loop.t; Sound.tone(420, .12, 'sine', .05, 0, .8);
  const b = $('#bubble'); b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge');
  const el = document.createElement('div'); el.className = 'nudge-tip';
  el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9a4 4 0 118 0c0 2.5-2 3.2-2.6 5.2-.5 1.8-1.4 3.8-3.4 3.8a2.6 2.6 0 01-2.5-2" fill="#FFE7A3" stroke="#243628" stroke-width="2" stroke-linecap="round"/><path d="M10.5 9.5a1.6 1.6 0 013 0c0 1-1 1.3-1.2 2.3" fill="none" stroke="#243628" stroke-width="2" stroke-linecap="round"/></svg><span>Listen to Pip first</span>';
  el.style.left = cx + 'px'; el.style.top = cy + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1400);
}

function award(id, cx, cy) {
  if (Store.data.stars[id]) return false;
  Store.data.stars[id] = Date.now(); Store.save(); // saved now, so the activity logic can see it right away
  // the celebration waits until Pip has explained what was found
  setTimeout(() => { if (Listen.on) Listen.pending.push([id, cx, cy]); else celebrate(id, cx, cy); }, 0);
  return true;
}
function celebrate(id, cx, cy) {
  Sound.star(); Pip.wowUntil = Loop.t + 1.3;
  flyStar(cx, cy); App.fresh = id; refresh(); setTimeout(checkBadges, 1100);
}
const allBadges = topic => topic.activities.map(a => ({ ...a.badge, icon: a.icon, act: a })).concat([topic.master]);
function hasBadge(a) { const need = a.badgeNeed || a.stars.length; return a.stars.filter(s => Store.data.stars[s.id]).length >= need; }
function checkBadges() {
  const tp = App.topic; if (!tp) return; let changed = false;
  for (const a of tp.activities) if (!Store.data.badges[a.badge.id] && hasBadge(a)) { Store.data.badges[a.badge.id] = Date.now(); App.toastQ.push({ ...a.badge, icon: a.icon }); changed = true; }
  if (!Store.data.badges[tp.master.id] && tp.activities.every(a => Store.data.badges[a.badge.id])) { Store.data.badges[tp.master.id] = Date.now(); App.toastQ.push(tp.master); changed = true; }
  if (changed) { Store.save(); refresh(); nextToast(); }
}
function nextToast() {
  if (App.toastOn || !App.toastQ.length) return; const b = App.toastQ.shift(); App.toastOn = true;
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'New badge');
  el.innerHTML = `<canvas width="240" height="240" aria-hidden="true"></canvas><div class="kicker">New badge!</div><h3>${b.name}</h3><p>${b.desc}</p>`;
  const cv = el.querySelector('canvas'); const btn = document.createElement('button'); btn.className = 'btn go'; btn.textContent = 'Hooray!'; el.appendChild(btn); document.body.appendChild(el);
  const off = Loop.add(t => { const c = cv.getContext('2d'); c.setTransform(2.4, 0, 0, 2.4, 0, 0); c.clearRect(0, 0, 100, 100); c.save(); c.translate(50, 50); c.rotate(RM ? 0 : Math.sin(t * 3) * .12); c.translate(-50, -50); c.fillStyle = C.sun; c.beginPath(); for (let i = 0; i < 24; i++) { const r = i % 2 ? 40 : 48, a = i / 24 * TAU + t * .5; c.lineTo(50 + Math.cos(a) * r, 50 + Math.sin(a) * r); } c.fill(); c.fillStyle = '#FFF4D6'; c.beginPath(); c.arc(50, 50, 36, 0, TAU); c.fill(); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(); c.translate(20, 20); c.scale(.6, .6); ICONS[b.icon](c, t); c.restore(); });
  Sound.badge(); confetti(innerWidth / 2, innerHeight / 2, 120, 1.3); setTimeout(() => confetti(innerWidth * .25, innerHeight * .4, 50), 300); setTimeout(() => confetti(innerWidth * .75, innerHeight * .4, 50), 500);
  say(`You earned the <b>${b.name}</b> badge! ${b.desc}`, { queue: true });
  const close = () => { off(); el.remove(); App.toastOn = false; Sound.pop(); setTimeout(nextToast, 300); };
  btn.onclick = close; btn.focus(); setTimeout(() => { if (el.isConnected) close(); }, 7000);
}

/* ============ page rendering ============ */
function refresh() {
  const tp = App.topic, stars = Store.data.stars, acts = tp ? tp.activities : TOPICS.flatMap(t => t.activities); // home counts every topic
  const total = acts.reduce((n, a) => n + a.stars.length, 0), have = acts.reduce((n, a) => n + a.stars.filter(s => stars[s.id]).length, 0);
  $('#starCount').textContent = have; $('#starTotal').textContent = total;
  if (!tp) { if (App.view === 'home') renderHome(); return; }
  for (const a of tp.activities) { const el = document.querySelector(`.tab[data-id="${a.id}"]`); if (!el) continue; const n = a.stars.filter(s => stars[s.id]).length; el.querySelector('.count').textContent = `${n} of ${a.stars.length} stars`; el.classList.toggle('done', hasBadge(a)); }
  if (App.act) $('#finds').innerHTML = App.act.stars.map(s => `<li class="${stars[s.id] ? 'got' : ''} ${App.fresh === s.id ? 'fresh' : ''}">${STAR_SVG(!!stars[s.id])}<span>${s.name}</span></li>`).join('');
  App.fresh = null;
  const shelf = $('#shelf'); shelf.innerHTML = '';
  for (const b of allBadges(tp)) {
    const got = !!Store.data.badges[b.id], d = document.createElement('div'); d.className = 'badge' + (got ? '' : ' locked'); d.title = got ? b.desc : 'Locked: ' + b.desc;
    d.innerHTML = `<div class="disc"><canvas width="108" height="108" aria-hidden="true"></canvas></div><b>${b.name}</b>`; shelf.appendChild(d); drawIcon(d.querySelector('canvas'), b.icon);
  }
}
function renderTabs() {
  const nav = $('#tabs'); nav.innerHTML = '';
  App.topic.activities.forEach((a, i) => {
    const b = document.createElement('button'); b.className = 'tab'; b.dataset.id = a.id; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false');
    b.innerHTML = `<canvas width="96" height="96" aria-hidden="true"></canvas><span><b>${a.name}</b><span class="count"></span></span>`;
    b.onclick = () => { Sound.tap(i); if (App.act !== a) go(`#/${App.topic.id}/${a.id}`); }; b.onmouseenter = () => Sound.tone(PENTA[i] * 2, .05, 'sine', .04);
    nav.appendChild(b); drawIcon(b.querySelector('canvas'), a.icon);
  });
}
function makeUI(intro) {
  const ui = {
    showAll: false,
    intro, // what Pip says as the tab opens; an html activity says it itself (the quiz adds it to its first question)
    say, award,
    button(text, fn, cls = '') { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = text; b.onclick = e => { Sound.ensure(); if (inputLocked()) return nudge(e.clientX || b.getBoundingClientRect().left + 30, e.clientY || b.getBoundingClientRect().top + 10); fn(); }; $('#actions').appendChild(b); return b; },
    hint(text) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = text; $('#extra').appendChild(p); return p; },
    extraEl(tagName, cls) { const e = document.createElement(tagName); e.className = cls; $('#extra').appendChild(e); return e; }
  };
  return ui;
}
// lead: a line Pip says just before the intro (after a reset), so the two don't cut each other off
// stop whatever is running: the activity, Pip mid-sentence, queued lines, the listen hold, sound loops
function leaveActivity() {
  if (App.inst) { try { App.inst.destroy(); } catch (e) { console.error(e); } App.inst = null; }
  Sound.buzz(false); Voice.stop(); App.sayQ.length = 0; stopListening();
}
function mount(a, lead = '') {
  leaveActivity();
  const host = $('#stage'); host.innerHTML = ''; host.classList.toggle('quiz', !!a.html); $('#actions').innerHTML = ''; $('#extra').innerHTML = '';
  App.act = a; Store.data.last = { topic: App.topic.id, activity: a.id }; Store.save();
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.id === a.id ? 'true' : 'false'));
  refresh();
  let intro = (lead ? lead + ' ' : '') + a.intro;
  if (!App.greeted) { App.greeted = true; const n = explorerName(); intro = `Hi${n ? ' ' + n : ''}! I'm <b>Pip</b>, a bean seed. ` + intro; }
  App.inst = a.mount(host, makeUI(intro)) || {};
  if (!a.html) say(intro);
}
// The page opens before the first tap allows sound, so Pip's opening line is shown but not heard.
// The first tap reads it out loud, and the listen-first hold waits for his voice instead of reading time.
// Taps on the read button, Pip or the voice toggle are left alone: those already decide what Pip says.
function hearOpening(e) {
  if (!Voice.auto || !App.current || (e.target.closest && e.target.closest('#readBtn, #pip, #talkBtn'))) return;
  App.sayT = Loop.t; Voice.speak(App.current);
  if (App.currentLocks) startListening(App.current);
}
/* ============ routes: every place has its own link, so back, refresh and bookmarks work ============ */
// #/ home, #/<topic>/<activity> (and #/<topic>, which opens its last or first activity); anything else goes home
// the last place: { topic, activity }; older saves stored just a Plants & Seeds activity id
function lastPlace() { const l = Store.data.last; return typeof l === 'string' ? (l ? { topic: 'plants', activity: l } : {}) : l || {}; }
function go(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
function route() {
  const [tid, aid] = location.hash.replace(/^#\/?/, '').split('/'), last = lastPlace();
  const tp = TOPICS.find(t => t.id === tid);
  if (!tp) { if (location.hash !== '#/') history.replaceState(null, '', '#/'); if (App.view !== 'home') showHome(); return; }
  const a = tp.activities.find(x => x.id === aid) || (last.topic === tp.id && tp.activities.find(x => x.id === last.activity)) || tp.activities[0];
  const want = `#/${tp.id}/${a.id}`; if (location.hash !== want) history.replaceState(null, '', want);
  if (App.view !== 'topic' || App.topic !== tp) {
    App.view = 'topic'; App.topic = tp; renderTabs(); $('#crumbTopic').textContent = tp.name;
    document.documentElement.classList.remove('at-home'); document.documentElement.classList.add('in-topic');
  }
  if (App.act !== a) mount(a);
}
// ids are saved in progress, so they must be unique across topics; new topics prefix theirs with the topic id
function checkIds() {
  const seen = new Set(), bad = [];
  for (const tp of TOPICS) {
    const ids = [...tp.activities.flatMap(a => [a.id, a.badge.id, ...a.stars.map(s => s.id)]), tp.master.id];
    for (const id of ids) { if (seen.has(id)) bad.push(`duplicate id ${id}`); seen.add(id); if (tp.id !== 'plants' && !id.startsWith(tp.id + '.')) bad.push(`${id} should start with ${tp.id}.`); }
  }
  if (bad.length) console.error('Topic ids: ' + bad.join(', '));
  return bad;
}

function init() {
  Store.load();
  fxInit();
  // title letters hop when hovered or tapped
  const h1 = $('#title'); h1.innerHTML = [...'Wonder'].map(ch => `<span class="w">${ch}</span>`).join('') + ' ' + [...'Lab'].map(ch => `<span class="l">${ch}</span>`).join('');
  h1.querySelectorAll('span').forEach((sp, i) => { const go = () => { sp.classList.remove('hop'); void sp.offsetWidth; sp.classList.add('hop'); Sound.tone(PENTA[i % 10], .12, 'triangle', .06); }; sp.addEventListener('mouseenter', go); sp.addEventListener('pointerdown', go); });
  // logo + Pip
  const logo = $('#logo'); Loop.add(t => drawIcon(logo, 'flask', t));
  const pip = $('#pip'), pc = pip.getContext('2d'); Loop.add(t => drawPip(pc, t));
  pip.addEventListener('pointerdown', () => { Sound.ensure(); Pip.pokeT = Loop.t; Sound.boing(); setTimeout(() => Voice.speak(App.current), 250); confetti(pip.getBoundingClientRect().left + 54, pip.getBoundingClientRect().top + 40, 10, .4); });
  // home: the logo, the title and the breadcrumb's Home button
  for (const el of [$('#homeLink'), $('#crumbHome')]) el.addEventListener('click', () => Sound.whoosh());
  homeInit();
  $('#readBtn').onclick = () => { if (Voice.speaking) Voice.stop(); else Voice.speak(App.current); };
  Settings.init();
  if (Voice.auto) Voice.load(); // fetching needs no tap, so the opening line can play as soon as sound is allowed
  const unlock = e => { Sound.unlocked = true; Sound.ensure(); Sound.levels(); Voice.load(); if (Store.data.music && !Music.on) Settings.setMusic(true); hearOpening(e); };
  document.addEventListener('pointerdown', unlock, { capture: true, once: true }); document.addEventListener('keydown', unlock, { capture: true, once: true });
  // ambient birds now and then
  setInterval(() => { if (Sound.on && Sound.ctx && !document.hidden && (App.view === 'home' || App.act && App.act.id !== 'quiz') && Math.random() < .5) Sound.chirp(); }, 9000);
  checkIds();
  addEventListener('hashchange', route);
  route();
}
init();
