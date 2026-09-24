/* ============ topics: add new ones here ============ */
const TOPICS = [
  { id: 'plants', name: 'Plants & Seeds', activities: [A_parts, A_seed, A_flower, A_grow, A_travel, A_quiz],
    master: { id: 'b.botanist', name: 'Botanist', icon: 'trophy', desc: 'You earned every plant badge! A botanist is a scientist who studies plants.' } }
];
const App = { topic: null, act: null, inst: null, greeted: false, toastQ: [], toastOn: false, current: '', sayQ: [] };
Loop.add(() => { if (App.sayQ.length && !Voice.speaking && Loop.t - (App.sayT || -99) > .8) say(App.sayQ.shift()); });

/* ============ Pip the seed ============ */
const Pip = { talkUntil: 0, wowUntil: 0, pokeT: -9 };
function drawPip(c, t) {
  c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 108, 108);
  const talking = t < Pip.talkUntil, wow = t < Pip.wowUntil, poke = t - Pip.pokeT < .6;
  const bob = RM ? 0 : Math.sin(t * 2.2) * 2 - (talking ? Math.abs(Math.sin(t * 10)) * 3 : 0) - (wow || poke ? Math.abs(Math.sin(t * 12)) * 6 : 0);
  c.save(); c.translate(54, 64);
  c.fillStyle = 'rgba(36,54,40,.15)'; c.beginPath(); c.ellipse(0, 36, 26 - bob, 5, 0, 0, TAU); c.fill();
  c.translate(0, bob);
  const sw = RM ? 0 : Math.sin(t * 1.7) * 6;
  c.strokeStyle = C.leafDeep; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(3, -24); c.quadraticCurveTo(1, -36, 3 + sw * .4, -44); c.stroke();
  drawLeaf(c, 3 + sw * .4, -44, -150 + sw, .22); drawLeaf(c, 3 + sw * .4, -44, -30 + sw, .24);
  c.save(); c.rotate(-.1 + (poke ? Math.sin(t * 30) * .08 : 0)); const body = kidney(70, 56); const g = c.createLinearGradient(0, -28, 0, 28); g.addColorStop(0, '#F8E6AE'); g.addColorStop(1, '#E3C27A');
  c.fillStyle = g; c.fill(body); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(body); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-16, -16, 12, 5, -.4, 0, TAU); c.fill(); c.restore();
  // eyes follow your finger
  let lx = Math.sin(t * .7) * 1.5, ly = 0; const st = App.inst && App.inst.stage;
  if (st && st.p.inside) { lx = clamp((st.p.x / W - .5) * 5, -2.5, 2.5); ly = clamp((st.p.y / H - .2) * 3, -2, 2.5); }
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
// polite messages (reminders) wait until Pip has finished talking and the last message has had time to be read
function readTime(html) { return Math.max(4, plainText(html || '').split(' ').length * .4); }
// queued messages (badge news) wait for Pip to finish the current one instead of cutting it off
function say(html, { polite = false, queue = false } = {}) {
  if (queue && (Voice.speaking || App.sayQ.length)) { App.sayQ.push(html); return true; }
  if (polite && (Voice.speaking || App.sayQ.length || Loop.t - (App.sayT || -99) < readTime(App.current))) return false;
  App.sayT = Loop.t;
  const p = $('#say'); p.innerHTML = html; App.current = html; const b = $('#bubble'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).length; Pip.talkUntil = Loop.t + Math.min(3.5, .6 + words * .12);
  if (Voice.auto && Sound.unlocked) Voice.speak(html); else Sound.babble(Math.min(6, 2 + Math.floor(words / 6)));
  return true;
}
function award(id, cx, cy) {
  if (Store.data.stars[id]) return false;
  Store.data.stars[id] = Date.now(); Store.save(); Sound.star(); Pip.wowUntil = Loop.t + 1.3;
  flyStar(cx, cy); App.fresh = id; refresh(); setTimeout(checkBadges, 1100); return true;
}
const allBadges = topic => topic.activities.map(a => ({ ...a.badge, icon: a.icon, act: a })).concat([topic.master]);
function hasBadge(a) { const need = a.badgeNeed || a.stars.length; return a.stars.filter(s => Store.data.stars[s.id]).length >= need; }
function checkBadges() {
  const tp = App.topic; let changed = false;
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
  const tp = App.topic, stars = Store.data.stars;
  const total = tp.activities.reduce((n, a) => n + a.stars.length, 0), have = tp.activities.reduce((n, a) => n + a.stars.filter(s => stars[s.id]).length, 0);
  $('#starCount').textContent = have; $('#starTotal').textContent = total;
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
    b.onclick = () => { Sound.tap(i); if (App.act !== a) mount(a); }; b.onmouseenter = () => Sound.tone(PENTA[i] * 2, .05, 'sine', .04);
    nav.appendChild(b); drawIcon(b.querySelector('canvas'), a.icon);
  });
}
function makeUI() {
  const ui = {
    showAll: false,
    say, award,
    button(text, fn, cls = '') { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = text; b.onclick = () => { Sound.ensure(); fn(); }; $('#actions').appendChild(b); return b; },
    hint(text) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = text; $('#extra').appendChild(p); return p; },
    extraEl(tagName, cls) { const e = document.createElement(tagName); e.className = cls; $('#extra').appendChild(e); return e; }
  };
  return ui;
}
function mount(a) {
  if (App.inst) { try { App.inst.destroy(); } catch (e) { console.error(e); } App.inst = null; }
  Sound.buzz(false); Voice.stop();
  const host = $('#stage'); host.innerHTML = ''; host.classList.toggle('quiz', !!a.html); $('#actions').innerHTML = ''; $('#extra').innerHTML = '';
  App.act = a; Store.data.last = a.id; Store.save();
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.id === a.id ? 'true' : 'false'));
  refresh();
  let intro = a.intro; if (!App.greeted) { App.greeted = true; const n = Store.data.name; intro = `Hi${n ? ' ' + n.replace(/[<>&"]/g, '') : ''}! I'm <b>Pip</b>, a bean seed. ` + intro; }
  App.inst = a.mount(host, makeUI()) || {};
  if (!a.html) say(intro); else setTimeout(() => {}, 0);
}
function selectTopic(tp) { App.topic = tp; renderTabs(); const last = tp.activities.find(a => a.id === Store.data.last); mount(last || tp.activities[0]); }

