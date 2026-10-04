/* ============ Activity: Light Seeker ============ */
// Stems grow toward light and roots grow down. Drag a lamp around a seedling in a clear cup and watch it
// bend toward the light over the days; tip the cup over and the stem turns back up while the roots turn down.
const A_light = {
  id: 'light', name: 'Light Seeker', icon: 'lamp',
  badge: { id: 'b.light', name: 'Light Seeker', desc: 'You found out that stems grow toward light and roots follow gravity down!', how: 'Not yet! Move the lamp and tip the cup in <b>Light Seeker</b>.' },
  stars: [{ id: 'light.bend', name: 'Bends to the light' }, { id: 'light.follow', name: 'Follows the light' }, { id: 'light.up', name: 'Stem turns up' }, { id: 'light.roots', name: 'Roots grow down' }],
  intro: 'Plants love light! <b>Drag the lamp</b> to one side and watch what the plant does.',
  facts: ['Did you know? Stems grow toward light, and roots grow down. Roots can feel <b>gravity</b>, the pull that makes things fall, so they know which way is down!', 'Did you know? A plant by a window leans toward the glass to catch more light.'],
  mount(host, ui) {
    const st = new Stage(host, 'A bean seedling in a clear cup on a table in a dim room, with a desk lamp you can drag around it, and a button to tip the cup over.');
    const CUP = [400, 430], ARC = 250, TABLE = 470;
    const found = k => !!Store.data.stars['light.' + k];
    const earn = (k, x, y) => { if (ui.award('light.' + k, ...st.client(x, y))) s.earnedHere = true; };
    let s;
    // angles are measured from straight up (0); right is positive
    function reset() { s = { lampA: 0, drag: false, tipped: false, tipT: -9, stemA: 0, rootA: PI, day: 1, dayT: Loop.t, bentSide: 0, lastAct: Loop.t, told: {} }; }
    const lampPos = (a = s.lampA) => [CUP[0] + Math.sin(a) * ARC, CUP[1] - 30 - Math.cos(a) * ARC];
    // the cup and everything in it share one transform: upright, or lying on its side with the opening to the right
    const tipK = () => s.tipped ? easeOut(clamp((st.t - s.tipT) / .5, 0, 1)) : 0;
    const T = ([lx, ly]) => { const k = tipK(), a = k * PI / 2, cx = CUP[0], cy = lerp(CUP[1], TABLE - 58, k); return [cx + lx * Math.cos(a) - ly * Math.sin(a), cy + lx * Math.sin(a) + ly * Math.cos(a)]; };
    const base = () => { const k = tipK(); return { stem: k * PI / 2, root: PI + k * PI / 2, at: T([0, -70]), rootAt: T([0, -58]) }; };
    function tip() {
      if (s.tipped) return; s.tipped = true; s.tipT = st.t; s.stemA = PI / 2; s.rootA = PI * 1.5; Sound.boing(); Sound.crack();
      ui.say('Whoa, the cup tipped over! Watch the stem and the roots.');
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t; const [lx, ly] = lampPos();
      if (dist(x, y, lx, ly) < 60) { s.drag = true; Sound.fwip(); return; }
      // a tap near the arc moves the lamp there
      const a = Math.atan2(x - CUP[0], CUP[1] - 30 - y);
      if (Math.abs(dist(x, y, CUP[0], CUP[1] - 30) - ARC) < 60 && Math.abs(a) < 1.25) { s.lampA = clamp(a, -1.2, 1.2); Sound.tap(Math.round(a * 3) + 4); return; }
      Sound.tap(Math.floor(x / 80));
    };
    st.onMove = (x, y) => { if (s.drag) s.lampA = clamp(Math.atan2(x - CUP[0], CUP[1] - 30 - y), -1.2, 1.2); };
    st.onUp = () => { s.drag = false; };

    function drawLamp(c, t) {
      const [x, y] = lampPos(), a = s.lampA;
      // the light cone, pointing at the plant
      c.save(); c.globalAlpha = .22; const g = c.createRadialGradient(x, y, 10, x, y, ARC + 40); g.addColorStop(0, '#FFE680'); g.addColorStop(1, 'rgba(255,230,128,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x, y); const dir = Math.atan2(CUP[1] - 60 - y, CUP[0] - x); c.arc(x, y, ARC + 40, dir - .35, dir + .35); c.closePath(); c.fill(); c.restore();
      c.save(); c.translate(x, y); c.rotate(dir - PI / 2); if (s.drag || st.over(circle(x, y, 60))) glowOn(c);
      c.fillStyle = C.carrot; c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, -6); c.lineTo(30, -6); c.lineTo(18, -40); c.lineTo(-18, -40); c.closePath(); c.fill(); c.shadowBlur = 0; c.stroke();
      c.fillStyle = '#FFF4B0'; c.beginPath(); c.ellipse(0, -6, 26, 8, 0, 0, TAU); c.fill(); c.stroke();
      c.restore();
    }
    function drawPlant(c, t) {
      const b = base(), L = 112 + Math.min(34, s.day * 3); // grows a little each day, staying clear of the lamp
      // the stem leaves the seed in its base direction, then curves toward where it's heading
      const p0 = b.at, p1 = [p0[0] + Math.sin(b.stem) * L * .45, p0[1] - Math.cos(b.stem) * L * .45], p2 = [p1[0] + Math.sin(s.stemA) * L * .6, p1[1] - Math.cos(s.stemA) * L * .6];
      const stem = new Path2D(); stem.moveTo(...p0); stem.quadraticCurveTo(...p1, ...p2);
      c.save(); c.lineCap = 'round'; c.strokeStyle = C.leafDeep; c.lineWidth = 12; c.stroke(stem); c.strokeStyle = C.stem; c.lineWidth = 6; c.stroke(stem); c.restore();
      // leaves at the tip, turned toward the light
      const sw = RM ? 0 : Math.sin(t * 1.4) * 3, face = s.stemA / DEG;
      drawLeaf(c, ...p2, -90 + face - 55 + sw, .42); drawLeaf(c, ...p2, -90 + face + 55 - sw, .42);
      const mid = qpt(p0, p1, p2, .55); drawLeaf(c, ...mid, -90 + face + (s.stemA > 0 ? -70 : 70), .3);
      return { tip: p2 };
    }
    function drawRoots(c, t) {
      const b = base(), r0 = b.rootAt;
      for (const [spread, len] of [[0, 70], [-.45, 50], [.45, 50]]) {
        const r1 = [r0[0] + Math.sin(b.root + spread) * len * .4, r0[1] - Math.cos(b.root + spread) * len * .4], r2 = [r1[0] + Math.sin(s.rootA + spread) * len * .6, r1[1] - Math.cos(s.rootA + spread) * len * .6];
        const p = new Path2D(); p.moveTo(...r0); p.quadraticCurveTo(...r1, ...r2);
        c.save(); c.lineCap = 'round'; c.strokeStyle = C.rootDeep; c.lineWidth = 6; c.stroke(p); c.strokeStyle = C.root; c.lineWidth = 3; c.stroke(p); c.restore();
      }
      return r0;
    }
    // a clear plastic cup with soil, so you can see the roots: the inside first, the glass outline over the roots
    const CUPP = (() => { const p = new Path2D(); p.moveTo(-58, -110); p.lineTo(58, -110); p.lineTo(44, 40); p.lineTo(-44, 40); p.closePath(); return p; })();
    function cupSpace(c) { const k = tipK(); c.translate(CUP[0], lerp(CUP[1], TABLE - 58, k)); c.rotate(k * PI / 2); }
    function drawCupInside(c) {
      c.save(); cupSpace(c); c.fillStyle = 'rgba(221,243,247,.45)'; c.fill(CUPP);
      c.save(); c.clip(CUPP); c.fillStyle = 'rgba(122,82,48,.55)'; c.fillRect(-60, -70, 120, 120); c.restore(); c.restore();
    }
    function drawCup(c) {
      c.save(); cupSpace(c); c.strokeStyle = 'rgba(36,54,40,.65)'; c.lineWidth = 3; c.stroke(CUPP);
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-44, -96); c.lineTo(-34, 24); c.stroke(); c.restore();
    }
    st.draw = (c, t, dt) => {
      // time-lapse: a day goes by every second and a bit, and the plant leans toward the light
      if (t - s.dayT > 1.3) { s.dayT = t; s.day++; }
      const target = s.lampA, upT = s.tipped ? clamp(target, -1.2, 1.2) : target, rate = RM ? 99 : .55;
      s.stemA += clamp(upT - s.stemA, -rate * dt, rate * dt);
      s.rootA += clamp(PI - s.rootA, -rate * .8 * dt, rate * .8 * dt); // roots turn the short way round to point down
      // what the plant just did, said once
      if (!s.tipped && Math.abs(s.stemA) > .38 && !found('bend')) { s.bentSide = Math.sign(s.stemA); earn('bend', ...lampPos()); ui.say('The plant is bending toward the lamp! Stems grow toward light so the leaves can catch more of it.'); }
      if (!s.tipped && found('bend') && !s.bentSide && Math.abs(s.stemA) > .38) s.bentSide = Math.sign(s.stemA);
      if (!s.tipped && s.bentSide && Math.sign(s.stemA) === -s.bentSide && Math.abs(s.stemA) > .3 && !found('follow')) { earn('follow', ...lampPos()); ui.say('You moved the light, and the plant turned to follow it! Plants keep reaching for the light.'); }
      if (s.tipped && s.stemA < PI / 2 - .5 && !found('up')) { earn('up', CUP[0] + 100, CUP[1] - 120); ui.say('The stem turned to grow up again! Stems can tell which way is up, and up is toward the light.', { queue: true }); }
      if (s.tipped && s.rootA < PI * 1.22 && !found('roots')) { earn('roots', CUP[0] - 60, CUP[1] + 40); ui.say('And the roots turned to grow down! Roots can feel <b>gravity</b>, the pull that makes a dropped ball fall. It tells them which way is down.', { queue: true }); }
      if (s.earnedHere && A_light.stars.every(q => Store.data.stars[q.id]) && !s.told.all) { s.told.all = true; ui.say('You found out that stems grow toward light, and roots follow gravity down!', { queue: true }); }
      // a dim room with a table
      const g = c.createLinearGradient(0, 0, 0, TABLE); g.addColorStop(0, '#3E4A63'); g.addColorStop(1, '#56627A'); c.fillStyle = g; c.fillRect(0, 0, W, TABLE);
      c.fillStyle = 'rgba(255,255,255,.06)'; for (let x = 0; x < W; x += 60) c.fillRect(x, 0, 30, TABLE);
      const tg = c.createLinearGradient(0, TABLE, 0, H); tg.addColorStop(0, '#B98A55'); tg.addColorStop(1, '#9A6E40'); c.fillStyle = tg; c.fillRect(0, TABLE, W, H - TABLE); c.fillStyle = '#8A5E33'; c.fillRect(0, TABLE - 6, W, 8);
      // the lamp's arc, so it's clear where it can go
      c.save(); c.setLineDash([6, 12]); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 3; c.beginPath(); c.arc(CUP[0], CUP[1] - 30, ARC, -PI / 2 - 1.2, -PI / 2 + 1.2); c.stroke(); c.restore();
      drawLamp(c, t);
      drawCupInside(c); drawRoots(c, t); drawCup(c); drawPlant(c, t);
      label(c, `Day ${s.day}`, 690, 40, { size: 24, color: '#FFE7A3', stroke: 'rgba(36,54,40,.85)' });
      const idle = t - s.lastAct > 5, bob = RM ? 0 : Math.abs(Math.sin(t * 5)) * 6;
      if (!found('bend') && idle) { const [lx, ly] = lampPos(); label(c, "Drag the lamp!", lx, ly - 64 - bob, { size: 20, color: C.carrot }); }
    };
    ui.button('Tip the cup', () => tip());
    ui.button('New plant', () => { reset(); Sound.pop(); ui.say(A_light.intro); });
    ui.hint("Try it: put a plant near a window. After a few days, which way is it leaning? Turn it around and check again!");
    reset();
    return { stage: st, state: () => s, geo: { lamp: () => lampPos(), arcPoint: a => lampPos(a), cup: CUP }, destroy() { st.destroy(); } };
  }
};
