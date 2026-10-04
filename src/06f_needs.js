/* ============ Activity: Plant Needs (a fair test) ============ */
// Four bean plants, the same except for water and light. Predict which grows best, let a week go by,
// then look at each one. A fair test changes only one thing, so you know what made the difference.
const A_needs = {
  id: 'needs', name: 'Plant Needs', icon: 'pots',
  badge: { id: 'b.needs', name: 'Fair Tester', desc: 'You ran a fair test and found out what plants need!', how: 'Not yet! Run the fair test in <b>Plant Needs</b>.' },
  stars: [{ id: 'needs.predict', name: 'Make a guess' }, { id: 'needs.best', name: 'Water and light' }, { id: 'needs.water', name: 'No water' },
    { id: 'needs.light', name: 'No light' }, { id: 'needs.fair', name: 'Fair test' }],
  intro: 'Scientists do a <b>fair test</b>. They change just one thing and keep everything else the same. These bean plants are the same, except for water and light. <b>Tap the plant</b> you think will grow the healthiest!',
  facts: ['Did you know? Plants need water and light to grow healthy and strong.', 'Did you know? In a <b>fair test</b>, scientists change just one thing, so they know what made the difference.'],
  mount(host, ui) {
    const st = new Stage(host, 'Four bean plants in pots on a windowsill, labeled water and light, no water, no light, and neither, with a wall calendar to let a week go by.');
    const POTS = [{ x: 130, water: true, light: true, label: "Water and light" }, { x: 310, water: false, light: true, label: "No water" }, { x: 490, water: true, light: false, label: "No light" }, { x: 670, water: false, light: false, label: "Neither" }];
    const SILL = 430, CAL = [680, 110];
    const found = k => !!Store.data.stars['needs.' + k];
    const earn = (k, x, y) => { if (ui.award('needs.' + k, ...st.client(x, y))) s.earnedHere = true; };
    const FACTS = [
      'This one had water and light. It grew big, green and strong. Plants need both!',
      'With no water, this plant drooped and dried up. Plants need water to stay strong.',
      'No light! This one grew tall, but it is pale and thin. It stretched up, looking for light. Without light it cannot make food, so it got weak.',
      'No water and no light. This plant hardly grew, and it dried up. But we took away two things, so we cannot tell which one hurt it. That is why a fair test changes just one thing!'
    ];
    let s;
    function reset() { s = { guess: -1, weekT: -9, week: 0, seen: [false, false, false, false], lastAct: Loop.t, told: {} }; }
    const grown = () => s.week ? clamp((st.t - s.weekT) / 3, 0, 1) : 0;   // the week plays out over 3 seconds
    const potAt = (x, y) => POTS.findIndex(p => Math.abs(x - p.x) < 70 && y > 200 && y < SILL + 50);
    function letWeekPass() {
      if (s.week) { Sound.tap(3); return; }
      if (s.guess < 0) { Sound.boing(); return ui.say('First, tap the plant you think will grow the healthiest!'); }
      s.week = 1; s.weekT = st.t; Sound.whoosh(); for (let i = 0; i < 7; i++) setTimeout(() => Sound.tone(PENTA[i + 2], .1, 'triangle', .06), i * 380);
      ui.say(s.guess === 0 ? 'One week later! Your guess was right. Tap each plant to see what happened.' : 'One week later! Let\'s see how your guess did. Tap each plant to see what happened.');
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t;
      if (dist(x, y, ...CAL) < 70) return letWeekPass();
      const i = potAt(x, y);
      if (i >= 0) {
        if (!s.week) { s.guess = i; Sound.pop(); Sound.tap(i + 2); if (!found('predict')) earn('predict', POTS[i].x, 300); return ui.say('Good guess! Now tap the <b>calendar</b> to let a week go by.'); }
        if (grown() < 1) return;
        Sound.tap(i + 3); s.seen[i] = true;
        const k = ['best', 'water', 'light', null][i]; if (k) earn(k, POTS[i].x, 280);
        ui.say(FACTS[i]);
        if (s.seen.every(Boolean) && !s.told.fair) { s.told.fair = true; earn('fair', 400, 200); ui.say('You did it! Look at each plant next to the water and light plant. The no water plant had just one change. So did the no light plant. Those were fair tests, so we know plants need water and light!', { queue: true }); }
        return;
      }
      Sound.tap(Math.floor(x / 80));
    };

    // one plant, drawn from how it grew: height, how pale, how droopy
    function drawBean(c, x, p, g, t) {
      const h = lerp(26, p.water && p.light ? 190 : p.light ? 110 : p.water ? 230 : 30, g);
      const green = p.water && p.light ? C.leaf : p.light ? mix(C.leaf, '#B8A15A', g) : p.water ? mix(C.leaf, '#D9DE8A', g) : mix(C.leaf, '#8A6B3E', g);
      const droop = !p.water ? g * (p.light ? .9 : 1.4) : 0, thin = p.water && !p.light ? 1 - g * .45 : 1;
      const base = [x, SILL - 70], sw = RM ? 0 : Math.sin(t * 1.3 + x) * 2;
      const top = [x + droop * 55 + sw, base[1] - h + droop * h * .45];
      const stem = new Path2D(); stem.moveTo(...base); stem.quadraticCurveTo(x - 6, base[1] - h * .6, ...top);
      c.save(); c.lineCap = 'round'; c.strokeStyle = mix(C.leafDeep, '#6B5530', !p.water ? g : 0); c.lineWidth = 9 * thin; c.stroke(stem); c.strokeStyle = green; c.lineWidth = 4.5 * thin; c.stroke(stem); c.restore();
      const ls = (p.water && p.light ? .42 : p.light ? .32 : p.water ? .24 : .2) * (.5 + g * .5);
      drawLeaf(c, ...top, -150 + droop * 70, ls, green); drawLeaf(c, ...top, -30 + droop * 70, ls, green);
      if (h > 120) { const m = qpt(base, [x - 6, base[1] - h * .6], top, .55); drawLeaf(c, ...m, -160 + droop * 60, ls * .85, green); drawLeaf(c, ...m, -20 + droop * 60, ls * .85, green); }
    }
    st.draw = (c, t, dt) => {
      const g = grown(), night = s.week && g < 1 ? Math.abs(Math.sin(g * PI * 7)) : 0;
      // a window behind the sill, cycling through the days while the week goes by
      const wg = c.createLinearGradient(0, 0, 0, SILL); wg.addColorStop(0, mix('#86CFEA', '#1D2B5A', night)); wg.addColorStop(1, mix('#E2F6FC', '#3B4C86', night)); c.fillStyle = wg; c.fillRect(0, 0, W, SILL);
      if (night < .5) sun(c, 90, 80, 30, t, { face: true }); else { c.fillStyle = '#FFF8D2'; c.beginPath(); c.arc(90, 80, 22, 0, TAU); c.fill(); }
      c.strokeStyle = '#FFFDF5'; c.lineWidth = 14; c.strokeRect(0, 0, W, SILL); c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, SILL); c.moveTo(0, SILL / 2); c.lineTo(W, SILL / 2); c.stroke();
      // calendar
      c.save(); c.translate(...CAL); if (!s.week && s.guess >= 0 && st.over(circle(...CAL, 70))) glowOn(c);
      const pg = rrect(-56, -60, 112, 120, 10); c.fillStyle = '#FFFDF5'; c.fill(pg); c.shadowBlur = 0; c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(pg);
      c.fillStyle = C.petal; c.fillRect(-56, -60, 112, 30); c.strokeRect(-56, -60, 112, 30);
      const day = s.week ? 1 + Math.min(7, Math.floor(g * 7)) : 1;
      label(c, s.week && g >= 1 ? "1 week" : "Day " + day, 0, -44, { size: 16, color: '#fff', stroke: null });
      c.fillStyle = 'rgba(36,54,40,.25)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(-40 + (i % 4) * 26, -6 + Math.floor(i / 4) * 28, 7, 0, TAU); c.fill(); }
      c.fillStyle = C.leaf; for (let i = 0; i < (s.week ? Math.min(7, Math.floor(g * 7)) : 0); i++) { c.beginPath(); c.arc(-40 + (i % 4) * 26, -6 + Math.floor(i / 4) * 28, 7, 0, TAU); c.fill(); }
      c.restore();
      // the sill
      c.fillStyle = '#E7BE84'; c.fillRect(0, SILL, W, H - SILL); c.fillStyle = '#C9955A'; c.fillRect(0, SILL - 6, W, 12);
      POTS.forEach((p, i) => {
        // dry soil looks pale and cracked; watered soil is dark
        drawBean(c, p.x, p, g, t);
        const pot = new Path2D(); pot.moveTo(p.x - 52, SILL - 78); pot.lineTo(p.x + 52, SILL - 78); pot.lineTo(p.x + 40, SILL); pot.lineTo(p.x - 40, SILL); pot.closePath();
        c.save(); if (st.p.inside && potAt(st.p.x, st.p.y) === i && (!s.week || g >= 1)) { glowOn(c); st.cursor = 'pointer'; }
        c.fillStyle = '#C8653A'; c.fill(pot); c.shadowBlur = 0; c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(pot); c.restore();
        c.fillStyle = p.water ? '#5A3920' : '#B08A5E'; c.fillRect(p.x - 48, SILL - 82, 96, 10);
        if (!p.water) { c.strokeStyle = '#7A5A36'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.x - 30, SILL - 80); c.lineTo(p.x - 20, SILL - 75); c.moveTo(p.x + 14, SILL - 80); c.lineTo(p.x + 24, SILL - 76); c.stroke(); }
        c.fillStyle = '#B5552D'; c.fillRect(p.x - 56, SILL - 90, 112, 14); c.strokeStyle = C.ink; c.lineWidth = 3; c.strokeRect(p.x - 56, SILL - 90, 112, 14);
        // the no-light plants sit under boxes all week; the boxes lift off at the end
        if (!p.light) {
          const lift = s.week ? clamp((st.t - s.weekT - 3) / .6, 0, 1) : 0, by = SILL - 90 - easeOut(lift) * 380;
          if (lift < 1) { const box = rrect(p.x - 70, by - 230, 140, 230, 6); c.fillStyle = '#C9A26B'; c.fill(box); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(box); c.strokeStyle = 'rgba(36,54,40,.3)'; c.beginPath(); c.moveTo(p.x - 70, by - 200); c.lineTo(p.x + 70, by - 200); c.stroke(); }
        }
        pillLabel(c, p.label, p.x - 62, SILL + 34, s.guess === i ? C.sun : '#FFFDF5');
        if (s.week && g >= 1 && s.seen[i]) sparkle(c, p.x + 48, SILL - 120, 8);
      });
      const idle = t - s.lastAct > 5, bob = RM ? 0 : Math.abs(Math.sin(t * 5)) * 6;
      if (s.guess < 0 && idle) label(c, "Tap your guess!", 400, 190 - bob, { size: 24, color: C.carrot });
      else if (!s.week && idle) label(c, "Tap the calendar!", CAL[0], CAL[1] + 90 - bob, { size: 20, color: C.carrot });
      else if (g >= 1 && !s.seen.every(Boolean) && idle) label(c, "Tap each plant!", 400, 190 - bob, { size: 22, color: C.carrot });
    };
    ui.button('Let a week go by', () => letWeekPass());
    ui.button('Start over', () => { reset(); Sound.pop(); ui.say(A_needs.intro); });
    ui.hint("Try a fair test at home! Grow two bean sprouts the same way. Put one in a sunny window and one in a dark closet. Give them the same water. Check them every day!");
    reset();
    return { stage: st, state: () => s, geo: { pots: POTS.map(p => [p.x, 330]), calendar: CAL }, destroy() { st.destroy(); } };
  }
};
