/* ============ bean seed pieces (shared with the quiz) ============ */
const KID = kidney(260, 174);
function drawEmbryo(c, glow, green = 0) {
  const on = k => glow === k || glow === 'embryo';
  const leafFill = mix('#C8DF84', C.leaf, green);
  // baby root
  c.save(); if (on('root')) glowOn(c); c.fillStyle = C.embryo; c.strokeStyle = '#93AE4F'; c.lineWidth = 2.5;
  const rad = new Path2D(); rad.moveTo(-44, 66); rad.quadraticCurveTo(-40, 44, -30, 34); rad.quadraticCurveTo(-18, 33, -12, 44); rad.quadraticCurveTo(-26, 52, -44, 66); rad.closePath();
  c.fill(rad); c.shadowBlur = 0; c.stroke(rad); c.restore();
  // the little stem joining root and leaves
  c.save(); if (on('embryo')) glowOn(c); c.strokeStyle = '#BFD77F'; c.lineCap = 'round'; c.lineWidth = 12; c.beginPath(); c.moveTo(-22, 40); c.quadraticCurveTo(-12, 26, 2, 20); c.stroke(); c.restore();
  // baby leaves
  for (const [rot, len] of [[-28, 44], [-64, 38]]) {
    c.save(); if (on('leaves')) glowOn(c); c.translate(0, 20); c.rotate(rot * DEG); const k = len / 112; c.scale(k, k * 1.15);
    c.fillStyle = leafFill; c.fill(LEAF); c.shadowBlur = 0; c.strokeStyle = '#7F9F3E'; c.lineWidth = 2.5 / k; c.stroke(LEAF);
    c.beginPath(); c.moveTo(6, 0); c.lineTo(100, 0); c.stroke(); c.restore();
  }
}
function drawBeanHalf(c, x, y, sc, { embryo = true, mirror = false, glow = null, green = 0 } = {}) {
  c.save(); c.translate(x, y); c.scale(mirror ? -sc : sc, sc);
  c.save(); if (glow === 'cot') glowOn(c); c.fillStyle = '#E9D08E'; c.fill(KID); c.restore();
  c.strokeStyle = '#C4A45C'; c.lineWidth = 3; c.stroke(KID);
  c.save(); c.scale(.93, .9); const g = c.createRadialGradient(-30, -25, 10, 0, 0, 150); g.addColorStop(0, '#FFFCEB'); g.addColorStop(1, '#F5E3AE'); c.fillStyle = g; c.fill(KID); c.restore();
  c.save(); c.clip(KID); const r = seeded(11); c.fillStyle = 'rgba(200,165,95,.22)'; for (let i = 0; i < 34; i++) { c.beginPath(); c.arc((r() - .5) * 220, (r() - .5) * 140, 1 + r() * 2.2, 0, TAU); c.fill(); } c.restore();
  if (embryo) drawEmbryo(c, glow, green);
  else { c.fillStyle = 'rgba(214,186,112,.5)'; c.beginPath(); c.ellipse(-16, 38, 26, 30, -.5, 0, TAU); c.fill(); }
  c.restore();
}

