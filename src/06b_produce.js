/* ============ Activity: Produce Lab (fruit or vegetable?) ============ */
// The class cut open produce looking for seeds: seeds inside means a fruit, no seeds means a vegetable.
// Tap a food, swipe across it to cut it open, then sort the halves into the Fruit or Vegetable crate.

// draw several shapes as one outlined blob: a thick ink stroke under each, then the fills on top
function blob(c, shapes, fill, edge = C.ink, w = 3) {
  c.save(); c.strokeStyle = edge; c.lineWidth = w * 2; c.lineJoin = 'round';
  for (const p of shapes) c.stroke(p);
  c.fillStyle = fill; for (const p of shapes) c.fill(p); c.restore();
}
function seedDot(c, x, y, rot = 0, s = 1, fill = '#F6E3A1', edge = '#C9A54A') {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.fillStyle = fill; c.strokeStyle = edge; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(4, 0, 0, 5); c.quadraticCurveTo(-4, 0, 0, -5); c.fill(); c.stroke(); c.restore();
}
const STRAW = (() => { const p = new Path2D(); p.moveTo(0, 62); p.bezierCurveTo(-30, 40, -58, 6, -52, -24); p.bezierCurveTo(-46, -50, -14, -54, 0, -44); p.bezierCurveTo(14, -54, 46, -50, 52, -24); p.bezierCurveTo(58, 6, 30, 40, 0, 62); p.closePath(); return p; })();
const CARROT = (() => { const p = new Path2D(); p.moveTo(-30, -52); p.quadraticCurveTo(0, -62, 30, -52); p.quadraticCurveTo(26, 10, 4, 68); p.quadraticCurveTo(0, 74, -4, 68); p.quadraticCurveTo(-26, 10, -30, -52); p.closePath(); return p; })();
const LONG = rrect(-76, -25, 152, 50, 25);

