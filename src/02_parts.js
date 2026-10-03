/* ============ the garden plant (shared by "Meet the Plant" and the quiz) ============ */
function drawPlant(c, t, o = {}) {
  const cx = o.cx ?? 400, gy = o.gy ?? 390, hl = o.hl || null, podOpen = o.podOpen || 0, bounce = o.bounce || 0;
  const sway = RM ? 0 : Math.sin(t * 1.1) * 6;
  const S = [[cx, gy], [cx - 14, gy - 85], [cx + 16 + sway * .5, gy - 170], [cx + sway, gy - 236]];
  const P = { stemCurve: S };
  // roots
  const R = [
    [[cx, gy], [cx - 6, gy + 45], [cx + 8, gy + 85], [cx + 2, gy + 140]],
    [[cx - 2, gy + 12], [cx - 30, gy + 22], [cx - 62, gy + 48], [cx - 92, gy + 96]],
    [[cx + 2, gy + 16], [cx + 32, gy + 26], [cx + 66, gy + 44], [cx + 96, gy + 90]],
    [[cx - 3, gy + 60], [cx - 26, gy + 72], [cx - 38, gy + 104], [cx - 50, gy + 146]],
    [[cx + 4, gy + 66], [cx + 26, gy + 80], [cx + 40, gy + 112], [cx + 50, gy + 150]]
  ];
  P.rootCurves = R; P.roots = ellipse(cx, gy + 78, 118, 84);
  c.save(); if (hl === 'roots') glowOn(c); c.lineCap = 'round';
  R.forEach((r, i) => { const p = new Path2D(); p.moveTo(...r[0]); p.bezierCurveTo(...r[1], ...r[2], ...r[3]); c.strokeStyle = C.rootDeep; c.lineWidth = i ? 7 : 11; c.stroke(p); });
  c.shadowBlur = 0;
  R.forEach((r, i) => { const p = new Path2D(); p.moveTo(...r[0]); p.bezierCurveTo(...r[1], ...r[2], ...r[3]); c.strokeStyle = C.root; c.lineWidth = i ? 3.5 : 6; c.stroke(p); });
  c.strokeStyle = C.rootDeep; c.lineWidth = 1.8;
  R.forEach(r => { for (const u of [.35, .6, .82]) { const a = bez(...r, u), b = bez(...r, u + .02); const nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + nx / L * 9 * sd, a[1] + ny / L * 9 * sd + 3); c.stroke(); } } });
  c.restore();
  // stem
  const stem = new Path2D(); stem.moveTo(...S[0]); stem.bezierCurveTo(...S[1], ...S[2], ...S[3]); P.stem = stem;
  c.save(); if (hl === 'stem') glowOn(c); c.lineCap = 'round'; c.strokeStyle = C.leafDeep; c.lineWidth = 17; c.stroke(stem); c.shadowBlur = 0;
  c.strokeStyle = C.stem; c.lineWidth = 10; c.stroke(stem); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.stroke(xf(stem, -3, 0)); c.restore();
  // pod stalk
  const bp = bez(...S, .5), pe = [bp[0] + 58, bp[1] + 14];
  c.save(); c.lineCap = 'round'; c.beginPath(); c.moveTo(...bp); c.quadraticCurveTo(bp[0] + 36, bp[1] - 18, pe[0], pe[1]); c.strokeStyle = C.leafDeep; c.lineWidth = 7; c.stroke(); c.strokeStyle = C.stem; c.lineWidth = 3.5; c.stroke(); c.restore();
  // leaves
  const LV = [{ u: .24, a: -158, s: .95 }, { u: .4, a: -22, s: .9 }, { u: .64, a: -150, s: .82 }, { u: .8, a: -30, s: .72 }];
  P.leaves = []; P.leafCenters = [];
  LV.forEach((l, i) => {
    const pt = bez(...S, l.u), rot = l.a + (RM ? 0 : Math.sin(t * 1.6 + i * 1.7) * 5);
    P.leaves.push(xf(LEAF, pt[0], pt[1], rot, l.s)); P.leafCenters.push([pt[0] + Math.cos(rot * DEG) * 56 * l.s, pt[1] + Math.sin(rot * DEG) * 56 * l.s]);
    c.save(); if (hl === 'leaves') glowOn(c); drawLeaf(c, pt[0], pt[1], rot, l.s); c.restore();
  });
  // pod (the fruit)
  const PR = -28;
  P.fruit = xf(ellipse(2, 50, 26, 60), pe[0], pe[1], PR);
  P.podCenter = [pe[0] + 2 * Math.cos(PR * DEG) - 50 * Math.sin(PR * DEG), pe[1] + 2 * Math.sin(PR * DEG) + 50 * Math.cos(PR * DEG)];
  c.save(); c.translate(...pe); c.rotate(PR * DEG); if (hl === 'fruit') glowOn(c); drawPod(c, podOpen, t); c.restore();
  // flower
  const F = [S[3][0], S[3][1] - 6]; P.flowerC = F; P.flower = circle(F[0], F[1], 62);
  c.save(); if (hl === 'flower') glowOn(c); drawFlowerHead(c, F[0], F[1], 1 + bounce, t); c.restore();
  return P;
}
function worm(c, x, y, t, fast = 0) {
  const sp = fast ? 12 : 3; c.save(); c.fillStyle = 'rgba(40,22,10,.35)'; c.beginPath(); c.ellipse(x + 36, y + 2, 52, 16, 0, 0, TAU); c.fill();
  const pts = []; for (let i = 0; i <= 10; i++) pts.push([x + i * 7, y + (RM ? 0 : Math.sin(t * sp - i * .7) * (fast ? 8 : 5))]);
  const p = new Path2D(); p.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) p.lineTo(...pts[i]);
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#C9646D'; c.lineWidth = 17; c.stroke(p); c.strokeStyle = '#F4A3A8'; c.lineWidth = 11; c.stroke(p);
  c.strokeStyle = 'rgba(201,100,109,.8)'; c.lineWidth = 2; for (const i of [6, 7]) { c.beginPath(); c.moveTo(pts[i][0], pts[i][1] - 5); c.lineTo(pts[i][0], pts[i][1] + 5); c.stroke(); }
  const hd = pts[10]; c.fillStyle = '#fff'; c.beginPath(); c.arc(hd[0] + 2, hd[1] - 3, 4, 0, TAU); c.fill(); c.fillStyle = C.ink; c.beginPath(); c.arc(hd[0] + 3, hd[1] - 3, 2, 0, TAU); c.fill();
  c.restore(); return circle(x + 36, y, 44);
}

