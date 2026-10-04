'use strict';
/* ============ helpers ============ */
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const W = 800, H = 560, PI = Math.PI, TAU = PI * 2, DEG = PI / 180;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; } // fair order, returns a copy
const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
function seeded(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v*v*v*p0[0] + 3*v*v*u*p1[0] + 3*v*u*u*p2[0] + u*u*u*p3[0], v*v*v*p0[1] + 3*v*v*u*p1[1] + 3*v*u*u*p2[1] + u*u*u*p3[1]]; };
const qpt = (p0, c, p1, u) => { const v = 1 - u; return [v*v*p0[0] + 2*v*u*c[0] + u*u*p1[0], v*v*p0[1] + 2*v*u*c[1] + u*u*p1[1]]; };
function xf(path, x, y, rot = 0, sx = 1, sy = sx) { const p = new Path2D(); p.addPath(path, new DOMMatrix().translate(x, y).rotate(rot).scale(sx, sy)); return p; }
function circle(x, y, r) { const p = new Path2D(); p.arc(x, y, r, 0, TAU); return p; }
function ellipse(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, TAU); return p; }
function rrect(x, y, w, h, r) { const p = new Path2D(); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); t = clamp(t, 0, 1); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; }
const FONT = 'Fredoka, "Trebuchet MS", "Arial Rounded MT Bold", sans-serif';

const C = {
  ink: '#243628', leaf: '#4FAE52', leafDeep: '#2F7D3E', leafLight: '#93D47E', stem: '#5BAF4A',
  sun: '#FFC93C', sunDeep: '#EFA51A', petal: '#F2668B', petalDeep: '#D6446D', petalLight: '#FFB8CA',
  soil: '#8A5A36', soilDeep: '#5A3920', soilLight: '#A87445', root: '#EFD3A6', rootDeep: '#B98E5E',
  sky1: '#86CFEA', sky2: '#E2F6FC', grass: '#6CC04A', grassDeep: '#4E9E36', water: '#4FB3E8',
  bean: '#F6E7B8', beanCoat: '#E8CF90', beanCoatDeep: '#BF9F5A', embryo: '#D6E8A0', pollen: '#FFD83D', carrot: '#FF8A3D'
};
const STAR_SVG = (on = true) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="${on ? '#FFC93C' : '#FFFDF5'}" stroke="${on ? '#243628' : '#9AAE9E'}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

/* ============ storage (per device) ============ */
const Store = {
  key: 'wonderlab.v1', data: { stars: {}, badges: {}, name: '', last: '', sound: true, music: false },
  load() { try { const r = localStorage.getItem(this.key); if (r) { const d = JSON.parse(r); Object.assign(this.data, d); this.data.stars = d.stars || {}; this.data.badges = d.badges || {}; } } catch (e) {} },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} }
};

