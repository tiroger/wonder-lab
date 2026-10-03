/* ============ Activity: Seed Travel ============ */
const A_travel = {
  id: 'travel', name: 'Seed Travel', icon: 'travel',
  badge: { id: 'b.travel', name: 'Seed Launcher', desc: 'You found 4 ways seeds travel to new places!', how: 'Not yet! Find all 4 ways seeds travel in <b>Seed Travel</b>.' },
  stars: [{ id: 'travel.wind', name: 'Wind' }, { id: 'travel.animal', name: 'Animals' }, { id: 'travel.water', name: 'Water' }, { id: 'travel.pop', name: 'Pop!' }],
  intro: 'Plants can\'t walk, so how do their seeds get to new places? <b>Tap each picture</b> to discover 4 ways seeds travel!',
  mount(host, ui) {
    const st = new Stage(host, 'Four garden scenes: a dandelion in the wind, a rabbit near a burr plant, a coconut palm by the sea, and a popping seed pod. Tap each one.');
    const facts = {
      wind: '<b>Wind!</b> Dandelion seeds have fluffy parachutes. A puff of wind carries them far, far away.',
      animal: '<b>Animal hitchhikers!</b> Burrs have tiny hooks that grab onto fur. The animal carries the seed to a new place. People invented Velcro by copying burrs!',
      water: '<b>Water!</b> Coconuts float. They can ride the ocean waves all the way to a new island and grow there.',
      pop: '<b>Pop!</b> Some seed pods dry out and burst open, shooting their seeds away like tiny cannons.'
    };
    const mkSeeds = () => Array.from({ length: 26 }, (_, i) => ({ a: i / 26 * TAU, free: false, d: 0, x: 0, y: 0, vx: 0, vy: 0, ph: Math.random() * 6 }));
    const s = {
      wind: { state: 'ready', t0: 0, seeds: mkSeeds() },
      ani: { state: 'sit', t0: 0, x: 60, y: 222, burrs: 5, carried: false, drop: null, sprouts: [], hopN: 0 },
      wat: { state: 'ready', t0: 0, x: 100, y: 86, vy: 0, sprout: -9 },
      pop: { state: 'ready', t0: 0, seeds: [], sprouts: [] }
    };
    const HX = 110, HY = 118;
    function hit(x, y) { return (x < 400 ? 0 : 1) + (y < 280 ? 0 : 2); }
    const keys = ['wind', 'animal', 'water', 'pop'];
    st.onDown = (x, y) => {
      const k = keys[hit(x, y)], t = st.t; let go = false;
      if (k === 'wind' && s.wind.state === 'ready') { s.wind.state = 'blow'; s.wind.t0 = t; s.wind.seeds.forEach((q, i) => { q.d = i * .04 + Math.random() * .1; }); Sound.whoosh(); go = true; }
      if (k === 'animal' && s.ani.state === 'sit') { s.ani.state = 'hop'; s.ani.t0 = t; s.ani.carried = false; s.ani.hopN = 0; go = true; }
      if (k === 'water' && s.wat.state === 'ready') { s.wat.state = 'fall'; s.wat.t0 = t; s.wat.x = 100; s.wat.y = 86; s.wat.vy = 0; Sound.fwip(); go = true; }
      if (k === 'pop' && s.pop.state === 'ready') { s.pop.state = 'shake'; s.pop.t0 = t; Sound.wobble(400, .45, .08, 30, 80, 'triangle'); go = true; }
      if (go) { ui.say(facts[k]); ui.award('travel.' + k, ...st.client(x, y)); } else Sound.tap(Math.floor(x / 80));
    };
    function panel(c, x, y, fn, bg1, bg2) { c.save(); c.beginPath(); c.rect(x, y, 400, 280); c.clip(); c.translate(x, y); const g = c.createLinearGradient(0, 0, 0, 280); g.addColorStop(0, bg1); g.addColorStop(1, bg2); c.fillStyle = g; c.fillRect(0, 0, 400, 280); fn(c); c.restore(); }
    function sproutAt(c, x, y, k, col = C.leaf) { k = clamp(k, 0, 1); if (k <= 0) return; c.save(); c.lineCap = 'round'; c.strokeStyle = C.leafDeep; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 22 * k); c.stroke(); drawLeaf(c, x, y - 22 * k, -150, .2 * k, col); drawLeaf(c, x, y - 22 * k, -30, .2 * k, col); c.restore(); }
    function grass(c, y) { c.fillStyle = C.grass; c.fillRect(0, y, 400, 280 - y); c.fillStyle = C.grassDeep; c.fillRect(0, y, 400, 5); }
    function burr(c, x, y, r = 10) { c.save(); c.translate(x, y); c.strokeStyle = '#5B3350'; c.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6)); c.lineTo(Math.cos(a + .25) * (r + 4), Math.sin(a + .25) * (r + 4)); c.stroke(); } c.fillStyle = '#8E5A7F'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke(); c.restore(); }
    function rabbit(c, x, y, t, air) {
      c.save(); c.translate(x, y); const sq = air ? 1.08 : 1;
      c.fillStyle = '#B79D86'; c.strokeStyle = C.ink; c.lineWidth = 2.5;
      for (const [ex, rot] of [[18, -.25], [30, .1]]) { c.save(); c.translate(ex, -34); c.rotate(rot + (RM ? 0 : Math.sin(t * 3) * .05)); c.beginPath(); c.ellipse(0, -16, 7, 20, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#F2B4BE'; c.beginPath(); c.ellipse(0, -16, 3, 13, 0, 0, TAU); c.fill(); c.restore(); c.fillStyle = '#B79D86'; }
      c.beginPath(); c.ellipse(0, 0, 30 * sq, 22 / sq, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#E9DDD0'; c.beginPath(); c.ellipse(6, 8, 16, 11, 0, 0, TAU); c.fill();
      c.fillStyle = '#B79D86'; c.beginPath(); c.arc(26, -16, 16, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-30, -4, 9, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = C.ink; c.beginPath(); c.arc(31, -19, 3, 0, TAU); c.fill(); c.fillStyle = '#F2668B'; c.beginPath(); c.arc(41, -13, 3, 0, TAU); c.fill();
      c.fillStyle = '#A48A74'; c.beginPath(); c.ellipse(-12, 20, 12, 5, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(18, 21, 8, 4, 0, 0, TAU); c.fill();
      c.restore();
    }
    st.draw = (c, t, dt) => {
      const W0 = s.wind, A = s.ani, Wt = s.wat, Pp = s.pop;
      // ---- wind ----
      panel(c, 0, 0, c => {
        cloud(c, (t * 15) % 520 - 90, 50, .7); grass(c, 240);
        if (W0.state === 'blow') { c.save(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 4; c.lineCap = 'round'; for (let i = 0; i < 4; i++) { const x = ((t - W0.t0) * 380 + i * 90) % 520 - 60, y = 70 + i * 40; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 40, y - 14, x + 80, y); c.stroke(); } c.restore(); }
        const sw = RM ? 0 : Math.sin(t * 1.4) * 5;
        c.save(); c.strokeStyle = C.leafDeep; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(HX, 245); c.quadraticCurveTo(HX - 8, 180, HX + sw, HY); c.stroke(); c.restore();
        drawLeaf(c, HX, 240, -160, .5); drawLeaf(c, HX, 240, -20, .45);
        const regrow = W0.state === 'regrow' ? clamp((t - W0.t0) / 1.2, 0, 1) : 1;
        c.fillStyle = '#E3D9A8'; c.beginPath(); c.arc(HX + sw, HY, 8, 0, TAU); c.fill();
        for (const q of W0.seeds) {
          if (!q.free) {
            if (W0.state === 'blow' && t - W0.t0 > q.d) { q.free = true; q.x = HX + sw + Math.cos(q.a) * 34; q.y = HY + Math.sin(q.a) * 34; q.vx = 70 + Math.random() * 90 + Math.cos(q.a) * 30; q.vy = Math.sin(q.a) * 30 - Math.random() * 25; }
            else { c.save(); c.globalAlpha = regrow; c.translate(HX + sw, HY); c.rotate(q.a); c.strokeStyle = '#EDEDE4'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(4, 0); c.lineTo(34, 0); c.stroke(); c.strokeStyle = '#fff'; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(34, 0); c.lineTo(34 + Math.cos(k * .35) * 10, Math.sin(k * .35) * 10); c.stroke(); } c.restore(); continue; }
          }
          q.x += q.vx * dt; q.y += (q.vy + Math.sin(t * 3 + q.ph) * 24) * dt; q.vx *= .999;
          c.save(); c.translate(q.x, q.y); c.strokeStyle = '#8A7250'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -8); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.6; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(0, -8); c.lineTo(Math.sin(k * .4) * 10, -8 - Math.cos(k * .4) * 9); c.stroke(); } c.fillStyle = '#8A7250'; c.beginPath(); c.ellipse(0, 7, 2, 4, 0, 0, TAU); c.fill(); c.restore();
        }
        if (W0.state === 'blow' && W0.seeds.every(q => q.free && (q.x > 420 || q.y < -20 || q.y > 300))) { W0.state = 'regrow'; W0.t0 = t; W0.seeds = mkSeeds(); }
        if (W0.state === 'regrow' && t - W0.t0 > 1.2) W0.state = 'ready';
        pillLabel(c, 'Wind', 12, 12); if (W0.state === 'ready') label(c, 'Tap to blow!', 270, 140, { size: 20, color: C.carrot });
      }, '#9ED8F0', '#E6F7FC');
      // ---- animal ----
      panel(c, 400, 0, c => {
        cloud(c, 260, 55, .6); grass(c, 238);
        // burdock
        c.save(); c.strokeStyle = C.leafDeep; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(150, 242); c.lineTo(150, 150); c.moveTo(150, 190); c.lineTo(175, 160); c.moveTo(150, 175); c.lineTo(126, 150); c.stroke(); c.restore();
        drawLeaf(c, 150, 238, -170, .7, '#5DA24E'); drawLeaf(c, 150, 238, -10, .65, '#5DA24E');
        const BP = [[150, 146], [176, 156], [124, 147], [138, 164], [165, 170]]; for (let i = 0; i < A.burrs; i++) burr(c, ...BP[i]);
        for (const sp of A.sprouts) { sproutAt(c, sp.x, 240, (t - sp.t0) / 2, '#5DA24E'); }
        if (A.state === 'hop') {
          const e = (t - A.t0) / 3.6, n = Math.floor(e * 7); if (n > A.hopN) { A.hopN = n; Sound.hop(); }
          A.x = lerp(60, 470, e); A.y = 222 - Math.abs(Math.sin(e * 7 * PI)) * 40;
          if (!A.carried && A.x > 140 && A.burrs > 0 && !A.drop) { A.carried = true; A.burrs--; Sound.pop(); }
          if (A.carried && A.x > 300) { A.carried = false; A.drop = { x: A.x - 12, y: A.y - 26, vy: 0 }; Sound.fwip(); }
          if (e >= 1) { A.state = 'back'; A.t0 = t; }
        } else if (A.state === 'back') { const e = clamp((t - A.t0) / 1.8, 0, 1); A.x = lerp(-60, 60, e); A.y = 222 - Math.abs(Math.sin(e * 3 * PI)) * 26; if (e >= 1) { A.state = 'sit'; A.y = 222; if (A.burrs === 0) A.burrs = 5; } }
        else { A.y = 222 + (RM ? 0 : Math.sin(t * 5) * 1.2); }
        if (A.drop) { A.drop.vy += 600 * dt; A.drop.y += A.drop.vy * dt; burr(c, A.drop.x, A.drop.y, 8); if (A.drop.y >= 236) { A.sprouts.push({ x: A.drop.x, t0: t }); if (A.sprouts.length > 3) A.sprouts.shift(); A.drop = null; Sound.drip(); } }
        rabbit(c, A.x, A.y, t, A.state !== 'sit' && A.y < 215);
        if (A.carried) burr(c, A.x - 6, A.y - 22, 8);
        pillLabel(c, 'Animals', 12, 12); if (A.state === 'sit') label(c, 'Tap the bunny!', 290, 110, { size: 20, color: C.carrot });
      }, '#B5E3F2', '#EAF8FC');
      // ---- water ----
      panel(c, 0, 280, c => {
        sun(c, 330, 50, 22, t, { face: false });
        const sea = c.createLinearGradient(0, 200, 0, 280); sea.addColorStop(0, '#4FB3E8'); sea.addColorStop(1, '#2C7FB8'); c.fillStyle = sea; c.fillRect(0, 205, 400, 75);
        c.fillStyle = '#F2D48B'; c.beginPath(); c.ellipse(40, 232, 100, 40, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(372, 226, 72, 30, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); for (let x = 120; x <= 310; x += 10) { const y = 222 + i * 18 + Math.sin(x * .06 + t * 2 + i) * 4; x === 120 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
        // palm
        c.save(); c.strokeStyle = '#8A5A36'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(60, 215); c.quadraticCurveTo(62, 130, 95, 78); c.stroke(); c.restore();
        for (const r of [-170, -135, -60, -20, 10, 160]) drawLeaf(c, 95, 74, r + (RM ? 0 : Math.sin(t * 1.5 + r) * 4), .55, '#4E9E36');
        const coco = (x, y) => { c.fillStyle = '#7B4A2A'; c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#3D2414'; for (const [a, b] of [[-4, -3], [3, -4], [0, 3]]) { c.beginPath(); c.arc(x + a, y + b, 2, 0, TAU); c.fill(); } };
        coco(84, 90);
        if (Wt.state === 'ready') coco(104, 88);
        else {
          const e = t - Wt.t0;
          if (Wt.state === 'fall') { Wt.vy += 700 * dt; Wt.y += Wt.vy * dt; Wt.x += 30 * dt; if (Wt.y >= 222) { Wt.state = 'float'; Wt.t0 = t; Sound.splash(); } }
          else if (Wt.state === 'float') { const k = clamp(e / 5, 0, 1); Wt.x = lerp(130, 318, ease(k)); Wt.y = 224 + Math.sin(t * 3) * 4; if (k >= 1) { Wt.state = 'land'; Wt.t0 = t; } }
          else if (Wt.state === 'land') { const k = clamp(e / .8, 0, 1); Wt.x = lerp(318, 350, k); Wt.y = lerp(224, 205, k); if (k >= 1) { Wt.state = 'grown'; Wt.t0 = t; Wt.sprout = t; Sound.grow(2); } }
          else if (Wt.state === 'grown' && e > 2.5) Wt.state = 'ready';
          if (Wt.state !== 'grown') coco(Wt.x, Wt.y);
        }
        if (Wt.sprout > 0) { const k = clamp((t - Wt.sprout) / 2, 0, 1); coco(350, 205); c.save(); c.strokeStyle = '#8A5A36'; c.lineWidth = 5; c.beginPath(); c.moveTo(352, 198); c.lineTo(354, 198 - 28 * k); c.stroke(); c.restore(); for (const r of [-150, -90, -30]) drawLeaf(c, 354, 198 - 28 * k, r, .3 * k, '#4E9E36'); }
        pillLabel(c, 'Water', 12, 12); if (Wt.state === 'ready') label(c, 'Tap the palm!', 250, 120, { size: 20, color: C.carrot });
      }, '#FFD9B0', '#FFF1DE');
      // ---- pop ----
      panel(c, 400, 280, c => {
        grass(c, 248);
        c.save(); c.strokeStyle = C.leafDeep; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(110, 252); c.quadraticCurveTo(100, 160, 115, 80); c.stroke(); c.restore();
        drawLeaf(c, 108, 200, -160, .5); drawLeaf(c, 106, 160, -20, .45); drawLeaf(c, 114, 100, -150, .38);
        for (const sp of Pp.sprouts) sproutAt(c, sp.x, 250, (t - sp.t0) / 1.5);
        const e = t - Pp.t0;
        if (Pp.state === 'ready' || Pp.state === 'shake' || Pp.state === 'regrow') {
          const k = Pp.state === 'regrow' ? clamp(e / 1, 0, 1) : 1, wob = Pp.state === 'shake' ? Math.sin(e * 50) * 8 : 0;
          c.save(); c.translate(112, 118); c.rotate((-100 + wob) * DEG); c.scale(1.1 * k, 1.1 * k); drawPod(c, 0, t, .6); c.restore();
          if (Pp.state === 'shake' && e > .45) {
            Pp.state = 'burst'; Pp.t0 = t; Sound.crack(); for (let i = 0; i < 6; i++) setTimeout(() => Sound.ptoo(), i * 60);
            Pp.seeds = Array.from({ length: 6 }, () => ({ x: 160, y: 112, vx: rand(60, 290) * (Math.random() < .25 ? -1 : 1), vy: rand(-340, -170), rest: false, rt: 0 }));
          }
          if (Pp.state === 'regrow' && e > 1) Pp.state = 'ready';
        } else if (Pp.state === 'burst') {
          c.save(); c.globalAlpha = clamp(1 - e / 2, 0, 1); c.translate(112, 118); for (const sd of [-1, 1]) { c.save(); c.rotate(sd * .6 - 1.4); c.strokeStyle = '#A88445'; c.fillStyle = '#D9B86C'; c.lineWidth = 3; c.beginPath(); c.arc(40, sd * 10, 30, sd > 0 ? 0 : PI, sd > 0 ? PI : TAU); c.stroke(); c.restore(); } c.restore();
          for (const q of Pp.seeds) {
            if (!q.rest) { q.vy += 650 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.x < 8 || q.x > 392) { q.vx *= -.6; q.x = clamp(q.x, 8, 392); } if (q.y >= 244 && q.vy > 0) { q.y = 244; q.vy *= -.35; q.vx *= .6; Sound.drip(); if (Math.abs(q.vy) < 40) { q.rest = true; q.rt = t; } } }
            else if (t - q.rt > .8 && !q.sp) { q.sp = true; Pp.sprouts.push({ x: q.x, t0: t }); if (Pp.sprouts.length > 8) Pp.sprouts.shift(); }
            if (!q.sp) { c.fillStyle = '#E8D29C'; c.strokeStyle = '#A88445'; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, 6, 0, TAU); c.fill(); c.stroke(); }
          }
          if (e > 3.2) { Pp.state = 'regrow'; Pp.t0 = t; }
        }
        pillLabel(c, 'Pop!', 12, 12); if (Pp.state === 'ready') label(c, 'Tap the pod!', 280, 110, { size: 20, color: C.carrot });
      }, '#E6DDF8', '#F7F3FF');
      // frame lines
      c.fillStyle = C.ink; c.fillRect(397, 0, 6, H); c.fillRect(0, 277, W, 6);
      st.cursor = 'pointer';
    };
    ui.hint('One more way: birds and animals eat berries and fruits, then drop the seeds far away in their poop!');
    return { stage: st, destroy() { st.destroy(); } };
  }
};
