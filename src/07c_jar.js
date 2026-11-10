/* ============ Activity: Terrarium (a water cycle in a jar) ============ */
// Like the class's terrarium: build the layers (rocks, soil, a plant), water it, close the lid and let sunny days go by.
// Water rises from the soil and the leaves (transpiration), fogs the glass (condensation) and drips back down like rain.
const A_jar = {
  id: 'weather.jar', name: 'Terrarium', icon: 'jar',
  badge: { id: 'weather.b.jar', name: 'Jar Gardener', desc: 'You built a tiny world with its own water cycle!', how: 'Not yet! Build a jar garden and watch the water in <b>Terrarium</b>.', reward: 'birdbath' },
  stars: [{ id: 'weather.jar.layers', name: 'Build the layers' }, { id: 'weather.jar.closed', name: 'A closed jar' }, { id: 'weather.jar.condense', name: 'Drops on the glass' }, { id: 'weather.jar.transpire', name: 'Leaves give off water' }, { id: 'weather.jar.rain', name: 'Rain in a jar' }],
  intro: 'Let\'s build a <b>terrarium</b>, a tiny garden in a closed jar! <b>Drag the rocks</b> in first.',
  facts: ['Did you know? A closed terrarium can go for months without being watered. The same water goes around and around!', 'Did you know? Plants give off lots of water from their leaves. A big tree can give off enough to fill a bathtub every day!'],
  mount(host, ui) {
    const st = new Stage(host, 'A big glass jar on a kitchen table, with rocks, soil, a little plant, a watering can and a lid on the shelves beside it, and a sunny window.');
    const JAR = { x: 300, y: 170, w: 260, h: 296 }, MID = JAR.x + JAR.w / 2, SOIL = 366, TABLE = 470, SUN = [690, 104];
    const ORDER = ['gravel', 'soil', 'plant', 'water', 'lid'];
    const HOME = { gravel: [110, 196], soil: [110, 318], plant: [110, 432], water: [712, 332], lid: [712, 452] };
    const NEXT = { gravel: 'First, the rocks go in!', soil: 'Next comes the soil!', plant: 'Now add the plant!', water: 'Now give it a drink!', lid: 'Now put the lid on!' };
    const found = k => !!Store.data.stars['weather.jar.' + k];
    const earn = (k, x, y) => { if (ui.award('weather.jar.' + k, ...st.client(x, y))) s.earnedHere = true; };
    let s;
    function reset() {
      s = { step: 0, pos: Object.fromEntries(Object.entries(HOME).map(([k, v]) => [k, [...v]])), drag: null, pourT: null, wet: 0, day: 0, dayT: -9, fog: 0, bigDrops: 0, fall: null, lastAct: Loop.t, told: {}, earnedHere: false };
    }
    const next = () => ORDER[s.step], closed = () => s.step >= 5;
    const inJar = (x, y) => x > JAR.x - 20 && x < JAR.x + JAR.w + 20 && y > JAR.y - 60 && y < TABLE;
    const plantH = () => 80 + Math.min(4, Math.max(0, s.day - 1)) * 10;
    const leafSpots = () => { const h = plantH(), top = SOIL - h; return [[MID - 4, top + 6, -150], [MID + 4, top + 6, -30], [MID, SOIL - h * .45, -160], [MID, SOIL - h * .6, -20]]; };
    const leafHit = (x, y) => s.step >= 3 && leafSpots().some(([lx, ly, r]) => dist(x, y, lx + Math.cos(r * DEG) * 26, ly + Math.sin(r * DEG) * 26) < 34);
    const DROPS = [[MID - 60, JAR.y + 14], [MID, JAR.y + 18], [MID + 60, JAR.y + 14]];

    function drop(item) {
      if (item !== next()) { s.pos[item] = [...HOME[item]]; Sound.oops(); ui.say(NEXT[next()]); return; }
      if (item === 'water') { s.pourT = st.t; s.pos.water = [MID + 110, JAR.y - 70]; Sound.splash(); return; }
      s.step++; s.pos[item] = null; s.lastAct = st.t;
      if (item === 'gravel') { Sound.crack(); Sound.tap(2); ui.say('Rocks go on the bottom. Extra water drains down there, so the roots don\'t get soggy.'); }
      if (item === 'soil') { Sound.squish(); ui.say('Next, soil. The roots will grow in it.'); }
      if (item === 'plant') { Sound.grow(1); earn('layers', MID, SOIL - 60); ui.say('Rocks, soil and a plant. Your tiny world is ready! Now <b>give it a drink</b> with the watering can.'); }
      if (item === 'lid') { Sound.plunk(); earn('closed', MID, JAR.y - 10); ui.say('The jar is closed tight. No water can get in or out! Now <b>tap the sun</b> to let a day go by.'); }
    }
    function watered() { s.pourT = null; s.pos.water = null; s.step++; s.wet = 1; Sound.drip(); ui.say('Now <b>put the lid on</b>, so no water can get out!'); }
    function sunnyDay() {
      Sound.steam(); s.sunT = st.t;
      if (!closed()) { ui.say(NEXT[next()]); return; }
      if (st.t - s.dayT < (RM ? .3 : 2.2)) return;   // a day is still going by
      s.day++; s.dayT = st.t;
      if (s.day === 1) ui.say('The sun warms the jar. Water rises from the wet soil and from the leaves as <b>water vapor</b>.');
      else if (s.day === 2) ui.say('Another sunny day. Keep an eye on the lid!');
      else { Sound.grow(s.day % 5); ui.say('Another day in the jar!'); }
    }
    function dayDone() {   // the vapor cools on the glass: fog first, then big drops under the lid
      s.fog = 1; if (s.day >= 2) s.bigDrops = 3;
      if (s.day === 1 && !found('condense')) ui.say('Look closely at the glass. <b>Tap the drops</b>!', { queue: true });
      if (s.day === 2 && !found('rain')) ui.say('<b>Tap a big drop</b> on the lid!', { queue: true });
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      if (s.pourT == null) for (const k of ORDER) { const p = s.pos[k]; if (p && dist(x, y, ...p) < 55) { s.drag = { item: k, dx: p[0] - x, dy: p[1] - y }; Sound.fwip(); return; } }
      if (s.pourT != null) { Sound.drip(); return; }
      if (dist(x, y, ...SUN) < 60) { sunnyDay(); return; }
      if (s.bigDrops && !s.fall && y < JAR.y + 50 && Math.abs(x - MID) < JAR.w / 2) {
        const i = DROPS.findIndex(([dx]) => Math.abs(x - dx) < 34); if (i >= 0) { s.fall = { x: DROPS[i][0], t0: st.t }; s.bigDrops--; Sound.drip(); return; }
      }
      if (leafHit(x, y)) {
        Sound.tap(6);
        if (s.day >= 1 && !found('transpire')) { earn('transpire', x, y); ui.say('Plants give off water vapor from tiny holes in their leaves. This is called <b>transpiration</b>. It\'s like the plant is breathing out water!'); }
        else if (s.day < 1) ui.say('What a happy little plant!');
        return;
      }
      if (s.fog && x > JAR.x && x < JAR.x + JAR.w && y > JAR.y && y < SOIL - 10) {
        Sound.drip();
        if (!found('condense')) {
          earn('condense', x, y); ui.say('Drops on the glass! The water vapor touched the cool glass and turned back into water. That\'s <b>condensation</b>, just like a cloud.');
          if (!found('transpire')) ui.say('Where else did the water come from? <b>Tap a leaf</b>!', { queue: true });
        }
        return;
      }
      Sound.tap(Math.floor(x / 80));
    };
    st.onMove = (x, y) => { const d = s.drag; if (d) s.pos[d.item] = [clamp(x + d.dx, 30, 770), clamp(y + d.dy, 40, 530)]; };
    st.onUp = (x, y) => {
      const d = s.drag; s.drag = null; if (!d) return; const p = s.pos[d.item];
      if (inJar(...p)) drop(d.item); else { s.pos[d.item] = [...HOME[d.item]]; Sound.tap(3); }
    };

    // ---- drawing ----
    function sack(c, x, y, col, top, speck) {
      const P = new Path2D(`M${x - 38} ${y + 40} Q${x - 46} ${y - 10} ${x - 26} ${y - 34} L${x + 26} ${y - 34} Q${x + 46} ${y - 10} ${x + 38} ${y + 40} Z`);
      c.fillStyle = col; c.fill(P); c.strokeStyle = C.ink; c.lineWidth = 3.5; c.stroke(P);
      c.fillStyle = top; c.beginPath(); c.ellipse(x, y - 34, 26, 8, 0, 0, TAU); c.fill(); c.stroke();
      const r = seeded(x + y); for (let i = 0; i < 7; i++) { c.fillStyle = speck; c.beginPath(); c.arc(x - 18 + r() * 36, y - 37 + r() * 6, 3 + r() * 2, 0, TAU); c.fill(); }
    }
    function pebbles(c, x0, x1, y0, y1, n, seed) { const r = seeded(seed); for (let i = 0; i < n; i++) { const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()); c.fillStyle = ['#9AA3AE', '#B7BEC6', '#7F8893'][i % 3]; c.strokeStyle = 'rgba(36,54,40,.6)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 7 + r() * 5, 5 + r() * 3, r() * 3, 0, TAU); c.fill(); c.stroke(); } }
    function sprout(c, x, y, h, t, s2 = 1) {
      const sw = RM ? 0 : Math.sin(t * 1.4) * 2;
      c.save(); c.translate(x, y); c.scale(s2, s2); c.lineCap = 'round'; c.strokeStyle = C.leafDeep; c.lineWidth = 7; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-4, -h * .5, sw, -h); c.stroke();
      drawLeaf(c, sw - 4, -h + 6, -150, .42); drawLeaf(c, sw + 4, -h + 6, -30, .42); drawLeaf(c, 0, -h * .45, -160, .32); drawLeaf(c, 0, -h * .6, -20, .32); c.restore();
    }
    function can(c, x, y, tilt) {
      c.save(); c.translate(x, y); c.rotate(tilt); c.strokeStyle = C.ink; c.lineWidth = 3.5; c.lineJoin = 'round';
      const body = rrect(-34, -26, 60, 52, 10); c.fillStyle = '#6FA8DC'; c.fill(body); c.stroke(body);
      c.fillStyle = '#6FA8DC'; c.beginPath(); c.moveTo(-34, 6); c.lineTo(-66, -26); c.lineTo(-60, -32); c.lineTo(-30, -6); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(-4, -26, 22, PI, TAU); c.stroke(); c.restore();
    }
    const lidPath = (x, y) => rrect(x - 124, y - 12, 248, 24, 9);
    function drawLid(c, x, y) { const p = lidPath(x, y); c.fillStyle = '#C8CDD2'; c.fill(p); c.strokeStyle = C.ink; c.lineWidth = 3.5; c.stroke(p); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 100, y - 4); c.lineTo(x + 60, y - 4); c.stroke(); }
    function drawItem(c, k, x, y, t) {
      if (k === 'gravel') { sack(c, x, y, '#D9CBB0', '#9AA3AE', '#7F8893'); label(c, "Rocks", x, y + 8, { size: 17 }); }
      if (k === 'soil') { sack(c, x, y, '#C9955A', C.soilDeep, C.soil); label(c, "Soil", x, y + 8, { size: 17 }); }
      if (k === 'plant') { const pot = new Path2D(`M${x - 24} ${y} L${x + 24} ${y} L${x + 18} ${y + 36} L${x - 18} ${y + 36} Z`); c.fillStyle = '#C8653A'; c.fill(pot); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(pot); sprout(c, x, y + 2, 60, t, .7); }
      if (k === 'water') can(c, x, y, s.pourT != null ? -.7 : 0);
      if (k === 'lid') { c.save(); c.translate(x, y); c.scale(.42, 1); drawLid(c, 0, 0); c.restore(); }
    }
    st.draw = (c, t, dt) => {
      // a kitchen wall with a sunny window, and the table
      const g = c.createLinearGradient(0, 0, 0, TABLE); g.addColorStop(0, '#F3EBDD'); g.addColorStop(1, '#E9DCC6'); c.fillStyle = g; c.fillRect(0, 0, W, TABLE);
      const win = rrect(604, 24, 172, 150, 12); c.fillStyle = WC.sky2; c.fill(win); c.save(); c.clip(win); sky(c, WC.sky1, WC.sky2, 180);
      const sg = st.over(circle(...SUN, 60)); if (sg) glowOn(c); sun(c, ...SUN, 32, t, { glow: st.t - (s.sunT || -9) < 1.2 ? 1 : sg ? .6 : 0 }); c.shadowBlur = 0; c.restore();
      c.strokeStyle = C.ink; c.lineWidth = 5; c.stroke(win); c.lineWidth = 3; c.beginPath(); c.moveTo(690, 24); c.lineTo(690, 60); c.stroke();
      for (const y of [236, 358]) { c.fillStyle = '#C9955A'; c.strokeStyle = C.ink; c.lineWidth = 3; c.fillRect(30, y, 160, 12); c.strokeRect(30, y, 160, 12); }
      c.fillStyle = '#C9955A'; c.fillRect(632, 360, 160, 12); c.strokeRect(632, 360, 160, 12);
      const tg = c.createLinearGradient(0, TABLE, 0, H); tg.addColorStop(0, '#B98A55'); tg.addColorStop(1, '#9A6E40'); c.fillStyle = tg; c.fillRect(0, TABLE, W, H - TABLE); c.fillStyle = '#8A5E33'; c.fillRect(0, TABLE - 6, W, 8);
      // the jar: what's inside, then the glass on top
      const body = rrect(JAR.x, JAR.y, JAR.w, JAR.h, 34);
      c.save(); c.clip(body); c.fillStyle = 'rgba(221,243,247,.5)'; c.fillRect(JAR.x, JAR.y, JAR.w, JAR.h);
      if (s.step >= 1) { c.fillStyle = '#D9D4CC'; c.fillRect(JAR.x, 426, JAR.w, 44); pebbles(c, JAR.x + 6, JAR.x + JAR.w - 6, 432, 462, 36, 5); }
      if (s.step >= 2) { c.fillStyle = mix(C.soilLight, C.soilDeep, s.wet); c.fillRect(JAR.x, SOIL, JAR.w, 62); const r = seeded(9); for (let i = 0; i < 24; i++) { c.fillStyle = 'rgba(50,28,12,.3)'; c.beginPath(); c.arc(JAR.x + r() * JAR.w, SOIL + 8 + r() * 50, 2 + r() * 3, 0, TAU); c.fill(); } }
      // a day goes by: vapor rises from the soil and the leaves
      const dk = RM ? 1 : clamp((st.t - s.dayT) / 2.2, 0, 1);
      if (s.dayT > 0 && dk < 1) { for (let i = 0; i < 6; i++) { const k = (dk * 1.6 + i / 6) % 1, x = JAR.x + 30 + i * 40; vaporPuff(c, x, SOIL - 20 - k * 150, t, .5 * (1 - k)); } }
      if (s.dayT > 0 && dk >= 1 && !s.told['day' + s.day]) { s.told['day' + s.day] = true; dayDone(); }
      if (s.step >= 3) {
        sprout(c, MID, SOIL + 4, plantH(), t);
        if (s.day >= 1 && !found('transpire') && !RM) for (const [lx, ly, r] of leafSpots()) { const k = (t * .7 + lx * .01) % 1; c.strokeStyle = `rgba(255,255,255,${.8 * (1 - k)})`; c.lineWidth = 2.5; c.beginPath(); c.arc(lx + Math.cos(r * DEG) * 30, ly + Math.sin(r * DEG) * 30 - k * 24, 4 + k * 4, 0, TAU); c.stroke(); }
      }
      if (s.pourT != null) { const k = RM ? 1 : clamp((st.t - s.pourT) / 1.3, 0, 1); c.strokeStyle = C.water; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(MID + 52, JAR.y - 40); c.quadraticCurveTo(MID + 20, JAR.y + 40, MID + 10, SOIL); c.stroke(); s.wet = Math.max(s.wet, k); if (k >= 1) watered(); }
      // fog: lots of tiny drops on the inside of the glass
      if (s.fog) { c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(JAR.x, JAR.y, JAR.w, SOIL - JAR.y); const r = seeded(21); for (let i = 0; i < 70; i++) { const side = r(), x = side < .35 ? JAR.x + 6 + r() * 34 : side < .7 ? JAR.x + JAR.w - 40 + r() * 34 : JAR.x + 30 + r() * (JAR.w - 60), y = side < .7 ? JAR.y + 20 + r() * (SOIL - JAR.y - 40) : JAR.y + 8 + r() * 30; c.fillStyle = 'rgba(255,255,255,.85)'; c.strokeStyle = 'rgba(47,134,194,.55)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 2 + r() * 3, 0, TAU); c.fill(); c.stroke(); } }
      for (let i = 0; i < 3; i++) if (i < s.bigDrops) raindrop(c, DROPS[i][0], DROPS[i][1] + 10 + (RM ? 0 : Math.sin(t * 3 + i) * 1.5), .9);
      if (s.fall) { const k = RM ? 1 : clamp((st.t - s.fall.t0) / .8, 0, 1); raindrop(c, s.fall.x, lerp(JAR.y + 24, SOIL - 6, k * k), .9);
        if (k >= 1) { s.fall = null; Sound.plunk(); if (!found('rain')) { earn('rain', MID, SOIL - 20); ui.say('Plop! The big drops fall back onto the soil, just like rain. It\'s the jar\'s own <b>precipitation</b>!'); } } }
      c.restore();
      c.strokeStyle = 'rgba(36,54,40,.7)'; c.lineWidth = 4; c.stroke(body); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(JAR.x + 22, JAR.y + 50); c.lineTo(JAR.x + 22, JAR.y + 220); c.stroke();
      const rim = rrect(JAR.x + 14, JAR.y - 16, JAR.w - 28, 22, 8); c.fillStyle = 'rgba(221,243,247,.8)'; c.fill(rim); c.strokeStyle = 'rgba(36,54,40,.7)'; c.lineWidth = 3.5; c.stroke(rim);
      if (closed()) drawLid(c, MID, JAR.y - 22);
      // the things on the shelves (the one being dragged on top)
      for (const k of ORDER) { const p = s.pos[k]; if (!p || (s.drag && s.drag.item === k)) continue; const hov = st.over(circle(...p, 55)); c.save(); if (hov && s.pourT == null) glowOn(c); drawItem(c, k, ...p, t); c.restore(); }
      if (s.drag) { st.cursor = 'grabbing'; drawItem(c, s.drag.item, ...s.pos[s.drag.item], t); }
      // what to do next, shown before Pip says it
      const bob = RM ? 0 : Math.abs(Math.sin(t * 4)) * 6, idle = t - s.lastAct > 4;
      if (!closed() && !s.drag && s.pourT == null && idle) { const p = s.pos[next()]; if (p) label(c, "Drag me in!", p[0], p[1] - 66 - bob, { size: 19, color: C.carrot }); }
      if (closed() && s.day === 0 && idle) label(c, "Tap the sun!", SUN[0], 200 - bob, { size: 19, color: C.carrot });
      if (s.fog && !found('condense') && dk >= 1) label(c, "Tap the drops!", MID, JAR.y + 120 - bob, { size: 19, color: C.carrot });
      if (s.bigDrops && !found('rain')) label(c, "Tap a big drop!", MID, JAR.y - 56 - bob, { size: 19, color: C.carrot });
      label(c, s.day ? `Day ${s.day}` : "", 700, 206, { size: 22, color: WC.accent });
      if (s.earnedHere && A_jar.stars.every(q => Store.data.stars[q.id]) && !s.told.all) { s.told.all = true; ui.say('The water goes around and around inside the jar. It\'s a tiny water cycle, so the plant hardly ever needs watering!', { queue: true }); }
    };
    ui.button('Build a new jar', () => { ui.fresh(); reset(); Sound.pop(); ui.say(A_jar.intro); });
    ui.hint("Try it: put a clear lid on a cup of damp soil and set it in a sunny window. Look for drops on the lid the next day!");
    reset();
    return { stage: st, state: () => s, geo: { home: HOME, jar: JAR, sun: SUN, mid: MID, soil: SOIL, drops: DROPS, leaves: () => leafSpots().map(([lx, ly, r]) => [lx + Math.cos(r * DEG) * 26, ly + Math.sin(r * DEG) * 26]) }, destroy() { st.destroy(); } };
  }
};
