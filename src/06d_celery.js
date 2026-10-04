/* ============ Activity: Thirsty Celery ============ */
// The classic class experiment, sped up: color the water, let the hours pass, and watch the color climb
// the stalk's tiny tubes to the leaves. Sunshine makes it faster. Cut the stalk to see the colored tubes.
const A_celery = {
  id: 'celery', name: 'Thirsty Celery', icon: 'celery',
  badge: { id: 'b.celery', name: 'Water Tracker', desc: 'You watched water climb all the way up a celery stalk!', how: 'Not yet! Watch the colored water climb in <b>Thirsty Celery</b>.' },
  stars: [{ id: 'celery.color', name: 'Colored water' }, { id: 'celery.climb', name: 'Water climbs' }, { id: 'celery.leaves', name: 'To the leaves' },
    { id: 'celery.sun', name: 'Sunshine helps' }, { id: 'celery.tubes', name: 'Tiny tubes' }],
  intro: 'Plants drink water through tiny tubes. Let\'s watch it happen! <b>Tap a color</b> to add it to the water.',
  facts: ['Did you know? Water climbs up a plant through tiny tubes, all the way to the leaves.', 'Did you know? Plants drink faster on a sunny day! Their leaves let water <b>evaporate</b>, or dry up into the air, and that pulls more water up.'],
  mount(host, ui) {
    const st = new Stage(host, 'A celery stalk standing in a glass of water on a table, with bottles of blue and red food coloring, a clock, and a window with blinds.');
    const GLASS = [300, 470], TOP = 150, BOTTLES = { blue: [520, 452], red: [598, 452] }, CLOCK = [690, 120], WINDOW = [140, 40, 200, 150];
    const DYES = { blue: '#3B6FD6', red: '#D93A5A' };
    const found = k => !!Store.data.stars['celery.' + k];
    const earn = (k, x, y) => { if (ui.award('celery.' + k, ...st.client(x, y))) s.earnedHere = true; };
    let s;
    function reset() { s = { dye: null, dyeT: -9, hours: 0, climb: 0, shown: 0, sunny: false, spinT: -9, cutT: -9, knife: null, lastAct: Loop.t, told: {} }; }
    // the stalk: a tall pale-green column in the glass, with tubes running up it
    const STALK = rrect(GLASS[0] - 22, TOP, 44, GLASS[1] - TOP + 10, 18);
    const onStalk = (x, y) => Math.abs(x - GLASS[0]) < 130 && y > TOP + 40 && y < GLASS[1] - 90; // a swipe can start beside the stalk
    function addDye(k) {
      if (s.dye) { Sound.tap(3); return ui.say(s.dye === k ? 'The color is already in!' : 'One color at a time. Tap <b>New celery</b> to try the other one!'); }
      s.dye = k; s.dyeT = st.t; Sound.drip(); setTimeout(() => Sound.drip(), 160); setTimeout(() => Sound.splash(), 380);
      earn('color', ...BOTTLES[k]); ui.say(k === 'blue' ? 'Drip, drip! Now the water is blue. Tap the <b>clock</b> to let the hours go by.' : 'Drip, drip! Now the water is red. Tap the <b>clock</b> to let the hours go by.');
    }
    function wait() {
      if (!s.dye) { Sound.boing(); return ui.say('Add a color to the water first, so we can see where it goes.'); }
      if (s.climb >= 1) { Sound.tap(5); return; }
      s.hours++; s.spinT = st.t; Sound.tone(PENTA[s.hours % 10], .12, 'triangle', .07); Sound.tone(PENTA[(s.hours + 2) % 10], .12, 'triangle', .06, .1);
      s.climb = Math.min(1, s.climb + (s.sunny ? .3 : .14));
    }
    function blinds() {
      s.sunny = !s.sunny; Sound.fwip(); if (s.sunny) Sound.sparkle(.1);
      if (s.sunny && !found('sun')) { earn('sun', WINDOW[0] + WINDOW[2] / 2, WINDOW[1] + 60); ui.say('Sunshine helps! Leaves let water <b>evaporate</b>. That means it dries up into the air, like a puddle on a sunny day. That pulls more water up the stalk.'); }
    }
    function cut() {
      s.cutT = st.t; Sound.crack(); Sound.squish();
      // the cut is at y 300; the color has passed it once it has climbed past about half way
      if (s.shown > .55) { earn('tubes', GLASS[0], 300); ui.say('Look at the colored dots! Each dot is a bundle of tiny tubes. The water climbed up through them, like through a straw.'); }
      else ui.say('The color is not up here yet. Let it climb higher, then cut again!');
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      for (const k of Object.keys(BOTTLES)) if (dist(x, y, ...BOTTLES[k]) < 34) return addDye(k);
      if (dist(x, y, ...CLOCK) < 60) return wait();
      if (x > WINDOW[0] && x < WINDOW[0] + WINDOW[2] && y > WINDOW[1] && y < WINDOW[1] + WINDOW[3]) return blinds();
      if (s.dye && onStalk(x, y)) { s.knife = { pts: [[x, y]] }; return; }
      Sound.tap(Math.floor(x / 80));
    };
    st.onMove = (x, y) => {
      if (!s.knife) return; s.knife.pts.push([x, y]);
      const xs = s.knife.pts.map(p => p[0]);
      if (Math.min(...xs) < GLASS[0] - 40 && Math.max(...xs) > GLASS[0] + 40) { s.knife = null; cut(); }
    };
    st.onUp = () => { s.knife = null; };

    st.draw = (c, t, dt) => {
      // the color creeps up smoothly toward where the hours have taken it
      s.shown += (s.climb - s.shown) * Math.min(1, dt * 2.5);
      if (s.shown > .45 && !found('climb')) { earn('climb', GLASS[0], GLASS[1] - (GLASS[1] - TOP) * .45); ui.say('The color is climbing! Tiny tubes inside the stalk carry water up, like straws.'); }
      if (s.shown > .97 && !found('leaves')) { earn('leaves', GLASS[0], TOP); ui.say(s.dye === 'blue' ? 'All the way to the leaves! Look, the leaf tips are turning blue. Leaves need water too.' : 'All the way to the leaves! Look, the leaf tips are turning red. Leaves need water too.', { queue: true }); }
      if (s.earnedHere && A_celery.stars.every(q => Store.data.stars[q.id]) && !s.told.all) { s.told.all = true; ui.say('You tracked the water from the glass to the leaves! Stalks and stems are like straws for plants.', { queue: true }); }
      const dye = s.dye ? DYES[s.dye] : null;
      // wall, window (blinds open or shut), clock
      const g = c.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, '#F3E9D8'); g.addColorStop(1, '#EADCC4'); c.fillStyle = g; c.fillRect(0, 0, W, 320);
      const [wx, wy, ww, wh] = WINDOW;
      c.save(); c.fillStyle = s.sunny ? '#BFE6F4' : '#9DB4C0'; c.fillRect(wx, wy, ww, wh);
      if (s.sunny) { sun(c, wx + 140, wy + 50, 26, t, { face: true }); cloud(c, wx + 20, wy + 110, .5); }
      if (!s.sunny) { c.fillStyle = '#F2E2B8'; for (let y = wy; y < wy + wh; y += 14) { c.fillRect(wx, y, ww, 11); c.strokeStyle = 'rgba(36,54,40,.25)'; c.lineWidth = 1; c.strokeRect(wx, y, ww, 11); } }
      else { c.fillStyle = '#F2E2B8'; for (let i = 0; i < 4; i++) { c.fillRect(wx, wy + i * 6, ww, 5); } }
      c.strokeStyle = '#FFFDF5'; c.lineWidth = 10; c.strokeRect(wx, wy, ww, wh); c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.stroke();
      c.strokeStyle = C.ink; c.lineWidth = 3; c.strokeRect(wx - 5, wy - 5, ww + 10, wh + 10);
      if (st.over(rrect(wx, wy, ww, wh, 0))) { c.strokeStyle = C.sun; c.lineWidth = 4; c.strokeRect(wx - 9, wy - 9, ww + 18, wh + 18); }
      c.restore();
      if (s.sunny) { c.save(); c.globalAlpha = .18; c.fillStyle = '#FFE680'; c.beginPath(); c.moveTo(wx, wy + wh); c.lineTo(wx + ww, wy + wh); c.lineTo(GLASS[0] + 160, GLASS[1] + 40); c.lineTo(GLASS[0] - 120, GLASS[1] + 40); c.closePath(); c.fill(); c.restore(); }
      // clock: tap it to let an hour go by
      c.save(); c.translate(...CLOCK); if (st.over(circle(...CLOCK, 60))) glowOn(c);
      c.fillStyle = '#FFFDF5'; c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 52, 0, TAU); c.fill(); c.shadowBlur = 0; c.stroke();
      c.fillStyle = C.ink; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.arc(Math.cos(a) * 42, Math.sin(a) * 42, i % 3 ? 2 : 3.5, 0, TAU); c.fill(); }
      const spin = clamp((st.t - s.spinT) / .6, 0, 1), hr = s.hours - 1 + ease(spin);
      c.lineCap = 'round'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(hr * TAU / 12 - PI / 2) * 26, Math.sin(hr * TAU / 12 - PI / 2) * 26); c.stroke();
      c.lineWidth = 3.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(hr * TAU - PI / 2) * 38, Math.sin(hr * TAU - PI / 2) * 38); c.stroke();
      c.fillStyle = C.carrot; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); c.restore();
      label(c, s.hours === 1 ? "1 hour" : `${s.hours} hours`, CLOCK[0], CLOCK[1] + 74, { size: 20 });
      // table
      const tg = c.createLinearGradient(0, 320, 0, H); tg.addColorStop(0, '#E7BE84'); tg.addColorStop(1, '#D3A566'); c.fillStyle = tg; c.fillRect(0, 320, W, H - 320); c.fillStyle = '#C9955A'; c.fillRect(0, 314, W, 10);
      // celery: the stalk with its tubes, colored as far as the water has climbed, and leaves on top
      const tipCol = dye && s.shown > .9 ? mix(C.leaf, dye, (s.shown - .9) / .1 * .75) : C.leaf;
      for (const [dx, r] of [[-30, -130], [-6, -100], [16, -70], [30, -40], [0, -90]]) drawLeaf(c, GLASS[0] + dx * .4, TOP + 10, r, .55, tipCol);
      c.save(); c.fillStyle = '#B8E094'; c.fill(STALK); c.strokeStyle = '#4E8C3A'; c.lineWidth = 3; c.stroke(STALK);
      const h = (GLASS[1] - TOP) * s.shown;
      for (const dx of [-14, -5, 4, 13]) {
        c.strokeStyle = 'rgba(78,140,58,.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(GLASS[0] + dx, GLASS[1]); c.lineTo(GLASS[0] + dx, TOP + 14); c.stroke();
        if (dye && h > 2) { c.strokeStyle = dye; c.lineWidth = 3.5; c.globalAlpha = .85; c.beginPath(); c.moveTo(GLASS[0] + dx, GLASS[1]); c.lineTo(GLASS[0] + dx, GLASS[1] - h); c.stroke(); c.globalAlpha = 1; }
      }
      if (st.t - s.cutT < 1.2) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.globalAlpha = 1 - (st.t - s.cutT) / 1.2; c.beginPath(); c.moveTo(GLASS[0] - 30, 300); c.lineTo(GLASS[0] + 30, 300); c.stroke(); }
      c.restore();
      if (s.dye && onStalk(st.p.x, st.p.y) && st.p.inside) st.cursor = 'crosshair';
      // the glass of water, colored once the dye is in
      c.save(); c.translate(GLASS[0], GLASS[1]);
      const water = new Path2D(); water.moveTo(-58, -110); water.lineTo(58, -110); water.lineTo(50, 0); water.lineTo(-50, 0); water.closePath();
      const mixK = s.dye ? clamp((st.t - s.dyeT) / 1.2, 0, 1) : 0; c.fillStyle = dye ? mix('#BFE6F4', dye, mixK * .7) : 'rgba(79,179,232,.35)'; c.globalAlpha = .8; c.fill(water); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(36,54,40,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-64, -170); c.lineTo(-50, 0); c.lineTo(50, 0); c.lineTo(64, -170); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-52, -160, 10, 150);
      c.restore();
      // dye bottles
      for (const [k, [x, y]] of Object.entries(BOTTLES)) {
        c.save(); c.translate(x, y); if (!s.dye && st.over(circle(x, y, 34))) glowOn(c); if (s.dye && s.dye !== k) c.globalAlpha = .5;
        const body = rrect(-20, -36, 40, 52, 8); c.fillStyle = DYES[k]; c.fill(body); c.shadowBlur = 0; c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(body);
        c.fillStyle = '#FFFDF5'; c.fill(rrect(-14, -20, 28, 18, 4)); c.fillStyle = C.ink; c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k === 'blue' ? "BLUE" : "RED", 0, -11);
        c.fillStyle = '#FFFDF5'; c.fillRect(-8, -54, 16, 18); c.strokeRect(-8, -54, 16, 18); c.fillStyle = C.ink; c.beginPath(); c.moveTo(-3, -54); c.lineTo(0, -64); c.lineTo(3, -54); c.fill();
        c.restore();
      }
      if (s.dye && st.t - s.dyeT < 1) { const [bx] = BOTTLES[s.dye]; for (let i = 0; i < 3; i++) { const k = ((st.t - s.dyeT) * 2 + i / 3) % 1; c.fillStyle = dye; c.beginPath(); c.arc(lerp(bx, GLASS[0] + 20, k), lerp(380, GLASS[1] - 110, k) - Math.sin(k * PI) * 60, 5, 0, TAU); c.fill(); } }
      // the slice, after a cut: colored dots are the tubes
      if (st.t - s.cutT < 6 && s.cutT > 0) {
        const k = easeOut(clamp((st.t - s.cutT) / .5, 0, 1)), px = 560, py = 250;
        c.save(); c.translate(px, py); c.scale(k * 1.4, k * 1.4);
        const p = new Path2D(); p.moveTo(-48, -6); p.quadraticCurveTo(0, -46, 48, -6); p.quadraticCurveTo(52, 24, 30, 34); p.quadraticCurveTo(0, 6, -30, 34); p.quadraticCurveTo(-52, 24, -48, -6); p.closePath();
        c.fillStyle = '#CFEBA8'; c.fill(p); c.strokeStyle = '#4E8C3A'; c.lineWidth = 3; c.stroke(p);
        c.fillStyle = dye && s.shown > .55 ? dye : '#7FB65A'; for (let i = 0; i < 9; i++) { const u = i / 8; c.beginPath(); c.arc(lerp(-38, 38, u), -10 - Math.sin(u * PI) * 16, 3.6, 0, TAU); c.fill(); }
        c.restore();
        label(c, "Celery slice", px, py + 70, { size: 18 });
      }
      // hints
      const idle = t - s.lastAct > 5, bob = RM ? 0 : Math.abs(Math.sin(t * 5)) * 6;
      if (!s.dye && idle) label(c, "Tap a color!", 559, 372 - bob, { size: 22, color: C.carrot });
      else if (s.dye && s.climb < 1 && idle) label(c, "Tap the clock!", CLOCK[0], CLOCK[1] - 74 - bob, { size: 20, color: C.carrot });
      else if (s.climb >= 1 && !found('tubes') && idle) label(c, "Swipe across the stalk!", GLASS[0], 260 - bob, { size: 20, color: C.carrot });
      if (s.knife && st.p.down) { st.cursor = 'none'; c.save(); c.translate(st.p.x - 40, st.p.y); c.fillStyle = '#DCE3E8'; c.strokeStyle = C.ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -8); c.lineTo(70, -5); c.quadraticCurveTo(82, 2, 68, 7); c.lineTo(0, 8); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#8A5A36'; c.fill(rrect(-44, -7, 44, 14, 6)); c.stroke(rrect(-44, -7, 44, 14, 6)); c.restore(); }
    };
    ui.button('Wait an hour', () => wait());
    ui.button('New celery', () => { reset(); Sound.pop(); ui.say(A_celery.intro); });
    ui.hint("Try it for real! Ask a grown-up to cut the bottom off a celery stalk. Stand it in water with lots of food coloring. Check it after one day!");
    reset();
    return { stage: st, state: () => s, geo: { bottles: BOTTLES, clock: CLOCK, window: [WINDOW[0] + WINDOW[2] / 2, WINDOW[1] + WINDOW[3] / 2], stalk: [GLASS[0], 300] }, destroy() { st.destroy(); } };
  }
};