function init() {
  Store.load();
  fxInit();
  // title letters hop when hovered or tapped
  const h1 = $('#title'); h1.innerHTML = [...'Wonder'].map(ch => `<span class="w">${ch}</span>`).join('') + ' ' + [...'Lab'].map(ch => `<span class="l">${ch}</span>`).join('');
  h1.querySelectorAll('span').forEach((sp, i) => { const go = () => { sp.classList.remove('hop'); void sp.offsetWidth; sp.classList.add('hop'); Sound.tone(PENTA[i % 10], .12, 'triangle', .06); }; sp.addEventListener('mouseenter', go); sp.addEventListener('pointerdown', go); });
  // logo + Pip
  const logo = $('#logo'); Loop.add(t => drawIcon(logo, 'grow', t));
  const pip = $('#pip'), pc = pip.getContext('2d'); Loop.add(t => drawPip(pc, t));
  pip.addEventListener('pointerdown', () => { Sound.ensure(); Pip.pokeT = Loop.t; Sound.boing(); setTimeout(() => Voice.speak(App.current), 250); confetti(pip.getBoundingClientRect().left + 54, pip.getBoundingClientRect().top + 40, 10, .4); });
  // topic dropdown
  const sel = $('#topic'); sel.innerHTML = TOPICS.map(t => `<option value="${t.id}">${t.name}</option>`).join('') + '<option disabled>More topics coming soon…</option>';
  sel.onchange = () => { const tp = TOPICS.find(t => t.id === sel.value); if (tp) { Sound.whoosh(); selectTopic(tp); } };
  $('#readBtn').onclick = () => { if (Voice.speaking) Voice.stop(); else Voice.speak(App.current); };
  Settings.init();
  const unlock = () => { Sound.unlocked = true; Sound.ensure(); Sound.levels(); Voice.load(); if (Store.data.music && !Music.on) Settings.setMusic(true); };
  document.addEventListener('pointerdown', unlock, { capture: true, once: true }); document.addEventListener('keydown', unlock, { capture: true, once: true });
  // ambient birds now and then
  setInterval(() => { if (Sound.on && Sound.ctx && !document.hidden && App.act && App.act.id !== 'quiz' && Math.random() < .5) Sound.chirp(); }, 9000);
  selectTopic(TOPICS[0]);
}
init();
