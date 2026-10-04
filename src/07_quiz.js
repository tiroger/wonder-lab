/* ============ Activity: Plant Quiz ============ */
const QUIZ = [
  { id: 'q1', name: 'Roots', pic: 'roots', q: 'What is this part of the plant called?', a: ['Roots', 'Stem', 'Leaves'], hint: 'It hides under the ground and drinks water.', why: 'Roots hold the plant in the soil and drink water.' },
  { id: 'q2', name: 'Leaves', pic: 'leaves', q: 'This part makes food from sunlight. What is it?', a: ['Leaves', 'Roots', 'Seed coat'], hint: 'They are green and flat, and catch lots of sunlight.', why: 'Leaves are the plant\'s food factories.' },
  { id: 'q3', name: 'Embryo', q: 'Which part of a seed is the baby plant?', a: ['Embryo', 'Seed coat', 'Cotyledon'], hint: 'It has a tiny root and tiny leaves.', why: 'The embryo is the baby plant inside the seed.' },
  { id: 'q4', name: 'Cotyledon', pic: 'cot', q: 'This big part of a bean seed stores food. What is it called?', a: ['Cotyledon', 'Stigma', 'Stem'], hint: 'It\'s the baby plant\'s packed lunch.', why: 'Cotyledons are packed with food for the baby plant.' },
  { id: 'q5', name: 'Seed coat', q: 'What does the seed coat do?', a: ['Protects the seed', 'Makes pollen', 'Drinks water from the soil'], hint: 'Think of a jacket.', why: 'The seed coat is a tough jacket that protects the seed.' },
  { id: 'q6', name: 'Germination', q: 'When a seed wakes up and starts to grow, it is called…', a: ['Germination', 'Pollination', 'Hibernation'], hint: 'It sounds a little like "germ".', why: 'Germination is when a seed sprouts.' },
  { id: 'q7', name: 'Stamen', q: 'Which flower part makes the yellow pollen?', a: ['Stamen', 'Pistil', 'Sepal'], hint: 'Its top part is called the anther.', why: 'The stamen\'s anther is covered in pollen.' },
  { id: 'q8', name: 'Stigma', q: 'The sticky top of the pistil that catches pollen is the…', a: ['Stigma', 'Petal', 'Root'], hint: 'It starts with "st", like sticky!', why: 'The sticky stigma catches pollen.' },
  { id: 'q9', name: 'Sepals', q: 'What do the green sepals do?', a: ['Protect the flower bud', 'Make seeds', 'Carry water up the plant'], hint: 'They wrap around the flower before it opens.', why: 'Sepals protect the flower when it\'s a bud.' },
  { id: 'q10', name: 'Fruit', q: 'After pollination, the flower\'s ovary grows into a…', a: ['Fruit', 'Leaf', 'Root'], hint: 'Apples, beans and tomatoes are all this!', why: 'The ovary becomes the fruit that holds the seeds.' },
  { id: 'q11', name: 'Seed travel', q: 'How do dandelion seeds travel?', a: ['They float on the wind', 'They float on the ocean', 'They stick to fur'], hint: 'Their fluffy tops are like parachutes.', why: 'Their fluffy parachutes ride the wind.' },
  { id: 'q13', name: 'Fruit or vegetable', q: 'You cut open a cucumber and find seeds. It is a…', a: ['Fruit', 'Vegetable', 'Root'], hint: 'Seeds grow inside fruits.', why: 'Seeds inside means it is a fruit.' },
  { id: 'q14', name: 'Root vegetables', q: 'Which part of the plant is a carrot?', a: ['Root', 'Stem', 'Flower'], hint: 'It grows under the ground.', why: 'A carrot is a root that grows under the ground.' },
  { id: 'q15', name: 'Flower buds', q: 'Broccoli is made of tiny…', a: ['Flower buds', 'Seeds', 'Roots'], hint: 'If they opened up, they would be flowers!', why: 'Broccoli is a bunch of tiny flower buds.' },
  { id: 'q12', name: 'Photosynthesis', q: 'Leaves use sunlight, air and water to make food. This is called…', a: ['Photosynthesis', 'Pollination', 'Germination'], hint: '"Photo" means light!', why: 'Photo means light, synthesis means making. Making food with light!' }
];
function drawQuizPic(cv, pic) {
  const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  if (pic === 'cot') {
    c.setTransform(cv.width / 400, 0, 0, cv.width / 400, 0, 0); c.fillStyle = '#FFF4D6'; c.fillRect(0, 0, 400, 400);
    drawBeanHalf(c, 200, 230, 1.25, {}); arrow(c, 330, 70, 262, 175); return;
  }
  const k = cv.width / 400 * .78; c.setTransform(k, 0, 0, k, cv.width / 2 - 400 * k, cv.height / 2 - 330 * k);
  sky(c); ground(c, 390, 0); const P = drawPlant(c, 0, {});
  if (pic === 'roots') arrow(c, 610, 545, 478, 468);
  if (pic === 'leaves') { const lc = P.leafCenters[1]; arrow(c, 600, 170, lc[0] + 22, lc[1] - 10); }
}
const A_quiz = {
  id: 'quiz', name: 'Plant Quiz', icon: 'quiz', html: true, badgeNeed: 10,
  badge: { id: 'b.quiz', name: 'Quiz Champ', desc: 'You earned 10 quiz stars. You really know your plants!', how: 'Not yet! Earn 10 stars in the <b>Plant Quiz</b>. You get a star when you answer right on the first try.' },
  stars: QUIZ.map(q => ({ id: 'quiz.' + q.id, name: q.name })),
  intro: 'Ready for a challenge? Get it right on the <b>first try</b> to earn a star. Collect 10 quiz stars for the Quiz Champ badge!',
  mount(host, ui) {
    const box = document.createElement('div'); box.className = 'quiz-box'; host.appendChild(box);
    let round, idx, results, tries;
    function newRound(lead) {
      const unseen = shuffle(QUIZ.filter(q => !Store.data.stars['quiz.' + q.id]));
      const seen = shuffle(QUIZ.filter(q => Store.data.stars['quiz.' + q.id]));
      round = shuffle(unseen.concat(seen).slice(0, 8)); idx = 0; results = []; show(lead);
    }
    // lead: the tab's intro, said together with the first question so neither cuts the other off
    function show(lead) {
      const q = round[idx]; tries = 0; box.innerHTML = '';
      const meta = document.createElement('div'); meta.className = 'q-meta';
      meta.innerHTML = `<span>Question ${idx + 1} of ${round.length}</span><span class="q-dots">${round.map((_, i) => `<i class="${results[i] === 1 ? 'ok' : results[i] === 0 ? 'meh' : ''} ${i === idx ? 'now' : ''}"></i>`).join('')}</span>`;
      const body = document.createElement('div'); body.className = 'q-body';
      if (q.pic) { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 400; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Picture with an arrow pointing to a part'); body.appendChild(cv); requestAnimationFrame(() => drawQuizPic(cv, q.pic)); }
      const h = document.createElement('p'); h.className = 'q-text'; h.textContent = q.q; body.appendChild(h);
      const ch = document.createElement('div'); ch.className = 'choices';
      shuffle(q.a).forEach((txt, i) => {
        const b = document.createElement('button'); b.className = 'choice'; b.textContent = txt;
        b.onclick = () => answer(b, txt === q.a[0], q); b.onmouseenter = () => Sound.tap(i + 2); ch.appendChild(b);
      });
      const foot = document.createElement('div'); foot.className = 'q-foot';
      box.append(meta, body, ch, foot); ui.say((lead ? lead + ' ' : '') + q.q, { lock: true });
    }
    function answer(btn, right, q) {
      if (btn.disabled) return;
      if (inputLocked()) { const r = btn.getBoundingClientRect(); return nudge(r.left + r.width / 2, r.top + 10); }
      tries++;
      const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (right) {
        btn.classList.add('right'); box.querySelectorAll('.choice').forEach(b => b.disabled = true);
        results[idx] = tries === 1 ? 1 : 0; confetti(cx, cy, 30, .6);
        if (tries === 1) { if (!ui.award('quiz.' + q.id, cx, cy)) Sound.star(); ui.say(`Yes! ${q.why}`, { lock: true }); }
        else { Sound.boing(); ui.say(`You got it! ${q.why}`, { lock: true }); }
        const nb = document.createElement('button'); nb.className = 'btn go'; nb.textContent = idx < round.length - 1 ? 'Next question' : 'See my score';
        nb.onclick = () => { if (inputLocked()) { const r = nb.getBoundingClientRect(); return nudge(r.left + r.width / 2, r.top + 10); } Sound.pop(); idx++; idx < round.length ? show() : end(); }; box.querySelector('.q-foot').appendChild(nb); nb.focus();
      } else { btn.classList.add('wrong'); btn.disabled = true; Sound.oops(); ui.say(`Not quite. Hint: ${q.hint}`, { lock: true }); }
    }
    function end() {
      const n = results.filter(x => x === 1).length; box.innerHTML = '';
      const e = document.createElement('div'); e.className = 'q-end';
      e.innerHTML = `<h3>${n === round.length ? 'Perfect round!' : n >= 5 ? 'Great job!' : 'Nice try!'}</h3><div class="stars">${round.map((_, i) => STAR_SVG(results[i] === 1)).join('')}</div><p>You got <b>${n} of ${round.length}</b> right on the first try.</p>`;
      const b = document.createElement('button'); b.className = 'btn go'; b.textContent = 'Play again'; b.onclick = () => { Sound.pop(); newRound(); }; e.appendChild(b);
      box.appendChild(e); Sound.badge(); const r = box.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + 80, 70);
      ui.say(n >= 6 ? 'Wow, you\'re a plant expert! Play again to collect more stars.' : 'Every scientist learns by trying. Play again and see how many you can get!');
    }
    ui.button('New round', () => { Sound.pop(); newRound(); });
    ui.hint('Stars only count on the first try, so take your time and think!');
    newRound(ui.intro);
    return { destroy() { box.remove(); } };
  }
};