// every food: whole (in the basket and on the board) and its cut face (each half shows one); drawn around 0,0, about 150 across
const PRODUCE = [
  { id: 'tomato', name: 'Tomato', fruit: true, star: 'fruit',
    fact: 'Seeds inside! A <b>tomato</b> is a <b>fruit</b>. A fruit grows from a flower and holds the seeds.',
    whole(c) {
      const g = c.createRadialGradient(-18, -18, 6, 0, 0, 64); g.addColorStop(0, '#FF8A7A'); g.addColorStop(1, '#E2402F');
      c.fillStyle = g; c.strokeStyle = '#9E2A1E'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 4, 60, 54, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-24, -18, 12, 7, -.5, 0, TAU); c.fill();
      for (let i = 0; i < 5; i++) drawLeaf(c, 0, -46, -90 + i * 72, .17, C.leaf);
    },
    face(c) {
      c.fillStyle = '#E2402F'; c.strokeStyle = '#9E2A1E'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 60, 54, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#FF8E7C'; c.beginPath(); c.ellipse(0, 0, 50, 45, 0, 0, TAU); c.fill();
      for (let k = 0; k < 3; k++) {
        c.save(); c.rotate(k * TAU / 3 - PI / 2); c.fillStyle = '#FFC7A8'; c.beginPath(); c.ellipse(26, 0, 17, 14, 0, 0, TAU); c.fill();
        for (const [x, y, r] of [[18, -5, .4], [26, 6, -.3], [33, -4, .8], [24, -9, 1.2], [31, 7, .2]]) seedDot(c, x, y, r, .9);
        c.restore();
      }
      c.fillStyle = '#FFB49A'; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill();
    } },
  { id: 'cucumber', name: 'Cucumber', fruit: true, star: 'fruit', tilt: -1.15,
    fact: 'So many seeds! A <b>cucumber</b> is a fruit in disguise.',
    whole(c) {
      const g = c.createLinearGradient(0, -25, 0, 25); g.addColorStop(0, '#5DA24E'); g.addColorStop(1, '#2F6B33');
      c.fillStyle = g; c.fill(LONG); c.strokeStyle = '#1F4A24'; c.lineWidth = 3; c.stroke(LONG);
      c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = -60; x <= 60; x += 15) for (const y of [-12, 4]) { c.beginPath(); c.arc(x + (y > 0 ? 7 : 0), y, 2, 0, TAU); c.fill(); }
      c.fillStyle = '#8A6B34'; c.beginPath(); c.ellipse(-77, 0, 5, 7, 0, 0, TAU); c.fill();
    },
    face(c) {
      c.fillStyle = '#2F6B33'; c.fill(LONG); c.strokeStyle = '#1F4A24'; c.lineWidth = 3; c.stroke(LONG);
      c.fillStyle = '#D9EFB0'; c.fill(rrect(-70, -19, 140, 38, 19));
      c.fillStyle = '#EEF8D6'; c.beginPath(); c.ellipse(0, 0, 58, 10, 0, 0, TAU); c.fill();
      for (let x = -48; x <= 48; x += 12) { seedDot(c, x, -4, PI / 2, .9, '#FFFBEA', '#B9B67E'); seedDot(c, x + 6, 4, PI / 2, .9, '#FFFBEA', '#B9B67E'); }
    } },
  { id: 'zucchini', name: 'Zucchini', fruit: true, star: 'fruit', tilt: 1.15,
    fact: 'Seeds inside a <b>zucchini</b> too! It is a fruit, just like its cousin the cucumber.',
    whole(c) {
      c.fillStyle = '#2E5E2C'; c.fill(LONG); c.strokeStyle = '#173A18'; c.lineWidth = 3; c.stroke(LONG);
      c.strokeStyle = 'rgba(190,220,140,.55)'; c.lineWidth = 2; for (const y of [-12, 0, 12]) { c.beginPath(); c.moveTo(-62, y); c.lineTo(62, y * 1.1); c.stroke(); }
      c.fillStyle = '#7C9B3C'; c.strokeStyle = '#173A18'; c.lineWidth = 2; c.fill(rrect(-90, -8, 18, 16, 4)); c.stroke(rrect(-90, -8, 18, 16, 4));
    },
    face(c) {
      c.fillStyle = '#2E5E2C'; c.fill(LONG); c.strokeStyle = '#173A18'; c.lineWidth = 3; c.stroke(LONG);
      c.fillStyle = '#F4F0C6'; c.fill(rrect(-71, -20, 142, 40, 20));
      c.fillStyle = '#FBF8DE'; c.beginPath(); c.ellipse(0, 0, 56, 9, 0, 0, TAU); c.fill();
      for (let x = -44; x <= 44; x += 11) { seedDot(c, x, -3, PI / 2, .8, '#FFFDF0', '#BDB68A'); seedDot(c, x + 5, 4, PI / 2, .8, '#FFFDF0', '#BDB68A'); }
    } },
  { id: 'pepper', name: 'Pepper', fruit: true, star: 'fruit',
    fact: 'Look at all those seeds! A <b>pepper</b> is a fruit. The seeds grow on a little stalk in the middle.',
    whole(c) {
      blob(c, [ellipse(-26, 10, 30, 46), ellipse(26, 10, 30, 46), ellipse(0, 14, 30, 48), ellipse(0, -14, 52, 34)], '#E8402F', '#9E2A1E');
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-24, -6, 7, 20, .2, 0, TAU); c.fill();
      c.fillStyle = C.leaf; c.strokeStyle = C.leafDeep; c.lineWidth = 3; c.fill(rrect(-6, -64, 12, 26, 5)); c.stroke(rrect(-6, -64, 12, 26, 5));
      c.beginPath(); c.ellipse(0, -44, 20, 7, 0, 0, TAU); c.fill(); c.stroke();
    },
    face(c) {
      const outer = [circle(-22, -18, 30), circle(22, -18, 30), circle(-22, 18, 30), circle(22, 18, 30)];
      blob(c, outer, '#E8402F', '#9E2A1E');
      blob(c, [circle(-22, -18, 23), circle(22, -18, 23), circle(-22, 18, 23), circle(22, 18, 23)], '#FFF4EC', 'rgba(0,0,0,0)', 0);
      c.fillStyle = '#F4EED2'; c.strokeStyle = '#D8CFA0'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill(); c.stroke();
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; seedDot(c, Math.cos(a) * 15, Math.sin(a) * 15, a, .9); }
      seedDot(c, 0, -3, .3, .9); seedDot(c, 3, 5, -.8, .9);
    } },
  { id: 'strawberry', name: 'Strawberry', fruit: true, star: 'outside',
    fact: 'Tricky one! A <b>strawberry</b> wears its seeds on the <b>outside</b>. Those tiny dots are seeds, so it is a fruit.',
    whole(c) {
      const g = c.createRadialGradient(-14, -14, 6, 0, 0, 64); g.addColorStop(0, '#FF6B6B'); g.addColorStop(1, '#D9302E');
      c.fillStyle = g; c.fill(STRAW); c.strokeStyle = '#8E1F1D'; c.lineWidth = 3; c.stroke(STRAW);
      const r = seeded(4); for (let i = 0; i < 26; i++) { const x = (r() - .5) * 84, y = (r() - .5) * 86 + 4; if (c.isPointInPath(STRAW, x, y)) seedDot(c, x, y, r(), .6); }
      for (let i = 0; i < 5; i++) drawLeaf(c, 0, -44, -160 + i * 35, .2, C.leaf);
    },
    face(c) {
      c.fillStyle = '#D9302E'; c.fill(STRAW); c.strokeStyle = '#8E1F1D'; c.lineWidth = 3; c.stroke(STRAW);
      c.save(); c.scale(.84, .82); c.translate(0, 4); c.fillStyle = '#FFB3B0'; c.fill(STRAW); c.restore();
      c.strokeStyle = '#FFF0EE'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -34); c.lineTo(0, 40);
      for (const [x, y] of [[-20, -10], [20, -10], [-16, 18], [16, 18]]) { c.moveTo(0, y - 10); c.lineTo(x, y); } c.stroke();
      for (let i = 0; i < 12; i++) { const u = i / 11, a = lerp(-2.6, 2.6, u); seedDot(c, Math.sin(a) * 50 * (1 - u * .1), -20 + (1 - Math.cos(a)) * 34 - 10, a, .6); }
    } },
  { id: 'celery', name: 'Celery', fruit: false, star: 'stem',
    fact: 'No seeds in <b>celery</b>. It is a <b>stalk</b>, the part that holds up the leaves. It is a vegetable.',
    whole(c) {
      for (const [x, rot] of [[-16, -.08], [16, .08], [0, 0]]) {
        c.save(); c.translate(x, 0); c.rotate(rot);
        const p = rrect(-11, -40, 22, 108, 10); c.fillStyle = '#A6D884'; c.fill(p); c.strokeStyle = '#4E8C3A'; c.lineWidth = 3; c.stroke(p);
        c.strokeStyle = 'rgba(78,140,58,.5)'; c.lineWidth = 1.5; for (const dx of [-4, 3]) { c.beginPath(); c.moveTo(dx, -34); c.lineTo(dx, 62); c.stroke(); }
        c.restore();
      }
      for (const [x, r] of [[-20, -120], [0, -90], [20, -60], [-8, -150], [10, -30]]) drawLeaf(c, x * .6, -38, r, .28, C.leaf);
    },
    face(c) { // a slice across the stalk: a curved C with tiny tubes that carry water
      const p = new Path2D(); p.moveTo(-48, -6); p.quadraticCurveTo(0, -46, 48, -6); p.quadraticCurveTo(52, 24, 30, 34); p.quadraticCurveTo(0, 6, -30, 34); p.quadraticCurveTo(-52, 24, -48, -6); p.closePath();
      c.fillStyle = '#CFEBA8'; c.fill(p); c.strokeStyle = '#4E8C3A'; c.lineWidth = 3; c.stroke(p);
      c.fillStyle = '#7FB65A'; for (let i = 0; i < 9; i++) { const u = i / 8, x = lerp(-38, 38, u); c.beginPath(); c.arc(x, -10 - Math.sin(u * PI) * 16, 3.2, 0, TAU); c.fill(); }
    } },
  { id: 'radish', name: 'Radish', fruit: false, star: 'root',
    fact: 'No seeds in a <b>radish</b>. It is a <b>root</b> that grows under the ground, so it is a vegetable.',
    whole(c) {
      c.strokeStyle = '#E9D8C8'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 40); c.quadraticCurveTo(6, 58, 2, 74); c.stroke();
      const g = c.createRadialGradient(-12, -2, 4, 0, 10, 44); g.addColorStop(0, '#FF7A93'); g.addColorStop(1, '#C92D4E');
      c.fillStyle = g; c.strokeStyle = '#8A1F36'; c.lineWidth = 3; c.beginPath(); c.arc(0, 8, 38, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-14, -6, 9, 5, -.5, 0, TAU); c.fill();
      for (const r of [-120, -90, -60]) drawLeaf(c, 0, -28, r, .32, C.leaf);
    },
    face(c) {
      c.fillStyle = '#FFF9F4'; c.strokeStyle = '#C92D4E'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = '#8A1F36'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 47, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(230,150,170,.45)'; c.lineWidth = 1.5; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * 36, Math.sin(a) * 36); c.stroke(); }
    } },
  { id: 'carrot', name: 'Carrot', fruit: false, star: 'root',
    fact: 'No seeds in a <b>carrot</b>. It is a <b>root</b> too, so it is a vegetable.',
    whole(c) {
      for (const r of [-115, -90, -65]) drawLeaf(c, 0, -54, r, .34, C.leaf);
      const g = c.createLinearGradient(-30, 0, 30, 0); g.addColorStop(0, '#FFA54A'); g.addColorStop(1, '#E8761E');
      c.fillStyle = g; c.fill(CARROT); c.strokeStyle = '#A04E12'; c.lineWidth = 3; c.stroke(CARROT);
      c.strokeStyle = 'rgba(160,78,18,.5)'; c.lineWidth = 2; for (const [y, w] of [[-30, 14], [-6, 12], [20, 9], [42, 6]]) { c.beginPath(); c.moveTo(-w, y); c.lineTo(w * .3, y + 3); c.stroke(); }
    },
    face(c) {
      c.fillStyle = '#F5892E'; c.fill(CARROT); c.strokeStyle = '#A04E12'; c.lineWidth = 3; c.stroke(CARROT);
      const core = new Path2D(); core.moveTo(-14, -48); core.quadraticCurveTo(0, -52, 14, -48); core.quadraticCurveTo(10, 10, 0, 56); core.quadraticCurveTo(-10, 10, -14, -48); core.closePath();
      c.fillStyle = '#FFBE73'; c.fill(core);
    } },
  { id: 'lettuce', name: 'Lettuce', fruit: false, star: 'leaf',
    fact: 'No seeds here. <b>Lettuce</b> is a bunch of <b>leaves</b>, so it is a vegetable.',
    whole(c) {
      blob(c, [circle(-30, 8, 32), circle(30, 8, 32), circle(0, -20, 34), circle(-18, -10, 30), circle(18, -10, 30), circle(0, 20, 36)], '#7CC95A', C.leafDeep);
      c.fillStyle = '#B5E38F'; c.beginPath(); c.arc(0, 0, 24, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(47,125,62,.55)'; c.lineWidth = 2; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); c.lineTo(Math.cos(a) * 52, Math.sin(a) * 50); c.stroke(); }
    },
    face(c) { // a slice across the head: layer after layer of leaves
      blob(c, [circle(-24, 4, 34), circle(24, 4, 34), circle(0, -18, 34), circle(0, 22, 32)], '#3E8E41', C.leafDeep);
      for (const [r, col] of [[42, '#8CCB6A'], [33, '#B5E38F'], [24, '#D7F0B4'], [13, '#EDF8D9']]) {
        c.fillStyle = col; c.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, rr = r + Math.sin(i * 2.7) * 3; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .92); } c.fill();
      }
    } },
  { id: 'broccoli', name: 'Broccoli', fruit: false, star: 'flower',
    fact: 'Surprise! <b>Broccoli</b> is a bunch of tiny <b>flower buds</b>. They have no seeds yet, so it is a vegetable.',
    whole(c) {
      const st = new Path2D(); st.moveTo(-14, -6); st.lineTo(14, -6); st.lineTo(10, 66); st.quadraticCurveTo(0, 72, -10, 66); st.closePath();
      c.fillStyle = '#A8C97A'; c.fill(st); c.strokeStyle = '#4E7A2C'; c.lineWidth = 3; c.stroke(st);
      blob(c, [circle(-34, -14, 26), circle(34, -14, 26), circle(0, -36, 30), circle(-16, -22, 26), circle(16, -22, 26), circle(0, -6, 22)], '#3E8E41', '#1F4A24');
      c.fillStyle = '#2F7034'; const r = seeded(9); for (let i = 0; i < 40; i++) { const a = r() * TAU, d = r() * 46; c.beginPath(); c.arc(Math.cos(a) * d, -22 + Math.sin(a) * d * .6, 2.6, 0, TAU); c.fill(); }
    },
    face(c) {
      const st = new Path2D(); st.moveTo(-12, 0); st.lineTo(12, 0); st.lineTo(9, 64); st.quadraticCurveTo(0, 70, -9, 64); st.closePath();
      c.fillStyle = '#D3E8AE'; c.fill(st); c.strokeStyle = '#4E7A2C'; c.lineWidth = 3; c.stroke(st);
      c.strokeStyle = '#B8D48C'; c.lineWidth = 5; c.lineCap = 'round'; for (const [x, y] of [[-30, -16], [30, -16], [0, -34], [-14, -24], [14, -24]]) { c.beginPath(); c.moveTo(0, 6); c.lineTo(x * .8, y + 10); c.stroke(); }
      blob(c, [circle(-34, -14, 22), circle(34, -14, 22), circle(0, -36, 24), circle(-16, -24, 20), circle(16, -24, 20)], '#5DA24E', '#1F4A24');
      c.fillStyle = '#2F7034'; const r = seeded(13); for (let i = 0; i < 46; i++) { const a = r() * TAU, d = r() * 38; c.beginPath(); c.arc(Math.cos(a) * d, -24 + Math.sin(a) * d * .55, 2.2, 0, TAU); c.fill(); }
    } }
];

