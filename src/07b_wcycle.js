/* ============ Weather & Water: shared drawing and sounds ============ */
// Named colors for the weather topic (docs/design.md, section 3: a topic adds its own next to C)
const WC = { sky1: '#7EC4E8', sky2: '#DDF1FA', cloud: '#FFFFFF', storm: '#8C99AB', stormDeep: '#5F6B7D', vapor: 'rgba(255,255,255,.75)',
  lake: '#4FB3E8', lakeDeep: '#2F86C2', rock: '#9AA3AE', rockDeep: '#6F7884', snow: '#F4FAFF', glass: 'rgba(221,243,247,.45)', red: '#E04B4B', accent: '#1D6E99' };
Object.assign(Sound, {
  thunder() { this.noise(1.6, .14, 'lowpass', 160, 0, 1, 60); this.noise(.6, .08, 'lowpass', 420, .05, 1, 90); this.tone(55, 1.2, 'sine', .07, 0, .8); },
  steam() { this.noise(.9, .07, 'bandpass', 1200, 0, 2, 3200); this.tone(PENTA[2], .2, 'sine', .05, .05, 1.5); },
  snowfall() { for (let i = 0; i < 6; i++) this.tone(PENTA[5 + (i % 4)], .18, 'sine', .035, i * .14); }
});
// a puffy sticker cloud centered at (x, y): the ink goes on first, the fill on top, so only the outer edge shows
const PUFFS = [[-52, 10, 30], [-20, -12, 38], [22, -8, 34], [54, 10, 26], [0, 14, 32]];
// face: null, or { t, full } for a friendly face that blinks (and puffs its cheeks when the cloud is full)
function puffCloud(c, x, y, s = 1, fill = WC.cloud, { line = 4, face = null } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = C.ink; for (const [px, py, r] of PUFFS) { c.beginPath(); c.arc(px, py, r + line / s, 0, TAU); c.fill(); }
  c.fillStyle = fill; for (const [px, py, r] of PUFFS) { c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill(); }
  c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-22, -26, 18, 7, -.3, 0, TAU); c.fill();
  if (face) cloudFace(c, 0, 10, face.t, face.full);
  c.restore(); return ellipse(x, y, 88 * s, 52 * s);
}
function cloudFace(c, x, y, t, full = false) {
  const blink = !RM && (t % 4.1) < .13;
  c.fillStyle = C.ink; for (const ex of [-16, 16]) { c.beginPath(); c.ellipse(x + ex, y - 4, 4.5, blink ? 1 : 5.5, 0, 0, TAU); c.fill(); if (!blink) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x + ex + 1.5, y - 6, 1.6, 0, TAU); c.fill(); c.fillStyle = C.ink; } }
  c.fillStyle = 'rgba(242,102,139,.45)'; const ch = full ? 8 : 5.5; for (const ex of [-28, 28]) { c.beginPath(); c.ellipse(x + ex, y + 6, ch, ch * .7, 0, 0, TAU); c.fill(); }
  c.strokeStyle = C.ink; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath();
  if (full) { c.moveTo(x - 6, y + 9); c.lineTo(x + 6, y + 9); } else c.arc(x, y + 4, 7, .15 * PI, .85 * PI);
  c.stroke();
}
// little splashes where rain lands along y, between x0 and x1
function splashes(c, t, x0, x1, y, n = 6) {
  if (RM) return; const r = seeded(17); c.save(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5; c.lineCap = 'round';
  for (let i = 0; i < n; i++) { const x = lerp(x0, x1, r()), k = (t * 2.2 + r()) % 1, w = 4 + k * 10; c.globalAlpha = 1 - k; c.beginPath(); c.arc(x, y, w, PI * 1.15, PI * 1.85); c.stroke(); }
  c.restore();
}
// a rainbow arc that fades in and out over `life` seconds (a = 0..1 strength)
function rainbow(c, x, y, r, a) {
  if (a <= 0) return; c.save(); c.globalAlpha = a * .8; c.lineCap = 'round';
  ['#E04B4B', C.carrot, C.sun, C.leaf, C.water, '#8D6CD9'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 9; c.beginPath(); c.arc(x, y, r - i * 9, PI * 1.08, PI * 1.92); c.stroke(); });
  c.restore();
}
// a zigzag lightning bolt (drawn, never a screen flash)
function bolt(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); const P = new Path2D('M4 0 L-14 34 L0 34 L-10 66 L18 24 L4 24 L14 0 Z');
  c.fillStyle = C.sun; c.fill(P); c.strokeStyle = C.ink; c.lineWidth = 3 / s; c.lineJoin = 'round'; c.stroke(P); c.restore();
}
// a long, flat, low blanket of cloud
function stratusCloud(c, x, y, s = 1, fill = '#D6DCE4') {
  c.save(); c.translate(x, y); c.scale(s, s); const P = new Path2D();
  P.moveTo(-150, 14); for (let i = 0; i <= 10; i++) P.quadraticCurveTo(-150 + i * 30 - 15, -14 - (i % 2) * 6, -150 + i * 30, -6);
  P.lineTo(150, 14); P.quadraticCurveTo(0, 26, -150, 14); P.closePath();
  c.fillStyle = fill; c.fill(P); c.strokeStyle = C.ink; c.lineWidth = 4 / s; c.lineJoin = 'round'; c.stroke(P); c.restore();
  return rrect(x - 150 * s, y - 24 * s, 300 * s, 48 * s, 20 * s);
}
// high, thin, wispy streaks of ice
function cirrusCloud(c, x, y, s = 1, t = 0) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round';
  for (const [dx, dy, len, curl] of [[-70, -8, 120, 18], [-20, 10, 140, 22], [30, -16, 110, 14]]) {
    const sw = RM ? 0 : Math.sin(t * .6 + dx) * 3, p = new Path2D(); p.moveTo(dx - len / 2, dy + 10); p.quadraticCurveTo(dx, dy - 8 + sw, dx + len / 2, dy - curl);
    c.strokeStyle = 'rgba(36,54,40,.55)'; c.lineWidth = 12; c.stroke(p); c.strokeStyle = '#FFFFFF'; c.lineWidth = 7; c.stroke(p);
  }
  c.restore(); return ellipse(x, y, 110 * s, 40 * s);
}
// a towering thunderstorm cloud with a flat, anvil-shaped top
function stormCloud(c, x, y, s = 1, fill = WC.storm) {
  c.save(); c.translate(x, y); c.scale(s, s); const P = new Path2D();
  P.moveTo(-70, 40); P.quadraticCurveTo(-96, 10, -66, -10); P.quadraticCurveTo(-74, -60, -40, -80); P.quadraticCurveTo(-60, -130, -110, -150);
  P.quadraticCurveTo(-20, -170, 0, -160); P.quadraticCurveTo(20, -170, 110, -150); P.quadraticCurveTo(60, -130, 42, -82);
  P.quadraticCurveTo(80, -60, 70, -10); P.quadraticCurveTo(100, 12, 72, 40); P.quadraticCurveTo(0, 56, -70, 40); P.closePath();
  const g = c.createLinearGradient(0, -160, 0, 50); g.addColorStop(0, '#E6EAF0'); g.addColorStop(1, fill);
  c.fillStyle = g; c.fill(P); c.strokeStyle = C.ink; c.lineWidth = 4 / s; c.lineJoin = 'round'; c.stroke(P); c.restore();
  return rrect(x - 110 * s, y - 165 * s, 220 * s, 215 * s, 30 * s);
}
// falling rain or snow under a cloud: streaks from (x0..x1, y0) down to y1
function precip(c, t, x0, x1, y0, y1, snow = false, n = 22) {
  const r = seeded(11); c.save();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), sp = snow ? 60 + r() * 30 : 260 + r() * 120, len = y1 - y0, k = RM ? r() : ((t * sp + r() * len) % len) / len, y = y0 + k * len, dx = snow ? Math.sin(t * 2 + i) * 6 : 0;
    if (snow) { c.fillStyle = WC.snow; c.strokeStyle = 'rgba(36,54,40,.5)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x + dx, y, 4.5, 0, TAU); c.fill(); c.stroke(); }
    else { c.strokeStyle = C.water; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 14); c.stroke(); }
  }
  c.restore();
}
// a wavy little cloud of water vapor
function vaporPuff(c, x, y, t, a = 1) {
  c.save(); c.globalAlpha = a; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 5; c.lineCap = 'round';
  for (const dx of [-16, 0, 16]) { const w = RM ? 0 : Math.sin(t * 3 + dx) * 4; c.beginPath(); c.moveTo(x + dx, y + 26); c.bezierCurveTo(x + dx + 10 + w, y + 12, x + dx - 10 - w, y - 4, x + dx + w, y - 22); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x, y, 30, 0, TAU); c.fill(); c.restore();
}
function raindrop(c, x, y, s = 1, fill = C.water) {
  c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(11, 2, 8, 7); c.arc(0, 6, 8, .1 * PI, .9 * PI); c.quadraticCurveTo(-11, 2, 0, -14); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 2.5 / s; c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(-3, 4, 2.4, 0, TAU); c.fill(); c.restore();
}

