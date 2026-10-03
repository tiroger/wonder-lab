/* End-to-end walkthrough: plays every activity from start to finish in a headless browser and checks
   that each stage unlocks, every star and badge can be earned, and every line Pip says has a recording
   in every voice. Also checks that reminders never cut Pip off mid-sentence.
   Runs in CI on every pull request (.github/workflows/ci.yml). Locally:
   python3 build.py && (cd dist && python3 -m http.server 8799 &) && node tests/walkthrough.js
   Needs Playwright (npm install --no-save playwright && npx playwright install chromium). */
const { chromium } = require('playwright');
const URL = process.env.WL_URL || 'http://localhost:8799/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const plainText0 = h => h.replace(/<[^>]+>/g, '').slice(0, 80);

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1300 } });
  const errors = [], warnings = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  await page.goto(URL); await sleep(800);
  // first visit: the page can't play sound until the first tap, which should then read Pip's opening line out loud
  await page.evaluate(() => { window.__firstClips = 0; const p = Voice.play.bind(Voice); Voice.play = (a, my) => { if (my === Voice.token) window.__firstClips++; return p(a, my); }; });
  await page.mouse.click(5, 5); // first tap unlocks audio
  const openingHeard = await page.waitForFunction(() => window.__firstClips > 0, null, { timeout: 8000 }).then(() => true, () => false);
  const firstVisit = { openingHeard, home: await page.evaluate(() => App.view), holds: await page.evaluate(() => Listen.on), line: await page.evaluate(() => plainText(App.current).slice(0, 80)) };
  // record every message Pip says, and any time a new message interrupts one still being spoken
  await page.evaluate(() => {
    window.__said = []; window.__cutoffs = [];
    const orig = window.say;
    window.__timeline = [];
    window.say = (html, opts) => { const before = { t: Loop.t, speaking: Voice.speaking, endT: Voice.endT || -99, html }; const r = orig(html, opts); if (r === true) { window.__said.push(html); window.__timeline.push(before); } return r; };
    Store.data.waitForPip = false; // most checks run with the listen lock off; it gets its own checks below
    window.__clips = 0; const play = Voice.play.bind(Voice); Voice.play = (a, my) => { if (my === Voice.token) window.__clips++; return play(a, my); };
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
  const report = { firstVisit };
  const setVoiceAuto = on => page.evaluate(v => { Voice.auto = v; Voice.stop(); }, on);

  // ---------- Meet the Plant ----------
  await setVoiceAuto(false); await page.evaluate(() => go('#/plants/seed')); await sleep(700); await tab('parts'); // into the topic, remounting so the recorder sees every line
  const P = await page.evaluate(() => { const c = document.createElement('canvas').getContext('2d'); const p = drawPlant(c, Loop.t, {}); return { leaf: p.leafCenters[2], flower: p.flowerC, pod: p.podCenter, stem: bez(...p.stemCurve, .3) }; });
  await tap(400, 470); await tap(P.stem[0], P.stem[1] - 6); await tap(...P.leaf); await tap(...P.flower); await tap(...P.pod);
  report.parts = await stars('parts.');
  // rapid taps: tapping the same part again and again, or several parts quickly, should start just one line
  await setVoiceAuto(true); await sleep(300);
  let c0 = await page.evaluate(() => window.__clips);
  for (let i = 0; i < 5; i++) { await page.mouse.click(...await at(400, 470)); await sleep(120); }
  await sleep(1500); const sameTapClips = (await page.evaluate(() => window.__clips)) - c0;
  await closeToasts(); await page.evaluate(() => { Voice.stop(); App.sayQ.length = 0; }); await sleep(300); c0 = await page.evaluate(() => window.__clips);
  for (const p of [[400, 470], [P.stem[0], P.stem[1] - 6], P.leaf]) { await page.mouse.click(...await at(...p)); await sleep(150); }
  await sleep(1500); const quickTapClips = (await page.evaluate(() => window.__clips)) - c0;
  const lastSaid = await page.evaluate(() => window.__said.filter(h => !h.includes('badge')).pop() || '');
  report.rapidTaps = { sameTapClips, quickTapClips, lastSaid: plainText0(lastSaid), newestWins: lastSaid.includes('food factories') };
  // listen first (voice on): a second tap while Pip explains is held with a nudge, and works once he's done
  await closeToasts(); await page.evaluate(() => { Store.data.waitForPip = true; App.sayQ.length = 0; }); await setVoiceAuto(true); await sleep(1500);
  await page.mouse.click(...await at(400, 470)); await sleep(700);
  const lockedNow = await page.evaluate(() => Listen.on);
  await page.mouse.click(...await at(P.stem[0], P.stem[1] - 6)); await sleep(250);
  const heldTap = await page.evaluate(() => ({ stillRoots: App.current.includes('Roots'), nudge: !!document.querySelector('.nudge-tip') }));
  const tw = Date.now(); while (await page.evaluate(() => Listen.on) && Date.now() - tw < 25000) await sleep(250);
  const unlockSecs = Math.round((Date.now() - tw) / 100) / 10;
  await page.mouse.click(...await at(P.stem[0], P.stem[1] - 6)); await sleep(400);
  report.listen = { lockedNow, heldTap, unlockSecs, stemAfter: await page.evaluate(() => App.current.includes('stem')) };
  await page.evaluate(() => { Store.data.waitForPip = false; });
  await setVoiceAuto(false);

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
  // with the voice off, queued lines wait until the last one could be read; let them finish so they aren't counted as late taps
  await page.waitForFunction(() => Store.data.stars['flower.pollen'] && !App.sayQ.length, null, { timeout: 45000 });
  await closeToasts(); const beforeLateTaps = await saidCount(); await tap(488, 231); await tap(440, 200); const lateSays = (await saidCount()) - beforeLateTaps; // old anther spots
  await tap(400, 300); const fruitTap = (await page.evaluate(() => App.current)).includes('grew into a');
  report.flower = { afterPieces, beeAppeared: beeHere, final: await stars('flower.'), witheredStamensStillTalk: lateSays > 0, fruitTapWorks: fruitTap };

  // ---------- Grow a Bean (with narration on, to catch interruptions) ----------
  await tab('grow'); await setVoiceAuto(true); await page.evaluate(() => { Loop.speed = 3; window.__cutoffs = []; window.__timeline = []; Store.data.waitForPip = true; });
  const t0 = Date.now(); let lastStage = '';
  const stagesSeen = [];
  while (Date.now() - t0 < 240000) {
    await tap(120, 200); await sleep(700); await tap(690, 85); await sleep(900);
    const st = await page.evaluate(() => document.querySelector('.cycle').innerText.split('›').filter((_, i) => document.querySelectorAll('.cycle span')[i]?.classList.contains('on')).pop());
    if (st !== lastStage) { stagesSeen.push(st); lastStage = st; }
    const done = await page.evaluate(() => window.__said.some(h => h.includes('life cycle</b> can start')) && !Voice.speaking);
    if (done) break;
  }
  const pacing = await page.evaluate(() => {
    const facts = window.__timeline.filter(e => /<b>(Germination|Sprout|Seedling|Adult plant|Flowers|Fruit and seeds)!<\/b>|life cycle<\/b> can start/.test(e.html));
    return { cutoffs: window.__timeline.filter(e => e.speaking).map(e => plainText(e.html).slice(0, 50)), factGaps: facts.map(e => Math.round((e.t - e.endT) * 10) / 10) };
  });
  await page.evaluate(() => { Loop.speed = 1; Store.data.waitForPip = false; });
  // reminders: a sprouted plant with dry soil, left alone for 26 s. Pip should ask for water once, not over and over
  await page.click('text=Plant a new seed'); await sleep(500);
  await page.evaluate(() => { const s = App.inst.state(); Object.assign(s, { g: 2.5, stage: 2, water: 0, sunM: 100, told: {} }); });
  const r0 = await page.evaluate(() => window.__said.filter(h => h.includes('thirsty')).length);
  await sleep(26000);
  const thirstyLines = (await page.evaluate(() => window.__said.filter(h => h.includes('thirsty')).length)) - r0;
  report.grow = { stagesInOrder: stagesSeen, final: await stars('grow.'), thirstyReminders: thirstyLines, seconds: Math.round((Date.now() - t0) / 1000), linesCutOff: pacing.cutoffs, gapsBeforeStageFacts: pacing.factGaps };
  await setVoiceAuto(false);

  // ---------- Seed Travel ----------
  await tab('travel'); await sleep(500);
  await page.evaluate(() => { Store.data.waitForPip = true; }); await sleep(6500); // let the intro finish
  const count = () => page.evaluate(() => +document.querySelector('#starCount').textContent);
  const c1 = await count(); await tap(200, 140); await sleep(300);
  const during = await count(); await tap(600, 140); await sleep(300);
  const animalHeld = !(await page.evaluate(() => !!Store.data.stars['travel.animal']));
  const tl = Date.now(); while (await page.evaluate(() => Listen.on) && Date.now() - tl < 15000) await sleep(250);
  await sleep(1300); const after = await count();
  await tap(600, 140); await sleep(300);
  report.travelListen = { before: c1, during, after, animalHeld, animalAfter: await page.evaluate(() => !!Store.data.stars['travel.animal']) };
  await page.evaluate(() => { Store.data.waitForPip = false; stopListening(); });
  for (const [x, y] of [[200, 420], [600, 420]]) await tap(x, y);
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

  // ---------- Routing: every place has its own link (fresh sessions, so the main run's recorders stay clean) ----------
  const extraSaid = []; // lines said in the fresh sessions, checked for recordings with the rest
  const fresh = async (init, { hash = '', viewport = { width: 1100, height: 1300 }, reducedMotion = 'no-preference' } = {}) => {
    const ctx = await browser.newContext({ viewport, reducedMotion });
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning' && m.text().includes('No recording')) warnings.push(m.text()); });
    await p.goto(URL + hash); await sleep(900);
    // record what Pip says (the opening line was said before this ran) and whether a line starts while he's still talking
    await p.evaluate(() => {
      window.__said = [App.current]; window.__talkover = []; window.__clips = 0; const o = window.say;
      window.say = (h, op) => { const speaking = Voice.speaking; const r = o(h, op); if (r === true) { window.__said.push(h); if (speaking) window.__talkover.push(plainText(h).slice(0, 50)); } return r; };
      const play = Voice.play.bind(Voice); Voice.play = (a, my) => { if (my === Voice.token) window.__clips++; return play(a, my); };
    });
    return { ctx, p };
  };
  const done = async (ctx, p) => { extraSaid.push(...await p.evaluate(() => window.__said || [App.current])); await ctx.close(); }; // a reload drops the recorder
  const quiet = p => p.waitForFunction(() => !Voice.speaking && !App.sayQ.length && Loop.t - (Voice.endT || -99) > .3, null, { timeout: 30000 }).then(() => true, () => false);
  const routing = {};
  {
    const { ctx, p } = await fresh();
    routing.start = await p.evaluate(() => location.hash);
    await p.click('.lot[data-topic="plants"]'); await p.waitForFunction(() => location.hash.startsWith('#/plants/'), null, { timeout: 4000 }).catch(() => {});
    routing.entered = await p.evaluate(() => location.hash);
    await p.click('.tab[data-id="seed"]'); await sleep(500);
    routing.tabHash = await p.evaluate(() => location.hash);
    await p.click('.tab[data-id="flower"]'); await sleep(500);
    await p.goBack(); await sleep(700);
    routing.back = await p.evaluate(() => ({ hash: location.hash, act: App.act.id, tab: document.querySelector('.tab[aria-selected="true"]').dataset.id }));
    await p.evaluate(() => { location.hash = '#/plants/grow'; }); await sleep(500); await p.reload(); await sleep(900);
    routing.refresh = await p.evaluate(() => App.act.id);
    await p.evaluate(() => { location.hash = '#/nowhere/at-all'; }); await sleep(700);
    routing.unknown = await p.evaluate(() => ({ hash: location.hash, view: App.view }));
    routing.saved = await p.evaluate(() => JSON.parse(localStorage.getItem('wonderlab.v1')).last);
    routing.ids = await p.evaluate(() => checkIds());
    await done(ctx, p);
  }
  {
    // saves from before routing stored just the activity id
    const { ctx, p } = await fresh(() => { if (!localStorage.getItem('wonderlab.v1')) localStorage.setItem('wonderlab.v1', JSON.stringify({ last: 'flower', stars: {}, badges: {} })); });
    await p.click('#keepGoing'); await sleep(900);
    routing.oldSave = await p.evaluate(() => ({ hash: location.hash, act: App.act && App.act.id }));
    await done(ctx, p);
  }
  report.routing = routing;

  // ---------- Home: the Lab campus map ----------
  const home = {};
  {
    // a first visit on a wide screen, voice on
    const { ctx, p } = await fresh();
    home.first = await p.evaluate(() => ({
      hash: location.hash, view: App.view, atHome: document.documentElement.classList.contains('at-home'),
      hidden: ['#tabs', '#stage', '.below', '#badgeCard'].every(s => getComputedStyle(document.querySelector(s)).display === 'none'),
      lots: [...document.querySelectorAll('.lot')].map(l => ({ topic: l.dataset.topic || null, text: l.textContent.trim(), h: l.getBoundingClientRect().height })),
      keepGoing: !document.querySelector('#keepGoing').hidden, line: plainText(App.current), total: +document.querySelector('#starTotal').textContent,
      wide: Home.cv.width > Home.cv.height }));
    // pacing: the first tap reads the greeting, and it plays to the end with nothing talking over it
    const c0 = await p.evaluate(() => window.__clips);
    const lawn = await (await p.$('#campusCanvas')).boundingBox();
    await p.mouse.click(lawn.x + 20, lawn.y + lawn.height - 20);
    await p.waitForFunction(() => Voice.speaking, null, { timeout: 8000 }).catch(() => {});
    home.greetingDone = await quiet(p);
    home.greeting = await p.evaluate(c0 => ({ clips: window.__clips - c0, pieces: Voice.pieces(App.current).length, holds: Listen.on }), c0);
    // tapping a building: little Pip walks there, then the topic opens and its intro starts promptly
    const t0 = Date.now(); await p.click('.lot[data-topic="plants"]');
    home.walked = await p.evaluate(() => !!Home.walk);
    await p.waitForFunction(() => location.hash === '#/plants/parts', null, { timeout: 4000 }).catch(() => {});
    await p.waitForFunction(() => Voice.speaking && App.current.includes('special jobs'), null, { timeout: 4000 }).catch(() => {});
    home.introAfter = (Date.now() - t0) / 1000;
    home.inTopic = await p.evaluate(() => ({ hash: location.hash, view: App.view, crumbs: getComputedStyle(document.querySelector('#crumbs')).display !== 'none', crumb: document.querySelector('#crumbTopic').textContent, tabs: getComputedStyle(document.querySelector('#tabs')).display !== 'none' }));
    await quiet(p);
    // back to the map: Pip asks where next, once; Keep going offers the activity just left
    await p.goBack(); await sleep(600);
    home.back = await p.evaluate(() => ({ hash: location.hash, view: App.view, line: plainText(App.current), keep: document.querySelector('#keepGoing').textContent }));
    await quiet(p);
    await p.click('#keepGoing'); await sleep(700);
    home.keepGoing = await p.evaluate(() => location.hash);
    await quiet(p);
    await p.click('#homeLink'); await sleep(700);
    home.logo = await p.evaluate(() => App.view);
    await quiet(p);
    await p.click('.lot.soon'); await sleep(300);
    home.soon = await p.evaluate(() => plainText(App.current));
    await quiet(p);
    await p.click('#settingsBtn'); await sleep(400);
    home.settings = await p.evaluate(() => ({ open: document.querySelector('#settings').open, rows: document.querySelectorAll('#progressList li').length }));
    await p.keyboard.press('Escape'); await sleep(300);
    home.talkover = await p.evaluate(() => window.__talkover);
    home.nextLines = await p.evaluate(() => window.__said.filter(h => h === HOME_NEXT).length);
    await done(ctx, p);
  }
  {
    // a returning visitor
    const { ctx, p } = await fresh(() => { if (!localStorage.getItem('wonderlab.v1')) localStorage.setItem('wonderlab.v1', JSON.stringify({ last: { topic: 'plants', activity: 'grow' }, stars: { 'parts.roots': 1 }, badges: {} })); });
    home.returning = await p.evaluate(() => ({ line: plainText(App.current), keep: document.querySelector('#keepGoing').textContent, pill: document.querySelector('.lot[data-topic="plants"]').textContent, pipAtDoor: Home.pipIdx === Home.doors[0] }));
    await done(ctx, p);
  }
  {
    // a phone: the map turns into one winding column, nothing scrolls sideways, and the buildings still work
    const { ctx, p } = await fresh(null, { viewport: { width: 390, height: 844 } });
    home.phone = await p.evaluate(() => ({ tall: Home.cv.clientHeight > Home.cv.clientWidth, cols: Home.cols, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth, minLot: Math.min(...[...document.querySelectorAll('.lot')].map(l => l.getBoundingClientRect().height)) }));
    await p.click('.lot[data-topic="plants"]'); await p.waitForFunction(() => location.hash.startsWith('#/plants/'), null, { timeout: 4000 }).catch(() => {});
    home.phone.entered = await p.evaluate(() => location.hash);
    await done(ctx, p);
  }
  {
    // reduced motion: no walk, the topic opens at once
    const { ctx, p } = await fresh(null, { reducedMotion: 'reduce' });
    await p.click('.lot[data-topic="plants"]'); await sleep(150);
    home.rm = await p.evaluate(() => ({ hash: location.hash, walking: !!Home.walk }));
    await done(ctx, p);
  }
  {
    // a link straight into an activity: the first tap reads its intro and taps wait for Pip
    const { ctx, p } = await fresh(null, { hash: '#/plants/parts' });
    const c0 = await p.evaluate(() => window.__clips);
    await p.mouse.click(5, 5);
    home.deepLink = await p.waitForFunction(c0 => window.__clips > c0, c0, { timeout: 8000 }).then(() => true, () => false);
    home.deepLinkHold = await p.evaluate(() => Listen.on && Listen.voice && App.current.includes('special jobs'));
    await done(ctx, p);
  }
  report.home = home;

  // ---------- badges + voice coverage ----------
  report.badges = await page.evaluate(() => Object.keys(Store.data.badges));
  report.voiceCoverage = await page.evaluate(extra => {
    const out = {}, said = window.__said.concat(extra);
    for (const name of Object.keys(VOICE_PACKS)) {
      const map = VOICE_PACKS[name].map, missing = new Set();
      for (const html of said) {
        const S = splitSentences(plainText(html));
        for (let i = 0; i < S.length;) {
          let j = S.length - 1, hit = false;
          for (; j >= i; j--) if (map[vkey(S.slice(i, j + 1).join(' '))]) { hit = true; break; }
          if (!hit) { j = i; if (!/^hi\b.*!$/i.test(S[i]) && !/^nice to meet you/i.test(S[i]) && !/^welcome back\b.*!$/i.test(S[i]) && !map[vkey(S[i])]) missing.add(S[i]); }
          i = j + 1;
        }
      }
      out[name] = missing.size ? [...missing] : 'all recorded';
    }
    return { messagesSaid: said.length, ...out };
  }, extraSaid);

  report.errors = errors; report.noRecordingWarnings = warnings.filter(w => w.includes('No recording'));
  console.log(JSON.stringify(report, null, 1));
  await page.screenshot({ path: 'tests/last-run.png' });
  await browser.close();

  // fail the run (and the CI job) if anything is off
  const stages = report.grow.stagesInOrder.map(s => s.trim());
  const checks = {
    'First tap: Pip reads the home greeting out loud (no hold on the map)': report.firstVisit.openingHeard && report.firstVisit.home === 'home' && !report.firstVisit.holds && report.firstVisit.line.includes('Welcome to Wonder Lab'),
    'Meet the Plant: 5 stars': report.parts.length === 5,
    'Open a Seed: 5 stars': report.seed.final.length === 5,
    'Open a Seed: sprout button unlocks': report.seed.sproutButtonEnabled,
    'Flower Lab: 5 stars': report.flower.final.length === 5,
    'Flower Lab: bee appears after stamen + pistil': report.flower.beeAppeared,
    'Flower Lab: withered parts stay quiet': report.flower.witheredStamensStillTalk === false,
    'Flower Lab: fruit can be tapped': report.flower.fruitTapWorks,
    'Grow a Bean: 6 stars': report.grow.final.length === 6,
    'Grow a Bean: one thirsty reminder, not a stream': report.grow.thirstyReminders === 1,
    'Rapid taps on one part start one line': report.rapidTaps.sameTapClips <= 1,
    'Quick taps on several parts: only the last one speaks': report.rapidTaps.quickTapClips <= 1 && report.rapidTaps.newestWins,
    'Listen first: taps wait while Pip explains, with a nudge': report.listen.lockedNow && report.listen.heldTap.stillRoots && report.listen.heldTap.nudge && report.listen.stemAfter,
    'Listen first: the star arrives when Pip finishes': report.travelListen.during === report.travelListen.before && report.travelListen.after === report.travelListen.before + 1 && report.travelListen.animalHeld && report.travelListen.animalAfter,
    'Grow a Bean: no line cuts off another': report.grow.linesCutOff.length === 0,
    'Grow a Bean: a pause before each stage fact': report.grow.gapsBeforeStageFacts.length >= 6 && report.grow.gapsBeforeStageFacts.every(g => g >= .8),
    'Grow a Bean: stages in order': JSON.stringify(stages) === JSON.stringify(['Seed', 'Germination', 'Sprout', 'Seedling', 'Adult plant', 'Flowers', 'Fruit & seeds']),
    'Seed Travel: 4 stars': report.travel.length === 4,
    'Plant Quiz: 12 stars': report.quiz === '12 of 12',
    'All 7 badges': report.badges.length === 7,
    'Routing: each place has its own link': report.routing.start === '#/' && report.routing.entered === '#/plants/parts' && report.routing.tabHash === '#/plants/seed',
    'Routing: back returns to the previous activity': report.routing.back.hash === '#/plants/seed' && report.routing.back.act === 'seed' && report.routing.back.tab === 'seed',
    'Routing: refresh keeps your place': report.routing.refresh === 'grow',
    'Routing: an unknown link goes home': report.routing.unknown.hash === '#/' && report.routing.unknown.view === 'home',
    'Last place saved as topic + activity': report.routing.saved && report.routing.saved.topic === 'plants' && report.routing.saved.activity === 'grow',
    'Old saves still open the last activity': report.routing.oldSave.act === 'flower' && report.routing.oldSave.hash === '#/plants/flower',
    'Home: a first visit opens on the map': report.home.first.hash === '#/' && report.home.first.view === 'home' && report.home.first.atHome && report.home.first.hidden && report.home.first.wide && !report.home.first.keepGoing,
    'Home: one building per topic, plus coming soon': report.home.first.lots.filter(l => l.topic).length === 1 && report.home.first.lots.some(l => !l.topic && /Coming soon/.test(l.text)) && report.home.first.lots.every(l => l.h >= 44),
    'Home: stars pill counts every topic': report.home.first.total === 37,
    'Home: first visit greeting': report.home.first.line.startsWith("Hi! I'm Pip") && report.home.first.line.includes('Tap a building'),
    'Pacing: the home greeting plays to the end': report.home.greetingDone && report.home.greeting.clips === report.home.greeting.pieces && !report.home.greeting.holds,
    'Pacing: tapping a building hands off to the topic intro within 3.5 s': report.home.walked && report.home.inTopic.hash === '#/plants/parts' && report.home.introAfter < 3.5,
    'Pacing: no line talks over another on the map': report.home.talkover.length === 0 && report.home.nextLines === 2,
    'Home: inside a topic, the breadcrumb shows it': report.home.inTopic.view === 'topic' && report.home.inTopic.crumbs && report.home.inTopic.crumb === 'Plants & Seeds' && report.home.inTopic.tabs,
    'Home: back returns to the map, Pip asks where next': report.home.back.hash === '#/' && report.home.back.line === 'Where should we explore next?' && report.home.back.keep.includes('Meet the Plant'),
    'Home: Keep going opens the last activity': report.home.keepGoing === '#/plants/parts',
    'Home: the logo goes home': report.home.logo === 'home',
    'Home: coming soon says so': report.home.soon.startsWith('That lab is still being built'),
    'Home: Settings works on the map': report.home.settings.open && report.home.settings.rows === 6,
    'Home: a returning visitor is welcomed back': report.home.returning.line.startsWith('Welcome back') && report.home.returning.keep.includes('Grow a Bean') && report.home.returning.pill.includes('1/37') && report.home.returning.pipAtDoor,
    'Home: phone map is one column, no sideways scrolling': report.home.phone.tall && report.home.phone.cols === 1 && !report.home.phone.sideways && report.home.phone.minLot >= 44 && report.home.phone.entered === '#/plants/parts',
    'Home: reduced motion skips the walk': report.home.rm.hash === '#/plants/parts' && !report.home.rm.walking,
    'First tap on a link into an activity reads its intro and holds taps': report.home.deepLink && report.home.deepLinkHold,
    'Topic ids are unique (new topics prefixed)': report.routing.ids.length === 0,
    'Every line recorded in every voice': Object.entries(report.voiceCoverage).every(([k, v]) => k === 'messagesSaid' || v === 'all recorded'),
    'No page errors': report.errors.length === 0 && report.noRecordingWarnings.length === 0
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  process.exit(failed.length ? 1 : 0);
})();
