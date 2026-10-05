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

  const L = report.laptop, P = report.phone, D = report.demo;
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
    "Invite-only: the invited teacher signs up, sees none of the family's groups, and isn't an admin": report.teacher.groups.length === 0 && !report.teacher.adminCard && report.teacher.joined,
    'Demo: a sample class of six, changes kept in this browser, reset and leave work': D.start[0].kids.length === 6 && D.added === 7 && D.kept === 7 && D.reset === 6 && D.classes === 2 && D.left,
    'Demo: nothing is sent to the API or to Cognito': D.network.api === 0 && D.network.cognito === 0,
    'Accounts: no page errors': errors.length === 0,
  };
  let failed = 0;
  for (const [name, ok] of Object.entries(checks)) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failed++; }
  if (failed) { console.log(JSON.stringify({ report, errors }, null, 1)); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
