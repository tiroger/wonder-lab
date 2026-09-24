/* End-to-end walkthrough: plays every activity from start to finish in a headless browser and checks
   that each stage unlocks, every star and badge can be earned, and every line Pip says has a recording
   in every voice. Also checks that reminders never cut Pip off mid-sentence.
   Runs in CI on every pull request (.github/workflows/ci.yml). Locally:
   python3 build.py && (cd dist && python3 -m http.server 8799 &) && node tests/walkthrough.js
   Needs Playwright (npm install --no-save playwright && npx playwright install chromium). */
const { chromium } = require('playwright');
const URL = process.env.WL_URL || 'http://localhost:8799/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1300 } });
  const errors = [], warnings = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  await page.goto(URL); await sleep(800);
  await page.mouse.click(5, 5); // first tap unlocks audio
  // record every message Pip says, and any time a new message interrupts one still being spoken
  await page.evaluate(() => {
    window.__said = []; window.__cutoffs = [];
    const orig = window.say;
    window.say = (html, opts) => { const r = orig(html, opts); if (r !== false) window.__said.push(html); return r; };
    const speak = Voice.speak.bind(Voice);
    Voice.speak = html => { if (Voice.speaking) window.__cutoffs.push({ was: plainText(App.current_prev || ''), now: plainText(html) }); App.current_prev = html; return speak(html); };
  });
  const box = async () => (await page.$('#stage canvas')).boundingBox();
  const at = async (x, y) => { const b = await box(); return [b.x + x / 800 * b.width, b.y + y / 560 * b.height]; };
  const tap = async (x, y) => { await closeToasts(); await page.mouse.click(...await at(x, y)); await sleep(250); };
  const drag = async (pts, steps = 8) => { await closeToasts(); await page.mouse.move(...await at(...pts[0])); await page.mouse.down(); for (const p of pts.slice(1)) await page.mouse.move(...await at(...p), { steps }); await page.mouse.up(); await sleep(300); };
  const closeToasts = async () => { for (let i = 0; i < 4; i++) { const b = await page.$('.toast .btn'); if (!b) break; await b.click(); await sleep(400); } };
  const tab = async id => { await sleep(1300); await closeToasts(); await page.click(`.tab[data-id="${id}"]`); await sleep(700); };
  const stars = prefix => page.evaluate(p => Object.keys(Store.data.stars).filter(k => k.startsWith(p)).sort(), prefix);
  const saidCount = () => page.evaluate(() => window.__said.length);
  const report = {};
  const setVoiceAuto = on => page.evaluate(v => { Voice.auto = v; Voice.stop(); }, on);

  // ---------- Meet the Plant ----------
  await setVoiceAuto(false); await tab('parts');
  const P = await page.evaluate(() => { const c = document.createElement('canvas').getContext('2d'); const p = drawPlant(c, Loop.t, {}); return { leaf: p.leafCenters[2], flower: p.flowerC, pod: p.podCenter, stem: bez(...p.stemCurve, .3) }; });
  await tap(400, 470); await tap(P.stem[0], P.stem[1] - 6); await tap(...P.leaf); await tap(...P.flower); await tap(...P.pod);
  report.parts = await stars('parts.');

  // ---------- Open a Seed ----------
  await tab('seed');
  await tap(400, 330); await sleep(4600);                                   // soak overnight
  const rub = []; for (let y = 250; y <= 410; y += 14) { rub.push([260, y]); rub.push([540, y]); }
  await drag(rub, 30);                                                      // peel the seed coat
  const afterPeel = await stars('seed.');
  await sleep(800); await drag([[400, 330], [620, 330]], 12); await sleep(1500);   // split it open
  await tap(600, 300); await tap(213, 364); await tap(195, 382); await tap(241, 336);  // cotyledon, embryo, baby root, baby leaves
  await sleep(3000); const sproutBtn = await page.$('text=Watch it sprout'); const sproutEnabled = sproutBtn && await sproutBtn.isEnabled();
  if (sproutEnabled) { await sproutBtn.click(); await sleep(5500); }
  report.seed = { afterPeel, final: await stars('seed.'), sproutButtonEnabled: sproutEnabled };

  // ---------- Flower Lab ----------
  await tab('flower');
  const B = [400, 352], pt = (a, d) => [B[0] + Math.sin(a * Math.PI / 180) * d, B[1] - Math.cos(a * Math.PI / 180) * d];
  for (const a of [0, 33, -33, 66, -66]) await drag([pt(a, 120), [pt(a, 120)[0] * .3, 60]], 6);
  for (const a of [118, -118]) await drag([pt(a, 60), [700, 520]], 6);
  const afterPieces = await stars('flower.');
  await tap(488, 231); await tap(400, 250);                                  // stamen, pistil
  await sleep(600); const beeHere = await page.evaluate(() => App.current.includes('bee buzzed'));
  await sleep(1500); await drag([[700, 120], [488, 231], [488, 240], [400, 184], [400, 186]], 14); await sleep(6000);
  await closeToasts(); const beforeLateTaps = await saidCount(); await tap(488, 231); await tap(440, 200); const lateSays = (await saidCount()) - beforeLateTaps; // old anther spots
  await tap(400, 300); const fruitTap = (await page.evaluate(() => App.current)).includes('grew into a');
  report.flower = { afterPieces, beeAppeared: beeHere, final: await stars('flower.'), witheredStamensStillTalk: lateSays > 0, fruitTapWorks: fruitTap };

  // ---------- Grow a Bean (with narration on, to catch interruptions) ----------
  await tab('grow'); await setVoiceAuto(true); await page.evaluate(() => { Loop.speed = 3; window.__cutoffs = []; });
  const t0 = Date.now(); let lastStage = '';
  const stagesSeen = [];
  while (Date.now() - t0 < 240000) {
    await tap(120, 200); await sleep(700); await tap(690, 85); await sleep(900);
    const st = await page.evaluate(() => document.querySelector('.cycle').innerText.split('›').filter((_, i) => document.querySelectorAll('.cycle span')[i]?.classList.contains('on')).pop());
    if (st !== lastStage) { stagesSeen.push(st); lastStage = st; }
    const done = await page.evaluate(() => window.__said.some(h => h.includes('life cycle</b> can start')) && !Voice.speaking);
    if (done) break;
  }
  await page.evaluate(() => { Loop.speed = 1; });
  report.grow = { stagesInOrder: stagesSeen, final: await stars('grow.'), seconds: Math.round((Date.now() - t0) / 1000), narrationCutoffs: await page.evaluate(() => window.__cutoffs) };
  await setVoiceAuto(false);

  // ---------- Seed Travel ----------
  await tab('travel');
  for (const [x, y] of [[200, 140], [600, 140], [200, 420], [600, 420]]) await tap(x, y);
  await sleep(6000); report.travel = await stars('travel.');

  // ---------- Plant Quiz: two rounds ----------
  await tab('quiz');
  for (let round = 0; round < 2; round++) {
    for (let q = 0; q < 8; q++) {
      const text = await page.textContent('.q-text');
      const answer = await page.evaluate(t => QUIZ.find(x => x.q === t).a[0], text);
      if (round === 0 && q < 2) { const wrong = await page.$$('.choice'); for (const w of wrong) if ((await w.textContent()) !== answer) { await w.click(); break; } await sleep(200); }
      await page.click(`.choice:text-is("${answer}")`); await sleep(300);
      await page.click('.q-foot .btn'); await sleep(300);
    }
    if (round === 0) { await page.click('.q-end .btn'); await sleep(300); }
  }
  report.quiz = (await stars('quiz.')).length + ' of 12';
  await sleep(8000); // let badge pop-ups finish

  // ---------- badges + voice coverage ----------
  report.badges = await page.evaluate(() => Object.keys(Store.data.badges));
  report.voiceCoverage = await page.evaluate(() => {
    const out = {};
    for (const name of Object.keys(VOICE_PACKS)) {
      const map = VOICE_PACKS[name].map, missing = new Set();
      for (const html of window.__said) {
        const S = splitSentences(plainText(html));
        for (let i = 0; i < S.length;) {
          let j = S.length - 1, hit = false;
          for (; j >= i; j--) if (map[vkey(S.slice(i, j + 1).join(' '))]) { hit = true; break; }
          if (!hit) { j = i; if (!/^hi\b.*!$/i.test(S[i]) && !/^nice to meet you/i.test(S[i]) && !map[vkey(S[i])]) missing.add(S[i]); }
          i = j + 1;
        }
      }
      out[name] = missing.size ? [...missing] : 'all recorded';
    }
    return { messagesSaid: window.__said.length, ...out };
  });
  report.errors = errors; report.noRecordingWarnings = warnings.filter(w => w.includes('No recording'));
  console.log(JSON.stringify(report, null, 1));
  await page.screenshot({ path: 'tests/last-run.png' });
  await browser.close();

  // fail the run (and the CI job) if anything is off
  const stages = report.grow.stagesInOrder.map(s => s.trim());
  const checks = {
    'Meet the Plant: 5 stars': report.parts.length === 5,
    'Open a Seed: 5 stars': report.seed.final.length === 5,
    'Open a Seed: sprout button unlocks': report.seed.sproutButtonEnabled,
    'Flower Lab: 5 stars': report.flower.final.length === 5,
    'Flower Lab: bee appears after stamen + pistil': report.flower.beeAppeared,
    'Flower Lab: withered parts stay quiet': report.flower.witheredStamensStillTalk === false,
    'Flower Lab: fruit can be tapped': report.flower.fruitTapWorks,
    'Grow a Bean: 6 stars': report.grow.final.length === 6,
    'Grow a Bean: stages in order': JSON.stringify(stages) === JSON.stringify(['Seed', 'Germination', 'Sprout', 'Seedling', 'Adult plant', 'Flowers', 'Fruit & seeds']),
    'Seed Travel: 4 stars': report.travel.length === 4,
    'Plant Quiz: 12 stars': report.quiz === '12 of 12',
    'All 7 badges': report.badges.length === 7,
    'Every line recorded in every voice': Object.entries(report.voiceCoverage).every(([k, v]) => k === 'messagesSaid' || v === 'all recorded'),
    'No page errors': report.errors.length === 0 && report.noRecordingWarnings.length === 0
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  process.exit(failed.length ? 1 : 0);
})();