/* ============ sound kit: every sound is synthesized ============ */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568, 1760];
const Sound = {
  ctx: null, out: null, musicOut: null, on: true, unlocked: false, vol: 1, noiseBuf: null, buzzNode: null, lastPeel: 0,
  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
        this.out = this.ctx.createGain(); this.out.connect(comp); comp.connect(this.ctx.destination);
        this.musicOut = this.ctx.createGain(); this.musicOut.connect(comp); this.levels(false);
        const len = this.ctx.sampleRate * 1.5; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return !!this.ctx;
  },
  ok(bus) { return (bus ? true : this.on) && this.unlocked && this.ensure(); },
  // effects and music each have a volume; both dip while Pip is talking
  levels(ducked = this.ducked) {
    this.ducked = ducked; if (!this.ctx) return; const d = ducked ? .5 : 1, t = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(.9 * this.vol * d, t, .06); this.musicOut.gain.setTargetAtTime(.9 * Music.vol * d, t, .06);
  },
  env(g, t, vol, a, d) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); },
  tone(f, dur = .15, type = 'sine', vol = .15, when = 0, slide = 0, attack = .01, bus = null) {
    if (!this.ok(bus)) return; const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    this.env(g, t, vol, attack, dur); o.connect(g).connect(bus || this.out); o.start(t); o.stop(t + dur + attack + .05);
  },
  noise(dur = .2, vol = .2, type = 'bandpass', f = 1000, when = 0, q = 1, f2 = 0, bus = null) {
    if (!this.ok(bus)) return; const c = this.ctx, t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); this.env(g, t, vol, .01, dur); s.connect(fl).connect(g).connect(bus || this.out); s.start(t, Math.random()); s.stop(t + dur + .05);
  },
  wobble(f, dur, vol, rate, depth, type = 'sine', when = 0, slide = 0) { // vibrato voice (boings, slurps)
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(), l = c.createOscillator(), lg = c.createGain(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
    l.frequency.value = rate; lg.gain.value = depth; l.connect(lg).connect(o.frequency);
    this.env(g, t, vol, .01, dur); o.connect(g).connect(this.out); o.start(t); l.start(t); o.stop(t + dur + .05); l.stop(t + dur + .05);
  },
  xylo(f, when = 0, vol = .14) { this.tone(f, .35, 'sine', vol, when); this.tone(f * 4, .08, 'sine', vol * .35, when); },
  // --- named sounds ---
  pop() { this.tone(380, .09, 'sine', .22, 0, 3.2); },
  tap(i = 0) { this.xylo(PENTA[i % PENTA.length]); },
  boing() { this.wobble(170, .45, .2, 16, 60, 'sine', 0, 3); },
  hop() { this.wobble(260, .18, .12, 22, 40, 'triangle', 0, 2.2); },
  star() { [0, 2, 4, 7].forEach((k, i) => this.xylo(PENTA[k], i * .07, .13)); this.tone(2600, .5, 'sine', .03, .28); },
  badge() { const n = [523.25, 659.25, 783.99, 1046.5]; n.forEach((f, i) => { this.tone(f, .22, 'square', .05, i * .12); this.xylo(f, i * .12, .1); });
    [1046.5, 1318.5, 1568].forEach(f => this.tone(f, 1.1, 'triangle', .07, .5)); this.sparkle(.6); },
  sparkle(when = 0) { for (let i = 0; i < 7; i++) this.tone(rand(2200, 4200), .12, 'sine', .04, when + i * .05); },
  oops() { this.tone(330, .22, 'sawtooth', .05, 0, .85); this.tone(262, .4, 'sawtooth', .05, .2, .8); this.noise(.3, .05, 'lowpass', 600, .2); },
  drip() { this.tone(rand(900, 1300), .12, 'sine', .12, 0, .45); },
  splash() { this.noise(.5, .22, 'bandpass', 2400, 0, .8, 400); for (let i = 0; i < 4; i++) this.tone(rand(700, 1400), .1, 'sine', .08, .05 + i * .07, .5); },
  slurp() { this.wobble(240, .7, .12, 12, 50, 'triangle', 0, 2.4); this.noise(.5, .05, 'bandpass', 900, 0, 4, 2400); },
  crack() { this.noise(.07, .35, 'highpass', 2500); this.noise(.12, .2, 'bandpass', 700, .05, 2); this.tone(120, .1, 'square', .06, 0, .5); },
  peel() { const n = performance.now(); if (n - this.lastPeel < 55) return; this.lastPeel = n; this.noise(.05, .1, 'highpass', rand(3000, 6000)); },
  whoosh() { this.noise(1.1, .22, 'bandpass', 300, 0, 1.5, 2200); this.noise(.9, .1, 'bandpass', 2400, .25, 2, 500); },
  fwip() { this.noise(.14, .14, 'bandpass', 1500, 0, 3, 5000); },
  plunk() { this.tone(260, .25, 'sine', .22, 0, .45); },
  squish() { this.wobble(110, .4, .15, 9, 25, 'sine', 0, 1.6); this.noise(.3, .06, 'lowpass', 500); },
  chirp(when = 0) { const f = rand(2200, 3000); for (let i = 0; i < 3; i++) this.tone(f, .07, 'sine', .05, when + i * .09, 1.35); },
  grow(k = 0) { for (let i = 0; i < 5; i++) this.xylo(PENTA[(k + i) % PENTA.length] * (i > 4 ? 2 : 1), i * .06, .09); this.wobble(300, .5, .06, 8, 20, 'sine', .1, 2); },
  bzz() { this.wobble(200, .7, .06, 28, 30, 'sawtooth', 0, 1.2); },
  croak() { this.wobble(150, .16, .16, 45, 40, 'triangle', 0, .7); this.wobble(135, .2, .16, 45, 40, 'triangle', .2, .7); },
  ptoo() { this.tone(500, .12, 'square', .06, 0, 2.5); },
  babble(n = 4) { for (let i = 0; i < n; i++) this.tone(PENTA[Math.floor(rand(2, 8))] * .75, .06, 'triangle', .07, i * .085, rand(.9, 1.2)); },
  buzz(on) { // continuous bee buzz
    if (!on) { if (this.buzzNode) { const b = this.buzzNode; this.buzzNode = null; try { b.g.gain.setTargetAtTime(.0001, this.ctx.currentTime, .05); b.o.stop(this.ctx.currentTime + .3); b.l.stop(this.ctx.currentTime + .3); } catch (e) {} } return; }
    if (this.buzzNode || !this.ok()) return; const c = this.ctx;
    const o = c.createOscillator(), l = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = 175; l.frequency.value = 30; lg.gain.value = 18; l.connect(lg).connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 1.2; g.gain.value = .0001; g.gain.setTargetAtTime(.05, c.currentTime, .08);
    o.connect(f).connect(g).connect(this.out); o.start(); l.start(); this.buzzNode = { o, l, g };
  }
};

