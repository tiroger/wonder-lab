/* ============ Activity: Cloud Maker ============ */
// A cloud sandbox: tap the sea to add water vapor, drag the cloud high or low to change what kind it is,
// overfill it in the middle of the sky to grow a thunderstorm, and drag the thermometer below freezing for snow.
const A_clouds = {
  id: 'weather.clouds', name: 'Cloud Maker', icon: 'clouds',
  badge: { id: 'weather.b.clouds', name: 'Cloud Spotter', desc: 'You made four kinds of clouds and a snowstorm!', how: 'Not yet! Make every kind of cloud, and some snow, in <b>Cloud Maker</b>.', reward: 'kite' },
  stars: [{ id: 'weather.clouds.cumulus', name: 'Cumulus' }, { id: 'weather.clouds.stratus', name: 'Stratus' }, { id: 'weather.clouds.cirrus', name: 'Cirrus' }, { id: 'weather.clouds.storm', name: 'Storm cloud' }, { id: 'weather.clouds.snow', name: 'Snow' }],
  intro: 'Let\'s make clouds! <b>Tap the sea</b> to add water vapor. Then <b>drag the cloud</b> up and down.',
  facts: ['Did you know? A big puffy cloud can weigh as much as 100 elephants! Its drops are so tiny and spread out that it floats.', 'Did you know? Fog is a cloud that sits right on the ground.'],
  mount(host, ui) {
    const st = new Stage(host, 'A big sky over the sea, with a cloud you can drag up and down, a height scale on the left and a thermometer on the right.');
    const SEA = 470, HIGH = 190, LOW = 330, TH = { x: 730, top: 110, bot: 420 }, FREEZE = .3, MAXV = 6;
    const NAMES = { cumulus: "Cumulus", stratus: "Stratus", cirrus: "Cirrus", storm: "Cumulonimbus" };
    const found = k => !!Store.data.stars['weather.clouds.' + k];
    const earn = (k, x, y) => { if (ui.award('weather.clouds.' + k, ...st.client(x, y))) s.earnedHere = true; };
    let s;
    function reset() { s = { v: 0, x: 400, y: 260, drag: null, temp: .8, puffs: [], shown: null, prev: null, fadeT: -9, settle: 0, storm: null, boltT: -9, lastAct: Loop.t, told: {}, earnedHere: false }; }
    const kind = () => !s.v ? null : s.y < HIGH ? 'cirrus' : s.y > LOW ? 'stratus' : s.storm || s.v >= MAXV ? 'storm' : 'cumulus';
    const freezing = () => s.temp < FREEZE, thY = v => lerp(TH.bot, TH.top, v);
    const LINES = {
      cumulus: 'A puffy cloud, like a cotton ball! This is a <b>cumulus</b> cloud. Cumulus clouds usually mean nice weather.',
      stratus: 'A low, flat, grey blanket! This is a <b>stratus</b> cloud. Fog is a stratus cloud right on the ground.',
      cirrus: 'Way up high, it\'s freezing, so this cloud is made of tiny bits of ice. Thin and wispy, like feathers! It\'s called <b>cirrus</b>.',
      storm: 'Whoa! All that vapor made the cloud grow super tall. It\'s a <b>cumulonimbus</b>, a thunderstorm cloud! Storm clouds bring heavy rain.'
    };
    // what's still left to make, said after a new kind of cloud (queued, so it follows the explanation)
    function nextIdea() {
      if (!found('cirrus') || !found('stratus')) ui.say('Now drag the cloud way up high, or way down low!', { queue: true });
      else if (!found('storm')) ui.say('Bring the cloud back to the middle. Then <b>tap the sea</b> lots of times!', { queue: true });
      else if (!found('snow') && !freezing()) ui.say('What if the air were freezing? <b>Drag the thermometer</b> down, then make a storm cloud!', { queue: true });
    }
    function settled(k) {   // a kind of cloud the kid made and let go of
      if (!k || found(k)) return;
      earn(k, s.x, s.y); ui.say(LINES[k]); nextIdea();
    }
    function startStorm() { s.storm = { t0: st.t }; s.boltT = st.t; Sound.thunder(); }
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      if (Math.abs(x - TH.x) < 40 && y > TH.top - 20 && y < TH.bot + 40) { s.drag = { kind: 'th' }; Sound.tap(Math.round(s.temp * 8)); st.onMove(x, y); return; }
      if (s.v && dist(x, y, s.x, s.y) < (kind() === 'stratus' ? 150 : 110) && Math.abs(y - s.y) < 110) { s.drag = { kind: 'cloud', dx: s.x - x, dy: s.y - y }; Sound.fwip(); return; }
      if (y > SEA) {
        if (s.v >= MAXV) { Sound.drip(); ui.say('The cloud is full of vapor!', { polite: true }); return; }
        Sound.steam(); s.puffs.push({ x, t0: st.t });
        return;
      }
      Sound.tap(Math.floor(x / 80));
    };
    st.onMove = (x, y) => {
      const d = s.drag; if (!d) return;
      if (d.kind === 'th') { const v = clamp((TH.bot - y) / (TH.bot - TH.top), 0, 1); if (Math.round(v * 8) !== Math.round(s.temp * 8)) Sound.tap(Math.round(v * 8)); s.temp = v; }
      else { s.x = clamp(x + d.dx, 170, 620); s.y = clamp(y + d.dy, 100, 420); }
    };
    st.onUp = () => {
      const d = s.drag; s.drag = null; if (!d) return;
      if (d.kind === 'cloud') { const k = kind(); Sound.tap(k === 'cirrus' ? 8 : k === 'stratus' ? 1 : 4); s.settle = st.t; }
    };

    function drawKind(c, k, t, a) {
      if (!k || a <= 0) return; c.save(); c.globalAlpha = a; const hov = !s.drag && st.p.inside && dist(st.p.x, st.p.y, s.x, s.y) < 110; if (hov || (s.drag && s.drag.kind === 'cloud')) { glowOn(c); st.cursor = s.drag ? 'grabbing' : 'grab'; }
      if (k === 'cumulus') puffCloud(c, s.x, s.y, .7 + s.v * .06, WC.cloud, { face: { t } });
      if (k === 'stratus') { stratusCloud(c, s.x, s.y, 1); c.shadowBlur = 0; cloudFace(c, s.x, s.y + 2, t); }
      if (k === 'cirrus') cirrusCloud(c, s.x, s.y, 1, t);
      if (k === 'storm') { stormCloud(c, s.x, s.y + 20, 1); c.shadowBlur = 0; cloudFace(c, s.x, s.y + 6, t, true); }
      c.restore();
    }
    st.draw = (c, t, dt) => {
      // the sky darkens a little toward the top, where it's high and cold
      sky(c, '#5DAEE0', WC.sky2, SEA);
      c.save(); c.setLineDash([8, 12]); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; for (const y of [HIGH, LOW]) { c.beginPath(); c.moveTo(120, y); c.lineTo(660, y); c.stroke(); } c.restore();
      // the height scale
      c.fillStyle = '#FFFDF5'; c.strokeStyle = C.ink; c.lineWidth = 3; const pole = rrect(26, 70, 18, SEA - 70, 9); c.fill(pole); c.stroke(pole);
      for (const [y, txt] of [[130, "High"], [260, "Middle"], [400, "Low"]]) label(c, txt, 74, y, { size: 19, color: C.ink, align: 'left' });
      // the sea, with a little island for scale
      c.fillStyle = WC.lake; c.fillRect(0, SEA, W, H - SEA); c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(0, SEA); c.lineTo(W, SEA); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; for (let x = 30; x < W; x += 90) { const w = RM ? 0 : Math.sin(t * 2 + x) * 5; c.beginPath(); c.moveTo(x + w, SEA + 30 + (x % 3) * 12); c.quadraticCurveTo(x + 20 + w, SEA + 22 + (x % 3) * 12, x + 40 + w, SEA + 30 + (x % 3) * 12); c.stroke(); }
      const isl = ellipse(560, SEA + 4, 70, 18); c.fillStyle = '#F1DDB0'; c.fill(isl); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(isl);
      c.strokeStyle = '#8A6B3E'; c.lineWidth = 6; c.beginPath(); c.moveTo(560, SEA - 6); c.quadraticCurveTo(552, SEA - 40, 566, SEA - 70); c.stroke(); for (const r of [-160, -110, -60, -10]) drawLeaf(c, 566, SEA - 70, r, .3);
      // vapor rising from the sea to the cloud
      s.puffs = s.puffs.filter(p => {
        const k = RM ? 1 : clamp((st.t - p.t0) / .9, 0, 1); vaporPuff(c, lerp(p.x, s.v ? s.x : 400, k), lerp(SEA - 20, s.v ? s.y : 260, k), t, 1 - k * .6);
        if (k < 1) return true;
        if (!s.v) { s.x = 400; s.y = 260; }
        s.v = Math.min(MAXV, s.v + 1); Sound.pop(); s.settle = st.t; return false;
      });
      // the cloud: when its kind changes, the old shape fades into the new one
      const k = kind();
      if (k !== s.shown) { s.prev = s.shown; s.shown = k; s.fadeT = st.t; if (k === 'storm' && !s.storm) startStorm(); }
      const fk = RM ? 1 : clamp((st.t - s.fadeT) / .5, 0, 1);
      // a storm rains (or snows) itself out, using up its vapor
      if (s.storm) {
        const snow = freezing(), e = st.t - s.storm.t0;
        if (k === 'storm') {
          precip(c, t, s.x - 80, s.x + 80, s.y + 60, SEA, snow, 28); if (!snow) splashes(c, t, s.x - 80, s.x + 80, SEA + 6, 6);
          if (st.t - s.boltT > 3.6) { s.boltT = st.t; Sound.thunder(); }
          if (st.t - s.boltT < .35) bolt(c, s.x + 30, s.y + 54, 1.1);
          if (snow && !found('snow') && found('storm')) { earn('snow', s.x, s.y + 120); ui.say('Brrr! The air is below freezing, so the water falls as <b>snow</b> instead of rain.', { queue: true }); }
          if (e > 8) { s.storm = null; s.v = 4; }
        } else s.storm = null;
      }
      drawKind(c, s.prev, t, 1 - fk); drawKind(c, k, t, fk);
      if (k && !s.drag) tag(c, NAMES[k], s.x, k === 'storm' ? s.y - 175 : s.y - 78);
      // award a kind once the cloud has settled there for a moment
      if (k && !s.drag && st.t - s.settle > .5 && fk >= 1) settled(k);
      // the thermometer: red liquid on a scale from warm to freezing
      const tube = rrect(TH.x - 14, TH.top - 16, 28, TH.bot - TH.top + 32, 14); c.fillStyle = '#FFFDF5'; c.fill(tube);
      const ly = thY(s.temp); c.fillStyle = freezing() ? '#6FA8DC' : WC.red; c.fillRect(TH.x - 6, ly, 12, TH.bot + 16 - ly);
      c.strokeStyle = C.ink; c.lineWidth = 3.5; c.stroke(tube); c.beginPath(); c.arc(TH.x, TH.bot + 30, 20, 0, TAU); c.fillStyle = freezing() ? '#6FA8DC' : WC.red; c.fill(); c.stroke();
      c.strokeStyle = WC.accent; c.lineWidth = 3; c.beginPath(); c.moveTo(TH.x - 26, thY(FREEZE)); c.lineTo(TH.x + 26, thY(FREEZE)); c.stroke();
      label(c, "Warm", TH.x, TH.top - 34, { size: 17 }); label(c, "Freezing", TH.x - 40, thY(FREEZE), { size: 16, align: 'right', color: WC.accent });
      const hb = st.over(rrect(TH.x - 40, TH.top - 20, 80, TH.bot - TH.top + 60, 20)); if (hb || (s.drag && s.drag.kind === 'th')) { st.cursor = 'ns-resize'; c.save(); glowOn(c); c.fillStyle = '#FFFDF5'; c.beginPath(); c.arc(TH.x, ly, 9, 0, TAU); c.fill(); c.restore(); }
      c.fillStyle = '#FFFDF5'; c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.arc(TH.x, ly, 9, 0, TAU); c.fill(); c.stroke();
      // hints on the canvas before Pip says them
      const bob = RM ? 0 : Math.abs(Math.sin(t * 4)) * 6;
      if (!s.v && !s.puffs.length && t - s.lastAct > 3) label(c, "Tap the sea!", 300, SEA + 46 - bob, { size: 21, color: C.carrot });
      if (s.v && found('cumulus') && !(found('cirrus') && found('stratus')) && !s.drag && t - s.lastAct > 6) label(c, "Drag me!", s.x, s.y + 74 - bob, { size: 20, color: C.carrot });
      if (s.earnedHere && A_clouds.stars.every(q => Store.data.stars[q.id]) && !s.told.all) { s.told.all = true; ui.say('You made cumulus, stratus, cirrus and a storm cloud, and even snow. You\'re a real cloud spotter!', { queue: true }); }
    };
    ui.button('Clear the sky', () => { reset(); Sound.pop(); App.sayQ.length = 0; ui.say(A_clouds.intro); });
    ui.hint("Try it: look up today. Are the clouds puffy, flat or wispy? Puffy cumulus, flat stratus, wispy cirrus!");
    reset();
    return { stage: st, state: () => s, geo: { sea: SEA, high: HIGH, low: LOW, th: TH, freeze: FREEZE }, destroy() { st.destroy(); } };
  }
};