/* ============ Activity: Open a Seed ============ */
const A_seed = {
  id: 'seed', name: 'Open a Seed', icon: 'seed',
  badge: { id: 'b.seed', name: 'Seed Scientist', desc: 'You dissected a bean seed and found the baby plant!', how: 'Not yet! Open the bean and find every part in <b>Open a Seed</b>.' },
  stars: [{ id: 'seed.coat', name: 'Seed coat' }, { id: 'seed.cot', name: 'Cotyledon' }, { id: 'seed.embryo', name: 'Embryo' }, { id: 'seed.root', name: 'Baby root' }, { id: 'seed.leaves', name: 'Baby leaves' }],
  intro: 'Scientists open seeds to see what\'s inside, just like your class! First, <b>tap the dry bean</b> to soak it in water overnight.',
  facts: ['Did you know? A seed packs its own lunch! The two halves of a bean are the <b>cotyledons</b>. They feed the baby plant until its leaves can make food.', 'Did you know? A dry seed can wait a long time, even years! Water, air and warmth wake it up.'],
  mount(host, ui) {
    const st = new Stage(host, 'A lab table with a bean seed on a paper towel. Soak it, peel off the seed coat, split it open and find the baby plant.');
    const BX = 400, BY = 330, L = [225, 330], R = [575, 330], GLASS = [690, 250];
    const COAT = kidney(282, 190);
    let s;
    const found = k => !!Store.data.stars['seed.' + k];
    function reset() {
      s = { step: 0, soakT: -1, cells: [], total: 0, flakes: [], peel: 0, split: 0, target: null, drag: null, grow: 0, growT: -1, lastAct: Loop.t };
      if (magBtn) { magBtn.disabled = true; magBtn.setAttribute('aria-pressed', 'false'); } mag = false;
      if (sproutBtn) sproutBtn.disabled = true;
    }
    let mag = false, magBtn = null, sproutBtn = null;
    function buildCells() {
      s.cells = []; const test = xf(kidney(296, 204), BX, BY);
      for (let y = -104; y <= 104; y += 16) for (let x = -150; x <= 150; x += 16) {
        const cx = BX + x + rand(-3, 3), cy = BY + y + rand(-3, 3);
        if (st.hit(test, cx, cy)) s.cells.push({ x: cx, y: cy, on: true, sh: rand(-.08, .08), w: rand(17, 22) });
      }
      s.total = s.cells.length;
    }
    function peelAt(x, y) {
      let n = 0;
      for (const cl of s.cells) if (cl.on && dist(cl.x, cl.y, x, y) < 26) { cl.on = false; n++; if (s.flakes.length < 120) s.flakes.push({ x: cl.x, y: cl.y, vx: rand(-60, 60), vy: rand(-120, -30), r: rand(0, 6), vr: rand(-6, 6), life: 1.6, w: rand(10, 18) }); }
      if (n) { Sound.peel(); s.peel = 1 - s.cells.filter(q => q.on).length / s.total; }
      if (s.peel >= .8 && s.step === 1) {
        for (const cl of s.cells) if (cl.on) { cl.on = false; s.flakes.push({ x: cl.x, y: cl.y, vx: rand(-80, 80), vy: rand(-140, -40), r: 0, vr: rand(-6, 6), life: 1.6, w: rand(10, 18) }); }
        s.peel = 1; s.step = 2; Sound.fwip(); Sound.sparkle(.1);
        ui.say('That skin is the <b>seed coat</b>. It\'s a tough jacket that protects the baby plant inside. Now <b>drag the bean sideways</b> to split it open!');
        ui.award('seed.coat', ...st.client(x, y));
      }
    }
    const facts = {
      cot: 'These two big halves are <b>cotyledons</b> (say it: cot-uh-LEE-dunz). They are stuffed with food, like a packed lunch for the baby plant.',
      embryo: 'You found the <b>embryo</b>. It\'s the baby plant! Look closer: it has a tiny root and tiny leaves. Tap them!',
      root: 'This pointy part is the <b>baby root</b>. When the seed sprouts, the root grows down first to find water.',
      leaves: 'These are the <b>baby leaves</b>. Folded up tight, they are waiting to grow up toward the sunlight.'
    };
    const EMB = xf(ellipse(-12, 34, 46, 42), ...L), ROOT = xf(ellipse(-30, 52, 17, 21), ...L), LVS = xf(ellipse(16, 6, 28, 24), ...L);
    const LH = xf(KID, ...L), RH = xf(KID, R[0], R[1], 0, -1, 1);
    function part(x, y) {
      if (st.hit(ROOT, x, y)) return 'root'; if (st.hit(LVS, x, y)) return 'leaves'; if (st.hit(EMB, x, y)) return 'embryo';
      if (st.hit(LH, x, y) || st.hit(RH, x, y)) return 'cot'; return null;
    }
    function explore(p, x, y) {
      s.lastAct = st.t; let k = null;
      if (p === 'cot') { Sound.boing(); k = 'cot'; }
      else if (!found('embryo')) { Sound.grow(0); k = 'embryo'; }
      else if (p === 'root') { Sound.hop(); k = 'root'; }
      else if (p === 'leaves') { Sound.sparkle(); Sound.tap(5); k = 'leaves'; }
      else Sound.tap(3);
      if (k) ui.award('seed.' + k, ...st.client(x, y)); // award first: the message changes once every part is found
      ui.say(k ? facts[k] + allFound() : facts.embryo);
    }
    // the last part found unlocks the sprout button, and Pip says so right after that part's fact
    function allFound() {
      if (!A_seed.stars.every(q => Store.data.stars[q.id]) || !sproutBtn.disabled) return '';
      sproutBtn.disabled = false; return '<br>You found every part! Press <b>Watch it sprout</b> to see what the embryo does next.';
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      if (s.step === 0) { if (dist(x, y, BX, BY) < 150) { s.step = .5; s.soakT = st.t; Sound.plunk(); setTimeout(() => Sound.splash(), 500); ui.say('Into the water it goes! Soaking all night makes the bean soft...'); } else Sound.tap(1); return; }
      if (s.step === 1) { peelAt(x, y); return; }
      if (s.step === 2) { s.drag = { x0: x, p0: s.split }; return; }
      if (s.step >= 3) { const p = part(x, y); if (p) explore(p, x, y); else Sound.tap(Math.floor(x / 90)); }
    };
    st.onMove = (x, y) => {
      if (s.step === 1 && st.p.down) peelAt(x, y);
      if (s.step === 2 && s.drag) { const ns = clamp(s.drag.p0 + Math.abs(x - s.drag.x0) / 190, 0, 1); if (Math.floor(ns * 6) !== Math.floor(s.split * 6)) Sound.peel(); s.split = ns; }
    };
    st.onUp = () => { if (s.step === 2 && s.drag) { s.drag = null; s.target = s.split > .35 ? 1 : 0; if (s.target) Sound.crack(); } };

    function drawRoom(c, t) {
      const g = c.createLinearGradient(0, 0, 0, 205); g.addColorStop(0, '#DCEFE9'); g.addColorStop(1, '#CFE6DF'); c.fillStyle = g; c.fillRect(0, 0, W, 205);
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; for (let x = 0; x < W; x += 50) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 205); c.stroke(); } for (let y = 0; y < 205; y += 50) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      // poster
      c.save(); c.translate(70, 30); c.rotate(-.04); c.fillStyle = '#FFFDF5'; c.fillRect(0, 0, 140, 120); c.strokeStyle = C.ink; c.lineWidth = 3; c.strokeRect(0, 0, 140, 120);
      label(c, 'SEED LAB', 70, 20, { size: 18, stroke: null }); drawBeanHalf(c, 70, 72, .38, {}); c.restore();
      // window with day/night
      const e = s.soakT > 0 ? st.t - s.soakT : -1, night = e > .8 && e < 3 ? Math.sin((e - .8) / 2.2 * PI) : 0;
      c.save(); c.translate(560, 26); const wg = c.createLinearGradient(0, 0, 0, 130); wg.addColorStop(0, mix('#8FD3EE', '#1D2B5A', night)); wg.addColorStop(1, mix('#DDF4FB', '#3B4C86', night));
      c.fillStyle = wg; c.fillRect(0, 0, 170, 130);
      if (night > .2) { c.fillStyle = `rgba(255,248,210,${night})`; c.beginPath(); c.arc(120, 40, 20, 0, TAU); c.fill(); c.fillStyle = mix('#8FD3EE', '#1D2B5A', night); c.beginPath(); c.arc(130, 34, 18, 0, TAU); c.fill(); for (let i = 0; i < 6; i++) sparkle(c, 20 + i * 25, 20 + (i % 3) * 30, 4, `rgba(255,255,255,${night})`); }
      else { cloud(c, 30 + (t * 8) % 140, 50, .6); }
      c.strokeStyle = '#FFFDF5'; c.lineWidth = 10; c.strokeRect(0, 0, 170, 130); c.beginPath(); c.moveTo(85, 0); c.lineTo(85, 130); c.moveTo(0, 65); c.lineTo(170, 65); c.stroke(); c.restore();
      // table
      const tg = c.createLinearGradient(0, 200, 0, H); tg.addColorStop(0, '#E7BE84'); tg.addColorStop(1, '#D3A566'); c.fillStyle = tg; c.fillRect(0, 200, W, H - 200);
      c.fillStyle = '#C9955A'; c.fillRect(0, 196, W, 10); c.strokeStyle = 'rgba(150,100,50,.25)'; c.lineWidth = 2; for (const y of [290, 390, 480]) { c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(200, y + 8, 500, y - 8, W, y + 4); c.stroke(); }
      // paper towel
      c.save(); c.translate(400, 340); c.rotate(-.025); c.fillStyle = '#FBFBF6'; c.fillRect(-250, -130, 500, 260); c.fillStyle = 'rgba(160,210,230,.25)'; c.beginPath(); c.ellipse(-60, 20, 150, 80, .2, 0, TAU); c.fill();
      c.fillStyle = 'rgba(0,0,0,.05)'; for (let x = -240; x < 250; x += 20) for (let y = -120; y < 130; y += 20) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); } c.restore();
      // magnifier + tweezers props
      c.save(); c.translate(80, 470); c.rotate(-.5); c.fillStyle = '#9AA7B0'; c.fillRect(0, -4, 90, 8); c.fillRect(0, 6, 90, 6); c.restore();
    }
    function drawBean(c, t) {
      if (s.step < 1) {
        // dry or soaking bean
        const e = s.soakT > 0 ? st.t - s.soakT : -1; let x = BX, y = BY, sc = .82, swell = 0;
        if (e >= 0) {
          if (e < .8) { const k = ease(e / .8); x = lerp(BX, GLASS[0], k); y = lerp(BY, GLASS[1] + 30, k) - Math.sin(k * PI) * 120; sc = lerp(.82, .38, k); }
          else if (e < 3) { x = GLASS[0] + Math.sin(e * 3) * 3; y = GLASS[1] + 30; sc = lerp(.38, .48, (e - .8) / 2.2); swell = (e - .8) / 2.2; }
          else { const k = ease(clamp((e - 3) / .9, 0, 1)); x = lerp(GLASS[0], BX, k); y = lerp(GLASS[1] + 30, BY, k) - Math.sin(k * PI) * 120; sc = lerp(.48, 1, k); swell = 1; }
          if (e > 3.9 && s.step === .5) { s.step = 1; buildCells(); ui.say('The bean drank up water and got bigger and softer! Now <b>rub the bean</b> with your finger to peel off its skin.', { queue: true }); Sound.slurp(); }
        }
        c.save(); c.translate(x, y); c.scale(sc, sc); c.rotate(-.05);
        if (st.over(circle(BX, BY, 150)) && s.step === 0) glowOn(c);
        c.fillStyle = mix('#D8B872', C.beanCoat, swell); c.fill(COAT); c.shadowBlur = 0; c.strokeStyle = C.beanCoatDeep; c.lineWidth = 4; c.stroke(COAT);
        if (swell < .9) { c.strokeStyle = `rgba(150,110,50,${.5 * (1 - swell)})`; c.lineWidth = 3; for (const [a, b, d] of [[-80, -20, 30], [10, -40, 25], [40, 30, 30], [-60, 40, 20]]) { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo(a + d / 2, b - 12, a + d, b); c.stroke(); } }
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-40, -45, 50, 16, -.2, 0, TAU); c.fill();
        c.fillStyle = '#FFF6E0'; c.beginPath(); c.ellipse(-12, 70, 16, 6, .2, 0, TAU); c.fill();
        c.restore();
        return;
      }
      if (s.step < 2) {
        const K = xf(kidney(282, 190), BX, BY);
        const g = c.createRadialGradient(BX - 40, BY - 40, 10, BX, BY, 160); g.addColorStop(0, '#FFF8DC'); g.addColorStop(1, '#F1DC9C'); c.fillStyle = g; c.fill(K);
        c.strokeStyle = 'rgba(200,170,95,.7)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(BX - 130, BY - 10); c.bezierCurveTo(BX - 40, BY - 30, BX + 60, BY - 20, BX + 138, BY + 5); c.stroke();
        c.save(); c.clip(K); for (const cl of s.cells) if (cl.on) { c.fillStyle = mix(C.beanCoat, '#D8B872', .5 + cl.sh * 4); c.fillRect(cl.x - cl.w / 2, cl.y - cl.w / 2, cl.w, cl.w); } c.restore();
        c.strokeStyle = C.beanCoatDeep; c.lineWidth = 4; c.stroke(K);
        return;
      }
      // splitting / split
      const p = s.split;
      if (p < .06) {
        const K = xf(kidney(282, 190), BX, BY); const g = c.createRadialGradient(BX - 40, BY - 40, 10, BX, BY, 160); g.addColorStop(0, '#FFF8DC'); g.addColorStop(1, '#F1DC9C');
        c.fillStyle = g; c.fill(K); c.strokeStyle = '#D0B46E'; c.lineWidth = 3; c.stroke(K);
        c.strokeStyle = 'rgba(190,150,80,.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(BX - 130, BY - 10); c.bezierCurveTo(BX - 40, BY - 30, BX + 60, BY - 20, BX + 138, BY + 5); c.stroke();
        return;
      }
      const k = ease(p), sc = lerp(1.05, 1, k);
      const hv = s.step >= 3 && st.p.inside ? part(st.p.x, st.p.y) : null; if (hv) st.cursor = 'pointer';
      const grow = s.grow;
      c.save(); c.globalAlpha = clamp(p * 3, 0, 1);
      drawBeanHalf(c, lerp(BX + 10, R[0], k), lerp(BY, R[1], k), sc, { embryo: false, mirror: true, glow: hv === 'cot' ? 'cot' : null });
      if (grow > 0) drawSprout(c, grow, st.t);
      drawBeanHalf(c, lerp(BX - 10, L[0], k), lerp(BY, L[1], k), sc, { glow: hv, green: grow });
      c.restore();
    }
    function drawSprout(c, g, t) {
      const [x, y] = L; c.save(); c.translate(x, y); c.lineCap = 'round';
      // root grows down and out
      const rp = new Path2D(); rp.moveTo(-40, 62); rp.bezierCurveTo(-60, 100, -40, 150, -58, 60 + 200 * g);
      c.strokeStyle = C.rootDeep; c.lineWidth = 9; c.stroke(rp); c.strokeStyle = C.root; c.lineWidth = 5; c.stroke(rp);
      c.strokeStyle = C.rootDeep; c.lineWidth = 1.6; for (let i = 1; i < 7; i++) { const yy = 70 + i * 26 * g; c.beginPath(); c.moveTo(-50, yy); c.lineTo(-64, yy + 6); c.moveTo(-50, yy); c.lineTo(-36, yy + 6); c.stroke(); }
      // shoot grows up
      const top = [10 + Math.sin(t * 1.4) * 4 * g, 20 - 210 * g];
      c.strokeStyle = C.leafDeep; c.lineWidth = 10; c.beginPath(); c.moveTo(2, 20); c.quadraticCurveTo(-12, 20 - 100 * g, top[0], top[1]); c.stroke();
      c.strokeStyle = C.stem; c.lineWidth = 5; c.stroke();
      if (g > .3) { const ls = (g - .3) / .7 * .55; drawLeaf(c, top[0], top[1], -155, ls); drawLeaf(c, top[0], top[1], -25, ls); }
      c.restore();
    }
    function drawScene(c, t, dt, lens) {
      drawRoom(c, t);
      // glass of water
      c.save(); c.translate(...GLASS); c.fillStyle = 'rgba(79,179,232,.35)'; c.beginPath(); c.moveTo(-48, 0); c.lineTo(48, 0); c.lineTo(40, 110); c.lineTo(-40, 110); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-42, -40, 84, 40); c.strokeStyle = 'rgba(36,54,40,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-52, -45); c.lineTo(-40, 110); c.lineTo(40, 110); c.lineTo(52, -45); c.stroke();
      if (s.step === .5) for (let i = 0; i < 4; i++) { const by = 100 - ((t * 40 + i * 25) % 100); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(-20 + i * 13, by, 3 + i % 2, 0, TAU); c.stroke(); }
      c.restore();
      // leftover seed-coat scraps
      if (s.step >= 2) { for (const [fx, fy, rr] of [[640, 470, .4], [680, 452, -.6], [662, 492, 1.2], [610, 488, 2]]) { c.save(); c.translate(fx, fy); c.rotate(rr); c.fillStyle = C.beanCoat; c.strokeStyle = C.beanCoatDeep; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(0, -12, 14, -2); c.quadraticCurveTo(2, 6, -14, 0); c.fill(); c.stroke(); c.restore(); } }
      drawBean(c, t);
      // flakes of seed coat
      if (!lens) { for (const f of s.flakes) { f.life -= dt; f.vy += 420 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt; if (f.y > 470) { f.y = 470; f.vy = 0; f.vx *= .8; f.vr = 0; } } s.flakes = s.flakes.filter(f => f.life > 0); }
      for (const f of s.flakes) { c.save(); c.globalAlpha = clamp(f.life, 0, 1); c.translate(f.x, f.y); c.rotate(f.r); c.fillStyle = C.beanCoat; c.strokeStyle = C.beanCoatDeep; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, f.w / 2, f.w / 4, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
    }
    st.draw = (c, t, dt) => {
      if (s.target != null && !s.drag) { s.split += (s.target - s.split) * Math.min(1, dt * 6); if (Math.abs(s.target - s.split) < .004) { s.split = s.target; if (s.target === 1 && s.step === 2) { s.step = 3; magBtn.disabled = false; Sound.boing(); ui.say('Wow, two halves! <b>Tap the parts</b> to learn their names. Try the <b>magnifying glass</b> too!'); } s.target = null; } }
      if (s.growT > 0) { s.grow = clamp((t - s.growT) / 5, 0, 1); }
      drawScene(c, t, dt, false);
      // helpers & labels
      if (s.step === 1) {
        const bar = rrect(300, 505, 200, 20, 10); c.fillStyle = '#fff'; c.fill(bar); c.save(); c.clip(bar); c.fillStyle = C.leaf; c.fillRect(300, 505, 200 * s.peel / .8, 20); c.restore(); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(bar);
        label(c, 'Seed coat peeled', 400, 488, { size: 17 });
        if (s.peel < .05) { const hx = BX - 90 + Math.sin(t * 3) * 90; c.save(); c.fillStyle = 'rgba(255,138,61,.85)'; c.beginPath(); c.arc(hx, BY + 20, 16, 0, TAU); c.fill(); c.restore(); label(c, 'Rub to peel!', BX, BY - 125, { size: 24, color: C.carrot }); }
      }
      if (s.step === 0) label(c, 'Tap the bean!', BX, BY - 110, { size: 26, color: C.carrot });
      if (s.step === 2 && s.split < .1) { const o = Math.sin(t * 4) * 8; arrow(c, BX - 40 - o, BY + 125, BX - 150 - o, BY + 125); arrow(c, BX + 40 + o, BY + 125, BX + 150 + o, BY + 125); label(c, 'Drag to split!', BX, BY - 120, { size: 26, color: C.carrot }); }
      if (s.step >= 2) { const F = k => found(k) || ui.showAll; if (F('coat')) tag(c, 'Seed coat', 700, 530, 662, 480); }
      if (s.step >= 3) {
        const F = k => found(k) || ui.showAll;
        if (F('cot')) tag(c, 'Cotyledon', 585, 175, 600, 280);
        if (F('embryo')) tag(c, 'Embryo', 225, 180, L[0] - 10, L[1] + 30);
        if (F('root') && s.grow < .1) tag(c, 'Baby root', 105, 505, L[0] - 36, L[1] + 58);
        if (F('leaves') && s.grow < .1) tag(c, 'Baby leaves', 380, 490, L[0] + 20, L[1] + 4);
        if (s.grow >= 1) { label(c, 'Germination!', 400, 40, { size: 30, color: C.leafDeep }); }
      }
      // magnifying glass
      if (mag && st.p.inside && s.step >= 3) {
        const { x, y } = st.p; c.save(); c.beginPath(); c.arc(x, y, 90, 0, TAU); c.clip(); c.translate(x, y); c.scale(2.3, 2.3); c.translate(-x, -y); drawScene(c, t, 0, true); c.restore();
        c.save(); c.lineCap = 'round'; c.strokeStyle = '#6B4F35'; c.lineWidth = 18; c.beginPath(); c.moveTo(x + 70, y + 70); c.lineTo(x + 125, y + 125); c.stroke();
        c.strokeStyle = C.ink; c.lineWidth = 11; c.beginPath(); c.arc(x, y, 92, 0, TAU); c.stroke(); c.strokeStyle = '#CFD8DC'; c.lineWidth = 6; c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 76, 3.6, 4.4); c.stroke(); c.restore();
        st.cursor = 'none';
      }
    };
    let magTold = false; // explain the magnifier the first time only
    magBtn = ui.button('Magnifying glass', () => { mag = !mag; magBtn.setAttribute('aria-pressed', mag); Sound.fwip(); if (mag && !magTold) magTold = ui.say('Move the <b>magnifying glass</b> over the seed to look up close. Scientists use them to see tiny details!'); });
    sproutBtn = ui.button('Watch it sprout', () => { s.growT = st.t; s.grow = 0; Sound.grow(0); setTimeout(() => Sound.grow(3), 1800); setTimeout(() => Sound.star(), 4200); ui.say('In the soil, the root grows <b>down</b> and the shoot grows <b>up</b>. This is called <b>germination</b>. The cotyledons feed the baby plant until its leaves can make food.'); }, 'go');
    ui.button('Get a new bean', () => { reset(); Sound.pop(); ui.say(A_seed.intro); });
    reset(); magBtn.setAttribute('aria-pressed', 'false');
    if (A_seed.stars.every(q => Store.data.stars[q.id])) ui.hint('You already found every part. Open the bean again to try the sprout!');
    ui.showAll = false;
    return { stage: st, destroy() { st.destroy(); } };
  }
};
