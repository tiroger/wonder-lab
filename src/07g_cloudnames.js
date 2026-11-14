/* ============ Activity: Cloud Names ============ */
// From NASA GLOBE's "Do You Know That Clouds Have Names?" (grades K-4): a cloud's name is a clue to its shape
// (cumulus heap, stratus layer, cirrus wisp), its height (cirro- high and icy, alto- middle) and whether it rains (nimbus).
// Pick a shape, tap the sky to pick a height, add rain, and the cloud with that name appears. Tap the jet for a contrail.
const A_cloudnames = {
  id: 'weather.names', name: 'Cloud Names', icon: 'cloudnames',
  badge: { id: 'weather.b.names', name: 'Cloud Namer', desc: 'You know the clues in cloud names: shape, height and rain!', how: 'Not yet! Make heaps, layers and wisps, high and middle clouds, a rain cloud, and tap the jet in <b>Cloud Names</b>.', reward: 'weathervane' },
  stars: [{ id: 'weather.names.shapes', name: 'Heap, layer, wisp' }, { id: 'weather.names.high', name: 'Cirro: high and icy' }, { id: 'weather.names.middle', name: 'Alto: middle clouds' }, { id: 'weather.names.rain', name: 'Nimbus: rain clouds' }, { id: 'weather.names.contrail', name: 'Contrail' }],
  intro: 'Clouds have names, and the names are clues! <b>Tap a shape</b> at the bottom. Then <b>tap the sky</b> to move your cloud higher.',
  facts: ['Did you know? A scientist named Luke Howard gave clouds names like cumulus and cirrus more than 200 years ago!', 'Did you know? There are ten main kinds of clouds. You can make nine of them here. The tenth is stratocumulus, a low, lumpy layer, like a bumpy blanket.'],
  mount(host, ui) {
    const st = new Stage(host, 'A big sky split into high, middle and low, over a school and some trees, with buttons for a cloud shape and for rain, a sun, and a jet plane that flies by.');
    const BANDS = { high: [36, 152], middle: [152, 288], low: [288, 418] }, GROUND = 418, CX = 450, SUN = [722, 78];
    const mid = b => (BANDS[b][0] + BANDS[b][1]) / 2;
    const SHAPES = [{ k: 'puffy', label: "Heap", x: 250 }, { k: 'layer', label: "Layer", x: 370 }, { k: 'wispy', label: "Wisp", x: 490 }], RAIN = [622, 500];
    const NAMES = { cumulus: "Cumulus", stratus: "Stratus", cirrus: "Cirrus", cirrocumulus: "Cirrocumulus", cirrostratus: "Cirrostratus", altocumulus: "Altocumulus", altostratus: "Altostratus", nimbostratus: "Nimbostratus", cumulonimbus: "Cumulonimbus" };
    const PARTS = { cumulus: "heap", stratus: "layer", cirrus: "curl of hair", cirrocumulus: "high + heap", cirrostratus: "high + layer", altocumulus: "middle + heap", altostratus: "middle + layer", nimbostratus: "rain + layer", cumulonimbus: "heap + rain" };
    const LINES = {
      cumulus: '<b>Cumulus</b> means heap. A heap of puffy cloud, low in the sky!',
      stratus: '<b>Stratus</b> means layer. A flat, gray layer of cloud, low in the sky.',
      cirrus: '<b>Cirrus</b> means a curl of hair. These wispy clouds float way up high, where they\'re made of ice.',
      cirrocumulus: 'Clouds with <b>cirro</b> in their name float way up high. <b>Cirrocumulus</b> clouds are tiny puffs in rows, like fish scales!',
      cirrostratus: '<b>Cirrostratus</b> is a thin, high sheet of ice. It can make a ring around the sun!',
      altocumulus: 'Clouds with <b>alto</b> in their name float in the middle of the sky. <b>Altocumulus</b> clouds are puffy patches up there.',
      altostratus: '<b>Altostratus</b> is a gray sheet in the middle of the sky. The sun looks dim and blurry through it, like through frosted glass.',
      nimbostratus: '<b>Nimbus</b> means rain cloud. <b>Nimbostratus</b> is a thick, dark layer that brings steady rain or snow.',
      cumulonimbus: 'A heap that rains! <b>Cumulonimbus</b> grows into a giant thunderstorm cloud.'
    };
    const found = k => !!Store.data.stars['weather.names.' + k];
    const earn = (k, x, y) => { if (ui.award('weather.names.' + k, ...st.client(x, y))) s.earnedHere = true; };
    let s;
    function reset() { s = { shape: null, band: 'low', rain: false, kind: null, prev: null, fadeT: -9, made: {}, plane: { t0: Loop.t + 2 }, contrail: null, pressT: {}, lastAct: Loop.t, told: {}, earnedHere: false }; }
    // what the choices make; null with a reason when that cloud doesn't exist
    function kindOf(shape, band, rain) {
      if (!shape) return { kind: null };
      if (shape === 'wispy') return rain ? { no: 'wispRain' } : band === 'high' ? { kind: 'cirrus' } : { no: 'wisp' };
      if (rain) return band === 'low' ? { kind: shape === 'puffy' ? 'cumulonimbus' : 'nimbostratus' } : { no: 'rain' };
      const p = { high: 'cirro', middle: 'alto', low: '' }[band];
      return { kind: p + (shape === 'puffy' ? 'cumulus' : 'stratus') };
    }
    function choose() {
      const r = kindOf(s.shape, s.band, s.rain);
      if (r.no === 'wisp') { Sound.tap(1); ui.say('Wispy clouds only float way up high, where it\'s icy! <b>Tap high in the sky</b>.', { lock: false }); return; }
      if (r.no === 'wispRain') { Sound.tap(1); ui.say('Wispy clouds don\'t bring rain. <b>Tap Rain</b> to turn it off!', { lock: false }); return; }
      if (r.no === 'rain') { Sound.tap(1); ui.say('Rain clouds hang low and dark. <b>Tap low in the sky</b>!', { lock: false }); return; }
      if (!r.kind || r.kind === s.kind) return;
      s.prev = s.kind; s.kind = r.kind; s.fadeT = st.t; s.made[r.kind] = true;
      Sound.grow({ high: 6, middle: 3, low: 0 }[s.band]); if (s.rain) Sound.rain();
      // award first, then explain the name
      const y = mid(s.band);
      if (['cirrocumulus', 'cirrostratus'].includes(r.kind)) earn('high', CX, y);
      if (['altocumulus', 'altostratus'].includes(r.kind)) earn('middle', CX, y);
      if (['nimbostratus', 'cumulonimbus'].includes(r.kind)) earn('rain', CX, y);
      const shapesNew = !found('shapes') && s.made.cumulus && s.made.stratus && s.made.cirrus; if (shapesNew) earn('shapes', CX, y);
      ui.say(LINES[r.kind]);
      if (shapesNew) ui.say('You made all three shapes: heaps, layers and wisps!', { queue: true });
    }
    const planeX = () => RM ? 300 : ((st.t - s.plane.t0) % 14) / 9 * 920 - 60;   // across the high sky every 14 s
    const PLANE_Y = 64;
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      const px = planeX(); if (px > -40 && px < 860 && dist(x, y, px, PLANE_Y) < 46) {
        Sound.whoosh(); s.contrail = { t0: st.t, from: px, lap: Math.floor((st.t - s.plane.t0) / 14) };
        if (!found('contrail')) { earn('contrail', px, PLANE_Y); ui.say('A jet plane left a long line cloud! It\'s called a <b>contrail</b>. Water vapor from the engine freezes into ice in the cold sky.'); }
        return;
      }
      for (const b of SHAPES) if (st.hit(rrect(b.x - 52, 452, 104, 92, 16), x, y)) { s.pressT[b.k] = st.t; Sound.tap({ puffy: 3, layer: 5, wispy: 7 }[b.k]); s.shape = b.k; choose(); return; }
      if (st.hit(rrect(RAIN[0] - 52, 452, 104, 92, 16), x, y)) { s.pressT.rain = st.t; s.rain = !s.rain; Sound.drip(); if (s.shape) choose(); else if (s.rain) ui.say('First, <b>tap a shape</b>!', { lock: false }); return; }
      if (y < GROUND && x > 120) { const band = y < BANDS.high[1] ? 'high' : y < BANDS.middle[1] ? 'middle' : 'low'; Sound.tap({ high: 8, middle: 5, low: 2 }[band]); s.band = band; if (s.shape) choose(); else ui.say('First, <b>tap a shape</b>!', { lock: false }); return; }
      Sound.tap(Math.floor(x / 80));
    };

    // ---- the nine clouds, drawn around (CX, the middle of their band) ----
    function drawKind(c, k, t, a) {
      if (!k || a <= 0) return; c.save(); c.globalAlpha = a; const face = { t };
      if (k === 'cumulus') puffCloud(c, CX, mid('low'), 1.05, WC.cloud, { face });
      if (k === 'stratus') { stratusCloud(c, CX, mid('low'), 1.45); cloudFace(c, CX, mid('low') + 2, t); }
      if (k === 'nimbostratus') { precip(c, t, CX - 200, CX + 200, mid('low') + 20, GROUND, false, 34); stratusCloud(c, CX, mid('low') - 6, 1.55, '#7D8796'); cloudFace(c, CX, mid('low') - 4, t, true); }
      if (k === 'cumulonimbus') { precip(c, t, CX - 90, CX + 90, mid('low') + 50, GROUND, false, 26); stormCloud(c, CX, mid('low') + 16, 1.15); cloudFace(c, CX, mid('low') + 2, t, true); if (!RM && (t % 4) < .3) bolt(c, CX + 30, mid('low') + 60, 1); }
      if (k === 'cirrus') { cirrusCloud(c, CX - 60, mid('high'), 1.25, t); cirrusCloud(c, CX + 150, mid('high') + 24, .8, t); }
      if (k === 'cirrocumulus') { c.strokeStyle = 'rgba(36,54,40,.45)'; c.lineWidth = 2; for (let row = 0; row < 4; row++) for (let i = 0; i < 11; i++) { const x = CX - 200 + i * 38 + row * 12, y = mid('high') - 30 + row * 18 + Math.sin(i * .9) * 3; c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(x, y, 13, 7, 0, 0, TAU); c.fill(); c.stroke(); } }
      if (k === 'cirrostratus') { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(130, BANDS.high[0] + 6, W - 140, 100); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 6; c.beginPath(); c.arc(...SUN, 70, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(242,166,90,.45)'; c.lineWidth = 3; c.beginPath(); c.arc(...SUN, 76, 0, TAU); c.stroke(); }
      if (k === 'altocumulus') for (const [dx, dy, sc] of [[-210, -24, .34], [-120, 10, .4], [-30, -28, .36], [60, 8, .42], [150, -22, .35], [230, 14, .3]]) puffCloud(c, CX + dx, mid('middle') + dy, sc, '#F4F6F9', { line: 3 });
      if (k === 'altostratus') { const sheet = rrect(140, mid('middle') - 42, W - 160, 84, 30); c.fillStyle = 'rgba(176,186,200,.9)'; c.fill(sheet); c.strokeStyle = C.ink; c.lineWidth = 3.5; c.stroke(sheet); cloudFace(c, CX, mid('middle'), t); }
      c.restore();
    }
    function button(c, x, label2, on, t, pressT, draw) {
      const r = rrect(x - 52, 452, 104, 92, 16), hov = st.over(r), pr = st.t - (pressT || -9) < .15 ? 3 : 0;
      c.save(); c.translate(0, pr); c.fillStyle = C.ink; c.fill(rrect(x - 52, 456, 104, 92, 16)); c.fillStyle = on ? '#8FD0EE' : hov ? '#FFF4D6' : '#FFFDF5'; c.fill(r); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(r);
      draw(c, x, 488); label(c, label2, x, 528, { size: 18, stroke: null }); c.restore();
    }
    st.draw = (c, t, dt) => {
      // the sky, a band at a time; the chosen band is lighter
      sky(c, '#5DAEE0', WC.sky2, GROUND);
      const sel = BANDS[s.band]; c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(120, sel[0], W - 120, sel[1] - sel[0]);
      c.save(); c.setLineDash([8, 12]); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; for (const y of [BANDS.high[1], BANDS.middle[1]]) { c.beginPath(); c.moveTo(120, y); c.lineTo(W, y); c.stroke(); } c.restore();
      c.fillStyle = '#FFFDF5'; c.strokeStyle = C.ink; c.lineWidth = 3; const pole = rrect(22, 30, 16, GROUND - 30, 8); c.fill(pole); c.stroke(pole);
      for (const [b, txt] of [['high', "High"], ['middle', "Middle"], ['low', "Low"]]) label(c, txt, 50, mid(b), { size: 19, align: 'left', color: s.band === b ? WC.accent : C.ink });
      // the sun (dim behind altostratus) and the jet
      sun(c, ...SUN, 30, t, { face: true }); if (s.kind === 'altostratus') { c.fillStyle = 'rgba(176,186,200,.6)'; c.beginPath(); c.arc(...SUN, 60, 0, TAU); c.fill(); }
      const px = planeX();
      if (s.contrail) { const cx0 = s.contrail.from, lap = Math.floor((st.t - s.plane.t0) / 14), x1 = RM ? px - 260 : cx0 - 30, x2 = RM || lap === s.contrail.lap ? px - 28 : 900, e = st.t - s.contrail.t0;
        if (e < 20) { c.save(); c.globalAlpha = clamp((20 - e) / 4, 0, 1); c.strokeStyle = '#FFFFFF'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(Math.min(x1, x2), PLANE_Y + 2); c.lineTo(x2, PLANE_Y + 2); c.stroke(); c.restore(); } else s.contrail = null; }
      if (px > -60 && px < 880) { c.save(); c.translate(px, PLANE_Y); if (st.over(circle(px, PLANE_Y, 46))) glowOn(c);
        c.fillStyle = '#FFFDF5'; c.strokeStyle = C.ink; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 0, 26, 6, 0, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-4, 0); c.lineTo(-14, -16); c.lineTo(-8, -16); c.lineTo(6, 0); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-4, 2); c.lineTo(-12, 14); c.lineTo(-6, 14); c.lineTo(6, 2); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-24, -2); c.lineTo(-28, -12); c.lineTo(-22, -12); c.lineTo(-18, -2); c.closePath(); c.fillStyle = WC.accent; c.fill(); c.stroke(); c.restore(); }
      // the cloud: the old one fades into the new one
      const fk = RM ? 1 : clamp((st.t - s.fadeT) / .6, 0, 1);
      drawKind(c, s.prev, t, 1 - fk); drawKind(c, s.kind, t, fk);
      if (s.kind) { const ty = s.kind === 'cumulonimbus' ? mid('low') - 168 : mid(s.kind.startsWith('cirr') ? 'high' : s.kind.startsWith('alto') ? 'middle' : 'low') - 58; tag(c, NAMES[s.kind], CX, Math.max(28, ty)); label(c, PARTS[s.kind], CX, Math.max(28, ty) + 30, { size: 16, color: WC.accent }); }
      // the school and trees, for scale
      c.fillStyle = C.grass; c.fillRect(0, GROUND, W, H - GROUND); c.strokeStyle = C.grassDeep; c.lineWidth = 4; c.beginPath(); c.moveTo(0, GROUND); c.lineTo(W, GROUND); c.stroke();
      const sch = rrect(682, 360, 96, 58, 4); c.fillStyle = '#E8A65A'; c.fill(sch); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(sch); c.fillStyle = '#E04B4B'; c.beginPath(); c.moveTo(674, 362); c.lineTo(730, 330); c.lineTo(786, 362); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#DDF3F7'; for (const x of [694, 748]) { c.fillRect(x, 374, 22, 16); c.strokeRect(x, 374, 22, 16); } c.fillStyle = '#A87445'; c.fillRect(722, 392, 16, 26); c.strokeRect(722, 392, 16, 26);
      for (const [tx, ty] of [[160, 390], [610, 396]]) { c.fillStyle = '#8A6B3E'; c.fillRect(tx - 5, ty, 10, GROUND - ty); c.strokeRect(tx - 5, ty, 10, GROUND - ty); c.fillStyle = C.leaf; c.beginPath(); c.arc(tx, ty - 12, 24, 0, TAU); c.fill(); c.stroke(); }
      // the buttons: three shapes and rain
      button(c, SHAPES[0].x, SHAPES[0].label, s.shape === 'puffy', t, s.pressT.puffy, (c, x, y) => puffCloud(c, x, y, .32, WC.cloud, { line: 3 }));
      button(c, SHAPES[1].x, SHAPES[1].label, s.shape === 'layer', t, s.pressT.layer, (c, x, y) => stratusCloud(c, x, y, .28));
      button(c, SHAPES[2].x, SHAPES[2].label, s.shape === 'wispy', t, s.pressT.wispy, (c, x, y) => cirrusCloud(c, x, y - 4, .36, t));
      button(c, RAIN[0], s.rain ? "Rain on" : "Rain", s.rain, t, s.pressT.rain, (c, x, y) => { for (const dx of [-14, 0, 14]) raindrop(c, x + dx, y + (dx ? 4 : -4), .7); });
      const bob = RM ? 0 : Math.abs(Math.sin(t * 4)) * 6;
      if (!s.shape && t - s.lastAct > 3) label(c, "Tap a shape!", SHAPES[1].x, 436 - bob, { size: 20, color: C.carrot });
      if (s.shape && !found('high') && t - s.lastAct > 6) label(c, "Tap up here!", CX, mid('high') - bob, { size: 20, color: C.carrot });
      if (s.earnedHere && A_cloudnames.stars.every(q => Store.data.stars[q.id]) && !s.told.all) { s.told.all = true; ui.say('Now you can read a cloud\'s name like a clue: its shape, its height, and nimbus for rain!', { queue: true }); }
    };
    ui.button('Clear the sky', () => { ui.fresh(); reset(); Sound.pop(); ui.say(A_cloudnames.intro); });
    ui.hint("Try it: look up and name a cloud. Is it a heap, a layer or a wisp? Is it high, middle or low?");
    reset();
    return { stage: st, state: () => s, geo: { shapes: Object.fromEntries(SHAPES.map(b => [b.k, [b.x, 498]])), rain: RAIN, bands: Object.fromEntries(Object.keys(BANDS).map(b => [b, [CX, mid(b)]])), plane: () => [planeX(), PLANE_Y] }, destroy() { st.destroy(); } };
  }
};