/* ============ garden music (optional loop) ============ */
const Music = {
  on: false, timer: null, step: 0, next: 0, vol: 1,
  tune: [0, 2, 4, 2, 5, 4, 2, -1, 0, 2, 4, 5, 7, 5, 4, -1, 4, 5, 7, 5, 4, 2, 0, -1, 2, 4, 2, 0, 1, 0, -1, -1],
  bass: [261.63, 196, 220, 174.61],
  start() {
    Sound.unlocked = true; if (!Sound.ensure()) return; this.on = true; this.next = Sound.ctx.currentTime + .1; this.step = 0;
    clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 100);
  },
  stop() { this.on = false; clearInterval(this.timer); },
  tick() {
    const c = Sound.ctx; if (!c || !this.on) return; const beat = .28;
    while (this.next < c.currentTime + .4) {
      const when = this.next - c.currentTime, n = this.tune[this.step % this.tune.length];
      const M = Sound.musicOut;
      if (n >= 0) { const f = PENTA[n] * .5; Sound.tone(f, .3, 'sine', .05, when, 0, .01, M); Sound.tone(f * 2, .06, 'sine', .015, when, 0, .01, M); }
      if (this.step % 8 === 0) Sound.tone(this.bass[(this.step / 8) % 4] * .5, 1.8, 'triangle', .035, when, 0, .01, M);
      if (this.step % 4 === 2) Sound.noise(.03, .02, 'highpass', 7000, when, 1, 0, M);
      if (Math.random() < .03) { const f = rand(2200, 3000); for (let i = 0; i < 3; i++) Sound.tone(f, .07, 'sine', .04, when + i * .09, 1.35, .01, M); }
      this.next += beat; this.step++;
    }
  }
};


