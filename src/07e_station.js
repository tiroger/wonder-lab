/* ============ Activity: Weather Station ============ */
// The class's daily weather readings: change the weather (drag the sun, swipe up wind, drag in a rain cloud and tap it)
// and read each tool: thermometer, wind vane, anemometer, rain gauge and barometer.
const A_station = {
  id: 'weather.station', name: 'Weather Station', icon: 'station',
  badge: { id: 'weather.b.station', name: 'Weather Watcher', desc: 'You used every tool at the weather station!', how: 'Not yet! Try every tool at the <b>Weather Station</b>.', reward: 'windsock' },
  stars: [{ id: 'weather.station.thermo', name: 'Thermometer' }, { id: 'weather.station.vane', name: 'Wind vane' }, { id: 'weather.station.anemo', name: 'Anemometer' }, { id: 'weather.station.gauge', name: 'Rain gauge' }, { id: 'weather.station.baro', name: 'Barometer' }],
  intro: 'Scientists use tools to measure the weather. <b>Tap a tool</b> to find out what it does!',
  facts: ['Did you know? <b>Weather</b> is what the sky is doing today. <b>Climate</b> is the usual weather of a place over many years.', 'Did you know? Wind is moving air. It blows from where the air pushes hard to where it pushes less.'],
  mount(host, ui) {
    const st = new Stage(host, 'A school weather station in a grassy yard: a thermometer, a wind vane, spinning wind cups, a rain gauge and a barometer, with a sun you can drag, a rain cloud and a sky you can swipe to make wind.');
    const GROUND = 330, BASE = 476, GAUGE = 560;
    const T = { thermo: [120, 380], vane: [270, 300], anemo: [420, 320], gauge: [GAUGE, 420], baro: [690, 380] };
    const found = k => !!Store.data.stars['weather.station.' + k];
    const earn = (k, x, y) => { if (ui.award('weather.station.' + k, ...st.client(x, y))) s.earnedHere = true; };
    let s;
    function reset() { s = { sunH: .25, temp: .35, temp0: .35, wind: 0, windSeen: false, vaneA: PI / 2, spin: 0, cloudX: 770, rainT: -9, rain: 0, press: 1, drag: null, lastAct: Loop.t, hinted: {}, told: {}, earnedHere: false }; }
    const sunPos = (h = s.sunH) => [lerp(90, 210, h), lerp(300, 78, h)];
    const raining = () => st.t - s.rainT < 4;
    const cloudPath = () => ellipse(s.cloudX, 104, 110, 62);
    const tool = (k, x, y) => {
      const R = { thermo: rrect(88, 270, 64, 210, 12), vane: rrect(200, 210, 140, 270, 12), anemo: rrect(360, 240, 120, 240, 12), gauge: rrect(522, 350, 76, 130, 12), baro: rrect(640, 320, 100, 160, 16) }[k];
      return x == null ? R : st.hit(R, x, y);
    };
    const READ = {
      thermo: { ok: () => s.temp - s.temp0 > .15, tip: 'This is a <b>thermometer</b>. It measures how hot or cold the air is. <b>Drag the sun</b> up high and watch it!', star: 'The red line went up! The sun warmed the air. The <b>temperature</b>, how hot or cold it is, went up. A thermometer measures temperature.' },
      vane: { ok: () => s.windSeen, tip: 'This is a <b>wind vane</b>. <b>Swipe across the sky</b> to make some wind!', star: 'A <b>wind vane</b> turns to point to where the wind is coming from. Swipe the other way and watch it turn!' },
      anemo: { ok: () => s.windSeen, tip: 'This is an <b>anemometer</b>. Its cups catch the wind. <b>Swipe across the sky</b> to make wind!', star: 'The cups are spinning! An <b>anemometer</b> measures how fast the wind blows. The faster they spin, the stronger the wind.' },
      gauge: { ok: () => s.rain > .2, tip: 'This is a <b>rain gauge</b>. <b>Drag the cloud</b> over it, then tap the cloud to make it rain!', star: 'Look how much rain it caught! A <b>rain gauge</b> measures how much rain fell.' },
      baro: { ok: () => s.press < .5, tip: 'This is a <b>barometer</b>. It measures <b>air pressure</b>, the push of the air all around us. When a storm is coming, the needle drops. <b>Drag the storm cloud in</b> and see!', star: 'The needle dropped! Low air pressure often brings clouds and rain.' }
    };
    function readTool(k) {
      const r = READ[k]; Sound.tap({ thermo: 2, vane: 4, anemo: 5, gauge: 6, baro: 7 }[k]);
      if (!r.ok()) { s.hinted[k] = true; ui.say(r.tip); return; }
      earn(k, ...T[k]); ui.say(r.star);
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t; const [sx, sy] = sunPos();
      if (dist(x, y, sx, sy) < 58) { s.drag = { kind: 'sun' }; Sound.fwip(); return; }
      if (st.hit(cloudPath(), x, y)) { s.drag = { kind: 'cloud', dx: s.cloudX - x, x0: x, moved: 0 }; Sound.fwip(); return; }
      for (const k of Object.keys(T)) if (tool(k, x, y)) { readTool(k); return; }
      if (y < GROUND) { s.drag = { kind: 'wind', x0: x, t0: st.t, last: x }; Sound.tap(Math.floor(x / 90)); return; }
      Sound.tap(Math.floor(x / 80));
    };
    st.onMove = (x, y) => {
      const d = s.drag; if (!d) return;
      if (d.kind === 'sun') { const h = clamp((300 - y) / 222, 0, 1); s.sunH = h; }
      if (d.kind === 'cloud') { s.cloudX = clamp(x + d.dx, 330, 770); d.moved = Math.max(d.moved, Math.abs(x - d.x0)); }
      if (d.kind === 'wind') { const v = (x - d.last); d.last = x; if (Math.abs(v) > 6) { s.wind = clamp(s.wind + v / 160, -1.6, 1.6); if (Math.abs(s.wind) > .35 && !s.windSeen) { s.windSeen = true; Sound.whoosh(); } } }
    };
    st.onUp = () => {
      const d = s.drag; s.drag = null; if (!d) return;
      if (d.kind === 'cloud' && d.moved < 10) { if (raining()) Sound.drip(); else { s.rainT = st.t; Sound.rain(); } }
      if (d.kind === 'wind' && Math.abs(s.wind) > .35) Sound.whoosh();
    };

    function drawThermo(c) {
      const [x] = T.thermo, F = Math.round(40 + s.temp * 50);
      c.fillStyle = '#C9955A'; c.strokeStyle = C.ink; c.lineWidth = 3; c.fillRect(x - 6, 440, 12, BASE - 440); c.strokeRect(x - 6, 440, 12, BASE - 440);
      const board = rrect(x - 28, 276, 56, 168, 10); c.fillStyle = '#FFFDF5'; c.fill(board); c.stroke(board);
      const top = 292, bot = 414, ly = lerp(bot, top, s.temp);
      const tube = rrect(x - 7, top - 4, 14, bot - top + 12, 7); c.fillStyle = '#EEF4F8'; c.fill(tube); c.fillStyle = WC.red; c.fillRect(x - 3.5, ly, 7, bot + 6 - ly); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke(tube);
      c.fillStyle = WC.red; c.beginPath(); c.arc(x, bot + 14, 10, 0, TAU); c.fill(); c.stroke();
      c.lineWidth = 2; for (let i = 0; i <= 5; i++) { const y = lerp(bot, top, i / 5); c.beginPath(); c.moveTo(x + 9, y); c.lineTo(x + 16, y); c.stroke(); }
      label(c, `${F}°`, x + 34, 300, { size: 20, color: WC.red, align: 'left' });
    }
    function drawVane(c) {
      const [x] = T.vane, y = 300, len = 64 * Math.cos(s.vaneA);   // seen from the side: the arrow looks shorter as it turns toward us
      c.strokeStyle = C.ink; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, BASE); c.lineTo(x, y); c.stroke(); c.strokeStyle = '#C8CDD2'; c.lineWidth = 3; c.stroke();
      c.strokeStyle = C.ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 46, 340); c.lineTo(x + 46, 340); c.stroke(); label(c, "W", x - 58, 340, { size: 17 }); label(c, "E", x + 58, 340, { size: 17 });
      c.save(); c.translate(x, y); c.lineJoin = 'round'; c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.moveTo(-len, 0); c.lineTo(len, 0); c.stroke();
      // the head points into the wind; the tail fin catches it
      c.fillStyle = C.carrot; c.lineWidth = 3; c.beginPath(); c.moveTo(-len - 18 * Math.sign(len || 1), 0); c.lineTo(-len, -11); c.lineTo(-len, 11); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = WC.accent; c.beginPath(); c.moveTo(len, 0); c.lineTo(len + 16 * Math.sign(len || 1), -20); c.lineTo(len + 22 * Math.sign(len || 1), 0); c.lineTo(len + 16 * Math.sign(len || 1), 20); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = C.ink; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); c.restore();
    }
    function drawAnemo(c) {
      const [x] = T.anemo, y = 270;
      c.strokeStyle = C.ink; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, BASE); c.lineTo(x, y); c.stroke(); c.strokeStyle = '#C8CDD2'; c.lineWidth = 3; c.stroke();
      for (let i = 0; i < 3; i++) { const a = s.spin + i * TAU / 3, cx = x + Math.cos(a) * 42, cy = y + Math.sin(a) * 12, back = Math.sin(a) < 0;
        c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(cx, cy); c.stroke();
        c.fillStyle = back ? '#3E7FA8' : WC.accent; c.beginPath(); c.arc(cx, cy, 11, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(cx - 3, cy - 3, 3.5, 0, TAU); c.fill(); }
      c.fillStyle = C.ink; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
    }
    function drawGauge(c) {
      const x = GAUGE, top = 372, bot = BASE - 8, lvl = lerp(bot, top + 14, clamp(s.rain, 0, 1));
      c.fillStyle = '#C9955A'; c.strokeStyle = C.ink; c.lineWidth = 3; c.fillRect(x - 24, bot, 48, 10); c.strokeRect(x - 24, bot, 48, 10);
      const tube = rrect(x - 16, top, 32, bot - top, 6); c.fillStyle = 'rgba(221,243,247,.9)'; c.fill(tube); c.fillStyle = C.water; c.fillRect(x - 14, lvl, 28, bot - lvl); c.stroke(tube);
      c.fillStyle = 'rgba(221,243,247,.9)'; c.beginPath(); c.moveTo(x - 30, top - 14); c.lineTo(x + 30, top - 14); c.lineTo(x + 16, top + 6); c.lineTo(x - 16, top + 6); c.closePath(); c.fill(); c.stroke();
      c.lineWidth = 2; for (let i = 1; i <= 4; i++) { const y = lerp(bot, top + 14, i / 4); c.beginPath(); c.moveTo(x + 6, y); c.lineTo(x + 16, y); c.stroke(); }
    }
    function drawBaro(c) {
      const [x, y] = T.baro, a = lerp(PI * 1.2, PI * 1.8, s.press);
      c.fillStyle = '#A87445'; c.strokeStyle = C.ink; c.lineWidth = 3; c.fillRect(x - 6, y + 44, 12, BASE - y - 44); c.strokeRect(x - 6, y + 44, 12, BASE - y - 44);
      c.fillStyle = '#C9955A'; c.beginPath(); c.arc(x, y, 50, 0, TAU); c.fill(); c.lineWidth = 4; c.stroke();
      c.fillStyle = '#FFFDF5'; c.beginPath(); c.arc(x, y, 40, 0, TAU); c.fill(); c.lineWidth = 2.5; c.stroke();
      c.lineWidth = 6; c.lineCap = 'butt'; for (const [a0, a1, col] of [[1.15, 1.42, '#6FA8DC'], [1.42, 1.58, '#C8CDD2'], [1.58, 1.85, C.sun]]) { c.strokeStyle = col; c.beginPath(); c.arc(x, y, 32, a0 * PI, a1 * PI); c.stroke(); }
      label(c, "Rain", x - 22, y + 16, { size: 13, stroke: null }); label(c, "Fair", x + 22, y + 16, { size: 13, stroke: null });
      c.strokeStyle = WC.red; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); c.stroke();
      c.fillStyle = C.ink; c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill();
    }
    st.draw = (c, t, dt) => {
      // the weather changes a little each frame: temperature follows the sun, wind dies down, pressure follows the cloud
      const tt = .2 + .75 * s.sunH - (raining() ? .1 : 0); s.temp += (tt - s.temp) * Math.min(1, dt * (RM ? 9 : .9));
      s.wind *= Math.exp(-dt / 5); if (Math.abs(s.wind) < .02) s.wind = 0;
      // pressure is high in fair weather and low once the storm is over the yard
      const pt = clamp((s.cloudX - 600) / 170, 0, 1); s.press += (pt - s.press) * Math.min(1, dt * (RM ? 9 : 1.2));
      s.spin += s.wind * dt * 9;
      const va = s.wind > .05 ? 0 : s.wind < -.05 ? PI : s.vaneA; s.vaneA = RM ? va : s.vaneA + clamp(va - s.vaneA, -3 * dt, 3 * dt);
      if (raining()) { const k = Math.abs(s.cloudX - GAUGE) < 130 ? 1 : 0; s.rain = Math.min(1, s.rain + k * dt * .2); }
      // sky and sun
      const dim = 1 - s.press; sky(c, mix(WC.sky1, '#8E9DB0', dim * .6), mix(WC.sky2, '#D3DAE3', dim * .6), GROUND + 4);
      const [sx, sy] = sunPos(), sg = st.over(circle(sx, sy, 58)) || (s.drag && s.drag.kind === 'sun'); if (sg) glowOn(c); sun(c, sx, sy, 36, t, { glow: sg ? .7 : 0 }); c.shadowBlur = 0;
      // wind: white streaks blowing across, in the wind's direction
      if (s.wind) { c.save(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.lineCap = 'round'; const r = seeded(4);
        for (let i = 0; i < 8; i++) { const y = 60 + r() * 380, sp = 300 * s.wind, x = RM ? r() * W : (((r() * W + t * sp) % (W + 200)) + W + 200) % (W + 200) - 100, len = 50 * Math.min(1, Math.abs(s.wind)); c.globalAlpha = Math.min(1, Math.abs(s.wind)); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - Math.sign(s.wind) * len * .5, y - 6, x - Math.sign(s.wind) * len, y); c.stroke(); }
        c.restore(); }
      // the yard
      c.fillStyle = C.grass; c.fillRect(0, GROUND, W, H - GROUND); c.strokeStyle = C.grassDeep; c.lineWidth = 4; c.beginPath(); c.moveTo(0, GROUND); c.lineTo(W, GROUND); c.stroke();
      const r = seeded(3); c.strokeStyle = C.grassDeep; c.lineWidth = 3; c.lineCap = 'round';
      for (let i = 0; i < 70; i++) { const bx = r() * W, by = GROUND + 20 + r() * 200, bh = 8 + r() * 10, sw = (RM ? 0 : Math.sin(t * 2 + bx * .05) * 2) + s.wind * 6; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + sw * .5, by - bh * .5, bx + sw, by - bh); c.stroke(); }
      c.fillStyle = '#E9DCC6'; c.strokeStyle = C.ink; c.lineWidth = 3; const pad = rrect(60, BASE - 6, 700, 18, 9); c.fill(pad); c.stroke(pad);
      // the tools, each glowing when the pointer is over it
      for (const [k, fn] of [['thermo', drawThermo], ['vane', drawVane], ['anemo', drawAnemo], ['gauge', drawGauge], ['baro', drawBaro]]) { c.save(); if (st.over(tool(k))) glowOn(c); fn(c); c.restore(); if (found(k)) tag(c, { thermo: "Thermometer", vane: "Wind vane", anemo: "Anemometer", gauge: "Rain gauge", baro: "Barometer" }[k], T[k][0], 520); }
      // the rain cloud
      if (raining()) { precip(c, t, s.cloudX - 90, s.cloudX + 90, 140, BASE, false, 26); splashes(c, t, s.cloudX - 90, s.cloudX + 90, BASE + 4, 6); }
      const hc = st.over(cloudPath()) || (s.drag && s.drag.kind === 'cloud'); c.save(); if (hc) glowOn(c); puffCloud(c, s.cloudX, 104 + (RM ? 0 : Math.sin(t * 1.3) * 3), 1.2, mix(WC.cloud, WC.storm, .7), { face: { t, full: raining() } }); c.restore();
      if (s.drag) st.cursor = 'grabbing';
      // hints, shown before Pip says them again
      const bob = RM ? 0 : Math.abs(Math.sin(t * 4)) * 6, idle = t - s.lastAct > 4;
      if (idle && !Object.keys(s.hinted).length && !A_station.stars.some(q => Store.data.stars[q.id])) label(c, "Tap a tool!", 420, 216 - bob, { size: 21, color: C.carrot });
      if (idle && s.hinted.thermo && !READ.thermo.ok()) label(c, "Drag the sun!", sx + 40, sy + 64 - bob, { size: 19, color: C.carrot, align: 'left' });
      if (idle && (s.hinted.vane || s.hinted.anemo) && !s.windSeen) label(c, "Swipe the sky!", 400, 190 - bob, { size: 21, color: C.carrot });
      if (idle && (s.hinted.gauge || s.hinted.baro) && s.cloudX > 680) label(c, "Drag me in!", s.cloudX - 40, 190 - bob, { size: 19, color: C.carrot });
      if (s.earnedHere && A_station.stars.every(q => Store.data.stars[q.id]) && !s.told.all) { s.told.all = true; ui.say('You used every tool at the weather station. That\'s how scientists watch the weather every day!', { queue: true }); }
    };
    ui.button('New day', () => { ui.fresh(); reset(); Sound.pop(); ui.say(A_station.intro); });
    ui.hint("Try it: be a weather scientist! Each morning, write down the temperature, the wind and the clouds. What changes from day to day?");
    reset();
    return { stage: st, state: () => s, geo: { tools: T, sun: () => sunPos(), gauge: GAUGE }, destroy() { st.destroy(); } };
  }
};