/* ============ little icons for tabs and badges (drawn in a 100x100 box) ============ */
const ICONS = {
  plant(c, t = 0) { c.fillStyle = C.soil; c.beginPath(); c.ellipse(50, 90, 30, 8, 0, 0, TAU); c.fill(); c.strokeStyle = C.leafDeep; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(50, 88); c.quadraticCurveTo(45, 62, 50, 38); c.stroke(); drawLeaf(c, 48, 70, -155, .33); drawLeaf(c, 49, 56, -25, .33); drawFlowerHead(c, 50, 30, .42, 0); },
  seed(c) { drawBeanHalf(c, 50, 50, .34, {}); },
  flower(c) { c.strokeStyle = C.leafDeep; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(50, 95); c.lineTo(50, 55); c.stroke(); drawLeaf(c, 50, 80, -30, .3); drawFlowerHead(c, 50, 42, .6, 0); },
  grow(c, t = 0) { c.fillStyle = C.soilLight; c.beginPath(); c.ellipse(50, 92, 44, 16, 0, PI, TAU); c.fill(); const sw = RM ? 0 : Math.sin(t * 2) * 3; c.strokeStyle = C.leafDeep; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(50, 80); c.quadraticCurveTo(48, 62, 50 + sw, 46); c.stroke(); drawLeaf(c, 50 + sw, 46, -160 + sw * 3, .34); drawLeaf(c, 50 + sw, 46, -20 + sw * 3, .34); c.fillStyle = C.water; c.beginPath(); c.moveTo(82, 12); c.quadraticCurveTo(94, 30, 82, 34); c.quadraticCurveTo(70, 30, 82, 12); c.fill(); },
  travel(c) { c.strokeStyle = C.leafDeep; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(40, 96); c.quadraticCurveTo(36, 70, 40, 46); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2.5; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; c.beginPath(); c.moveTo(40, 40); c.lineTo(40 + Math.cos(a) * 22, 40 + Math.sin(a) * 22); c.stroke(); } c.strokeStyle = '#B8B8A8'; c.lineWidth = 1.5; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; c.beginPath(); c.arc(40 + Math.cos(a) * 22, 40 + Math.sin(a) * 22, 2.5, 0, TAU); c.stroke(); } c.strokeStyle = '#8A7250'; c.lineWidth = 2; c.beginPath(); c.moveTo(80, 30); c.lineTo(80, 16); c.stroke(); c.strokeStyle = '#B8B8A8'; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(80, 16); c.lineTo(80 + Math.sin(k * .4) * 10, 16 - Math.cos(k * .4) * 9); c.stroke(); } },
  quiz(c) { c.save(); c.translate(50, 52); c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 19 : 42, a = -PI / 2 + i * PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = C.sun; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke(); c.restore(); label(c, '?', 50, 56, { size: 36, weight: 700, stroke: null }); },
  // the Wonder Lab logo: a flask with bubbles rising through blue liquid
  flask(c, t = 0) {
    const P = new Path2D('M42 8 V36 L18 78 A9 9 0 0 0 26 92 H74 A9 9 0 0 0 82 78 L58 36 V8 Z');
    c.fillStyle = '#FFFDF5'; c.fill(P);
    c.save(); c.clip(P); c.fillStyle = C.sky; c.fillRect(0, 60 + (RM ? 0 : Math.sin(t * 2) * 1.5), 100, 40);
    for (let i = 0; i < 4; i++) { const k = RM ? i / 4 : (t * .3 + i / 4) % 1; c.fillStyle = i % 2 ? C.sun : C.petal; c.strokeStyle = C.ink; c.lineWidth = 2.5; c.beginPath(); c.arc(50 + Math.sin(k * 9 + i * 2) * 8, 88 - k * 76, 3 + (i % 2) * 1.5, 0, TAU); c.fill(); c.stroke(); }
    c.restore();
    c.strokeStyle = C.ink; c.lineWidth = 5; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(P); c.beginPath(); c.moveTo(35, 8); c.lineTo(65, 8); c.stroke();
  },
  // a tomato cut in half: seeds inside
  produce(c) { c.save(); c.translate(50, 52); c.scale(.62, .62); PRODUCE[0].face(c); c.restore(); },
  trophy(c) { c.fillStyle = C.sun; c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(26, 16); c.lineTo(74, 16); c.quadraticCurveTo(74, 62, 50, 64); c.quadraticCurveTo(26, 62, 26, 16); c.fill(); c.stroke(); c.beginPath(); c.arc(22, 32, 11, PI * .5, PI * 1.5); c.moveTo(78, 21); c.arc(78, 32, 11, -PI * .5, PI * .5); c.stroke(); c.fillRect(44, 64, 12, 14); c.strokeRect(44, 64, 12, 14); c.fillStyle = C.soil; c.fillRect(32, 78, 36, 12); c.strokeRect(32, 78, 36, 12); drawLeaf(c, 50, 44, -120, .22); drawLeaf(c, 50, 44, -60, .22); }
};
function drawIcon(cv, name, t = 0) { const c = cv.getContext('2d'); c.setTransform(cv.width / 100, 0, 0, cv.width / 100, 0, 0); c.clearRect(0, 0, 100, 100); ICONS[name](c, t); }