/* ============ animation loop ============ */
const Loop = { fns: new Set(), t: 0, last: 0, speed: 1 }; // speed > 1 only in automated tests
Loop.add = f => { Loop.fns.add(f); return () => Loop.fns.delete(f); };
function frame(now) {
  const t = now / 1000, dt = (Loop.last ? Math.min(.05, t - Loop.last) : .016) * Loop.speed; Loop.last = t; Loop.t = t;
  for (const f of Loop.fns) { try { f(t, dt); } catch (e) { console.error(e); } }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ============ Stage: an 800x560 drawing surface that scales to fit ============ */
class Stage {
  constructor(host, desc) {
    this.canvas = document.createElement('canvas'); this.canvas.setAttribute('role', 'img'); this.canvas.setAttribute('aria-label', desc || '');
    host.appendChild(this.canvas); this.ctx = this.canvas.getContext('2d');
    this.scale = 1; this.t = Loop.t; this.p = { x: -999, y: -999, down: false, inside: false }; this.cursor = 'default';
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.canvas); this.resize();
    const L = e => { const r = this.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    this.ev = {
      pointerdown: e => { Sound.ensure(); if (typeof inputLocked === 'function' && inputLocked()) { e.preventDefault(); nudge(e.clientX, e.clientY); return; } const [x, y] = L(e); Object.assign(this.p, { x, y, down: true, inside: true }); try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {} if (this.onDown) this.onDown(x, y); e.preventDefault(); },
      pointermove: e => { const [x, y] = L(e); Object.assign(this.p, { x, y, inside: true }); if (this.onMove) this.onMove(x, y); },
      pointerup: e => { const [x, y] = L(e); this.p.down = false; if (this.onUp) this.onUp(x, y); if (e.pointerType !== 'mouse') this.p.inside = false; },
      pointercancel: () => { this.p.down = false; if (this.onUp) this.onUp(this.p.x, this.p.y); },
      pointerleave: () => { if (!this.p.down) { this.p.inside = false; this.p.x = -999; this.p.y = -999; } }
    };
    for (const k in this.ev) this.canvas.addEventListener(k, this.ev[k]);
    this.off = Loop.add((t, dt) => {
      this.t = t; const c = this.ctx; c.setTransform(this.scale, 0, 0, this.scale, 0, 0); c.clearRect(0, 0, W, H);
      this.cursor = 'default'; if (this.draw) this.draw(c, t, dt);
      if (this.canvas.style.cursor !== this.cursor) this.canvas.style.cursor = this.cursor;
    });
  }
  resize() { const r = this.canvas.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(2, window.devicePixelRatio || 1); const w = Math.round(r.width * dpr); if (w === this.canvas.width) return; this.canvas.width = w; this.canvas.height = Math.round(w * H / W); this.scale = w / W; }
  hit(path, x, y) { if (!path) return false; const c = this.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); const r = c.isPointInPath(path, x, y); c.restore(); return r; }
  hitLine(path, x, y, w) { if (!path) return false; const c = this.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.lineWidth = w; const r = c.isPointInStroke(path, x, y); c.restore(); return r; }
  over(path) { const p = this.p; if (!p.inside || !path) return false; if (this.hit(path, p.x, p.y)) { this.cursor = 'pointer'; return true; } return false; }
  overLine(path, w) { const p = this.p; if (!p.inside || !path) return false; if (this.hitLine(path, p.x, p.y, w)) { this.cursor = 'pointer'; return true; } return false; }
  client(x, y) { const r = this.canvas.getBoundingClientRect(); return [r.left + x / W * r.width, r.top + y / H * r.height]; }
  destroy() { this.off(); this.ro.disconnect(); for (const k in this.ev) this.canvas.removeEventListener(k, this.ev[k]); this.canvas.remove(); }
}