/* ============ Activity: Meet the Plant ============ */
const A_parts = {
  id: 'parts', name: 'Meet the Plant', icon: 'plant',
  badge: { id: 'b.parts', name: 'Plant Pal', desc: 'You found every part of a plant!', how: 'Not yet! Find all 5 parts of the plant in <b>Meet the Plant</b>.' },
  stars: [{ id: 'parts.roots', name: 'Roots' }, { id: 'parts.stem', name: 'Stem' }, { id: 'parts.leaves', name: 'Leaves' }, { id: 'parts.flower', name: 'Flower' }, { id: 'parts.fruit', name: 'Fruit & seeds' }],
  intro: 'Every plant has parts with special jobs. <b>Tap each part</b> of this plant to learn its job. Can you find all 5?',
  mount(host, ui) {
    const st = new Stage(host, 'A plant growing in a garden with roots under the soil. Tap its roots, stem, leaves, flower and pod.');
    const CL = [{ x: 180, y: 70, s: .9, v: 12 }, { x: 560, y: 110, s: .7, v: 8 }, { x: 860, y: 55, s: 1.1, v: 10 }];
    const s = { P: null, sel: null, selT: -9, fx: { roots: -9, stem: -9, leaves: -9, flower: -9, fruit: -9 }, podOpen: 0, podTarget: 0, drops: [], worm: -9, sunT: -9, lastAct: Loop.t, all: false };
    const facts = {
      roots: '<b>Roots</b> grow under the ground. They hold the plant in place and slurp up water and minerals, like a bunch of straws!',
      stem: 'The <b>stem</b> holds the plant up tall. Tiny tubes inside carry water up to the leaves, like an elevator.',
      leaves: '<b>Leaves</b> are food factories! They use sunlight, air and water to make sugar for the plant. That is called <b>photosynthesis</b>.',
      flower: 'The <b>flower</b> is where seeds get started. Bright petals invite bees, and the bees bring <b>pollen</b>.',
      fruit: 'This pod is the plant\'s <b>fruit</b>! A fruit holds and protects the <b>seeds</b>. Every bean inside could grow a brand new plant.'
    };
    const sounds = { roots: () => Sound.slurp(), stem: () => Sound.boing(), leaves: () => Sound.sparkle(), flower: () => Sound.buzz(true), fruit: () => { Sound.crack(); [0, 1, 2, 3].forEach(i => setTimeout(() => Sound.pop(), 200 + i * 110)); } };
    const found = k => !!Store.data.stars['parts.' + k];
    function spawnDrops(fromStem) {
      for (let i = 0; i < 16; i++) s.drops.push(fromStem ? { mode: 'stem', u: 0, d: i * .14 } : { mode: 'root', ri: i % 5, u: 1, d: i * .12 });
    }
    function choose(part, x, y) {
      s.sel = part; s.selT = st.t; s.fx[part] = st.t; s.lastAct = st.t; ui.say(facts[part]); sounds[part]();
      if (part === 'fruit') s.podTarget = s.podTarget ? 0 : 1;
      if (part === 'roots') spawnDrops(false); if (part === 'stem') spawnDrops(true);
      if (part === 'flower') setTimeout(() => { if (st.t - s.fx.flower > 5.5) Sound.buzz(false); }, 6000);
      ui.award('parts.' + part, ...st.client(x, y));
    }
    function which(x, y) {
      const P = s.P; if (!P) return null;
      if (st.hit(P.fruit, x, y)) return 'fruit'; if (st.hit(P.flower, x, y)) return 'flower';
      if (P.leaves.some(p => st.hit(p, x, y))) return 'leaves'; if (st.hitLine(P.stem, x, y, 30)) return 'stem';
      if (st.hit(P.roots, x, y)) return 'roots'; return null;
    }
    st.onDown = (x, y) => {
      const part = which(x, y); if (part) return choose(part, x, y);
      if (st.hit(s.wormPath, x, y)) { s.worm = st.t; Sound.squish(); ui.say('Wiggle wiggle! <b>Earthworms</b> dig tunnels that let air and water reach the roots. Worms help plants grow!'); return; }
      if (st.hit(s.butterPath, x, y)) { Sound.fwip(); Sound.sparkle(.1); ui.say('<b>Butterflies</b> sip sweet nectar from flowers. Pollen sticks to them and they carry it to the next flower!'); return; }
      if (st.hit(circle(95, 88, 60), x, y)) { s.sunT = st.t; Sound.grow(2); ui.say('The <b>sun</b> gives plants the energy they need to make their food.'); return; }
      Sound.tap(Math.floor(x / 80));
    };
    st.draw = (c, t, dt) => {
      sky(c); sun(c, 95, 88, 40, t, { glow: t - s.sunT < 2 ? 1 : 0 }); clouds(c, t, CL);
      c.fillStyle = '#A8DB8A'; c.beginPath(); c.moveTo(0, 392); c.quadraticCurveTo(170, 300, 360, 382); c.quadraticCurveTo(560, 320, 800, 374); c.lineTo(800, 400); c.lineTo(0, 400); c.fill();
      ground(c, 390, t);
      s.wormPath = worm(c, 170, 482, t, t - s.worm < 2);
      st.over(s.wormPath); // pointer cursor over the worm
      // which part is under the pointer
      let hv = null; const P0 = s.P;
      if (P0 && st.p.inside) { hv = which(st.p.x, st.p.y); if (hv) st.cursor = 'pointer'; }
      const hl = hv || (t - s.selT < 1.2 ? s.sel : null);
      s.podOpen += (s.podTarget - s.podOpen) * Math.min(1, dt * 5);
      const fe = t - s.fx.flower; const fb = fe < 1.5 ? Math.sin(fe * 14) * .08 * (1.5 - fe) : 0;
      const P = s.P = drawPlant(c, t, { hl, podOpen: s.podOpen, bounce: fb });
      // water drops travel up
      for (const d of s.drops) {
        d.d -= dt; if (d.d > 0) continue;
        if (d.mode === 'root') { d.u -= dt * .75; if (d.u <= 0) { d.mode = 'stem'; d.u = 0; } }
        else { d.u += dt * .5; if (d.u >= .96) d.dead = true; }
        const pt = d.mode === 'root' ? bez(...P.rootCurves[d.ri], clamp(d.u, 0, 1)) : bez(...P.stemCurve, d.u);
        c.fillStyle = C.water; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(pt[0], pt[1], 5.5, 0, TAU); c.fill(); c.stroke();
        if (d.mode === 'stem' && Math.random() < dt * 2) Sound.drip();
      }
      s.drops = s.drops.filter(d => !d.dead);
      // sunlight + sparkles on leaves
      const le = t - s.fx.leaves;
      if (le < 4.5) {
        c.save(); c.globalAlpha = Math.min(1, 4.5 - le); c.setLineDash([12, 12]); c.lineDashOffset = -t * 50; c.strokeStyle = 'rgba(255,196,40,.9)'; c.lineWidth = 5; c.lineCap = 'round';
        for (const lc of P.leafCenters) { c.beginPath(); c.moveTo(125, 115); c.lineTo(lc[0], lc[1]); c.stroke(); }
        c.setLineDash([]); for (const [i, lc] of P.leafCenters.entries()) sparkle(c, lc[0] + Math.sin(t * 5 + i) * 12, lc[1] - 14 + Math.cos(t * 4 + i) * 8, 7 + 4 * Math.abs(Math.sin(t * 6 + i)));
        c.restore();
      }
      // the bee visits the flower
      if (fe < 6) {
        const a = fe * 2.3, F = P.flowerC, k = Math.min(1, fe * 2, (6 - fe) * 2);
        bee(c, F[0] + Math.cos(a) * 115, F[1] - 10 + Math.sin(a * 2) * 40, t, k, { flip: Math.sin(a) > 0, pollen: fe > 2 });
      } else if (fe < 6.3) Sound.buzz(false);
      // butterfly
      const bx = 620 + Math.cos(t * .37) * 140, by = 200 + Math.sin(t * .83) * 70;
      butterfly(c, bx, by, t, .9, '#8D6CD9'); s.butterPath = circle(bx, by, 34); st.over(s.butterPath);
      st.over(circle(95, 88, 60));
      // labels for parts already found
      const show = k => found(k) || ui.showAll;
      const sp = bez(...P.stemCurve, .3), lc = P.leafCenters[2], F = P.flowerC, pc = P.podCenter;
      if (show('roots')) tag(c, 'Roots', 585, 505, 470, 450);
      if (show('stem')) tag(c, 'Stem', 250, 300, sp[0] - 8, sp[1]);
      if (show('leaves')) tag(c, 'Leaves', 175, 185, lc[0], lc[1]);
      if (show('flower')) tag(c, 'Flower', 590, 92, F[0] + 48, F[1] - 22);
      if (show('fruit')) tag(c, 'Fruit (pod)', 655, 300, pc[0] + 16, pc[1]);
      // gentle hint after a pause
      const todo = ['roots', 'stem', 'leaves', 'flower', 'fruit'].filter(k => !found(k));
      if (todo.length && t - s.lastAct > 7) {
        const pos = { roots: [400, 460], stem: sp, leaves: lc, flower: F, fruit: pc }[todo[0]];
        c.save(); c.strokeStyle = C.carrot; c.lineWidth = 5; c.setLineDash([10, 8]); c.lineDashOffset = -t * 30; c.beginPath(); c.arc(pos[0], pos[1], 34 + Math.sin(t * 5) * 6, 0, TAU); c.stroke(); c.restore();
        label(c, 'Try here!', pos[0], pos[1] - 52, { size: 20, color: C.carrot });
      }
    };
    const showBtn = ui.button('Show all labels', () => { ui.showAll = !ui.showAll; showBtn.setAttribute('aria-pressed', ui.showAll); Sound.fwip(); });
    showBtn.setAttribute('aria-pressed', 'false'); ui.showAll = false;
    ui.hint('Bonus: tap the wiggly worm, the butterfly and the sun.');
    return { stage: st, destroy() { Sound.buzz(false); st.destroy(); } };
  }
};