const A_produce = {
  id: 'produce', name: 'Produce Lab', icon: 'produce',
  badge: { id: 'b.produce', name: 'Fruit Finder', desc: 'You cut open produce and sorted the fruits from the vegetables!', how: 'Not yet! Cut open the produce and sort it in <b>Produce Lab</b>.', reward: 'pumpkins' },
  stars: [{ id: 'produce.fruit', name: 'Seeds mean fruit' }, { id: 'produce.outside', name: 'Seeds outside' }, { id: 'produce.root', name: 'Root' },
    { id: 'produce.stem', name: 'Stalk' }, { id: 'produce.leaf', name: 'Leaves' }, { id: 'produce.flower', name: 'Flower buds' }],
  intro: 'Your class cut open <b>produce</b>, which means fruits and vegetables, to look for seeds. Let\'s try it! <b>Tap a food</b> in the basket to put it on the cutting board.',
  facts: ['Did you know? A tomato is a fruit, because it has seeds inside!', 'Did you know? When you eat a carrot, you are eating a root!'],
  mount(host, ui) {
    const st = new Stage(host, 'A kitchen counter with a basket of produce, a cutting board, and two crates labeled Fruit and Vegetable. Cut each food open, look for seeds, and sort it.');
    const BOARD = [420, 410], SLOTS = [[40, 372], [88, 366], [136, 364], [184, 366], [232, 372], [44, 422], [90, 418], [136, 416], [182, 418], [228, 422]];
    const BINS = { fruit: { x: 592, y: 268, w: 190, h: 120, label: 'Fruit', fill: '#FFD7DF', crate: '#E48A9E' }, veg: { x: 592, y: 418, w: 190, h: 120, label: 'Vegetable', fill: '#DDF0D2', crate: '#8CC063' } };
    const byId = id => PRODUCE.find(p => p.id === id);
    let s;
    // where each food sits is shuffled, so the rows never give the answer away
    function reset() { s = { basket: PRODUCE.map(p => p.id), slots: Object.fromEntries(shuffle(PRODUCE.map(p => p.id)).map((id, i) => [id, SLOTS[i]])), board: null, bins: { fruit: [], veg: [] }, knife: null, cuts: 0, lastAct: Loop.t, told: {} }; }
    const binAt = (x, y) => Object.keys(BINS).find(k => { const b = BINS[k]; return x > b.x - 10 && x < b.x + b.w + 10 && y > b.y - 34 && y < b.y + b.h + 10; });
    const onBoardItem = (x, y) => dist(x, y, ...BOARD) < 95;
    const onBoard = (x, y) => Math.abs(x - BOARD[0]) < 150 && Math.abs(y - BOARD[1]) < 100; // a swipe can start anywhere on the board
    function pick(id) {
      s.basket = s.basket.filter(x => x !== id);
      s.board = { id, from: s.slots[id], t0: st.t, cut: false, off: [0, 0], fly: null };
      Sound.hop(); Sound.tap(2);
      if (!s.told.swipe) { s.told.swipe = true; ui.say('<b>Swipe across it</b> to cut it open!'); }
    }
    function cut() {
      const b = s.board; b.cut = true; b.cutT = st.t; s.cuts++; Sound.crack(); Sound.squish();
      if (s.cuts <= 2) ui.say('Seeds or no seeds? Pick a bin!');
    }
    function sort(bin) {
      const b = s.board, item = byId(b.id);
      if ((bin === 'fruit') !== item.fruit) {
        Sound.oops(); b.off = [0, 0]; b.wobT = st.t;
        ui.say(item.id === 'strawberry' ? 'Not quite. Hint: look at the outside too. What are those tiny dots?' : item.fruit ? 'Not quite. Hint: did you spot any seeds?' : 'Not quite. Hint: look again. Are there any seeds?');
        return;
      }
      b.fly = { bin, t0: st.t, from: [BOARD[0] + b.off[0], BOARD[1] + b.off[1]] }; Sound.pop(); Sound.sparkle(.1);
      ui.award('produce.' + item.star, ...st.client(BINS[bin].x + BINS[bin].w / 2, BINS[bin].y + 40)); // award first, then explain
      ui.say(item.fact);
    }
    st.onDown = (x, y) => {
      s.lastAct = st.t; const b = s.board;
      if (b && b.fly) return;
      if (b && b.cut) {
        const bin = binAt(x, y); if (bin) return sort(bin);
        if (onBoardItem(x - b.off[0], y - b.off[1])) { s.drag = { x0: x - b.off[0], y0: y - b.off[1] }; Sound.fwip(); return; }
      }
      if (b && !b.cut && onBoard(x, y)) { s.knife = { pts: [[x, y]] }; return; }
      const hit = s.basket.find(id => dist(x, y, ...s.slots[id]) < 28);
      if (hit) {
        if (!b) return pick(hit);
        Sound.boing(); return ui.say(b.cut ? 'Sort this one first!' : 'Cut this one first!');
      }
      if (binAt(x, y)) { Sound.tap(4); return; }
      Sound.tap(Math.floor(x / 80));
    };
    st.onMove = (x, y) => {
      const b = s.board;
      if (s.drag && b && b.cut && !b.fly) { b.off = [x - s.drag.x0, y - s.drag.y0]; return; }
      if (s.knife && b && !b.cut) {
        s.knife.pts.push([x, y]); if (s.knife.pts.length % 3 === 0) Sound.peel();
        const xs = s.knife.pts.filter(p => Math.abs(p[1] - BOARD[1]) < 80).map(p => p[0]);
        if (xs.length && Math.min(...xs) < BOARD[0] - 55 && Math.max(...xs) > BOARD[0] + 55) { s.knife = null; cut(); }
      }
    };
    st.onUp = (x, y) => {
      if (s.drag) { s.drag = null; const b = s.board; const bin = b && b.cut && !b.fly && binAt(x, y); if (bin) sort(bin); else if (b && !b.fly) b.off = [0, 0]; }
      s.knife = null;
    };

    function drawRoom(c, t) {
      const g = c.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#E4F1EC'); g.addColorStop(1, '#D3E8E1'); c.fillStyle = g; c.fillRect(0, 0, W, 250);
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 250); c.stroke(); } for (let y = 0; y < 250; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      // the class rule, on a poster
      c.save(); c.translate(26, 22); c.rotate(-.02); const pp = rrect(0, 0, 300, 196, 10); c.fillStyle = '#FFFDF5'; c.fill(pp); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(pp);
      label(c, "Seeds inside?", 150, 26, { size: 22, stroke: null });
      for (const [y, yes] of [[82, true], [150, false]]) {
        c.save(); c.translate(52, y); c.scale(.36, .36); (yes ? byId('tomato') : byId('carrot')).face(c); c.restore();
        label(c, yes ? 'YES' : 'NO', 108, y, { size: 20, color: yes ? '#B4500F' : C.leafDeep, stroke: null });
        arrow(c, 136, y, 176, y, yes ? C.petal : C.leaf);
        label(c, yes ? 'Fruit' : 'Vegetable', 238, y, { size: 22, stroke: null });
      }
      c.restore();
      // a shelf of seed jars
      c.fillStyle = '#C9955A'; c.fillRect(560, 168, 220, 12); c.strokeStyle = C.ink; c.lineWidth = 3; c.strokeRect(560, 168, 220, 12);
      for (const [x, col] of [[586, '#F6E3A1'], [646, '#E9D08E'], [706, '#D9B866'], [760, '#F2C9A0']]) {
        const jar = rrect(x - 20, 112, 40, 56, 8); c.fillStyle = 'rgba(221,243,247,.85)'; c.fill(jar);
        c.save(); c.clip(jar); const r = seeded(x); for (let i = 0; i < 22; i++) seedDot(c, x - 16 + r() * 32, 130 + r() * 36, r() * 3, .7, col); c.restore();
        c.stroke(jar); c.fillStyle = C.carrot; c.fillRect(x - 16, 104, 32, 10); c.strokeRect(x - 16, 104, 32, 10);
      }
      // counter
      const tg = c.createLinearGradient(0, 246, 0, H); tg.addColorStop(0, '#E7BE84'); tg.addColorStop(1, '#D3A566'); c.fillStyle = tg; c.fillRect(0, 246, W, H - 246);
      c.fillStyle = '#C9955A'; c.fillRect(0, 242, W, 10);
    }
    function drawBasket(c, t, hover) {
      // the back of the basket, behind the food
      c.save(); c.fillStyle = 'rgba(80,50,20,.18)'; c.beginPath(); c.ellipse(136, 530, 128, 14, 0, 0, TAU); c.fill();
      const back = new Path2D(); back.moveTo(12, 446); back.lineTo(22, 352); back.quadraticCurveTo(136, 338, 250, 352); back.lineTo(260, 446); back.closePath();
      c.fillStyle = '#B07A3E'; c.fill(back); c.save(); c.clip(back); c.strokeStyle = '#94632C'; c.lineWidth = 3; for (let y = 350; y < 450; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(300, y); c.stroke(); } c.restore();
      c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(back);
      c.restore();
      for (const id of s.basket) {
        const [x, y] = s.slots[id]; c.save(); c.translate(x, y); if (hover === id) { glowOn(c); c.translate(0, RM ? 0 : -Math.abs(Math.sin(t * 8)) * 4); }
        c.rotate(byId(id).tilt || 0); c.scale(.42, .42); byId(id).whole(c, t); c.restore();
      }
      // the front of the basket, woven, over the bottom of the food
      const front = new Path2D(); front.moveTo(8, 440); front.lineTo(264, 440); front.lineTo(248, 528); front.quadraticCurveTo(136, 540, 24, 528); front.closePath();
      c.fillStyle = '#D19A55'; c.fill(front); c.save(); c.clip(front); c.strokeStyle = '#A8732F'; c.lineWidth = 3;
      for (let y = 450; y < 540; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      for (let x = 14; x < 270; x += 18) { c.beginPath(); c.moveTo(x, 440); c.lineTo(x + 6, 540); c.stroke(); }
      c.restore(); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(front);
      c.lineWidth = 6; c.strokeStyle = '#8E5A26'; c.beginPath(); c.moveTo(10, 440); c.lineTo(262, 440); c.stroke();
    }
    function drawBin(c, k, hot) {
      const b = BINS[k]; c.save(); if (hot) glowOn(c);
      const body = rrect(b.x, b.y, b.w, b.h, 12); c.fillStyle = b.crate; c.fill(body); c.shadowBlur = 0; c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(body);
      c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(b.x + 8, b.y + 10, b.w - 16, 20);
      // what's been sorted, peeking out of the top
      s.bins[k].forEach((id, i) => { c.save(); c.translate(b.x + 30 + (i % 5) * 32, b.y + 22 + Math.floor(i / 5) * 12); c.scale(.26, .26); byId(id).whole(c, 0); c.restore(); });
      c.strokeStyle = 'rgba(36,54,40,.35)'; c.lineWidth = 3; for (const y of [b.y + 58, b.y + 88]) { c.beginPath(); c.moveTo(b.x + 6, y); c.lineTo(b.x + b.w - 6, y); c.stroke(); }
      c.restore();
      c.save(); c.font = `600 20px ${FONT}`; const w = c.measureText(b.label).width + 28; const pill = rrect(b.x + b.w / 2 - w / 2, b.y + 50, w, 34, 17);
      c.fillStyle = b.fill; c.fill(pill); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(pill); c.restore();
      label(c, b.label, b.x + b.w / 2, b.y + 68, { size: 20, stroke: null });
    }
    function drawKnife(c, x, y, rot) {
      c.save(); c.translate(x, y); c.rotate(rot); c.lineJoin = 'round';
      const blade = new Path2D(); blade.moveTo(0, -9); blade.lineTo(78, -6); blade.quadraticCurveTo(92, 2, 76, 8); blade.lineTo(0, 9); blade.closePath();
      c.fillStyle = '#DCE3E8'; c.fill(blade); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke(blade);
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(8, -4); c.lineTo(70, -2); c.stroke();
      const handle = rrect(-52, -8, 52, 16, 7); c.fillStyle = '#8A5A36'; c.fill(handle); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke(handle);
      c.fillStyle = '#E9D8C8'; for (const hx of [-40, -22]) { c.beginPath(); c.arc(hx, 0, 2.5, 0, TAU); c.fill(); }
      c.restore();
    }
    st.draw = (c, t, dt) => {
      drawRoom(c, t);
      const b = s.board;
      let hoverItem = null; if (st.p.inside && !s.drag && !s.knife) { hoverItem = s.basket.find(id => dist(st.p.x, st.p.y, ...s.slots[id]) < 28) || null; if (hoverItem) st.cursor = 'pointer'; }
      drawBasket(c, t, hoverItem);
      // cutting board
      c.save(); c.fillStyle = 'rgba(80,50,20,.18)'; c.beginPath(); c.ellipse(BOARD[0], 512, 150, 12, 0, 0, TAU); c.fill();
      const board = rrect(BOARD[0] - 148, BOARD[1] - 98, 296, 196, 26); c.fillStyle = '#F1D3A0'; c.fill(board); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(board);
      c.strokeStyle = 'rgba(160,110,60,.3)'; c.lineWidth = 2; for (const y of [-60, -10, 40]) { c.beginPath(); c.moveTo(BOARD[0] - 130, BOARD[1] + y); c.bezierCurveTo(BOARD[0] - 40, BOARD[1] + y + 6, BOARD[0] + 40, BOARD[1] + y - 6, BOARD[0] + 130, BOARD[1] + y + 3); c.stroke(); }
      c.fillStyle = '#E7BE84'; c.beginPath(); c.arc(BOARD[0] + 126, BOARD[1] - 76, 9, 0, TAU); c.fill(); c.stroke(); c.restore();
      const hotBin = b && b.cut && !b.fly && st.p.inside ? binAt(st.p.x, st.p.y) : null; if (hotBin) st.cursor = 'pointer';
      drawBin(c, 'fruit', hotBin === 'fruit' || (s.drag && binAt(st.p.x, st.p.y) === 'fruit')); drawBin(c, 'veg', hotBin === 'veg' || (s.drag && binAt(st.p.x, st.p.y) === 'veg'));
      // the food on the board: hopping in, whole, then two halves
      if (b) {
        const item = byId(b.id);
        if (!b.cut) {
          const k = easeOut(clamp((st.t - b.t0) / .45, 0, 1)), x = lerp(b.from[0], BOARD[0], k), y = lerp(b.from[1], BOARD[1], k) - Math.sin(k * PI) * 90;
          c.save(); c.translate(x, y); c.scale(lerp(.34, .95, k), lerp(.34, .95, k)); item.whole(c, t); c.restore();
          if (st.p.inside && onBoard(st.p.x, st.p.y) && k >= 1) st.cursor = 'crosshair';
        } else {
          let ox = b.off[0], oy = b.off[1], sc = .7, gap = lerp(0, 80, easeOut(clamp((st.t - b.cutT) / .35, 0, 1)));
          if (b.fly) {
            const k = ease(clamp((st.t - b.fly.t0) / .5, 0, 1)), bn = BINS[b.fly.bin], tx = bn.x + bn.w / 2 - BOARD[0], ty = bn.y + 30 - BOARD[1];
            ox = lerp(b.fly.from[0] - BOARD[0], tx, k); oy = lerp(b.fly.from[1] - BOARD[1], ty, k) - Math.sin(k * PI) * 60; sc = lerp(.7, .25, k); gap *= 1 - k;
            if (k >= 1) { s.bins[b.fly.bin].push(b.id); s.board = null; if (!s.basket.length) ui.say('You sorted the whole basket! Seeds mean fruit, inside or outside. Roots, stalks, leaves and flower buds are vegetables.', { queue: true }); }
          }
          const wob = b.wobT && st.t - b.wobT < .5 && !RM ? Math.sin((st.t - b.wobT) * 40) * 6 : 0;
          if (s.board) for (const sd of [-1, 1]) { c.save(); c.translate(BOARD[0] + ox + sd * gap + wob, BOARD[1] + oy); c.scale(sd * sc, sc); item.face(c); c.restore(); }
        }
      }
      // the knife: resting by the board, or in your hand while you cut
      if (s.knife && st.p.down) { const P = s.knife.pts, a = P.length > 1 ? Math.atan2(P[P.length - 1][1] - P[Math.max(0, P.length - 4)][1], P[P.length - 1][0] - P[Math.max(0, P.length - 4)][0]) : 0; drawKnife(c, st.p.x - 40, st.p.y - 4, clamp(a, -.6, .6)); st.cursor = 'none'; }
      else drawKnife(c, BOARD[0] - 20, BOARD[1] - 118, -.05);
      // hints when nothing's happening
      const idle = st.t - s.lastAct > 5;
      if (!b && s.basket.length && idle) label(c, "Tap a food!", 136, 318 - (RM ? 0 : Math.abs(Math.sin(t * 5)) * 6), { size: 24, color: C.carrot });
      if (b && !b.cut && st.t - b.t0 > 1.2) { const o = RM ? 0 : (t * 60) % 40; c.save(); c.setLineDash([12, 10]); c.lineDashOffset = -o; c.strokeStyle = C.carrot; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(BOARD[0] - 120, BOARD[1] + 70); c.lineTo(BOARD[0] + 120, BOARD[1] + 70); c.stroke(); c.restore(); label(c, "Swipe to cut!", BOARD[0], BOARD[1] + 96, { size: 20, color: C.carrot }); }
      if (b && b.cut && !b.fly && idle) label(c, "Pick a bin!", 687, 250 - (RM ? 0 : Math.abs(Math.sin(t * 5)) * 6), { size: 22, color: C.carrot });
    };
    ui.button('Get a new basket', () => { reset(); Sound.pop(); ui.say(A_produce.intro); });
    ui.hint("At home, ask a grown-up to help you cut open a pepper or an apple. Count the seeds!");
    reset();
    return { stage: st, state: () => s, geo: { board: BOARD, bins: Object.fromEntries(Object.entries(BINS).map(([k, b]) => [k, [b.x + b.w / 2, b.y + b.h / 2]])), slot: id => s.slots[id] }, destroy() { st.destroy(); } };
  }
};
