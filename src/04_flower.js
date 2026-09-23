/* ============ Activity: Flower Lab ============ */
function petalPath(L, w) { const p = new Path2D(); p.moveTo(0, 0); p.bezierCurveTo(-w * .95, -L * .25, -w * .7, -L * .95, 0, -L); p.bezierCurveTo(w * .7, -L * .95, w * .95, -L * .25, 0, 0); p.closePath(); return p; }
const A_flower = {
  id: 'flower', name: 'Flower Lab', icon: 'flower',
  badge: { id: 'b.flower', name: 'Flower Detective', desc: 'You took a flower apart and helped a bee pollinate it!' },
  stars: [{ id: 'flower.sepals', name: 'Sepals' }, { id: 'flower.petals', name: 'Petals' }, { id: 'flower.stamen', name: 'Stamen' }, { id: 'flower.pistil', name: 'Pistil' }, { id: 'flower.pollen', name: 'Pollination' }],
  intro: 'Let\'s dissect a flower! <b>Drag the pink petals</b> and the green <b>sepals</b> off, one by one, into the trays. What\'s hiding inside?',
  mount(host, ui) {
    const st = new Stage(host, 'A flower on a lab table. Drag its petals and sepals into trays, then tap the stamens and the pistil, and help a bee carry pollen.');
    const B = [400, 352], PET = petalPath(190, 82), SEP = petalPath(96, 40);
    const O = [400, 322], STIG = [400, 184];
    const STAM = [-36, -24, -12, 12, 24, 36].map(a => {
      const r = a * DEG, base = [B[0] + Math.sin(r) * 10, B[1] - 12], tip = [B[0] + Math.sin(r) * 150, B[1] - Math.cos(r) * 150], ctrl = [B[0] + Math.sin(r) * 70 + (a > 0 ? 8 : -8), B[1] - Math.cos(r) * 80];
      const path = new Path2D(); path.moveTo(...base); path.quadraticCurveTo(...ctrl, ...tip); return { a, base, tip, ctrl, path };
    });
    const STYLE = (() => { const p = new Path2D(); p.moveTo(400, 298); p.lineTo(400, 192); return p; })();
    const found = k => !!Store.data.stars['flower.' + k];
    let s;
    function reset() {
      s = { pieces: [], drag: null, cut: 0, cutOn: false, bee: null, tubeT: -1, fruit: 0, pollen: [], stamT: -9, lastAct: Loop.t, fruitDone: false };
      [-118, 118].forEach(a => s.pieces.push({ kind: 'sepal', ang: a, removed: false, dx: 0, dy: 0, fly: 0 }));
      [-66, 66, -33, 33, 0].forEach(a => s.pieces.push({ kind: 'petal', ang: a, removed: false, dx: 0, dy: 0, fly: 0 }));
      if (found('stamen') && found('pistil')) { /* inner parts known, but a new flower still starts closed */ }
      Sound.buzz(false);
    }
    const left = k => s.pieces.filter(p => p.kind === k && !p.removed).length;
    function slotOf(p) { return p.kind === 'petal' ? { x: 50 + p.slot * 38, y: 540, r: -6 + p.slot * 3, s: .3 } : { x: 640 + p.slot * 70, y: 540, r: 0, s: .5 }; }
    function pose(p) {
      if (p.removed) { const e = ease(clamp(p.fly, 0, 1)), sl = slotOf(p); return { x: lerp(p.rx, sl.x, e), y: lerp(p.ry, sl.y, e) - Math.sin(e * PI) * 60, r: lerp(p.ang, sl.r, e), s: lerp(1, sl.s, e) }; }
      return { x: B[0] + p.dx, y: B[1] + p.dy, r: p.ang + (p === s.drag?.p ? Math.sin(st.t * 20) * 3 : 0), s: 1 };
    }
    const pathOf = p => { const o = pose(p); return xf(p.kind === 'petal' ? PET : SEP, o.x, o.y, o.r, o.s); };
    function drawPiece(c, p, hl) {
      const o = pose(p), petal = p.kind === 'petal', L = petal ? 190 : 96, path = petal ? PET : SEP;
      c.save(); c.translate(o.x, o.y); c.rotate(o.r * DEG); c.scale(o.s, o.s); if (hl) glowOn(c);
      const g = c.createLinearGradient(0, 0, 0, -L);
      if (petal) { g.addColorStop(0, '#FFE0E8'); g.addColorStop(.35, C.petalLight); g.addColorStop(1, C.petal); } else { g.addColorStop(0, C.leafDeep); g.addColorStop(1, C.leaf); }
      c.fillStyle = g; c.fill(path); c.shadowBlur = 0; c.strokeStyle = petal ? C.petalDeep : C.leafDeep; c.lineWidth = 3 / o.s; c.stroke(path);
      c.strokeStyle = petal ? 'rgba(214,68,109,.35)' : 'rgba(30,90,40,.4)'; c.lineWidth = 2 / o.s; c.beginPath();
      for (const k of [-1, 0, 1]) { c.moveTo(0, -8); c.quadraticCurveTo(k * L * .14, -L * .5, k * L * .11, -L * .85); } c.stroke(); c.restore();
    }
    const innerOpen = () => left('petal') === 0;
    function hitInner(x, y) {
      if (STAM.some(m => st.hitLine(m.path, x, y, 18) || dist(x, y, ...m.tip) < 18)) return 'stamen';
      if (st.hitLine(STYLE, x, y, 22) || dist(x, y, ...STIG) < 20 || st.hit(ellipse(O[0], O[1], 24, 32), x, y)) return 'pistil';
      return null;
    }
    function maybeBee(msg) {
      if (found('stamen') && found('pistil') && !s.bee && !s.fruitDone) {
        s.bee = { x: 700, y: 120, drag: false, pollen: false, done: false, gone: 0 }; Sound.buzz(true);
        return msg + '<br>A bee buzzed in! <b>Drag the bee</b> to an anther to grab pollen, then to the sticky stigma.';
      }
      return msg;
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      if (s.bee && !s.bee.done && dist(x, y, s.bee.x, s.bee.y) < 42) { s.bee.drag = true; Sound.hop(); return; }
      const live = s.pieces.filter(p => !p.removed).reverse(); // front-most first
      for (const p of live) if (st.hit(pathOf(p), x, y)) { s.drag = { p, x0: x - p.dx, y0: y - p.dy }; Sound.fwip(); return; }
      const inner = hitInner(x, y);
      if (inner && !innerOpen()) { Sound.tap(2); ui.say('Pull off <b>all the petals</b> first to see what\'s hiding inside!'); return; }
      if (inner === 'stamen') {
        s.stamT = st.t; Sound.noise(.4, .12, 'bandpass', 3000, 0, 1, 800); Sound.sparkle(.1);
        for (const m of STAM) for (let i = 0; i < 7; i++) s.pollen.push({ x: m.tip[0], y: m.tip[1], vx: rand(-60, 60), vy: rand(-90, 10), life: rand(1, 1.8) });
        ui.say(maybeBee('That\'s a <b>stamen</b>, the pollen maker! The fuzzy top is the <b>anther</b>, covered in yellow <b>pollen</b>. The thin stalk is the <b>filament</b>.'));
        ui.award('flower.stamen', ...st.client(x, y));
      } else if (inner === 'pistil') {
        s.cutOn = true; Sound.boing();
        ui.say(maybeBee('The <b>pistil</b> is in the very middle. Its sticky top, the <b>stigma</b>, catches pollen. The tube is the <b>style</b>. At the bottom, the <b>ovary</b> holds tiny <b>ovules</b> that can become seeds!'));
        ui.award('flower.pistil', ...st.client(x, y));
      } else Sound.tap(Math.floor(x / 90));
    };
    st.onMove = (x, y) => {
      if (s.drag) { const p = s.drag.p; p.dx = x - s.drag.x0; p.dy = y - s.drag.y0; }
      const b = s.bee;
      if (b && b.drag) {
        b.x = x; b.y = y;
        if (!b.pollen && STAM.some(m => dist(x, y, ...m.tip) < 34)) { b.pollen = true; Sound.sparkle(); Sound.pop(); for (let i = 0; i < 12; i++) s.pollen.push({ x, y, vx: rand(-70, 70), vy: rand(-80, 20), life: 1.2 }); ui.say('The bee is dusted with pollen! Now drag it to the sticky <b>stigma</b> at the very top of the pistil.'); }
        if (b.pollen && dist(x, y, ...STIG) < 34) { b.drag = false; b.done = true; s.tubeT = st.t; Sound.grow(1); ui.say('Pollen landed on the stigma! Watch: a tiny <b>pollen tube</b> grows down the style to the ovules...'); }
      }
    };
    st.onUp = (x, y) => {
      const b = s.bee; if (b && b.drag) { b.drag = false; if (!b.pollen) ui.say('Drag the bee onto one of the orange <b>anthers</b> first, to pick up pollen.'); }
      if (!s.drag) return; const p = s.drag.p; s.drag = null;
      if (Math.hypot(p.dx, p.dy) > 70) {
        const o = pose(p); p.removed = true; p.rx = o.x; p.ry = o.y; p.fly = 0; p.slot = s.pieces.filter(q => q.kind === p.kind && q.removed).length - 1;
        Sound.hop();
        if (p.kind === 'sepal' && left('sepal') === 0) { ui.say('Those green leafy parts are <b>sepals</b>. They wrapped around the flower and protected it when it was a bud.'); ui.award('flower.sepals', ...st.client(x, y)); }
        else if (p.kind === 'petal' && left('petal') === 0) { ui.say('All 5 <b>petals</b> are off! Petals are bright and colorful to invite bees and butterflies. Now <b>tap the parts in the middle</b>.'); ui.award('flower.petals', ...st.client(x, y)); }
        else if (p.kind === 'petal' && left('petal') === 4) ui.say('Nice pull! Keep going. Pull off every petal.');
      } else Sound.boing();
    };
    st.draw = (c, t, dt) => {
      // room + table
      const g = c.createLinearGradient(0, 0, 0, 440); g.addColorStop(0, '#EDE8FB'); g.addColorStop(1, '#F8F4FF'); c.fillStyle = g; c.fillRect(0, 0, W, 440);
      c.strokeStyle = 'rgba(141,108,217,.13)'; c.lineWidth = 1.5; for (let x = 0; x < W; x += 28) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 440); c.stroke(); } for (let y = 0; y < 440; y += 28) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      const tg = c.createLinearGradient(0, 436, 0, H); tg.addColorStop(0, '#E7BE84'); tg.addColorStop(1, '#D3A566'); c.fillStyle = tg; c.fillRect(0, 436, W, H - 436); c.fillStyle = '#C9955A'; c.fillRect(0, 432, W, 8);
      // trays
      for (const [x, name, n, tot] of [[18, 'Petals', 5 - left('petal'), 5], [572, 'Sepals', 2 - left('sepal'), 2]]) {
        const r = rrect(x, 448, 210, 104, 18); c.fillStyle = '#C8D8E0'; c.fill(r); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(r);
        c.fillStyle = '#E4EEF3'; c.fill(rrect(x + 10, 458, 190, 84, 12)); pillLabel(c, `${name} ${n}/${tot}`, x + 8, 410, '#fff');
      }
      // vase + stem
      c.save(); c.lineCap = 'round'; c.strokeStyle = C.leafDeep; c.lineWidth = 15; c.beginPath(); c.moveTo(400, 360); c.lineTo(400, 540); c.stroke(); c.strokeStyle = C.stem; c.lineWidth = 8; c.stroke(); c.restore();
      drawLeaf(c, 402, 470, -30, .6);
      c.fillStyle = 'rgba(170,215,240,.45)'; c.beginPath(); c.moveTo(365, 440); c.lineTo(435, 440); c.lineTo(428, 552); c.lineTo(372, 552); c.closePath(); c.fill(); c.strokeStyle = 'rgba(36,54,40,.55)'; c.lineWidth = 3; c.stroke();
      // hover
      let hvPiece = null; if (st.p.inside && !s.drag) { for (const p of s.pieces.filter(p => !p.removed).reverse()) if (st.hit(pathOf(p), st.p.x, st.p.y)) { hvPiece = p; st.cursor = 'grab'; break; } }
      if (s.drag) st.cursor = 'grabbing';
      const hvInner = !hvPiece && st.p.inside && innerOpen() ? hitInner(st.p.x, st.p.y) : null; if (hvInner) st.cursor = 'pointer';
      // sepals behind everything
      for (const p of s.pieces) if (p.kind === 'sepal' && !p.removed && p !== s.drag?.p) drawPiece(c, p, p === hvPiece);
      // pollen tube + fruit growth
      if (s.tubeT > 0) { const e = st.t - s.tubeT; s.fruit = clamp((e - 2.8) / 2.2, 0, 1); if (s.fruit >= 1 && !s.fruitDone) { s.fruitDone = true; Sound.buzz(false); ui.say('Pollen + ovule = seed! The ovary swelled up into a <b>fruit</b> with seeds inside. That\'s <b>pollination</b>. You\'re a flower detective!'); ui.award('flower.pollen', ...st.client(O[0], O[1])); } }
      const fr = s.fruit, alive = 1 - fr;
      // receptacle
      c.fillStyle = C.leaf; c.strokeStyle = C.leafDeep; c.lineWidth = 3; c.beginPath(); c.ellipse(400, 356, 30, 14, 0, 0, TAU); c.fill(); c.stroke();
      // stamens
      c.save(); c.globalAlpha = alive; if (hvInner === 'stamen') glowOn(c); c.lineCap = 'round';
      for (const m of STAM) { c.strokeStyle = '#E8E2A0'; c.lineWidth = 6; c.stroke(m.path); c.save(); c.translate(...m.tip); c.rotate(m.a * DEG); c.fillStyle = '#E0902A'; c.beginPath(); c.ellipse(0, 0, 8, 16, 0, 0, TAU); c.fill(); c.shadowBlur = 0; c.strokeStyle = '#A8601A'; c.lineWidth = 2; c.stroke(); c.fillStyle = C.pollen; for (const [px, py] of [[-3, -8], [3, -3], [-2, 4], [3, 9], [0, -12]]) { c.beginPath(); c.arc(px, py, 2.4, 0, TAU); c.fill(); } c.restore(); }
      c.restore();
      // pistil
      const orx = lerp(20, 60, fr), ory = lerp(28, 64, fr), oy = O[1] - fr * 22;
      c.save(); c.globalAlpha = 1 - fr * .85; if (hvInner === 'pistil') glowOn(c); c.lineCap = 'round'; c.strokeStyle = '#8CC063'; c.lineWidth = 9; c.stroke(STYLE); c.shadowBlur = 0; c.strokeStyle = '#B8DF8C'; c.lineWidth = 4; c.stroke(STYLE);
      c.fillStyle = '#C8E06A'; c.strokeStyle = '#7FA23A'; c.lineWidth = 2.5; for (const [dx, dy] of [[-8, 0], [8, 0], [0, -8]]) { c.beginPath(); c.arc(STIG[0] + dx, STIG[1] + dy, 9, 0, TAU); c.fill(); c.stroke(); }
      sparkle(c, STIG[0] + 6, STIG[1] - 12, 4 + Math.abs(Math.sin(t * 4)) * 3); c.restore();
      c.save(); if (hvInner === 'pistil') glowOn(c); const og = c.createRadialGradient(O[0] - 8, oy - 10, 4, O[0], oy, ory); og.addColorStop(0, mix('#CFEA92', '#FFB27A', fr)); og.addColorStop(1, mix('#8CC063', '#EF6F3A', fr));
      c.fillStyle = og; c.beginPath(); c.ellipse(O[0], oy, orx, ory, 0, 0, TAU); c.fill(); c.shadowBlur = 0; c.strokeStyle = mix('#5E8F34', '#B8451E', fr); c.lineWidth = 3; c.stroke(); c.restore();
      s.cut += ((s.cutOn ? 1 : 0) - s.cut) * Math.min(1, dt * 4);
      if (s.cut > .02) {
        c.save(); c.globalAlpha = s.cut; c.fillStyle = mix('#F4FBE3', '#FFE3C8', fr); c.beginPath(); c.ellipse(O[0], oy, orx * .66, ory * .72, 0, 0, TAU); c.fill();
        for (let i = 0; i < 4; i++) { const ox = O[0] + (i % 2 ? 1 : -1) * orx * .26, oyy = oy + (i < 2 ? -1 : 1) * ory * .28, rr = lerp(4.5, 10, fr); c.fillStyle = mix('#FFFFFF', '#E8D29C', fr); c.strokeStyle = mix('#9CBF6A', '#A88445', fr); c.lineWidth = 1.5; c.beginPath(); c.ellipse(ox, oyy, rr, rr * 1.2, 0, 0, TAU); c.fill(); c.stroke(); }
        c.restore();
      }
      if (s.tubeT > 0) { const e = clamp((st.t - s.tubeT) / 2.5, 0, 1) * alive; if (e > 0) { const ty = lerp(STIG[1], O[1] - 8, e); c.save(); c.strokeStyle = C.pollen; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(STIG[0] + 3, STIG[1]); c.lineTo(STIG[0] + 3, ty); c.stroke(); sparkle(c, STIG[0] + 3, ty, 7, '#FFE55C'); c.restore(); } }
      // petals (front)
      for (const p of s.pieces) if (p.kind === 'petal' && !p.removed && p !== s.drag?.p) drawPiece(c, p, p === hvPiece);
      // pieces in trays / flying
      for (const p of s.pieces) if (p.removed) { p.fly = Math.min(1, p.fly + dt * 1.8); drawPiece(c, p, false); }
      // piece being dragged / springing back
      for (const p of s.pieces) if (!p.removed && p !== s.drag?.p) { p.dx *= Math.exp(-dt * 10); p.dy *= Math.exp(-dt * 10); }
      if (s.drag) drawPiece(c, s.drag.p, true);
      // pollen dust
      for (const q of s.pollen) { q.life -= dt; q.vy += 120 * dt; q.x += q.vx * dt; q.y += q.vy * dt; c.fillStyle = `rgba(255,216,61,${clamp(q.life, 0, 1)})`; c.beginPath(); c.arc(q.x, q.y, 3, 0, TAU); c.fill(); }
      s.pollen = s.pollen.filter(q => q.life > 0);
      // labels
      const F = k => found(k) || ui.showAll;
      if (innerOpen() && fr < .5) {
        if (F('stamen')) { const m = STAM[5]; tag(c, 'Anther', 610, 150, m.tip[0] + 8, m.tip[1]); tag(c, 'Filament', 640, 260, ...qpt(m.base, m.ctrl, m.tip, .55)); }
        if (F('pistil')) { tag(c, 'Stigma', 200, 140, STIG[0] - 14, STIG[1]); tag(c, 'Style', 205, 240, 396, 250); tag(c, 'Ovary', 225, 330, O[0] - 20, O[1]); }
      }
      if (s.fruitDone) tag(c, 'Fruit with seeds!', 620, 250, O[0] + orx - 6, oy);
      // the bee
      const b = s.bee;
      if (b) {
        if (!b.drag && !b.done) { const hx = 700, hy = 120; b.x += (hx + Math.sin(t * 2) * 14 - b.x) * Math.min(1, dt * 3); b.y += (hy + Math.sin(t * 3) * 10 - b.y) * Math.min(1, dt * 3); }
        if (b.done) { b.gone += dt; b.x += 160 * dt * (b.gone > .8 ? 1 : 0); b.y -= 60 * dt * (b.gone > .8 ? 1 : 0); }
        if (b.x < 900) { bee(c, b.x, b.y, t, 1.4, { pollen: b.pollen, flip: !b.done }); if (dist(st.p.x, st.p.y, b.x, b.y) < 42 && !b.done) st.cursor = 'grab'; }
        if (!b.pollen && !b.drag) label(c, 'Drag me!', b.x, b.y - 46, { size: 18, color: C.carrot });
      }
      if (left('petal') === 5 && t - s.lastAct > 5) label(c, 'Drag a petal away!', 400, 60, { size: 26, color: C.carrot });
    };
    ui.button('Get a new flower', () => { reset(); Sound.pop(); ui.say(A_flower.intro); });
    const lb = ui.button('Show all labels', () => { ui.showAll = !ui.showAll; lb.setAttribute('aria-pressed', ui.showAll); Sound.fwip(); }); lb.setAttribute('aria-pressed', 'false'); ui.showAll = false;
    ui.hint('Real flowers have the same parts. Next time you see one, look for the stamens and the pistil!');
    reset();
    return { stage: st, destroy() { Sound.buzz(false); st.destroy(); } };
  }
};