/* ============ shared drawing ============ */
function label(c, text, x, y, { size = 22, color = C.ink, align = 'center', weight = 600, stroke = 'rgba(255,255,255,.92)' } = {}) {
  c.save(); c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = size * .3; c.strokeText(text, x, y); }
  c.fillStyle = color; c.fillText(text, x, y); c.restore();
}
function tag(c, text, x, y, px, py, col = C.ink, bg = '#fff') {
  c.save(); c.font = `600 19px ${FONT}`; const w = c.measureText(text).width + 26, h = 34;
  if (px != null) { c.strokeStyle = col; c.lineWidth = 2.5; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(x, y); c.lineTo(px, py); c.stroke(); c.setLineDash([]); c.fillStyle = col; c.beginPath(); c.arc(px, py, 5, 0, TAU); c.fill(); }
  const r = rrect(x - w / 2, y - h / 2, w, h, 17); c.fillStyle = bg; c.fill(r); c.strokeStyle = col; c.lineWidth = 3; c.stroke(r);
  c.fillStyle = C.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y + 1); c.restore();
}
function pillLabel(c, text, x, y, bg = '#fff') {
  c.save(); c.font = `600 18px ${FONT}`; const w = c.measureText(text).width + 24; const r = rrect(x, y, w, 32, 16);
  c.fillStyle = bg; c.fill(r); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(r); c.fillStyle = C.ink; c.textBaseline = 'middle'; c.fillText(text, x + 12, y + 17); c.restore();
}
function sky(c, top = C.sky1, bot = C.sky2, h = H) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, W, h); }
function cloud(c, x, y, s = 1, a = .95) {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath();
  for (const [cx, cy, r] of [[0, 0, 24], [28, -14, 31], [60, -4, 25], [32, 8, 24], [8, 8, 18]]) { c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, TAU); }
  c.fill(); c.restore();
}
function clouds(c, t, list) { for (const k of list) { const x = ((k.x + (RM ? 0 : t * k.v)) % 1000 + 1000) % 1000 - 110; cloud(c, x, k.y, k.s); } }
function sun(c, x, y, r, t, { face = true, glow = 0 } = {}) {
  c.save(); c.translate(x, y); const rot = RM ? 0 : t * .3; c.fillStyle = C.sun;
  for (let i = 0; i < 12; i++) { const a = rot + i * PI / 6, L = r * (1.5 + .12 * Math.sin(t * 3 + i)); c.beginPath(); c.moveTo(Math.cos(a - .13) * r * 1.05, Math.sin(a - .13) * r * 1.05); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.lineTo(Math.cos(a + .13) * r * 1.05, Math.sin(a + .13) * r * 1.05); c.fill(); }
  if (glow) { c.shadowColor = 'rgba(255,220,80,.95)'; c.shadowBlur = 40 * glow; }
  const g = c.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); g.addColorStop(0, '#FFEE9A'); g.addColorStop(1, C.sun);
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.shadowBlur = 0;
  if (face) {
    const bl = (t % 4.3) < .13 ? .15 : 1; c.fillStyle = C.ink;
    for (const ex of [-.33, .33]) { c.beginPath(); c.ellipse(ex * r, -r * .12, r * .09, r * .11 * bl, 0, 0, TAU); c.fill(); }
    c.strokeStyle = C.ink; c.lineWidth = r * .08; c.lineCap = 'round'; c.beginPath(); c.arc(0, r * .08, r * .34, .2 * PI, .8 * PI); c.stroke();
    c.fillStyle = 'rgba(242,102,139,.45)'; for (const ex of [-.55, .55]) { c.beginPath(); c.arc(ex * r, r * .18, r * .13, 0, TAU); c.fill(); }
  }
  c.restore();
}
function ground(c, y, t, { soil = true } = {}) {
  if (soil) {
    const g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, C.soilLight); g.addColorStop(1, C.soilDeep); c.fillStyle = g; c.fillRect(0, y, W, H - y);
    const r = seeded(7);
    for (let i = 0; i < 80; i++) { const px = r() * W, py = y + 18 + r() * (H - y - 18); c.fillStyle = r() < .6 ? 'rgba(50,28,12,.3)' : 'rgba(255,225,180,.22)'; c.beginPath(); c.ellipse(px, py, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, TAU); c.fill(); }
  }
  c.fillStyle = C.grassDeep; c.fillRect(0, y - 4, W, 16);
  c.fillStyle = C.grass; c.beginPath(); c.moveTo(0, y + 8); for (let x = 0; x < W; x += 20) c.quadraticCurveTo(x + 10, y - 7, x + 20, y + 1); c.lineTo(W, y + 10); c.lineTo(0, y + 10); c.fill();
  const r = seeded(3); c.strokeStyle = C.grassDeep; c.lineWidth = 3; c.lineCap = 'round';
  for (let i = 0; i < 90; i++) { const bx = r() * W, bh = 8 + r() * 15, sw = RM ? 0 : Math.sin(t * 2 + bx * .05) * 3; c.beginPath(); c.moveTo(bx, y + 3); c.quadraticCurveTo(bx + sw * .5, y - bh * .5, bx + sw, y - bh); c.stroke(); }
}
function sparkle(c, x, y, s, col = '#FFF7B0') {
  c.save(); c.translate(x, y); c.fillStyle = col; c.beginPath();
  c.moveTo(0, -s); c.quadraticCurveTo(0, 0, s, 0); c.quadraticCurveTo(0, 0, 0, s); c.quadraticCurveTo(0, 0, -s, 0); c.quadraticCurveTo(0, 0, 0, -s); c.fill(); c.restore();
}
function glowOn(c) { c.shadowColor = 'rgba(255,236,120,1)'; c.shadowBlur = 26; }

