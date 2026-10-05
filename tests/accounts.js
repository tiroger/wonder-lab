/* Accounts end to end: the grown-up page in a real browser, talking to the real API code (api/lib/routes.mjs, with an
   in-memory table) and a pretend Cognito, both served through Playwright. Also the demo, which must never call the API.
   Locally: python3 build.py && (cd dist && python3 -m http.server 8799 &) && node tests/accounts.js (prints PASS/FAIL lines) */
const { chromium } = require('playwright');
const SITE = process.env.WL_URL || 'http://localhost:8799/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const { routes, inviteCheck } = await import('../api/lib/routes.mjs'), { memoryStore } = await import('../api/lib/memory.mjs'), { validCode } = await import('../api/lib/rules.mjs');
  const store = memoryStore();
  // pretend Cognito: users by email, the last code it "emailed", and unsigned tokens our verifier trusts
  const users = new Map(), sent = [], cognitoCalls = [];
  const idToken = email => `test.${Buffer.from(JSON.stringify({ sub: `sub-${email}`, email, email_verified: true, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`;
  const verify = async t => { try { if (!t.startsWith('test.')) return null; const c = JSON.parse(Buffer.from(t.split('.')[1], 'base64url')); return users.has(c.email) ? { sub: c.sub, email: c.email, emailVerified: c.email_verified } : null; } catch { return null; } };
  // parent@example.com is the admin (invite-only); the pretend Cognito runs the real pre sign-up check
  const admins = ['parent@example.com'], allowed = inviteCheck({ store, admins });
  const app = routes({ store, verify, config: { region: 'us-east-1', clientId: 'test-client', admins } });
  const auth = email => ({ AuthenticationResult: { IdToken: idToken(email), AccessToken: `access-${email}`, RefreshToken: `refresh-${email}` } });
  const fail = (type, message) => ({ status: 400, body: { __type: type, message } });
  async function cognito(target, b) {
    cognitoCalls.push(target);
    const email = b.Username || (b.AuthParameters && b.AuthParameters.USERNAME) || (b.ChallengeResponses && b.ChallengeResponses.USERNAME), u = users.get(email);
    if (target === 'SignUp') { if (u) return fail('UsernameExistsException', 'User already exists'); if (!(await allowed(email))) return fail('UserLambdaValidationException', 'PreSignUp failed with error INVITE_ONLY.'); users.set(email, { confirmed: false }); sent.push({ email, code: '111111' }); return { body: { UserConfirmed: false } }; }
    if (target === 'ConfirmSignUp') { if (b.ConfirmationCode !== '111111') return fail('CodeMismatchException', 'Invalid code'); u.confirmed = true; return { body: { Session: `confirmed-${email}` } }; }
    if (target === 'InitiateAuth' && b.AuthFlow === 'REFRESH_TOKEN_AUTH') return { body: auth(b.AuthParameters.REFRESH_TOKEN.replace('refresh-', '')) };
    if (target === 'InitiateAuth') {
      if (b.Session === `confirmed-${email}`) return { body: auth(email) };
      if (!u || !u.confirmed) return fail('UserNotConfirmedException', 'not confirmed');
      sent.push({ email, code: '222222' }); return { body: { ChallengeName: 'EMAIL_OTP', Session: `otp-${email}` } };
    }
    if (target === 'RespondToAuthChallenge') return b.ChallengeResponses.EMAIL_OTP_CODE === '222222' ? { body: auth(email) } : fail('CodeMismatchException', 'Invalid code');
    if (target === 'RevokeToken') return { body: {} };
    if (target === 'DeleteUser') { users.delete(b.AccessToken.replace('access-', '')); return { body: {} }; }
    return fail('InvalidParameterException', target);
  }

  const browser = await chromium.launch(), errors = [], report = {};
  async function device(name, { viewport = { width: 1100, height: 1400 } } = {}) {
    const ctx = await browser.newContext({ viewport }), p = await ctx.newPage(); p.apiCalls = [];
    p.on('pageerror', e => errors.push(`${name}: ${e.message}`)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${name}: ${m.text()}`); });
    await p.route('**/api/**', async r => {
      const q = r.request(), u = new URL(q.url()); p.apiCalls.push(`${q.method()} ${u.pathname}`);
      const res = await app({ method: q.method(), path: u.pathname, headers: q.headers(), body: q.postData() || '', ip: '1.1.1.1' });
      await r.fulfill({ status: res.status, contentType: 'application/json', body: JSON.stringify(res.body) });
    });
    await p.route('https://cognito-idp.us-east-1.amazonaws.com/', async r => {
      const q = r.request(), res = await cognito(q.headers()['x-amz-target'].split('.').pop(), JSON.parse(q.postData()));
      await r.fulfill({ status: res.status || 200, contentType: 'application/x-amz-json-1.1', body: JSON.stringify(res.body) });
    });
    await p.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
    await p.goto(SITE + '#/grownups'); await sleep(700);
    return { ctx, p };
  }
  const ask = async (p, text) => { await p.waitForSelector('dialog.gu-dialog[open]'); if (text != null) await p.fill('dialog.gu-dialog input[name=text]', text); await p.click('dialog.gu-dialog button[value=ok]'); await sleep(300); };
  const signIn = async (p, email, code) => {
    await p.fill('#guEmailIn', email); await p.click('#guEmail button'); await p.waitForSelector('#guCodeIn');
    await p.fill('#guCodeIn', code); await p.click('#guCode button'); await sleep(500);
  };
  const groups = p => p.evaluate(() => [...document.querySelectorAll('.gu-group')].map(g => ({ name: g.querySelector('h2').textContent, code: g.querySelector('.gu-code code').textContent,
    kids: [...g.querySelectorAll('.gu-nick')].map(n => n.textContent), pics: g.querySelectorAll('.gu-pics').length })));

  // ---------- a new grown-up on a laptop: sign up, make a family, add kids, print login cards ----------
  {
    const { ctx, p } = await device('laptop'), r = {};
    r.signedOut = await p.evaluate(() => App.view === 'grownups' && !!document.querySelector('#guEmailIn') && getComputedStyle(document.querySelector('.guide')).display === 'none');
    await signIn(p, 'parent@example.com', '000000');
    r.wrongCode = await p.evaluate(() => (document.querySelector('.gu-msg') || {}).textContent || '');
    await p.fill('#guCodeIn', '111111'); await p.click('#guCode button'); await sleep(600);
    r.welcome = await p.evaluate(() => !!document.querySelector('#guAddFamily') && document.body.textContent.includes('Signed in as parent@example.com'));
    await p.click('#guAddFamily'); await ask(p, 'The Lab Family'); await sleep(300);
    for (const nick of ['Sam', 'Ava']) { await p.fill('.gu-group [name=nick]', nick); await p.click('.gu-group [data-addkid] button'); await sleep(400); }
    let g = (await groups(p))[0]; r.family = g;
    await p.click('[data-pictures]'); await sleep(400); r.picsOn = (await groups(p))[0].pics;
    await p.click('[data-rename]'); await ask(p, 'The Lefort Lab'); r.renamed = (await groups(p))[0].name;
    await p.click('[data-print]'); await sleep(300);
    r.cards = await p.evaluate(() => ({ printed: window.__printed, cards: document.querySelectorAll('#cardsSheet .login-card').length, qr: [...document.querySelectorAll('#cardsSheet .lc-qr')].every(c => c.width > 100), pics: document.querySelectorAll('#cardsSheet .lc-pics canvas').length }));
    await p.click('[data-newcode]'); await ask(p); r.newCode = (await groups(p))[0].code; r.oldCode = g.code;
    // the admin's Invites card: invite a teacher, get a message to send them
    r.adminCard = await p.evaluate(() => !!document.querySelector('.gu-invites'));
    await p.fill('#guInviteIn', 'Teacher@Example.com'); await p.click('#guInvite button'); await sleep(400);
    r.invite = await p.evaluate(() => ({ list: [...document.querySelectorAll('.gu-invlist li span:first-child')].map(x => x.textContent), note: (document.querySelector('#guNote') || {}).textContent || '' }));
    await p.click('#guOut'); await sleep(400);
    r.signedOutAgain = await p.evaluate(() => !!document.querySelector('#guEmailIn') && !localStorage.getItem('wonderlab.grownup'));
    report.laptop = r; await ctx.close();
  }
  // ---------- kids: join with the group code, play, and progress follows them to another device ----------
  {
    const r = {}, bearer = { authorization: `Bearer ${idToken('parent@example.com')}` };
    const api = async (method, path, body) => (await app({ method, path: `/api${path}`, headers: bearer, body: body ? JSON.stringify(body) : '' })).body;
    const fam = await api('POST', '/groups', { name: 'Kid Test Family', kind: 'family' }), mia = await api('POST', `/groups/${fam.id}/kids`, { nick: 'Mia', look: 'petal' });
    await api('POST', `/groups/${fam.id}/kids`, { nick: 'Leo', look: 'sky' });
    const room = await api('POST', '/groups', { name: 'Room 9', kind: 'class' }), zed = await api('POST', `/groups/${room.id}/kids`, { nick: 'Zed', look: 'grape' });
    const progressOf = id => (store.rows.get(`KID#${id}\u0000PROGRESS`) || { p: { stars: {} } }).p;
    const said = p => p.evaluate(() => plainText(App.current));
    // a tablet that was played on as a guest first: scanning the login card's QR link opens "Who's playing?"
    const tablet = await device('tablet');
    await tablet.p.evaluate(() => { Store.data.stars['parts.roots'] = 1000; Store.data.stars['parts.stem'] = 2000; Store.save(); });
    await tablet.p.goto(SITE + '#/join/' + fam.code); await sleep(800);
    r.join = { view: await tablet.p.evaluate(() => App.view), hash: await tablet.p.evaluate(() => location.hash), kids: await tablet.p.$$eval('.pl-kid span', xs => xs.map(x => x.textContent)), line: await said(tablet.p) };
    await tablet.p.click('.pl-kid >> nth=0'); await sleep(600);
    r.keep = { step: await tablet.p.evaluate(() => Players.st.step), line: await said(tablet.p) };
    await tablet.p.click('#plKeep'); await sleep(800);
    r.mia = await tablet.p.evaluate(() => ({ view: App.view, key: Store.key, stars: Object.keys(Store.data.stars).sort(), chip: document.querySelector('#playerBtn').textContent, line: plainText(App.current),
      guestLeft: Object.keys(JSON.parse(localStorage.getItem('wonderlab.v1')).stars || {}).length }));
    await sleep(2600); r.synced = Object.keys(progressOf(mia.id).stars).sort();
    // the same kid on a phone in a fresh browser: types the code loosely, taps her name, and her stars are there
    const phone = await device('kid phone', { viewport: { width: 390, height: 900 } });
    await phone.p.goto(SITE + '#/players'); await sleep(600);
    await phone.p.fill('#plCodeIn', '  ' + fam.code.toUpperCase().replace(/-/g, ' ') + ' '); await phone.p.click('#plCode button'); await sleep(600);
    await phone.p.click('.pl-kid >> nth=0'); await sleep(1200);
    r.phone = await phone.p.evaluate(() => ({ view: App.view, stars: Object.keys(Store.data.stars).sort(), sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth, asked: Players.st.step === 'keep' }));
    // a star earned on the phone shows up on the tablet
    await phone.p.evaluate(() => { Store.data.stars['seed.peel'] = Date.now(); Store.save(); }); await sleep(2600);
    await tablet.p.reload(); await sleep(1200);
    r.tabletAfter = await tablet.p.evaluate(() => Object.keys(Store.data.stars).sort());
    // the grown-up gives Mia new pictures: her devices are signed out and asked to sign in again
    await api('PATCH', `/kids/${mia.id}`, { resetPictures: true });
    await tablet.p.evaluate(() => { Store.data.stars['seed.split'] = Date.now(); Store.save(); }); await sleep(2800);
    r.lost = await tablet.p.evaluate(() => ({ view: App.view, player: Player.on, key: Store.key, line: plainText(App.current), step: Players.st.step }));
    // play without signing in: back to the guest's own (now empty) progress
    await phone.p.click('#playerBtn'); await sleep(500); await phone.p.click('#plGuest'); await sleep(600);
    r.guest = await phone.p.evaluate(() => ({ view: App.view, player: Player.on, key: Store.key, chip: document.querySelector('#playerBtn').getAttribute('aria-label') }));
    // a class with secret pictures: the wrong order is refused kindly, the right order signs in
    const desk = await device('class laptop');
    await desk.p.goto(SITE + '#/join/' + room.code); await sleep(700);
    await desk.p.click('.pl-kid >> nth=0'); await sleep(300);
    r.picsAsk = await said(desk.p);
    for (const pic of [...zed.pictures].reverse()) { await desk.p.click(`[data-pic-btn="${pic}"]`); await sleep(150); }
    await sleep(800); r.picsWrong = { line: await said(desk.p), player: await desk.p.evaluate(() => Player.on) };
    for (const pic of zed.pictures) { await desk.p.click(`[data-pic-btn="${pic}"]`); await sleep(150); }
    await sleep(1200); r.picsRight = await desk.p.evaluate(() => ({ view: App.view, nick: Player.on && Player.p.kid.nick }));
    // a code that doesn't exist
    await desk.p.goto(SITE + '#/join/maple-otter-pond-99'); await sleep(800); r.badCode = await said(desk.p);
    r.recorded = await desk.p.evaluate(() => { const lines = [WHO_PLAYING, TYPE_CODE, CODE_UNKNOWN, TAP_PICTURES, PICTURES_WRONG, TOO_MANY, KEEP_STARS, SIGN_IN_AGAIN];
      return Object.entries(VOICE_PACKS).flatMap(([v, pk]) => lines.filter(l => !pk.map[vkey(plainText(l))]).map(l => `${v}: ${l}`)); });
    report.kids = r;
    for (const d of [tablet, phone, desk]) await d.ctx.close();
    await api('DELETE', `/groups/${fam.id}`); await api('DELETE', `/groups/${room.id}`);   // leave the grown-up as we found them
  }
  // ---------- the same grown-up on a phone, in a fresh (incognito-like) browser: an emailed code, and the family is there ----------
  {
    const { ctx, p } = await device('phone', { viewport: { width: 390, height: 900 } }), r = {};
    await signIn(p, 'parent@example.com', '222222');
    r.groups = await groups(p);
    r.sideways = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    report.phone = r;
    // remove a kid, then delete the account: everything goes
    await p.click('.gu-kid [data-remove]'); await ask(p); r.afterRemove = (await groups(p))[0].kids;
    await p.click('#guDelete'); await ask(p); await sleep(400);
    r.deleted = { signedOut: await p.evaluate(() => !!document.querySelector('#guEmailIn')), rows: [...store.rows.values()].filter(x => !x.pk.startsWith('RATE#') && x.pk !== 'INVITES').length, user: users.has('parent@example.com') };
    await ctx.close();
  }
  // ---------- invite-only: a stranger can't make an account; the invited teacher can, and sees none of the family ----------
  {
    const { ctx, p } = await device('stranger'), r = {};
    await p.fill('#guEmailIn', 'stranger@example.com'); await p.click('#guEmail button'); await sleep(500);
    r.refused = await p.evaluate(() => ({ msg: (document.querySelector('.gu-msg') || {}).textContent || '', noCodeBox: !document.querySelector('#guCodeIn') }));
    r.noAccount = !users.has('stranger@example.com');
    report.stranger = r; await ctx.close();
  }
  {
    const { ctx, p } = await device('teacher'), r = {};
    await signIn(p, 'teacher@example.com', '111111'); r.groups = await groups(p);
    r.adminCard = await p.evaluate(() => !!document.querySelector('.gu-invites'));
    r.joined = !!(await store.get('INVITES', 'teacher@example.com')).joined;
    report.teacher = r; await ctx.close();
  }
  // ---------- Settings links to the grown-up page, and closes so the page shows ----------
  {
    const { ctx, p } = await device('settings'); await p.goto(SITE + '#/'); await sleep(700);
    await p.click('#settingsBtn'); await sleep(300); await p.click('#setGrownups'); await sleep(600);
    report.settingsLink = await p.evaluate(() => ({ view: App.view, open: document.querySelector('#settings').open }));
    await ctx.close();
  }
  // ---------- the demo: everything works, nothing leaves the browser ----------
  {
    const { ctx, p } = await device('demo'), r = {};
    const before = cognitoCalls.length;
    await p.click('#guDemo'); await sleep(500);
    r.start = await groups(p);
    await p.fill('.gu-group [name=nick]', 'Visitor'); await p.click('.gu-group [data-addkid] button'); await sleep(300);
    r.added = (await groups(p))[0].kids.length;
    await p.reload(); await sleep(800); r.kept = (await groups(p))[0].kids.length;
    await p.click('#guDemoReset'); await sleep(400); r.reset = (await groups(p))[0].kids.length;
    await p.click('#guAddClass'); await ask(p, 'Room 7'); r.classes = (await groups(p)).length;
    await p.click('#guOut'); await sleep(300); r.left = await p.evaluate(() => !!document.querySelector('#guEmailIn'));
    r.network = { api: p.apiCalls.length, cognito: cognitoCalls.length - before };
    report.demo = r; await ctx.close();
  }
  await browser.close();

  const L = report.laptop, P = report.phone, D = report.demo, K = report.kids;
  const checks = {
    'Grown-ups: the page opens signed out, with no Pip narration': L.signedOut,
    'Grown-ups: a wrong code says so, the right one signs in': /didn.t match/.test(L.wrongCode) && L.welcome,
    'Grown-ups: make a family and add kids; it gets a real group code': L.family.name === 'The Lab Family' && L.family.kids.join() === 'Sam,Ava' && validCode(L.family.code),
    'Grown-ups: secret pictures on, rename, and a new code replaces the old one': L.picsOn === 2 && L.renamed === 'The Lefort Lab' && validCode(L.newCode) && L.newCode !== L.oldCode,
    'Grown-ups: login cards print, one per kid, each with a QR code and its pictures': L.cards.printed === 1 && L.cards.cards === 2 && L.cards.qr && L.cards.pics === 4,
    'Grown-ups: sign out forgets the session': L.signedOutAgain,
    'Grown-ups: another device signs in with an emailed code and finds the same family': P.groups.length === 1 && P.groups[0].name === 'The Lefort Lab' && P.groups[0].kids.join() === 'Sam,Ava' && !P.sideways,
    'Grown-ups: removing a kid and deleting the account delete everything': P.afterRemove.length === 1 && P.deleted.signedOut && P.deleted.rows === 0 && !P.deleted.user,
    'Invite-only: an email without an invite is turned away, kindly, and no account is made': /hasn.t been invited/.test(report.stranger.refused.msg) && report.stranger.refused.noCodeBox && report.stranger.noAccount,
    'Invite-only: the admin invites a teacher by email and gets a message to send': L.adminCard && L.invite.list.join() === 'teacher@example.com' && L.invite.note.includes('teacher@example.com') && L.invite.note.includes('/#/grownups'),
    'Kids: a login card link opens "Who\'s playing?" with the family\'s kids, and keeps the code out of the address bar': K.join.view === 'players' && K.join.hash === '#/players' && K.join.kids.join() === 'Mia,Leo' && K.join.line.startsWith("Who's playing today"),
    'Kids: guest stars on the device are offered, added to the kid, and moved (not copied)': K.keep.step === 'keep' && /found stars/.test(K.keep.line) && K.mia.view === 'home' && K.mia.key.startsWith('wonderlab.kid.') && K.mia.stars.join() === 'parts.roots,parts.stem' && K.mia.guestLeft === 0 && K.mia.chip.includes('Mia') && K.mia.line.includes('Mia'),
    'Kids: progress syncs to the API a moment after a change': K.synced.join() === 'parts.roots,parts.stem',
    'Kids: the same kid on another device types the code loosely and finds their stars': K.phone.view === 'home' && K.phone.stars.join() === 'parts.roots,parts.stem' && !K.phone.asked && !K.phone.sideways,
    'Kids: a star earned on one device shows up on the other': K.tabletAfter.join() === 'parts.roots,parts.stem,seed.peel',
    'Kids: new pictures from the grown-up sign the kid out, and Pip asks them to sign in again': K.lost.view === 'players' && !K.lost.player && K.lost.key === 'wonderlab.v1' && K.lost.line.startsWith("Let's sign in again") && K.lost.step === 'code',
    'Kids: "Play without signing in" goes back to guest progress': K.guest.view === 'home' && !K.guest.player && K.guest.key === 'wonderlab.v1' && /Who.s playing/.test(K.guest.chip),
    'Kids: secret pictures, the wrong order is refused kindly, the right order signs in': /in order/.test(K.picsAsk) && /Not quite/.test(K.picsWrong.line) && !K.picsWrong.player && K.picsRight.view === 'home' && K.picsRight.nick === 'Zed',
    'Kids: an unknown code gets a kind "check it" from Pip': /don.t know that code/.test(K.badCode),
    'Kids: every line Pip says on "Who\'s playing?" is recorded in every voice': K.recorded.length === 0,
    "Invite-only: the invited teacher signs up, sees none of the family's groups, and isn't an admin": report.teacher.groups.length === 0 && !report.teacher.adminCard && report.teacher.joined,
    'Demo: a sample class of six, changes kept in this browser, reset and leave work': D.start[0].kids.length === 6 && D.added === 7 && D.kept === 7 && D.reset === 6 && D.classes === 2 && D.left,
    'Demo: nothing is sent to the API or to Cognito': D.network.api === 0 && D.network.cognito === 0,
    'Settings: the grown-up link closes Settings and shows the grown-up page': report.settingsLink.view === 'grownups' && !report.settingsLink.open,
    'Accounts: no page errors': errors.length === 0,
  };
  let failed = 0;
  for (const [name, ok] of Object.entries(checks)) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failed++; }
  if (failed) { console.log(JSON.stringify({ report, errors }, null, 1)); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
