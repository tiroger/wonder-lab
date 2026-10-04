/* ============ Activity: Leaf Factory (photosynthesis) ============ */
// A leaf needs sunlight, water and air (carbon dioxide) to make food. Move the cloud off the sun, water the plant,
// tap the air bubbles; then the leaf makes sugar (it travels down to feed the plant) and lets out oxygen.
const A_leaf = {
  id: 'leaf', name: 'Leaf Factory', icon: 'leaf',
  badge: { id: 'b.leaf', name: 'Sun Chef', desc: 'You helped a leaf cook its food with sunlight!', how: 'Not yet! Help the leaf make food in <b>Leaf Factory</b>.' },
  stars: [{ id: 'leaf.sun', name: 'Sunlight' }, { id: 'leaf.water', name: 'Water' }, { id: 'leaf.air', name: 'Carbon dioxide' },
    { id: 'leaf.sugar', name: 'Sugar' }, { id: 'leaf.oxygen', name: 'Oxygen' }, { id: 'leaf.green', name: 'Chlorophyll' }],
  intro: 'Leaves are food factories! This leaf needs three things to make food: <b>sunlight</b>, <b>water</b> and <b>air</b>. First, move the cloud off the sun.',
  facts: ['Did you know? Leaves make food from sunlight, air and water. Making food with light is called <b>photosynthesis</b>.', 'Did you know? Leaves give off <b>oxygen</b>, the gas we need to breathe!'],
  mount(host, ui) {
    const st = new Stage(host, 'A plant with one big leaf in the sun. A cloud covers the sun, a watering can sits on the ground, and air bubbles float by. Help the leaf make food.');
    const GY = 470, SUN = [712, 92], CAN = [96, 420], LEAF_AT = [300, 268], LEAF_ROT = -12, LEAF_S = 3.2;
    const LEAFP = xf(LEAF, LEAF_AT[0], LEAF_AT[1], LEAF_ROT, LEAF_S);
    const along = u => { const a = LEAF_ROT * DEG, d = 112 * LEAF_S * u; return [LEAF_AT[0] + Math.cos(a) * d, LEAF_AT[1] + Math.sin(a) * d]; };
    const STEM = [[330, GY], [318, 410], [306, 330], [LEAF_AT[0], LEAF_AT[1]]];
    const found = k => !!Store.data.stars['leaf.' + k];
    // award a star (before Pip explains it); remember that one was earned here, for the wrap-up line
    const earn = (k, x, y) => { if (ui.award('leaf.' + k, ...st.client(x, y))) s.earnedHere = true; };
    let s, mag = false, magBtn;
    function reset() {
      s = { cloudX: SUN[0], cloudY: SUN[1] + 4, drag: null, water: 0, air: 0, pourT: -9, drops: [], bubbles: [], flying: [], sugars: [], o2: [], made: 0, nextMake: 0, told: {}, magT: 0, lastAct: Loop.t };
      for (let i = 0; i < 5; i++) s.bubbles.push(newBubble(true));
    }
    const lit = () => Math.abs(s.cloudX - SUN[0]) > 95 || Math.abs(s.cloudY - SUN[1]) > 70;
    // water and air are the ingredients; sunlight is the energy, so a cloud slows the factory way down
    const running = () => s.water > 4 && s.air > 4;
    // carbon dioxide bubbles drift through the open sky, left of the plant and under the sun
    function newBubble(anywhere) { // keep clear of the other bubbles
      let b; for (let tries = 0; tries < 12; tries++) {
        const left = Math.random() < .55, x = left ? rand(40, 230) : rand(560, 780), y = anywhere ? (left ? rand(150, 330) : rand(250, 430)) : (left ? 345 : 445);
        b = { x, y, ph: rand(0, 6), vy: rand(-12, -6), left }; if (!s || s.bubbles.every(q => dist(q.x, q.y, x, y) > 60)) break;
      }
      return b;
    }
    function sunOut() { Sound.whoosh(); if (!found('sun')) { earn('sun', ...SUN); ui.say('Sunlight! It gives the leaf energy to make food.'); } }
    function water() {
      if (st.t - s.pourT < 1.2) return; s.pourT = st.t; s.lastAct = st.t; Sound.splash(); setTimeout(() => Sound.slurp(), 600);
      s.water = Math.min(100, s.water + 45); for (let i = 0; i < 14; i++) s.drops.push({ u: 0, d: i * .12 });
      if (!found('water')) { earn('water', ...CAN); ui.say('Water goes into the roots, up the stem, and into the leaf.'); }
    }
    function tapBubble(b) {
      s.bubbles.splice(s.bubbles.indexOf(b), 1); s.bubbles.push(newBubble(false));
      s.flying.push({ x: b.x, y: b.y, t0: st.t, to: along(.45 + Math.random() * .3) }); Sound.pop(); Sound.tap(5);
      if (!found('air')) { earn('air', b.x, b.y); ui.say('That bubble is <b>carbon dioxide</b>, a gas in the air. Its short name is C-O-two. The leaf takes it in through tiny holes.'); }
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      // oxygen first (it floats over everything), then the cloud, the sun, the air, the can, the leaf
      const o = s.o2.find(q => dist(x, y, q.x, q.y) < 26);
      if (o) { o.pop = st.t; Sound.pop(); if (!found('oxygen')) { earn('oxygen', x, y); ui.say('That bubble is <b>oxygen</b>, O-two for short. The leaf lets it out into the air, and we breathe it in!'); } return; }
      if (dist(x, y, s.cloudX + 20, s.cloudY - 4) < 75) { s.drag = { dx: x - s.cloudX, dy: y - s.cloudY, x0: x, y0: y, moved: false }; Sound.fwip(); return; }
      if (dist(x, y, ...SUN) < 60) { Sound.grow(4); return; }
      const b = s.bubbles.find(q => dist(x, y, q.x, q.y) < 30); if (b) return tapBubble(b);
      if (dist(x, y, ...CAN) < 70) return water();
      if (st.hit(LEAFP, x, y)) { Sound.sparkle(); if (!found('green') && !mag) ui.say('Try the <b>magnifying glass</b> to look inside the leaf!'); return; }
      Sound.tap(Math.floor(x / 80));
    };
    st.onMove = (x, y) => { if (s.drag) { s.cloudX = clamp(x - s.drag.dx, 60, 740); s.cloudY = clamp(y - s.drag.dy, 40, 200); if (dist(x, y, s.drag.x0, s.drag.y0) > 8) s.drag.moved = true; } };
    st.onUp = () => {
      if (!s.drag) return;
      // a tap (not a drag) slides the cloud out of the way, or back over the sun
      if (!s.drag.moved) { const cover = lit(); s.cloudTarget = cover ? [SUN[0], SUN[1] + 4] : [SUN[0] - 230, 46]; }
      s.drag = null;
    };

    function drawCan(c, t) {
      const e = st.t - s.pourT, k = e < .25 ? ease(e / .25) : e < 1 ? 1 : e < 1.3 ? 1 - ease((e - 1) / .3) : 0;
      c.save(); c.translate(CAN[0] + k * 40, CAN[1] - k * 30); c.rotate(-k * .55); if (st.over(circle(...CAN, 70)) && !k) glowOn(c);
      const body = rrect(-38, -28, 76, 58, 12); c.fillStyle = '#5BA8D9'; c.fill(body); c.shadowBlur = 0; c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(body);
      c.lineCap = 'round'; c.lineWidth = 11; c.beginPath(); c.moveTo(32, 6); c.lineTo(80, -30); c.stroke(); c.strokeStyle = '#5BA8D9'; c.lineWidth = 6; c.stroke();
      c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.arc(-36, -6, 22, PI * .6, PI * 1.45); c.stroke();
      c.restore();
      if (k > .7 && e < 1) for (let i = 0; i < 3; i++) { c.fillStyle = C.water; c.beginPath(); c.arc(CAN[0] + 120 + rand(-6, 10), CAN[1] - 50 + rand(0, 40) + (e * 60 % 30), 3.5, 0, TAU); c.fill(); }
    }
    function drawPlant(c, t, glow) {
      // roots in the soil
      c.save(); c.lineCap = 'round'; for (const [ex, ey] of [[260, 540], [330, 556], [400, 538], [292, 520]]) { const p = new Path2D(); p.moveTo(330, GY + 4); p.quadraticCurveTo((330 + ex) / 2, ey - 30, ex, ey); c.strokeStyle = C.rootDeep; c.lineWidth = 8; c.stroke(p); c.strokeStyle = C.root; c.lineWidth = 4; c.stroke(p); } c.restore();
      // stem
      const stem = new Path2D(); stem.moveTo(...STEM[0]); stem.bezierCurveTo(...STEM[1], ...STEM[2], ...STEM[3]);
      c.save(); c.lineCap = 'round'; c.strokeStyle = C.leafDeep; c.lineWidth = 18; c.stroke(stem); c.strokeStyle = C.stem; c.lineWidth = 11; c.stroke(stem); c.restore();
      // the big leaf (it brightens while the factory runs)
      c.save(); if (glow) { c.shadowColor = 'rgba(255,236,120,.9)'; c.shadowBlur = 20 + Math.sin(t * 4) * 6; }
      const g = c.createLinearGradient(...along(0), ...along(1)); g.addColorStop(0, running() ? '#5DBE55' : '#4FAE52'); g.addColorStop(1, running() ? '#9BE08A' : C.leafLight);
      c.fillStyle = g; c.fill(LEAFP); c.shadowBlur = 0; c.strokeStyle = C.leafDeep; c.lineWidth = 4; c.stroke(LEAFP);
      c.strokeStyle = 'rgba(47,125,62,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(...along(.02)); c.lineTo(...along(.96));
      for (const u of [.2, .38, .56, .74]) { const [x, y] = along(u), a = LEAF_ROT * DEG; for (const sd of [-1, 1]) { c.moveTo(x, y); c.lineTo(x + Math.cos(a + sd * .9) * 70, y + Math.sin(a + sd * .9) * 70); } } c.stroke();
      c.restore();
    }
    function cellsView(c, x, y, t) { // inside the leaf, up close: cells full of green chloroplasts
      c.save(); c.beginPath(); c.arc(x, y, 92, 0, TAU); c.clip(); c.fillStyle = '#D9F2C2'; c.fillRect(x - 92, y - 92, 184, 184);
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
        const cx = x + i * 48 + (j % 2 ? 24 : 0), cy = y + j * 34, cell = rrect(cx - 22, cy - 15, 44, 30, 9);
        c.fillStyle = '#EAF8DC'; c.fill(cell); c.strokeStyle = '#7FB65A'; c.lineWidth = 2; c.stroke(cell);
        const r = seeded(i * 7 + j * 13 + 50); for (let k = 0; k < 5; k++) { const ox = (r() - .5) * 28 + (RM ? 0 : Math.sin(t * 1.5 + k + i) * 1.5), oy = (r() - .5) * 16; c.fillStyle = '#3E9B4F'; c.strokeStyle = '#2A7340'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(cx + ox, cy + oy, 5, 3, r() * 3, 0, TAU); c.fill(); c.stroke(); }
      }
      c.restore();
      c.save(); c.lineCap = 'round'; c.strokeStyle = '#6B4F35'; c.lineWidth = 18; c.beginPath(); c.moveTo(x + 70, y + 70); c.lineTo(x + 122, y + 122); c.stroke();
      c.strokeStyle = C.ink; c.lineWidth = 11; c.beginPath(); c.arc(x, y, 94, 0, TAU); c.stroke(); c.strokeStyle = '#CFD8DC'; c.lineWidth = 6; c.stroke(); c.restore();
    }
    st.draw = (c, t, dt) => {
      // the cloud glides where a tap sent it
      if (s.cloudTarget && !s.drag) { s.cloudX += (s.cloudTarget[0] - s.cloudX) * Math.min(1, dt * 4); s.cloudY += (s.cloudTarget[1] - s.cloudY) * Math.min(1, dt * 4); if (dist(s.cloudX, s.cloudY, ...s.cloudTarget) < 2) s.cloudTarget = null; }
      const isLit = lit(); if (isLit && !s.wasLit) { sunOut(); s.nextMake = Math.min(s.nextMake, t + .6); } s.wasLit = isLit; // the sun speeds things up at once
      // the factory: sunlight + water + air make sugar (down to the plant) and oxygen (out to the air)
      const on = running();
      if (on && t > s.nextMake) {
        s.nextMake = t + (isLit ? 1.4 : 5); s.water = Math.max(0, s.water - 7); s.air = Math.max(0, s.air - 9); s.made++; if (isLit) s.madeLit = true;
        s.sugars.push({ u: 0, from: along(rand(.3, .7)) }); s.o2.push({ ...(() => { const [x, y] = along(rand(.35, .85)); return { x, y: y - 40 }; })(), vy: -26, ph: rand(0, 6), born: t });
        Sound.tone(PENTA[(s.made % 5) + 3], .12, 'sine', .06);
        if (!found('sugar')) { earn('sugar', ...along(.5)); ui.say('The factory is working! The leaf uses sunlight to turn water and air into <b>sugar</b>. Sugar is the plant\'s food. Making food with light is called <b>photosynthesis</b>.', { queue: true }); }
      }
      if (!isLit && s.madeLit && !s.told.dark) { s.told.dark = true; ui.say('The cloud is blocking the sun, so the factory slowed way down. Less sunlight, less food!', { polite: true }) || (s.told.dark = false); }
      // sky, sun, cloud, ground
      const dim = isLit ? 0 : .35; sky(c, mix('#86CFEA', '#9AAFB8', dim), mix('#E2F6FC', '#C9D4D8', dim), GY);
      sun(c, ...SUN, 40, t, { glow: isLit && on ? 1 : 0 });
      if (isLit) { c.save(); c.globalAlpha = on ? .85 : .55; c.setLineDash([12, 12]); c.lineDashOffset = RM ? 0 : -t * 50; c.strokeStyle = 'rgba(255,196,40,.9)'; c.lineWidth = 5; c.lineCap = 'round'; for (const u of [.4, .6, .8, .95]) { c.beginPath(); c.moveTo(SUN[0] - 30, SUN[1] + 30); c.lineTo(...along(u)); c.stroke(); } c.restore(); }
      ground(c, GY, t);
      if (s.water > 0) { const wg = c.createRadialGradient(330, GY + 40, 10, 330, GY + 40, 160); wg.addColorStop(0, `rgba(45,25,12,${s.water / 100 * .5})`); wg.addColorStop(1, 'rgba(45,25,12,0)'); c.fillStyle = wg; c.fillRect(160, GY + 6, 340, 90); }
      drawPlant(c, t, on);
      // water climbing up the stem into the leaf
      for (const d of s.drops) { d.d -= dt; if (d.d > 0) continue; d.u += dt * .45; const [x, y] = d.u < .7 ? bez(...STEM, d.u / .7) : along((d.u - .7) / .3 * .6); c.fillStyle = C.water; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); c.stroke(); }
      s.drops = s.drops.filter(d => d.u < 1);
      // sugar blocks travel down the stem to feed the plant
      for (const q of s.sugars) {
        q.u += dt * .35; const k = q.u; let x, y; if (k < .3) { const [ax, ay] = q.from, [bx, by] = LEAF_AT; x = lerp(ax, bx, k / .3); y = lerp(ay, by, k / .3); } else [x, y] = bez(...[...STEM].reverse(), Math.min(1, (k - .3) / .7));
        c.save(); c.translate(x, y); c.rotate(.3); c.fillStyle = '#FFFDF5'; c.strokeStyle = C.ink; c.lineWidth = 2; c.fill(rrect(-8, -8, 16, 16, 3)); c.stroke(rrect(-8, -8, 16, 16, 3)); c.fillStyle = 'rgba(200,200,200,.6)'; c.fillRect(-4, -4, 4, 4); c.restore();
      }
      s.sugars = s.sugars.filter(q => q.u < 1);
      // carbon dioxide bubbles, and the ones flying into the leaf
      for (const b of s.bubbles) { if (!RM) { b.y += b.vy * dt; b.x += Math.sin(t + b.ph) * 8 * dt; } if (b.y < (b.left ? 140 : 240)) Object.assign(b, newBubble(false)); drawGasBubble(c, b.x, b.y, 'CO₂', '#C9D6DE', st.over(circle(b.x, b.y, 30))); }
      s.flying = s.flying.filter(f => { const k = clamp((st.t - f.t0) / .6, 0, 1); drawGasBubble(c, lerp(f.x, f.to[0], ease(k)), lerp(f.y, f.to[1], ease(k)), 'CO₂', '#C9D6DE', false, 1 - k * .7); if (k >= 1) { s.air = Math.min(100, s.air + 25); Sound.tap(6); } return k < 1; });
      // the cloud
      c.save(); if (s.drag || st.over(circle(s.cloudX + 20, s.cloudY - 4, 75))) glowOn(c); cloud(c, s.cloudX - 40, s.cloudY, 1.7, .98); c.restore();
      // oxygen bubbles float up and away
      for (const q of s.o2) { if (q.pop) continue; q.y += q.vy * dt; q.x += (RM ? 0 : Math.sin(t * 1.4 + q.ph) * 14) * dt; drawGasBubble(c, q.x, q.y, 'O₂', '#BFE6F4', st.over(circle(q.x, q.y, 26))); }
      for (const q of s.o2) if (q.pop) { const k = clamp((st.t - q.pop) / .3, 0, 1); c.save(); c.globalAlpha = 1 - k; c.strokeStyle = C.water; c.lineWidth = 3; c.beginPath(); c.arc(q.x, q.y, 22 + k * 16, 0, TAU); c.stroke(); c.restore(); }
      s.o2 = s.o2.filter(q => q.y > -30 && !(q.pop && st.t - q.pop > .3));
      drawCan(c, t);
      // meters
      const panel = rrect(16, 14, 214, 112, 16); c.fillStyle = 'rgba(255,253,245,.94)'; c.fill(panel); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(panel);
      for (const [i, name, v, col] of [[0, "Sunlight", isLit ? 100 : 25, C.sun], [1, "Water", s.water, C.water], [2, "Air", s.air, '#9FB3BF']]) {
        const y = 28 + i * 32; label(c, name, 30, y + 8, { size: 16, align: 'left', stroke: null });
        const bar = rrect(110, y, 106, 16, 8); c.fillStyle = '#EDEDE4'; c.fill(bar); c.save(); c.clip(bar); c.fillStyle = col; c.fillRect(110, y, 106 * v / 100, 16); c.restore(); c.strokeStyle = C.ink; c.lineWidth = 2; c.stroke(bar);
      }
      label(c, on ? (isLit ? "Making food!" : "Making food slowly") : "Factory waiting", 400, 528, { size: 24, color: on ? '#fff' : '#FFE7A3', stroke: 'rgba(36,54,40,.85)' });
      // hints: show what's missing
      const idle = t - s.lastAct > 4, b = RM ? 0 : Math.abs(Math.sin(t * 5)) * 6;
      if (!isLit && idle) label(c, "Move the cloud!", SUN[0] - 40, SUN[1] + 92 - b, { size: 20, color: C.carrot });
      else if (s.water < 5 && idle) label(c, "Water me!", CAN[0], CAN[1] - 64 - b, { size: 20, color: C.carrot });
      else if (s.air < 5 && idle && s.bubbles[0]) label(c, "Tap the air!", s.bubbles[0].x, s.bubbles[0].y - 40 - b, { size: 18, color: C.carrot });
      else if (on && s.o2.length && !found('oxygen') && idle) label(c, "Tap a bubble!", s.o2[0].x, Math.max(24, s.o2[0].y - 40), { size: 18, color: C.carrot });
      // the magnifying glass: look inside the leaf
      if (mag && st.p.inside && st.hit(LEAFP, st.p.x, st.p.y)) {
        cellsView(c, st.p.x, st.p.y, t); st.cursor = 'none'; s.magT += dt;
        if (s.magT > .6 && !found('green')) { earn('green', st.p.x, st.p.y); ui.say('Up close, a leaf is full of tiny green parts. The green stuff inside them is <b>chlorophyll</b>. It catches sunlight, like a solar panel.'); }
      } else s.magT = 0;
      if (s.earnedHere && A_leaf.stars.every(q => Store.data.stars[q.id]) && !s.told.all) { s.told.all = true; ui.say('You ran the leaf factory! Sunlight, water and carbon dioxide go in. Sugar and oxygen come out.', { queue: true }); }
    };
    function drawGasBubble(c, x, y, txt, fill, hot, alpha = 1) {
      c.save(); c.globalAlpha = alpha; if (hot) glowOn(c); c.fillStyle = fill; c.strokeStyle = C.ink; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, 22, 0, TAU); c.fill(); c.shadowBlur = 0; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(x - 8, y - 9, 6, 3.5, -.5, 0, TAU); c.fill();
      label(c, txt, x, y + 2, { size: 15, weight: 700, stroke: null }); c.restore();
    }
    magBtn = ui.button('Magnifying glass', () => { mag = !mag; magBtn.setAttribute('aria-pressed', mag); Sound.fwip(); });
    magBtn.setAttribute('aria-pressed', 'false');
    ui.button('Water', () => water());
    ui.button('Start over', () => { reset(); Sound.pop(); ui.say(A_leaf.intro); });
    ui.hint("Try it: put a leafy plant in a sunny window and one in a dark closet for a week. Which one stays green?");
    reset();
    return { stage: st, state: () => s, geo: { sun: SUN, can: CAN, leaf: along(.5), cloud: () => [s.cloudX + 20, s.cloudY - 4] }, destroy() { st.destroy(); } };
  }
};