/* ============ the Weather & Water building on the campus map: a little weather station ============ */
// a white instrument hut with louvers, a mast with spinning wind cups and a fluttering wind sock;
// it fills in as stars are earned: a rain gauge, a thermometer, a rainbow, a weather balloon
function drawWeatherStation(c, t, p = 0) {
  const spin = RM ? .4 : t * 3.2, flap = RM ? 0 : Math.sin(t * 4) * .12;
  c.save(); c.translate(-110, -160); c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = 'rgba(36,54,40,.18)'; c.beginPath(); c.ellipse(110, 156, 98, 10, 0, 0, TAU); c.fill();
  if (p >= .6) { for (const [r, col] of [[70, '#E04B4B'], [62, C.sun], [54, C.leaf], [46, C.water]]) { c.strokeStyle = col; c.lineWidth = 8; c.beginPath(); c.arc(90, 132, r, PI * 1.05, PI * 1.95); c.stroke(); } }
  if (p >= .85) { const by = RM ? 0 : Math.sin(t * 1.2) * 4; c.strokeStyle = 'rgba(36,54,40,.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(40, 72); c.quadraticCurveTo(30, 40, 34, 18 + by); c.stroke(); c.fillStyle = '#FFFDF5'; c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.arc(34, 6 + by, 13, 0, TAU); c.fill(); c.stroke(); }
  // the mast, the wind sock and the cups
  c.strokeStyle = C.ink; c.lineWidth = 9; c.beginPath(); c.moveTo(176, 150); c.lineTo(176, 24); c.stroke(); c.strokeStyle = '#C8CDD2'; c.lineWidth = 4; c.stroke();
  c.save(); c.translate(178, 62); c.rotate(flap); const sock = new Path2D('M0 -12 L52 -6 L52 6 L0 12 Z'); c.fillStyle = '#FFFDF5'; c.fill(sock);
  c.save(); c.clip(sock); c.fillStyle = C.carrot; for (const x of [0, 26]) c.fillRect(x, -14, 13, 28); c.restore(); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(sock); c.restore();
  c.save(); c.translate(176, 22);
  for (let i = 0; i < 3; i++) { const a = spin + i * TAU / 3, x = Math.cos(a) * 24, y = Math.sin(a) * 7; c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(x, y); c.stroke(); c.fillStyle = WC.accent; c.beginPath(); c.arc(x, y, 6.5, 0, TAU); c.fill(); c.stroke(); }
  c.fillStyle = C.ink; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.restore();
  // the hut: a roof, louvered walls and a door
  const hut = rrect(34, 74, 112, 76, 6); c.fillStyle = '#FFFDF5'; c.fill(hut);
  c.strokeStyle = 'rgba(36,54,40,.35)'; c.lineWidth = 2.5; for (let y = 84; y < 146; y += 9) { c.beginPath(); c.moveTo(42, y); c.lineTo(138, y + 3); c.stroke(); }
  c.strokeStyle = C.ink; c.lineWidth = 4; c.stroke(hut);
  const roof = new Path2D('M22 78 L90 36 L158 78 Z'); c.fillStyle = '#5BA8D6'; c.fill(roof); c.stroke(roof);
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4; c.beginPath(); c.moveTo(48, 68); c.lineTo(86, 46); c.stroke();
  const door = rrect(76, 102, 28, 48, 4); c.fillStyle = '#A87445'; c.fill(door); c.strokeStyle = C.ink; c.lineWidth = 3.5; c.stroke(door);
  c.fillStyle = C.sun; c.beginPath(); c.arc(98, 128, 2.5, 0, TAU); c.fill();
  if (p >= .35) { c.fillStyle = '#FFFDF5'; c.strokeStyle = C.ink; c.lineWidth = 2.5; const tb = rrect(118, 86, 12, 46, 6); c.fill(tb); c.stroke(tb); c.fillStyle = WC.red; c.fillRect(122, 104, 4, 22); c.beginPath(); c.arc(124, 128, 5, 0, TAU); c.fill(); c.stroke(); }
  if (p >= .15) { c.fillStyle = 'rgba(221,243,247,.9)'; c.strokeStyle = C.ink; c.lineWidth = 3; const g = rrect(10, 112, 16, 38, 3); c.fill(g); c.fillStyle = C.water; c.fillRect(12, 132, 12, 16); c.stroke(g); c.beginPath(); c.moveTo(6, 112); c.lineTo(30, 112); c.stroke(); }
  const base = rrect(6, 146, 208, 10, 4); c.fillStyle = '#C9955A'; c.fill(base); c.strokeStyle = C.ink; c.lineWidth = 3.5; c.stroke(base);
  c.restore();
}

/* ============ Activity: The Water Cycle ============ */
// Water's never-ending trip: the sun warms the lake (evaporation), the vapor is dragged up into the cold sky and
// becomes a cloud (condensation), the full cloud rains or snows (precipitation), and the river carries it home (collection).
const A_wcycle = {
  id: 'weather.cycle', name: 'Water Cycle', icon: 'wcycle',
  badge: { id: 'weather.b.cycle', name: 'Water Cycler', desc: 'You followed water all the way around the water cycle!', how: 'Not yet! Follow the water all the way around in <b>Water Cycle</b>.', reward: 'umbrella' },
  stars: [{ id: 'weather.cycle.evap', name: 'Evaporation' }, { id: 'weather.cycle.condense', name: 'Condensation' }, { id: 'weather.cycle.precip', name: 'Precipitation' }, { id: 'weather.cycle.collect', name: 'Collection' }, { id: 'weather.cycle.snow', name: 'Snow on the mountain' }],
  intro: 'Water goes on a trip that never ends! <b>Tap the sun</b> to warm up the lake.',
  facts: ['Did you know? The water you drink today might have been rain on a dinosaur long ago! Earth keeps using the same water over and over.', 'Did you know? The sun is the engine of the water cycle. Its heat keeps the water moving!'],
  mount(host, ui) {
    const st = new Stage(host, 'A sunny valley with a lake, a river and a snowy mountain. Tap the sun to warm the lake, drag the water vapor up into the sky to make a cloud, then make it rain or snow.');
    const SUN = [100, 92], LAKE = [175, 478], COLD = 175, CY = 104, MTN = 560;
    const RIVER = [[628, 318], [560, 430], [430, 372], [312, 462]];
    const found = k => !!Store.data.stars['weather.cycle.' + k];
    const earn = (k, x, y) => { if (ui.award('weather.cycle.' + k, ...st.client(x, y))) s.earnedHere = true; };
    let s;
    function reset() { s = { puff: null, drops: 0, cloudX: 420, drag: null, rainT: -9, snowT: -9, snowcap: .35, flow: null, lake: 0, heavyTold: 0, lastAct: Loop.t, told: {}, earnedHere: false }; }
    const cloudScale = () => .55 + s.drops * .17, heavy = () => s.drops >= 3;
    const raining = () => st.t - s.rainT < 2.6, overMountain = () => s.cloudX > MTN;
    const riverAt = u => bez(...RIVER, u);
    const cloudPath = () => ellipse(s.cloudX, CY, 90 * cloudScale(), 55 * cloudScale());
    function tapSun() {
      Sound.steam(); s.sunT = st.t;
      if (s.puff) { ui.say('First, drag the vapor up high!', { polite: true }); return; }
      if (heavy()) { ui.say('The cloud is full. Tap it!', { polite: true }); return; }
      if (raining() || s.flow) return;
      s.puff = { x: LAKE[0] + 30, y: LAKE[1] - 40, risen: RM, join: null };
      if (RM) s.puff.y = 300;
      if (!found('evap')) { earn('evap', ...SUN); ui.say('The sun warms the lake. Tiny bits of water float up into the air as <b>water vapor</b>. It\'s a gas you can\'t see. This is <b>evaporation</b>, like a puddle drying up on a sunny day!'); ui.say('Now <b>drag the vapor up</b> into the cold sky!', { queue: true }); }
    }
    function joinCloud() {
      const p = s.puff; p.join = st.t; Sound.pop(); Sound.tap(5 + s.drops);
    }
    function joined() {
      s.puff = null; s.drops++;
      if (!found('condense')) { earn('condense', s.cloudX, CY); ui.say('High up, the air is cold. The vapor cools and turns back into tiny drops of water. The drops crowd together and make a cloud! This is <b>condensation</b>.'); ui.say('Make the cloud bigger! <b>Tap the sun</b> again.', { queue: true }); return; }
      if (heavy()) {
        if (!s.heavyTold) ui.say('The cloud is full and heavy! <b>Tap it</b> to make it rain, or <b>drag it</b> over the mountain first.');
        else if (!found('snow')) ui.say('The cloud is full again! This time, <b>drag it over the mountain</b>, then tap it.');
        s.heavyTold++;
      }
    }
    function rain() {
      s.rainT = st.t; const snow = overMountain(); s.rainSnow = snow; s.drops = 0; Sound.rain();
      if (snow) { Sound.snowfall(); s.snowcap = Math.min(1, s.snowcap + .3); }
      const precipNew = !found('precip'); earn('precip', s.cloudX, CY + 60);
      if (snow && !found('snow')) { earn('snow', 660, 200); ui.say('Up on the cold mountain, the water froze and fell as snow! Snow is <b>precipitation</b> too. When it melts, the water runs down the mountain.'); }
      else if (precipNew) ui.say('Drip, drop! The drops got so big and heavy that they fell. Water falling from clouds is <b>precipitation</b>. Rain, snow and hail are all precipitation!');
      // the water reaches the river where it fell (over the mountain: at the top) and flows to the lake
      const u0 = snow ? 0 : clamp(1 - (s.cloudX - 312) / (628 - 312), 0, 1);
      s.flow = { u0, t0: st.t + (RM ? 0 : 1.4), dur: RM ? 0 : 2.2 * (1 - u0) + .4 };
    }
    function arrived() {
      s.flow = null; s.lake = Math.min(1, s.lake + .25); Sound.splash();
      if (!found('collect')) { earn('collect', LAKE[0], LAKE[1] - 20); ui.say('The water runs into rivers, and the rivers carry it back to the lake. This is <b>collection</b>. Now the sun can warm it up again!', { queue: true }); }
      if (!found('snow') && !s.told.again) { s.told.again = true; ui.say('Let\'s go around again! This time, make it snow on the mountain.', { queue: true }); }
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      if (s.puff && !s.puff.join && dist(x, y, s.puff.x, s.puff.y) < 55) { s.drag = { kind: 'puff', dx: s.puff.x - x, dy: s.puff.y - y }; Sound.fwip(); return; }
      if (s.drops && !raining() && st.hit(cloudPath(), x, y)) { s.drag = { kind: 'cloud', dx: s.cloudX - x, x0: x, moved: 0 }; Sound.fwip(); return; }
      if (dist(x, y, ...SUN) < 62) { tapSun(); return; }
      if (x > MTN && y > 170 && y < 400) { Sound.tap(8); ui.say('Brrr! It\'s cold up on the mountain.'); return; }
      if (dist(x, y, ...LAKE) < 150 && y > 420) { Sound.drip(); return; }
      Sound.tap(Math.floor(x / 80));
    };
    st.onMove = (x, y) => {
      const d = s.drag; if (!d) return;
      if (d.kind === 'puff') { s.puff.x = clamp(x + d.dx, 40, 760); s.puff.y = clamp(y + d.dy, 40, 520); s.puff.risen = true; }
      else { s.cloudX = clamp(x + d.dx, 250, 720); d.moved = Math.max(d.moved, Math.abs(x - d.x0)); }
    };
    st.onUp = () => {
      const d = s.drag; s.drag = null; if (!d) return;
      if (d.kind === 'puff') { if (s.puff.y < COLD) joinCloud(); else Sound.tap(2); return; }
      if (d.moved < 10) { if (heavy()) rain(); else { Sound.tap(3); ui.say('It needs more water first! Tap the sun.'); } }
      else Sound.tap(overMountain() ? 8 : 4);
    };

    function drawMountain(c) {
      const M = new Path2D('M500 402 L660 168 L716 236 L760 196 L840 402 Z'); c.fillStyle = WC.rock; c.fill(M); c.strokeStyle = C.ink; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke(M);
      c.save(); c.clip(M); c.fillStyle = WC.rockDeep; c.beginPath(); c.moveTo(660, 168); c.lineTo(700, 402); c.lineTo(840, 402); c.lineTo(760, 196); c.lineTo(716, 236); c.closePath(); c.globalAlpha = .35; c.fill(); c.globalAlpha = 1;
      const h = 40 + s.snowcap * 70; c.fillStyle = WC.snow; c.fillRect(480, 160, 380, h); c.restore();
      c.strokeStyle = C.ink; c.lineWidth = 4; c.stroke(M);
    }
    function drawRiver(c, t) {
      const R = new Path2D(); R.moveTo(...RIVER[0]); R.bezierCurveTo(...RIVER[1], ...RIVER[2], ...RIVER[3]);
      c.save(); c.lineCap = 'round'; c.strokeStyle = C.ink; c.lineWidth = 20; c.stroke(R); c.strokeStyle = WC.lake; c.lineWidth = 13; c.stroke(R);
      if (s.flow && st.t > s.flow.t0) { // a bright rush of water running down to the lake
        const k = s.flow.dur ? clamp((st.t - s.flow.t0) / s.flow.dur, 0, 1) : 1, u = lerp(s.flow.u0, 1, k);
        c.strokeStyle = '#BFE8FF'; c.lineWidth = 7; c.beginPath(); for (let v = Math.max(s.flow.u0, u - .25); v <= u + .001; v += .02) { const [px, py] = riverAt(Math.min(1, v)); v === Math.max(s.flow.u0, u - .25) ? c.moveTo(px, py) : c.lineTo(px, py); } c.stroke();
        if (k >= 1) arrived();
      }
      c.restore();
    }
    st.draw = (c, t, dt) => {
      sky(c, WC.sky1, WC.sky2, 410);
      // the cold air up high, so it's clear where vapor becomes cloud
      c.save(); c.setLineDash([8, 10]); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(220, COLD); c.lineTo(W, COLD); c.stroke(); c.restore();
      label(c, "Cold air up high", 300, COLD - 16, { size: 17, color: WC.accent });
      // the sun
      const sg = st.over(circle(...SUN, 62)); if (sg) glowOn(c); sun(c, ...SUN, 40, t, { glow: st.t - (s.sunT || -9) < 1 ? 1 : sg ? .6 : 0 }); c.shadowBlur = 0;
      // after a shower, when the sun comes back out, a rainbow shows up and fades away
      if (s.rainT > 0 && !s.rainSnow) { const e = st.t - s.rainT - 2.4; rainbow(c, 520, 420, 230, e > 0 ? clamp(Math.min(e / 1.2, (8 - e) / 1.5), 0, 1) : 0); }
      drawMountain(c);
      // the land and the lake
      c.fillStyle = C.grass; c.beginPath(); c.moveTo(0, 400); c.quadraticCurveTo(300, 380, 520, 398); c.lineTo(W, 398); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill(); c.strokeStyle = C.grassDeep; c.lineWidth = 4; c.stroke();
      drawRiver(c, t);
      const lake = ellipse(LAKE[0], LAKE[1] + 10, 175, 62 + s.lake * 6); c.fillStyle = WC.lake; c.fill(lake); c.strokeStyle = C.ink; c.lineWidth = 4; c.stroke(lake);
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; for (const [wx, wy] of [[110, 470], [210, 500], [250, 462]]) { const w = RM ? 0 : Math.sin(t * 2 + wx) * 4; c.beginPath(); c.moveTo(wx - 18 + w, wy); c.quadraticCurveTo(wx + w, wy - 6, wx + 18 + w, wy); c.stroke(); }
      for (const [tx, ty] of [[420, 470], [470, 440], [700, 470]]) { c.fillStyle = C.leafDeep; c.strokeStyle = C.ink; c.lineWidth = 3; c.fillRect(tx - 4, ty, 8, 20); c.strokeRect(tx - 4, ty, 8, 20); c.fillStyle = C.leaf; c.beginPath(); c.arc(tx, ty - 8, 20, 0, TAU); c.fill(); c.stroke(); }
      // evaporation: wisps rise from the warm lake while a puff of vapor floats up
      if (s.puff) {
        const p = s.puff;
        if (p.join != null) { const k = RM ? 1 : clamp((st.t - p.join) / .6, 0, 1); p.x = lerp(p.x, s.cloudX, k); p.y = lerp(p.y, CY, k); vaporPuff(c, p.x, p.y, t, 1 - k); if (k >= 1) joined(); }
        else {
          if (!p.risen && !s.drag) { p.y -= 90 * dt; if (p.y <= 300) { p.y = 300; p.risen = true; } }
          if (!RM && !p.risen) for (let i = 0; i < 3; i++) { const k = (t * .8 + i / 3) % 1; c.strokeStyle = `rgba(255,255,255,${.7 * (1 - k)})`; c.lineWidth = 3; c.beginPath(); c.moveTo(120 + i * 50, 460 - k * 60); c.quadraticCurveTo(130 + i * 50, 440 - k * 60, 120 + i * 50, 420 - k * 60); c.stroke(); }
          if (st.over(circle(p.x, p.y, 55)) || (s.drag && s.drag.kind === 'puff')) { c.save(); glowOn(c); vaporPuff(c, p.x, p.y, t); c.restore(); } else vaporPuff(c, p.x, p.y, t);
          if (p.risen && !s.drag) label(c, "Drag me up!", p.x, p.y - 52 - (RM ? 0 : Math.abs(Math.sin(t * 4)) * 6), { size: 20, color: C.carrot });
          if (s.drag && s.drag.kind === 'puff') st.cursor = 'grabbing';
        }
      }
      // the cloud: bigger with every puff, grey when it's full
      if (s.drops || raining()) {
        const r = raining(), k = r ? clamp(1 - (st.t - s.rainT) / 2.6, 0, 1) : 0, sc = r ? .55 + .5 * k : cloudScale();
        if (r) precip(c, t, s.cloudX - 70 * sc, s.cloudX + 70 * sc, CY + 30, s.rainSnow ? 240 : 400, s.rainSnow, 24);
        const col = r ? mix(WC.storm, WC.cloud, 1 - k) : mix(WC.cloud, WC.storm, Math.max(0, s.drops - 1) / 2);
        const over = !r && st.over(cloudPath());
        c.save(); if (over || (s.drag && s.drag.kind === 'cloud')) glowOn(c); puffCloud(c, s.cloudX, CY + (heavy() && !RM ? Math.sin(t * 3) * 2 : 0), sc, col, { face: { t, full: heavy() } }); c.restore();
        if (r && !s.rainSnow) splashes(c, t, s.cloudX - 70 * sc, s.cloudX + 70 * sc, s.cloudX < 340 ? 462 : 404, 7);
        if (heavy() && !s.drag) label(c, overMountain() ? "Tap to snow!" : "Tap to rain!", s.cloudX, CY + 74 - (RM ? 0 : Math.abs(Math.sin(t * 4)) * 6), { size: 20, color: C.carrot });
        if (s.drops && !heavy() && !s.puff) for (let i = 0; i < 3; i++) { c.fillStyle = i < s.drops ? C.water : 'rgba(255,255,255,.8)'; c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.arc(s.cloudX - 24 + i * 24, CY + 62, 7, 0, TAU); c.fill(); c.stroke(); }
      }
      if (!s.puff && !heavy() && !raining() && !s.flow && t - s.lastAct > 4) label(c, "Tap the sun!", SUN[0] + 10, SUN[1] + 82 - (RM ? 0 : Math.abs(Math.sin(t * 4)) * 6), { size: 20, color: C.carrot });
      if (s.earnedHere && A_wcycle.stars.every(q => Store.data.stars[q.id]) && !s.told.all) { s.told.all = true; ui.say('Evaporation, condensation, precipitation, collection. Around and around it goes. That\'s the <b>water cycle</b>!', { queue: true }); }
    };
    ui.button('Start over', () => { reset(); Sound.pop(); App.sayQ.length = 0; ui.say(A_wcycle.intro); });
    ui.hint("Try it: on a sunny day, draw around a puddle with chalk. Check it every hour. Where does the water go?");
    reset();
    return { stage: st, state: () => s, geo: { sun: SUN, lake: LAKE, cy: CY, cold: COLD, mountain: MTN }, destroy() { st.destroy(); } };
  }
};
