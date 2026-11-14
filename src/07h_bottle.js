/* ============ Activity: Cloud in a Bottle ============ */
// UCAR's and NASA's cloud-in-a-bottle experiment: warm water in a capped bottle, squeeze and let go. Letting go cools
// the air; with no specks for the vapor to stick to, hardly anything happens. A puff of match smoke (a grown-up's job)
// gives it specks, and a cloud appears; squeezing again warms the air and the cloud disappears.
const A_bottle = {
  id: 'weather.bottle', name: 'Cloud in a Bottle', icon: 'bottle',
  badge: { id: 'weather.b.bottle', name: 'Cloud Builder', desc: 'You made a real cloud with water vapor, cool air and tiny specks!', how: 'Not yet! Squeeze and let go to make a cloud in <b>Cloud in a Bottle</b>.', reward: 'rainBoots' },
  stars: [{ id: 'weather.bottle.vapor', name: 'Warm water vapor' }, { id: 'weather.bottle.specks', name: 'Clouds need specks' }, { id: 'weather.bottle.cloud', name: 'A cloud forms' }, { id: 'weather.bottle.vanish', name: 'Warm air, no cloud' }],
  intro: 'Let\'s make a real cloud in a bottle! First, <b>drag the warm water</b> into the bottle.',
  facts: ['Did you know? Every cloud drop starts on a tiny speck of dust, smoke, sea salt or pollen.', 'Did you know? Air cools as it rises up high. That\'s how real clouds form!'],
  mount(host, ui) {
    const st = new Stage(host, 'A clear plastic bottle on a table, with a cup of warm water, a bottle cap and a box of matches beside it. Squeeze the bottle and let go to make a cloud inside.');
    const TABLE = 470, BX = 400, TOP = 196, BOT = 462, HW = 76, MOUTH = [BX, 150];
    const HOME = { cup: [150, 408], cap: [664, 446] }, MATCHES = [664, 340];
    const found = k => !!Store.data.stars['weather.bottle.' + k];
    const earn = (k, x, y) => { if (ui.award('weather.bottle.' + k, ...st.client(x, y))) s.earnedHere = true; };
    let s;
    function reset() { s = { water: 0, pourT: null, capped: false, smoke: false, smokeT: null, pos: { cup: [...HOME.cup], cap: [...HOME.cap] }, drag: null, press: false, k: 0, peak: 0, cool: 0, fog: 0, fogTo: 0, triedPlain: false, lastAct: Loop.t, told: {}, earnedHere: false }; }
    // the bottle's outline, pinched in at the sides as it's squeezed (k = 0..1)
    function bottlePath(k = s.k) {
      const p = new Path2D(), pin = 18 * k;
      p.moveTo(BX - 30, TOP - 46); p.lineTo(BX - 30, TOP - 22); p.quadraticCurveTo(BX - HW, TOP - 10, BX - HW, TOP + 30);
      p.quadraticCurveTo(BX - HW + pin * 2, (TOP + BOT) / 2, BX - HW, BOT - 20); p.quadraticCurveTo(BX - HW, BOT, BX - HW + 22, BOT); p.lineTo(BX + HW - 22, BOT); p.quadraticCurveTo(BX + HW, BOT, BX + HW, BOT - 20);
      p.quadraticCurveTo(BX + HW - pin * 2, (TOP + BOT) / 2, BX + HW, TOP + 30); p.quadraticCurveTo(BX + HW, TOP - 10, BX + 30, TOP - 22); p.lineTo(BX + 30, TOP - 46); p.closePath(); return p;
    }
    const ready = () => s.water >= 1 && s.capped && s.smokeT == null;
    function needFirst() { if (s.water < 1) { ui.say('First, add the warm water!'); return true; } if (!s.capped) { ui.say('<b>Drag the cap</b> onto the bottle first!'); return true; } return false; }
    function letGo() {
      s.press = false; if (!ready()) return;
      if (s.peak < .85) { Sound.tap(2); ui.say('Hold it longer! Press, hold, then let go.'); return; }
      s.cool = 1; Sound.fwip();
      if (s.smoke) {
        s.fogTo = 1; Sound.sparkle();
        if (!found('cloud')) { earn('cloud', BX, (TOP + BOT) / 2); ui.say('A cloud! When you let go, the air cooled down. The vapor turned into tiny drops on the smoke specks. That\'s how real clouds form!'); }
      } else {
        s.fogTo = .1; s.triedPlain = true;
        if (!found('specks')) { earn('specks', BX, (TOP + BOT) / 2); ui.say('Hmm, hardly any cloud! Water vapor needs tiny specks of dust or smoke to stick to. <b>Tap the matches</b>, and a grown-up will add some smoke.'); }
        else ui.say('Hardly any cloud. It needs specks!');
      }
      s.peak = 0;
    }
    function tapMatches() {
      Sound.tap(6);
      if (s.water < 1) { ui.say('First, add the warm water!'); return; }
      if (s.smoke || s.smokeT != null) { ui.say('There\'s smoke in it already!'); return; }
      if (!s.triedPlain && !found('specks')) { ui.say('First, squeeze it without smoke and see what happens!'); return; }
      s.smokeT = st.t; Sound.crack();
      ui.say('A grown-up blows out a match and drops a puff of smoke into the bottle. Only grown-ups use matches!');
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      if (s.pourT == null && s.smokeT == null) for (const k of ['cup', 'cap']) { const p = s.pos[k]; if (p && dist(x, y, ...p) < 56) { s.drag = { item: k, dx: p[0] - x, dy: p[1] - y }; Sound.fwip(); return; } }
      if (dist(x, y, ...MATCHES) < 50) { tapMatches(); return; }
      if (st.hit(bottlePath(0), x, y)) {
        if (needFirst()) { Sound.tap(1); return; }
        if (s.smokeT != null) { Sound.tap(3); return; }
        s.press = true; s.peak = 0; Sound.squish(); return;
      }
      Sound.tap(Math.floor(x / 80));
    };
    st.onMove = (x, y) => { const d = s.drag; if (d) s.pos[d.item] = [clamp(x + d.dx, 30, 770), clamp(y + d.dy, 40, 530)]; };
    st.onUp = () => {
      if (s.press) { letGo(); return; }
      const d = s.drag; s.drag = null; if (!d) return; const p = s.pos[d.item], near = dist(...p, ...MOUTH) < 100;
      if (d.item === 'cup') {
        if (near && s.water < 1) { s.pourT = st.t; s.pos.cup = [BX + 80, MOUTH[1] - 70]; Sound.splash(); }
        else { s.pos.cup = [...HOME.cup]; Sound.tap(3); }
      } else {
        if (near && s.water >= 1) { s.capped = true; s.pos.cap = null; Sound.plunk(); ui.say('Now <b>squeeze the bottle</b> and hold it. Then let go!'); }
        else { s.pos.cap = [...HOME.cap]; if (near) { Sound.tap(1); ui.say('First, <b>drag the warm water</b> in!'); } else Sound.tap(3); }
      }
    };

    st.draw = (c, t, dt) => {
      // squeezing and letting go; the air warms while squeezed and cools after
      const kt = s.press ? 1 : 0; s.k += clamp(kt - s.k, -5 * dt, 5 * dt) * (RM ? 99 : 1); s.k = clamp(s.k, 0, 1); s.peak = Math.max(s.peak, s.k);
      s.cool = Math.max(0, s.cool - dt / 3);
      if (s.press && s.k > .5 && s.fog > .3 && s.fogTo > 0) { s.fogTo = 0; Sound.tap(4); if (!found('vanish')) { earn('vanish', BX, TOP + 40); ui.say('Squeezing warms the air. The tiny drops turn back into vapor!'); } }
      s.fog += clamp(s.fogTo - s.fog, -2 * dt, 2 * dt) * (RM ? 99 : 1); s.fog = clamp(s.fog, 0, 1);
      // a kitchen wall and a table
      const g = c.createLinearGradient(0, 0, 0, TABLE); g.addColorStop(0, '#EAF3F7'); g.addColorStop(1, '#DCE8EE'); c.fillStyle = g; c.fillRect(0, 0, W, TABLE);
      const tg = c.createLinearGradient(0, TABLE, 0, H); tg.addColorStop(0, '#B98A55'); tg.addColorStop(1, '#9A6E40'); c.fillStyle = tg; c.fillRect(0, TABLE, W, H - TABLE); c.fillStyle = '#8A5E33'; c.fillRect(0, TABLE - 6, W, 8);
      // a dark card behind the bottle, like in a real demo, so the white cloud shows up
      const card = rrect(BX - 130, 80, 260, TABLE - 86, 14); c.fillStyle = '#2F3E4F'; c.fill(card); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(card);
      // the bottle: water, fog, smoke inside; then the plastic
      const B = bottlePath();
      c.save(); c.clip(B); c.fillStyle = 'rgba(221,243,247,.16)'; c.fillRect(BX - HW, TOP - 50, HW * 2, BOT - TOP + 60);
      if (s.pourT != null) { const k = RM ? 1 : clamp((st.t - s.pourT) / 1.2, 0, 1); s.water = k; if (k >= 1) { s.pourT = null; s.pos.cup = [...HOME.cup]; Sound.drip(); earn('vapor', BX, BOT - 30); ui.say('Warm water makes lots of <b>water vapor</b> in the bottle. Now <b>drag the cap</b> on tight!'); } }
      if (s.water > 0) { const h = 40 * s.water; c.fillStyle = 'rgba(79,179,232,.75)'; c.fillRect(BX - HW, BOT - h, HW * 2, h); if (!RM) for (let i = 0; i < 4; i++) { const k = (t * .5 + i / 4) % 1; c.strokeStyle = `rgba(255,255,255,${.5 * (1 - k)})`; c.lineWidth = 2.5; c.beginPath(); c.moveTo(BX - 40 + i * 26, BOT - h - 6 - k * 80); c.quadraticCurveTo(BX - 34 + i * 26, BOT - h - 20 - k * 80, BX - 40 + i * 26, BOT - h - 32 - k * 80); c.stroke(); } }
      if (s.smoke && !RM) for (let i = 0; i < 3; i++) { c.strokeStyle = 'rgba(120,120,120,.18)'; c.lineWidth = 3; c.beginPath(); const y = TOP + 40 + i * 60; c.moveTo(BX - 40, y); c.bezierCurveTo(BX - 10, y - 20 + Math.sin(t + i) * 8, BX + 10, y + 20, BX + 40, y); c.stroke(); }
      if (s.fog > .01) { c.fillStyle = `rgba(255,255,255,${.78 * s.fog})`; c.fillRect(BX - HW, TOP - 40, HW * 2, BOT - TOP + 10); const r = seeded(5); for (let i = 0; i < 14; i++) { const x = BX - 60 + r() * 120, y = TOP + r() * (BOT - TOP - 60), w = RM ? 0 : Math.sin(t * .8 + i) * 6; c.fillStyle = `rgba(255,255,255,${.5 * s.fog})`; c.beginPath(); c.arc(x + w, y, 18 + r() * 14, 0, TAU); c.fill(); } }
      c.restore();
      const hov = !s.drag && ready() && st.over(bottlePath(0)); if (hov) st.cursor = 'pointer';
      c.save(); if (hov || s.press) glowOn(c); c.strokeStyle = 'rgba(36,54,40,.75)'; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke(B); c.restore();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(BX - HW + 18 + s.k * 10, TOP + 40); c.lineTo(BX - HW + 18 + s.k * 10, TOP + 170); c.stroke();
      // a little thermometer sticker: up while squeezed, down after letting go
      const tv = clamp(.5 + .32 * s.k - .3 * s.cool, 0, 1), tx = BX + 44, ty0 = TOP + 60, ty1 = TOP + 170;
      c.fillStyle = '#FFFDF5'; c.strokeStyle = C.ink; c.lineWidth = 2.5; const tb = rrect(tx - 9, ty0 - 8, 18, ty1 - ty0 + 22, 9); c.fill(tb); c.stroke(tb);
      const ly = lerp(ty1, ty0, tv); c.fillStyle = tv < .4 ? '#6FA8DC' : WC.red; c.fillRect(tx - 3, ly, 6, ty1 + 6 - ly); c.beginPath(); c.arc(tx, ty1 + 8, 7, 0, TAU); c.fill(); c.stroke();
      // the cap, on the bottle or by the side; the smoke puff (a grown-up's job) lifts it off and puts it back
      const sk = s.smokeT == null ? -1 : RM ? 1 : clamp((st.t - s.smokeT) / 2.4, 0, 1);
      const capY = s.capped ? (sk >= 0 && sk < 1 ? MOUTH[1] - 36 - Math.sin(PI * sk) * 60 : MOUTH[1] - 32) : null;
      if (capY != null) { const cp = rrect(BX - 36, capY, 72, 26, 6); c.fillStyle = '#E04B4B'; c.fill(cp); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(cp); }
      if (sk >= 0) {
        if (sk < 1) { const hx = BX + 70, hy = MOUTH[1] - 90 + Math.sin(PI * sk) * 30; c.strokeStyle = '#C9955A'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx + 40, hy - 30); c.lineTo(hx - 20, hy + 10); c.stroke(); c.fillStyle = '#3A2A1A'; c.beginPath(); c.arc(hx - 22, hy + 11, 4, 0, TAU); c.fill();
          for (let i = 0; i < 3; i++) { const k = (sk * 3 + i / 3) % 1; c.strokeStyle = `rgba(110,110,110,${.6 * (1 - k)})`; c.lineWidth = 3; c.beginPath(); c.arc(hx - 24 - k * 16, hy + 14 + k * 50, 6 + k * 8, 0, TAU); c.stroke(); } }
        else { s.smokeT = null; s.smoke = true; ui.say(s.capped ? 'Now squeeze and let go again!' : '<b>Drag the cap</b> onto the bottle first!', { queue: true }); }
      }
      // the cup of warm water, the cap and the matches
      if (s.pos.cup) { const [x, y] = s.pos.cup, pour = s.pourT != null; c.save(); c.translate(x, y); if (pour) c.rotate(-1.1); if (!pour && st.over(circle(x, y, 56))) glowOn(c);
        const cup = new Path2D('M-34 -38 L34 -38 L26 38 L-26 38 Z'); c.fillStyle = 'rgba(221,243,247,.9)'; c.fill(cup); c.shadowBlur = 0; c.fillStyle = 'rgba(79,179,232,.8)'; c.fillRect(-30, -14, 60, 50); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(cup); c.restore();
        if (pour) { c.strokeStyle = 'rgba(79,179,232,.85)'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 40, y - 20); c.quadraticCurveTo(BX + 10, MOUTH[1] - 20, BX, MOUTH[1] + 30); c.stroke(); }
        else if (s.water < 1 && !RM) for (let i = 0; i < 3; i++) { const k = (t * .6 + i / 3) % 1; c.strokeStyle = `rgba(255,255,255,${.9 * (1 - k)})`; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 14 + i * 14, y - 44 - k * 40); c.quadraticCurveTo(x - 6 + i * 14, y - 54 - k * 40, x - 14 + i * 14, y - 64 - k * 40); c.stroke(); }
        if (!pour) label(c, "Warm water", x, y + 58, { size: 16 }); }
      if (s.pos.cap) { const [x, y] = s.pos.cap; c.save(); if (st.over(circle(x, y, 56))) glowOn(c); const cp = rrect(x - 36, y - 13, 72, 26, 6); c.fillStyle = '#E04B4B'; c.fill(cp); c.restore(); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(rrect(x - 36, y - 13, 72, 26, 6)); label(c, "Cap", x, y + 36, { size: 16 }); }
      { const [x, y] = MATCHES; c.save(); if (st.over(circle(x, y, 50))) glowOn(c); const box = rrect(x - 40, y - 24, 80, 48, 6); c.fillStyle = C.sun; c.fill(box); c.restore(); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(rrect(x - 40, y - 24, 80, 48, 6)); c.fillStyle = '#E04B4B'; c.fillRect(x - 28, y - 12, 56, 24); c.strokeRect(x - 28, y - 12, 56, 24); label(c, "Matches", x, y + 44, { size: 16 }); label(c, "Grown-ups only", x, y - 44, { size: 14, color: WC.accent }); }
      if (s.drag) st.cursor = 'grabbing';
      // what to do next, shown before Pip says it
      const bob = RM ? 0 : Math.abs(Math.sin(t * 4)) * 6, idle = t - s.lastAct > 4;
      if (idle && s.water < 1 && s.pourT == null && s.pos.cup) label(c, "Drag me!", s.pos.cup[0], s.pos.cup[1] - 70 - bob, { size: 19, color: C.carrot });
      else if (idle && s.water >= 1 && !s.capped && s.pos.cap) label(c, "Drag me!", s.pos.cap[0], s.pos.cap[1] - 40 - bob, { size: 19, color: C.carrot });
      else if (idle && ready() && !s.press) label(c, "Squeeze and let go!", BX, TOP - 100 - bob, { size: 19, color: C.carrot });
      if (s.earnedHere && A_bottle.stars.every(q => Store.data.stars[q.id]) && !s.told.all) { s.told.all = true; ui.say('A cloud needs three things: water vapor, cooler air, and tiny specks to grow on. You made a real cloud!', { queue: true }); }
    };
    ui.button('New bottle', () => { ui.fresh(); reset(); Sound.pop(); ui.say(A_bottle.intro); });
    ui.hint("Try it with a grown-up: put a little warm water, not hot, in a clear bottle. A grown-up drops in a puff of match smoke. Cap it, squeeze hard, and let go!");
    reset();
    return { stage: st, state: () => s, geo: { home: HOME, mouth: MOUTH, matches: MATCHES, bottle: [BX, (TOP + BOT) / 2] }, destroy() { st.destroy(); } };
  }
};

/* ============ icons for the cloud activities (100x100) ============ */
Object.assign(ICONS, {
  // a cloud wearing a name tag
  cloudnames(c, t = 0) { puffCloud(c, 50, 44, .48, WC.cloud, { face: { t } }); const tg = rrect(24, 70, 52, 20, 10); c.fillStyle = C.sun; c.fill(tg); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(tg); label(c, 'Aa', 50, 81, { size: 15, weight: 700, stroke: null }); },
  // a clear bottle with a little cloud inside and a red cap
  bottle(c) {
    const b = rrect(30, 30, 40, 64, 14); c.fillStyle = 'rgba(221,243,247,.9)'; c.fill(b); c.save(); c.clip(b); c.fillStyle = 'rgba(79,179,232,.8)'; c.fillRect(30, 82, 40, 12); c.fillStyle = '#FFFFFF'; for (const [x, y, r] of [[42, 56, 9], [54, 52, 11], [60, 62, 8], [46, 66, 8]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } c.restore();
    c.strokeStyle = C.ink; c.lineWidth = 3.5; c.stroke(b); const cap = rrect(38, 14, 24, 16, 4); c.fillStyle = '#E04B4B'; c.fill(cap); c.stroke(cap);
  }
});