/* ============ the greenhouse: Plants & Seeds' building on the campus map (base center at 0,0; about 220x170) ============ */
function drawGreenhouse(c, t) {
  const sw = RM ? 0 : Math.sin(t * 1.3) * 4;
  c.save(); c.translate(-110, -160);
  c.fillStyle = 'rgba(36,54,40,.18)'; c.beginPath(); c.ellipse(110, 156, 98, 10, 0, 0, TAU); c.fill();
  const glass = new Path2D('M26 124 V78 A84 64 0 0 1 194 78 V124 Z');
  c.fillStyle = '#DDF3F7'; c.fill(glass);
  c.save(); c.clip(glass);
  drawLeaf(c, 50, 124, -78 + sw, .42); drawLeaf(c, 66, 124, -112 - sw, .36); drawLeaf(c, 38, 124, -58 + sw * .5, .3);
  c.strokeStyle = C.leafDeep; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(150, 124); c.quadraticCurveTo(146, 98, 150 + sw * .5, 74); c.stroke();
  drawLeaf(c, 148, 104, -30 + sw, .22); drawFlowerHead(c, 150 + sw * .5, 68, .36, t);
  c.restore();
  c.strokeStyle = 'rgba(36,54,40,.45)'; c.lineWidth = 2.5; c.beginPath();
  c.moveTo(68, 23); c.lineTo(68, 124); c.moveTo(110, 14); c.lineTo(110, 124); c.moveTo(152, 23); c.lineTo(152, 124); c.moveTo(26, 92); c.lineTo(194, 92); c.stroke();
  c.strokeStyle = '#fff'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(42, 62); c.quadraticCurveTo(52, 36, 82, 26); c.stroke();
  c.strokeStyle = C.ink; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke(glass);
  const base = rrect(18, 122, 184, 30, 5); c.fillStyle = '#C9955A'; c.fill(base); c.stroke(base);
  const door = rrect(96, 96, 28, 56, 4); c.fillStyle = '#A87445'; c.fill(door); c.lineWidth = 3.5; c.stroke(door);
  c.fillStyle = C.sun; c.beginPath(); c.arc(118, 126, 2.5, 0, TAU); c.fill();
  c.restore();
}
