/* ============ Activity: Grow a Bean (life cycle) ============ */
const A_grow = {
  id: 'grow', name: 'Grow a Bean', icon: 'grow',
  badge: { id: 'b.grow', name: 'Green Thumb', desc: 'You grew a bean plant through its whole life cycle!' },
  stars: [{ id: 'grow.1', name: 'Germination' }, { id: 'grow.2', name: 'Sprout' }, { id: 'grow.3', name: 'Seedling' }, { id: 'grow.4', name: 'Adult plant' }, { id: 'grow.5', name: 'Flowers' }, { id: 'grow.6', name: 'Fruit & seeds' }],
  intro: 'We planted a bean seed! To wake up, a seed needs <b>water</b>, <b>air</b> and <b>warmth</b>. <b>Tap the watering can</b> to give it a drink.',
  mount(host, ui) {
    const st = new Stage(host, 'A garden cut away to show a bean seed in the soil. Tap the watering can and the sun to help it grow through its life cycle.');
    const GY = 300, SX = 400, SY = 372, CAN = [120, 200], SUN = [690, 85];
    const STAGES = ['Seed', 'Germination', 'Sprout', 'Seedling', 'Adult plant', 'Flowers', 'Fruit & seeds'];
    const facts = [
      '',
      '<b>Germination!</b> The seed coat cracked and a tiny root poked out. Roots always grow <b>down</b>. Seeds don\'t need sunlight to sprout, just water, air and warmth.',
      '<b>Sprout!</b> The shoot pushed <b>up</b> out of the soil. Those two round leaves are the <b>cotyledons</b> from inside the seed. Now it needs <b>sunlight</b> too!',
      '<b>Seedling!</b> The true leaves are opening. They catch sunlight and make food for the plant.',
      '<b>Adult plant!</b> It grew tall, with lots of leaves. Under the ground, the roots spread out to find water.',
      '<b>Flowers!</b> The plant is blooming. Bees visit and carry pollen from flower to flower.',
      '<b>Fruit and seeds!</b> After pollination, the flowers turned into bean pods. Inside each pod are new seeds.'
    ];
    let s, chips = null;
    function reset() { s = { g: 0, water: 0, sunM: 45, stage: 0, pourT: -9, sunT: -9, drops: [], seeds: [], dropped: false, thirst: 0, dryT: 0, told: {}, spokeT: -99, factQ: [], cloudX: 900, pods: [], flowers: [], done: false }; paintChips(); }
    function paintChips() { if (!chips) return; chips.innerHTML = STAGES.map((n, i) => `<span class="${i <= s.stage ? 'on' : ''}">${n}</span>`).join('<i>›</i>'); }
    const canTip = () => { const e = st.t - s.pourT; if (e > 1.6) return 0; return e < .3 ? ease(e / .3) : e < 1.25 ? 1 : 1 - ease((e - 1.25) / .35); };
    function water(x, y) { if (st.t - s.pourT < 1.6) return; s.pourT = st.t; Sound.splash(); setTimeout(() => Sound.slurp(), 700); if (s.g < .1 && !s.toldWater) { s.toldWater = true; ui.say('Glug glug! The water soaks into the soil and the seed starts to drink it up...'); } }
    function shine() { s.sunT = st.t; s.sunM = 100; Sound.grow(4); Sound.sparkle(.2); if (s.g < 1.9 && !s.toldSun) { s.toldSun = true; ui.say('Warm sunshine! The seed is still under the ground, so it only needs <b>water</b> and <b>warmth</b> for now.'); } }
    function onStage(n) {
      paintChips();
      // stage facts wait in line so one never cuts off the one before it
      if (n <= 6) { Sound.grow(n); s.factQ.push(facts[n]); ui.award('grow.' + n, ...st.client(SX, n < 2 ? SY : GY - 120)); }
      if (n === 7) { Sound.boing(); s.factQ.push('The pods dried up and popped open. The seeds fell to the ground and the <b>life cycle</b> can start all over again! Press <b>Plant a new seed</b> to grow another.'); s.done = true; }
    }
    st.onDown = (x, y) => {
      if (dist(x, y, ...CAN) < 75 || (x < 250 && y < 280 && y > 110)) return water(x, y);
      if (dist(x, y, ...SUN) < 70 || (x > s.cloudX - 20 && x < s.cloudX + 110 && y < 150)) return shine();
      Sound.tap(Math.floor(x / 80));
    };
    function drawCan(c, t, dt) {
      const k = canTip(), x = lerp(CAN[0], 250, k), y = lerp(CAN[1], 150, k), rot = -k * .6;
      c.save(); c.translate(x, y); c.rotate(-rot);
      const hot = st.over(circle(...CAN, 75)) && !k; if (hot) glowOn(c);
      const body = rrect(-42, -30, 84, 64, 12); c.fillStyle = '#5BA8D9'; c.fill(body); c.shadowBlur = 0; c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(body);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-32, -22, 10, 44);
      c.lineCap = 'round'; c.strokeStyle = C.ink; c.lineWidth = 12; c.beginPath(); c.moveTo(36, 8); c.lineTo(88, -34); c.stroke(); c.strokeStyle = '#5BA8D9'; c.lineWidth = 7; c.stroke();
      c.fillStyle = '#4B93C2'; c.beginPath(); c.ellipse(92, -38, 8, 14, -.9, 0, TAU); c.fill(); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke();
      c.strokeStyle = C.ink; c.lineWidth = 6; c.beginPath(); c.arc(-40, -8, 26, PI * .6, PI * 1.45); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-6, 0, 12, 0, TAU); c.fill(); c.fillStyle = C.water; c.beginPath(); c.moveTo(-6, -8); c.quadraticCurveTo(2, 2, -6, 6); c.quadraticCurveTo(-14, 2, -6, -8); c.fill();
      c.restore();
      if (k > .7 && st.t - s.pourT < 1.3) { const sx = x + Math.cos(rot) * 92 + Math.sin(rot) * 38, sy = y - Math.sin(rot) * 92 - Math.cos(rot) * 38 + 30; for (let i = 0; i < 2; i++) s.drops.push({ x: sx + rand(-8, 8), y: sy, vx: rand(50, 130), vy: rand(-20, 40) }); s.water = Math.min(100, s.water + 58 * dt); }
      // the can itself is the reminder: it bounces and asks for a tap when the soil is dry (or at the very start)
      if (!k && (s.g < .05 || s.water < 1)) { const b = RM ? 0 : Math.abs(Math.sin(t * 5)) * 6; label(c, s.g < .05 ? 'Tap me!' : 'Water me!', CAN[0], CAN[1] - 62 - b, { size: 19, color: C.carrot }); }
    }
    function drawPlantAt(c, t, g) {
      const droop = clamp(s.thirst / 2, 0, 1) * (g >= 1.9 ? 1 : 0), sw = RM ? 0 : Math.sin(t * 1.3) * 4;
      // roots
      const rl = clamp((g - .5) / 2.5, 0, 1);
      if (rl > 0) {
        c.save(); c.lineCap = 'round'; const mr = new Path2D(); mr.moveTo(SX - 2, SY + 10); mr.bezierCurveTo(SX - 10, SY + 60 * rl, SX + 10, SY + 110 * rl, SX + 4, SY + 12 + 165 * rl);
        c.strokeStyle = C.rootDeep; c.lineWidth = 7; c.stroke(mr); c.strokeStyle = C.root; c.lineWidth = 3.5; c.stroke(mr);
        const br = clamp((g - 2) / 2.5, 0, 1);
        if (br > 0) for (const [u, sd, len] of [[.25, -1, 70], [.3, 1, 80], [.5, -1, 60], [.55, 1, 66], [.75, -1, 45], [.8, 1, 50]]) {
          const y0 = SY + 12 + 165 * rl * u, p = new Path2D(); p.moveTo(SX, y0); p.quadraticCurveTo(SX + sd * len * .5 * br, y0 + 4, SX + sd * len * br, y0 + len * .55 * br);
          c.strokeStyle = C.rootDeep; c.lineWidth = 4.5; c.stroke(p); c.strokeStyle = C.root; c.lineWidth = 2; c.stroke(p);
        }
        c.restore();
      }
      // seed coat
      const cs = g < 2.2 ? 1 : lerp(1, .55, clamp((g - 2.2) / 1.2, 0, 1));
      c.save(); c.translate(SX, SY); c.rotate(-.15); c.scale(cs, cs); const K = kidney(50, 34); c.fillStyle = g < 2.2 ? C.beanCoat : '#D9C08A'; c.fill(K); c.strokeStyle = C.beanCoatDeep; c.lineWidth = 2.5; c.stroke(K);
      if (g > .4) { c.strokeStyle = C.soilDeep; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, -10); c.lineTo(-6, -2); c.lineTo(-10, 4); c.lineTo(0, 12); c.stroke(); }
      c.restore();
      // shoot underground (pale, hooked)
      const sp = clamp((g - 1.1) / .8, 0, 1);
      if (sp > 0) { const topY = lerp(SY - 14, GY - 2, sp); c.save(); c.lineCap = 'round'; c.strokeStyle = '#7FA64A'; c.lineWidth = 9; c.beginPath(); c.moveTo(SX, SY - 12); c.lineTo(SX, topY); c.stroke(); c.strokeStyle = '#DDEBA8'; c.lineWidth = 5; c.stroke(); if (g < 1.9) { c.strokeStyle = '#7FA64A'; c.lineWidth = 8; c.beginPath(); c.arc(SX + 9, topY, 9, PI, PI * 1.95); c.stroke(); } c.restore(); }
      const ah = g < 1.9 ? 0 : g < 4.6 ? easeOut(clamp((g - 1.9) / 2.7, 0, 1)) * 210 : 210;
      s.pods = []; s.flowers = [];
      if (ah <= 0) return;
      const top = [SX + sw + droop * 55, GY - ah + droop * 30];
      const S = [[SX, GY], [SX - 6, GY - ah * .35], [SX + 8 + sw * .5 + droop * 25, GY - ah * .7], top];
      c.save(); c.lineCap = 'round'; const stem = new Path2D(); stem.moveTo(...S[0]); stem.bezierCurveTo(...S[1], ...S[2], ...S[3]);
      c.strokeStyle = C.leafDeep; c.lineWidth = lerp(8, 14, ah / 210); c.stroke(stem); c.strokeStyle = C.stem; c.lineWidth = lerp(4, 8, ah / 210); c.stroke(stem); c.restore();
      // cotyledons
      const cg = clamp((g - 1.9) / .5, 0, 1), cf = clamp((g - 4.4) / 1, 0, 1);
      if (cg > 0 && g < 5.6) { const u = Math.min(1, 28 / ah), p = bez(...S, u); for (const sd of [-1, 1]) { c.save(); c.translate(p[0] + sd * 15 * cg, p[1] + droop * 6); c.rotate(sd * (.35 + droop * .6)); c.fillStyle = mix('#8FCB63', '#D8C66A', cf); c.strokeStyle = C.leafDeep; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 0, 17 * cg * (1 - cf * .35), 11 * cg * (1 - cf * .35), 0, 0, TAU); c.fill(); c.stroke(); c.restore(); } }
      // trifoliate leaves at nodes, with flowers → pods
      const nodes = [{ h: 70, sd: -1 }, { h: 105, sd: 1 }, { h: 140, sd: -1 }, { h: 170, sd: 1 }, { h: 195, sd: -1 }];
      nodes.forEach((n, i) => {
        const lg = clamp((ah - n.h - 5) / 30, 0, 1) * (g >= 2.6 ? 1 : 0); if (lg <= 0) return;
        const p = bez(...S, clamp(n.h / ah, 0, 1)), base = n.sd < 0 ? -150 : -30, d = droop * 35 * (n.sd < 0 ? -1 : 1), wig = RM ? 0 : Math.sin(t * 1.7 + i) * 4;
        for (const [off, sz] of [[-32, .34], [0, .42], [32, .34]]) drawLeaf(c, p[0], p[1], base + off + d + wig, sz * lg);
        if (i >= 1 && i <= 3) {
          const fl = clamp((g - 4.8) / .6, 0, 1), pd = clamp((g - 5.8) / .6, 0, 1), dry = clamp((g - 6.6) / .4, 0, 1), op = clamp((g - 7) / .2, 0, 1);
          const fx = p[0] - n.sd * 16, fy = p[1] + 8;
          if (fl > 0 && pd < 1) { drawFlowerHead(c, fx, fy, .3 * fl * (1 - pd), t, { petal: '#C9A8F2', light: '#FFFFFF', edge: '#8A6CC0' }); s.flowers.push([fx, fy]); }
          if (pd > 0) { c.save(); c.translate(fx, fy); c.rotate((n.sd < 0 ? -18 : 18) * DEG); c.scale(.7 * pd, .7 * pd); drawPod(c, op, t, dry); c.restore(); s.pods.push([fx, fy + 30]); }
        }
      });
      if (g >= 2.4) { const k = clamp((g - 2.4) / .8, 0, 1); drawLeaf(c, top[0], top[1], -115 + droop * 60, .38 * k); drawLeaf(c, top[0], top[1], -65 + droop * 60, .38 * k); }
    }
    st.draw = (c, t, dt) => {
      // grow logic
      const above = s.g >= 1.9, okW = s.water > .5, okS = !above || s.sunM > .5;
      // say the next stage fact once Pip is free (and the last message had a moment on screen)
      if (s.factQ.length && !App.sayQ.length && calm(1) && t - (App.sayT || -99) > (Voice.auto && Sound.unlocked || waitForPip() ? 1 : 5)) ui.say(s.factQ.shift());
      // growth slows down while Pip is explaining, so the story keeps pace with the plant
      const pace = Voice.speaking || Listen.on || s.factQ.length ? .35 : 1;
      if (okW && okS && s.g < 7.25) { s.g += dt * .2 * pace; s.water = Math.max(0, s.water - dt * 2.4 * pace); if (above) s.sunM = Math.max(0, s.sunM - dt * 2.6 * pace); }
      s.water = Math.max(0, s.water - dt * .3);
      s.thirst = !okW && s.g >= 1.9 && s.g < 7 ? s.thirst + dt : Math.max(0, s.thirst - dt * 2);
      // Reminders: the can or the sun shows the need right away (bouncing label, drooping plant). Pip only says it
      // the first time, or if it's been ignored for a while, and never over another line.
      const need = !okW ? 'water' : !okS ? 'sun' : null;
      s.dryT = need && s.g > .05 && s.g < 7 ? s.dryT + dt : 0;
      if (need && s.dryT > 3) {
        const first = !s.told[need], ignored = s.dryT > 20 && t - s.spokeT > 30;
        if (first || ignored) {
          const msg = need === 'water' ? 'The plant is <b>thirsty</b>! Its leaves are drooping. Tap the watering can.' : 'Clouds are blocking the sun. Plants need <b>sunlight</b> to make food. Tap the sun!';
          if (ui.say(msg, { polite: true })) { s.told[need] = true; s.spokeT = t; Sound.oops(); }
        }
      }
      const ns = Math.min(7, Math.floor(s.g)); if (ns > s.stage) { s.stage = ns; onStage(ns); }
      // sky dims with less sunshine
      const dim = above ? (1 - s.sunM / 100) : 0;
      sky(c, mix('#86CFEA', '#7F97A6', dim), mix('#E2F6FC', '#B8C6CC', dim), GY);
      const cov = clamp((55 - s.sunM) / 40, 0, 1) * (above ? 1 : 0); s.cloudX += ((t - s.sunT < 1.5 ? 900 : lerp(880, 640, cov)) - s.cloudX) * Math.min(1, dt * 2);
      sun(c, ...SUN, 42, t, { glow: t - s.sunT < 1.5 ? 1 : 0 }); st.over(circle(...SUN, 70)); // pointer cursor over the sun
      cloud(c, s.cloudX, 95, 1.35, .97); cloud(c, 300 + ((t * 10) % 300), 60, .6);
      if (above && s.sunM < 1 && s.g < 7) { const b = RM ? 0 : Math.abs(Math.sin(t * 5)) * 6; label(c, 'Tap the sun!', SUN[0] - 10, SUN[1] + 66 - b, { size: 19, color: C.carrot }); }
      ground(c, GY, t);
      // wet soil
      if (s.water > 0) { const wg = c.createRadialGradient(SX, GY + 30, 10, SX, GY + 30, 190); wg.addColorStop(0, `rgba(45,25,12,${s.water / 100 * .5})`); wg.addColorStop(1, 'rgba(45,25,12,0)'); c.fillStyle = wg; c.fillRect(SX - 200, GY + 6, 400, 260); }
      drawPlantAt(c, t, s.g);
      // falling seeds
      if (s.g >= 7 && !s.dropped && s.pods.length) { s.dropped = true; for (const [px, py] of s.pods) for (let i = 0; i < 2; i++) s.seeds.push({ x: px + rand(-6, 6), y: py, vx: rand(-60, 60), vy: rand(-80, -20), rest: false }); Sound.ptoo(); setTimeout(() => Sound.ptoo(), 150); }
      for (const q of s.seeds) { if (!q.rest) { q.vy += 700 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.y > GY + 2) { q.y = GY + 2; q.vy *= -.3; q.vx *= .5; if (Math.abs(q.vy) < 30) { q.rest = true; Sound.drip(); } } } c.save(); c.translate(q.x, q.y); c.fillStyle = '#E8D29C'; c.strokeStyle = '#A88445'; c.lineWidth = 2; const K = kidney(18, 12); c.fill(K); c.stroke(K); c.restore(); }
      // bees when flowers bloom
      if (s.flowers.length) { const f = s.flowers[Math.floor(t / 2.5) % s.flowers.length]; const a = t * 3; bee(c, f[0] + Math.cos(a) * 34, f[1] - 14 + Math.sin(a * 2) * 12, t, .7, { flip: Math.sin(a) > 0 }); }
      // water drops
      for (const d of s.drops) { d.vy += 700 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.y > GY) { d.dead = true; if (Math.random() < .15) Sound.drip(); } c.fillStyle = C.water; c.beginPath(); c.arc(d.x, d.y, 4, 0, TAU); c.fill(); }
      s.drops = s.drops.filter(d => !d.dead);
      drawCan(c, t, dt);
      // meters
      const panel = rrect(560, 170, 222, 88, 16); c.fillStyle = 'rgba(255,253,245,.92)'; c.fill(panel); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(panel);
      for (const [i, name, v, col] of [[0, 'Water', s.water, C.water], [1, 'Sunlight', above ? s.sunM : 100, C.sun]]) {
        const y = 186 + i * 38; label(c, name, 574, y + 8, { size: 16, align: 'left', stroke: null });
        const bar = rrect(660, y, 110, 16, 8); c.fillStyle = '#EDEDE4'; c.fill(bar); c.save(); c.clip(bar); c.fillStyle = col; c.fillRect(660, y, 110 * v / 100, 16); c.restore(); c.strokeStyle = C.ink; c.lineWidth = 2; c.stroke(bar);
      }
      if (!above) label(c, 'Seeds sprout in the dark!', 671, 276, { size: 14, color: C.ink });
      // stage name
      label(c, STAGES[Math.min(6, s.stage)] + (s.done ? ' → Seed again!' : ''), 400, 528, { size: 26, color: '#fff', stroke: 'rgba(36,54,40,.85)' });
      if (!s.done && s.g > .05 && okW && okS) label(c, 'Growing...', 400, 494, { size: 17, color: '#FFE7A3', stroke: 'rgba(36,54,40,.7)' });
    };
    ui.button('Water', () => water(), '');
    ui.button('Sunshine', () => shine(), '');
    ui.button('Plant a new seed', () => { reset(); Sound.pop(); ui.say(A_grow.intro); }, 'go');
    chips = ui.extraEl('div', 'cycle');
    reset();
    return { stage: st, state: () => s, destroy() { st.destroy(); } }; // state() is for tests
  }
};