// the leaf shape: base at (0,0), tip at (112,0)
const LEAF = (() => { const p = new Path2D(); p.moveTo(0, 0); p.bezierCurveTo(30, -38, 80, -34, 112, 0); p.bezierCurveTo(80, 34, 30, 38, 0, 0); p.closePath(); return p; })();
function drawLeaf(c, x, y, rot, s, fill = C.leaf, edge = C.leafDeep) {
  c.save(); c.translate(x, y); c.rotate(rot * DEG); c.scale(s, s);
  const g = c.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, C.leafLight); g.addColorStop(1, fill);
  c.fillStyle = g; c.fill(LEAF); c.shadowBlur = 0; c.strokeStyle = edge; c.lineWidth = 3 / s; c.stroke(LEAF);
  c.lineWidth = 2 / s; c.beginPath(); c.moveTo(4, 0); c.lineTo(104, 0);
  for (const k of [25, 50, 75]) { c.moveTo(k, 0); c.lineTo(k + 15, -13); c.moveTo(k, 0); c.lineTo(k + 15, 13); } c.stroke(); c.restore();
}
// kidney-bean outline centered at 0,0 with the notch at the bottom
function kidney(w, h) {
  const p = new Path2D(), a = w / 2, b = h / 2;
  p.moveTo(-a, 0); p.bezierCurveTo(-a, -.75 * b, -.45 * a, -b, .1 * a, -.95 * b); p.bezierCurveTo(.7 * a, -.9 * b, a, -.5 * b, a, .05 * b);
  p.bezierCurveTo(a, .6 * b, .6 * a, b, .15 * a, .9 * b); p.bezierCurveTo(.02 * a, .87 * b, -.05 * a, .62 * b, -.2 * a, .7 * b);
  p.bezierCurveTo(-.55 * a, .9 * b, -a, .7 * b, -a, 0); p.closePath(); return p;
}
const POD = (() => { const p = new Path2D(); p.moveTo(0, 0); p.bezierCurveTo(18, 8, 20, 62, 9, 100); p.bezierCurveTo(5, 108, -3, 106, -5, 98); p.bezierCurveTo(-13, 60, -13, 10, 0, 0); p.closePath(); return p; })();
function drawPod(c, open = 0, t = 0, dry = 0) {
  c.fillStyle = mix(C.leaf, '#D9B86C', dry); c.fill(POD); c.shadowBlur = 0; c.strokeStyle = dry > .5 ? '#8D6B34' : C.leafDeep; c.lineWidth = 3; c.stroke(POD);
  if (open > 0) {
    c.fillStyle = dry > .5 ? '#F5E6C0' : '#E9F5C8'; c.beginPath(); c.ellipse(2, 52, 9 * open + .5, 42, 0, 0, TAU); c.fill();
    for (let k = 0; k < 4; k++) { const j = RM ? 0 : Math.sin(t * 8 + k) * 1.5 * open; c.fillStyle = dry > .5 ? '#E8D29C' : '#A6D884'; c.strokeStyle = dry > .5 ? '#A88445' : C.leafDeep; c.lineWidth = 2; c.beginPath(); c.ellipse(2 + j, 22 + k * 20, 8 * open, 9 * open, 0, 0, TAU); c.fill(); c.stroke(); }
  } else {
    c.strokeStyle = 'rgba(0,0,0,.13)'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(3, 22 + k * 20, 7, -.4 * PI, .4 * PI); c.stroke(); }
  }
}
function drawFlowerHead(c, x, y, sc = 1, t = 0, { petal = C.petal, light = C.petalLight, edge = C.petalDeep } = {}) {
  c.save(); c.translate(x, y); c.scale(sc, sc); c.rotate(RM ? 0 : Math.sin(t * .8) * .05);
  for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * PI / 3); const g = c.createLinearGradient(0, 0, 60, 0); g.addColorStop(0, light); g.addColorStop(1, petal); c.fillStyle = g; c.beginPath(); c.ellipse(32, 0, 30, 18, 0, 0, TAU); c.fill(); c.shadowBlur = 0; c.strokeStyle = edge; c.lineWidth = 2.5; c.stroke(); c.restore(); }
  c.shadowBlur = 0; c.fillStyle = C.sun; c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.fill(); c.strokeStyle = C.sunDeep; c.lineWidth = 3; c.stroke();
  c.fillStyle = C.sunDeep; for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 4 + (i % 3) * 4; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 2, 0, TAU); c.fill(); }
  c.restore();
}
function bee(c, x, y, t, s = 1, { pollen = false, flip = false } = {}) {
  c.save(); c.translate(x, y); c.scale(flip ? -s : s, s);
  const fl = RM ? 1 : .35 + .65 * Math.abs(Math.sin(t * 38));
  c.fillStyle = 'rgba(255,255,255,.8)'; c.strokeStyle = C.ink; c.lineWidth = 2;
  c.beginPath(); c.ellipse(-4, -15, 9, 3 + 12 * fl, -.4, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(7, -15, 8, 3 + 10 * fl, .4, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-20, 0); c.lineTo(-28, 2); c.lineTo(-19, 5); c.fillStyle = C.ink; c.fill();
  const body = ellipse(0, 0, 20, 14); c.fillStyle = C.sun; c.fill(body);
  c.save(); c.clip(body); c.fillStyle = C.ink; c.fillRect(-10, -15, 5, 30); c.fillRect(1, -15, 5, 30); c.restore(); c.lineWidth = 2.5; c.stroke(body);
  c.fillStyle = C.ink; c.beginPath(); c.arc(18, -2, 9, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(21, -4, 3, 0, TAU); c.fill();
  c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(20, -10); c.quadraticCurveTo(24, -20, 30, -20); c.moveTo(16, -10); c.quadraticCurveTo(16, -20, 22, -24); c.stroke();
  if (pollen) { c.fillStyle = C.pollen; c.strokeStyle = '#C79A00'; c.lineWidth = 1; for (const [px, py] of [[-8, 12], [-2, 14], [5, 12], [-12, 8], [9, 9], [0, 10]]) { c.beginPath(); c.arc(px, py, 3.2, 0, TAU); c.fill(); c.stroke(); } }
  c.restore();
}
function butterfly(c, x, y, t, s = 1, col = C.carrot) {
  c.save(); c.translate(x, y); c.scale(s, s); const f = RM ? .8 : .25 + .75 * Math.abs(Math.sin(t * 9));
  for (const d of [-1, 1]) {
    c.save(); c.scale(d * f, 1); c.fillStyle = col; c.strokeStyle = C.ink; c.lineWidth = 2;
    c.beginPath(); c.ellipse(13, -10, 15, 12, .5, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(10, 9, 9, 8, -.4, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(15, -11, 3.5, 0, TAU); c.fill(); c.restore();
  }
  c.fillStyle = C.ink; c.beginPath(); c.ellipse(0, 0, 3, 13, 0, 0, TAU); c.fill();
  c.strokeStyle = C.ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(-4, -20, -8, -22); c.moveTo(0, -12); c.quadraticCurveTo(4, -20, 8, -22); c.stroke();
  c.restore();
}
function arrow(c, x1, y1, x2, y2, col = C.carrot) {
  const a = Math.atan2(y2 - y1, x2 - x1); c.save(); c.lineCap = 'round'; c.strokeStyle = C.ink; c.lineWidth = 16; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - Math.cos(a) * 18, y2 - Math.sin(a) * 18); c.stroke();
  c.strokeStyle = col; c.lineWidth = 10; c.stroke();
  c.translate(x2, y2); c.rotate(a); c.beginPath(); c.moveTo(4, 0); c.lineTo(-30, -20); c.lineTo(-30, 20); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke(); c.restore();
}
