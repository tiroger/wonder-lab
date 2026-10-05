/* ============ Accounts: the API, grown-up sign-in, and the demo ============ */
// Api.call(method, path, body) talks to /api (api/ in the repo). A grown-up signs in with any email and a one-time code:
// Cognito's own API, called with fetch, no library. In demo mode DemoApi answers instead, in this browser only.
const GROWNUP_KEY = 'wonderlab.grownup', DEMO_KEY = 'wonderlab.demo';
const PICTURE_NAMES = ['frog', 'sun', 'rocket', 'apple', 'fish', 'star', 'leaf', 'moon', 'bee'];
const LOOK_NAMES = ['leaf', 'sun', 'sky', 'petal', 'carrot', 'grape', 'berry', 'sea'];
const store2 = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
async function sha256Hex(text) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const Grownup = {
  s: store2.get(GROWNUP_KEY),   // { email, id, access, refresh, exp } or { demo: true }
  get signedIn() { return !!(this.s && (this.s.demo || this.s.refresh)); },
  get demo() { return !!(this.s && this.s.demo); },
  save(s) { this.s = s; store2.set(GROWNUP_KEY, s); },
  // what the API says the app needs to reach Cognito
  async config() { return this.cfg || (this.cfg = await (await fetch('/api/config')).json()); },
  async cognito(target, body) {
    const cfg = await this.config();
    const r = await fetch(`https://cognito-idp.${cfg.region}.amazonaws.com/`, { method: 'POST', body: JSON.stringify({ ClientId: cfg.clientId, ...body }),
      headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}` } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.message || 'Something went wrong'); e.code = String(j.__type || '').split('#').pop(); throw e; }
    return j;
  },
  // step 1: an email. New addresses sign up (Cognito emails a confirmation code); known ones get a sign-in code.
  async start(email) {
    try { await this.cognito('SignUp', { Username: email, UserAttributes: [{ Name: 'email', Value: email }] }); return { email, step: 'confirm' }; }
    catch (e) {
      if (/INVITE_ONLY/.test(e.message)) throw new Error("This email hasn\u2019t been invited yet. Wonder Lab is invite-only for now.");
      if (e.code !== 'UsernameExistsException') throw e;
    }
    try {
      const r = await this.cognito('InitiateAuth', { AuthFlow: 'USER_AUTH', AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: 'EMAIL_OTP' } });
      return { email, step: 'otp', session: r.Session };
    } catch (e) {
      if (e.code !== 'UserNotConfirmedException') throw e;   // signed up before but never typed the code
      await this.cognito('ResendConfirmationCode', { Username: email }); return { email, step: 'confirm' };
    }
  },
  // step 2: the 6-digit code from the email
  async finish(st, code) {
    let r;
    if (st.step === 'confirm') {
      const c = await this.cognito('ConfirmSignUp', { Username: st.email, ConfirmationCode: code });
      r = await this.cognito('InitiateAuth', { AuthFlow: 'USER_AUTH', Session: c.Session, AuthParameters: { USERNAME: st.email } });
    } else r = await this.cognito('RespondToAuthChallenge', { ChallengeName: 'EMAIL_OTP', Session: st.session, ChallengeResponses: { USERNAME: st.email, EMAIL_OTP_CODE: code } });
    if (!r.AuthenticationResult) throw new Error("That code didn’t work. Try again.");
    this.keep(st.email, r.AuthenticationResult);
  },
  keep(email, a) {
    const claims = JSON.parse(atob(a.IdToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    this.save({ email: claims.email || email, id: a.IdToken, access: a.AccessToken, refresh: a.RefreshToken || (this.s && this.s.refresh), exp: claims.exp * 1000 });
  },
  // a fresh ID token, refreshing it a minute before it expires
  async idToken() {
    if (!this.s || !this.s.refresh) return null;
    if (Date.now() < this.s.exp - 60000) return this.s.id;
    try { const r = await this.cognito('InitiateAuth', { AuthFlow: 'REFRESH_TOKEN_AUTH', AuthParameters: { REFRESH_TOKEN: this.s.refresh } }); this.keep(this.s.email, r.AuthenticationResult); return this.s.id; }
    catch (e) { this.save(null); return null; }
  },
  async signOut() {
    const s = this.s; this.save(null);
    if (s && s.refresh) this.cognito('RevokeToken', { Token: s.refresh }).catch(() => {});
  },
  async deleteAccount() {
    if (this.demo) { store2.set(DEMO_KEY, null); this.save(null); return; }
    await Api.call('DELETE', '/me'); const access = this.s.access; this.save(null);
    await this.cognito('DeleteUser', { AccessToken: access }).catch(() => {});
  },
  startDemo() { this.save({ demo: true, email: 'ms.rivera@example.com' }); DemoApi.load(); },
};

const Api = {
  // as a grown-up (default), as a kid's device ({ device: token }), or as nobody yet ({ anon: true }: joining a group).
  // The demo ({ demo: true }, a 'demo:' token, or a grown-up in the demo) never leaves the browser.
  async call(method, path, body, { device, anon, demo } = {}) {
    if (demo || (device && device.startsWith('demo:')) || (!device && !anon && Grownup.demo)) return DemoApi.handle(method, path, body, device);
    // tokens go in X-Wonder-Auth (CloudFront signs the request to the API, replacing Authorization), and any body carries
    // its SHA-256, which a signed request to a Lambda function URL needs
    const headers = { 'Content-Type': 'application/json' }, data = body ? JSON.stringify(body) : undefined;
    if (device) headers['X-Wonder-Auth'] = `Device ${device}`;
    else if (!anon) { const t = await Grownup.idToken(); if (!t) throw new ApiError(401, "Please sign in again."); headers['X-Wonder-Auth'] = `Bearer ${t}`; }
    if (data) headers['x-amz-content-sha256'] = await sha256Hex(data);
    const r = await fetch(`/api${path}`, { method, headers, body: data });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { if (r.status === 401 && !device && !anon) Grownup.save(null); throw new ApiError(r.status, j.error || 'Something went wrong'); }
    return j;
  },
};

// ---------- the demo: the same answers as the API, kept in this browser only ----------
// Ms. Rivera's class: six kids with progress made from the live TOPICS, so new activities show up here by themselves.
const DemoApi = {
  d: null,
  load() {
    this.d = store2.get(DEMO_KEY);
    if (!this.d || this.d.v !== 1) this.reset();
    return this.d;
  },
  reset() {
    const stars = TOPICS.flatMap(tp => tp.activities.flatMap(a => a.stars.map(s => s.id))), r = seeded(7), t0 = Date.now() - 20 * 86400000;
    const some = share => Object.fromEntries(stars.filter(() => r() < share).map((id, i) => [id, t0 + i * 60000]));
    const kid = (id, nick, look, pics, share) => ({ id, nick, look, pictures: pics, progress: { stars: some(share), badges: {}, critters: {}, gardenSeen: {}, hallSeen: {} } });
    const kids = [kid('demo-explorer', 'Demo Explorer', 'sun', ['frog', 'star'], 1), kid('demo-maya', 'Maya', 'petal', ['moon', 'bee'], .7), kid('demo-leo', 'Leo', 'sky', ['rocket', 'fish'], .45),
      kid('demo-zoe', 'Zoe', 'grape', ['apple', 'sun'], .3), kid('demo-sam', 'Sam', 'leaf', ['leaf', 'frog'], .15), kid('demo-ava', 'Ava', 'carrot', ['star', 'moon'], .05)];
    // Demo Explorer has everything: every badge and trophy, every critter
    const all = kids[0].progress;
    for (const tp of TOPICS) { tp.activities.forEach((a, i) => { all.badges[a.badge.id] = t0 + i * 3600000; }); all.badges[tp.master.id] = t0 + 86400000; }
    for (const c of CRITTERS) all.critters[c.id] = t0;
    for (const b of CAMPUS_BADGES) all.badges[b.id] = t0 + 2 * 86400000;
    for (const k of kids.slice(1)) for (const tp of TOPICS) for (const a of tp.activities) if (hasBadgeIn(a, k.progress.stars)) k.progress.badges[a.badge.id] = t0 + 3600000;
    this.d = { v: 1, groups: [{ id: 'demo-class', name: "Ms. Rivera's class", kind: 'class', code: 'sunny-otter-pond-00', pictures: true, kids }] };
    this.save();
  },
  save() { store2.set(DEMO_KEY, this.d); },
  async handle(method, path, body = {}, device) {
    const d = this.d || this.load(), g = id => d.groups.find(x => x.id === id), k = id => d.groups.flatMap(x => x.kids).find(x => x.id === id);
    const pub = x => ({ id: x.id, nick: x.nick, look: x.look }), full = x => ({ ...pub(x), pictures: x.pictures }), group = x => ({ ...x, kids: x.kids.map(full) });
    const nope = () => { throw new ApiError(404, 'not found'); }, bad = m => { throw new ApiError(400, m); };
    const word = () => WORDS_DEMO[Math.floor(Math.random() * WORDS_DEMO.length)], code = () => `${word()}-${word()}-${word()}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
    let m, out;
    if (method === 'GET' && path === '/me') out = { email: Grownup.s.email, groups: d.groups.map(group) };
    else if (method === 'POST' && path === '/groups') {
      const name = String(body.name || '').trim(); if (!name || !['family', 'class'].includes(body.kind)) bad("A group needs a name.");
      const x = { id: `demo-${Date.now().toString(36)}`, name: name.slice(0, 40), kind: body.kind, code: code(), pictures: body.kind === 'class', kids: [] }; d.groups.push(x); out = group(x);
    } else if ((m = /^\/groups\/([^/]+)$/.exec(path))) {
      const x = g(m[1]) || nope();
      if (method === 'DELETE') { d.groups = d.groups.filter(y => y !== x); out = { deleted: true }; }
      else { if (body.name) x.name = String(body.name).trim().slice(0, 40); if (body.pictures != null) x.pictures = !!body.pictures; if (body.newCode) x.code = code(); out = group(x); }
    } else if ((m = /^\/groups\/([^/]+)\/kids$/.exec(path))) {
      const x = g(m[1]) || nope(), nick = String(body.nick || '').trim(); if (!nick) bad("A kid needs a nickname.");
      if (x.kids.length >= (x.kind === 'class' ? 40 : 10)) bad("This group is full.");
      const a = PICTURE_NAMES[Math.floor(Math.random() * 9)], b = PICTURE_NAMES.filter(p => p !== a)[Math.floor(Math.random() * 8)];
      const y = { id: `demo-${Date.now().toString(36)}`, nick: nick.slice(0, 24), look: LOOK_NAMES.includes(body.look) ? body.look : 'leaf', pictures: [a, b], progress: { stars: {}, badges: {}, critters: {}, gardenSeen: {}, hallSeen: {} } };
      x.kids.push(y); out = full(y);
    } else if ((m = /^\/kids\/([^/]+)$/.exec(path))) {
      const y = k(m[1]) || nope();
      if (method === 'DELETE') { d.groups.forEach(x => { x.kids = x.kids.filter(z => z !== y); }); out = { deleted: true }; }
      else {
        if (body.nick) y.nick = String(body.nick).trim().slice(0, 24); if (LOOK_NAMES.includes(body.look)) y.look = body.look;
        if (body.resetPictures) { const a = PICTURE_NAMES[Math.floor(Math.random() * 9)]; y.pictures = [a, PICTURE_NAMES.filter(p => p !== a)[Math.floor(Math.random() * 8)]]; }
        out = full(y);
      }
    } else if ((m = /^\/groups\/([^/]+)\/progress$/.exec(path))) out = { kids: (g(m[1]) || nope()).kids.map(y => ({ ...pub(y), progress: y.progress })) };
    else if (method === 'DELETE' && path === '/me') { this.reset(); out = { deleted: true }; }
    // the kid side: join the demo class, play, save progress (same answers as the real API)
    else if ((m = /^\/join\/([^/]+)$/.exec(path))) { const x = d.groups.find(y => y.code === m[1]) || nope(); out = { group: { name: x.name, kind: x.kind, pictures: x.pictures }, kids: x.kids.map(pub), pictures: x.pictures ? PICTURE_NAMES : [] }; }
    else if ((m = /^\/join\/([^/]+)\/kids\/([^/]+)$/.exec(path))) {
      const x = d.groups.find(y => y.code === m[1]) || nope(), y = x.kids.find(z => z.id === m[2]) || nope(), p = body.pictures || [];
      if (x.pictures && (p[0] !== y.pictures[0] || p[1] !== y.pictures[1])) throw new ApiError(401, 'wrong pictures');
      out = { token: `demo:${y.id}`, kid: pub(y), group: { name: x.name } };
    } else if (device) {
      const y = k(device.slice(5)); if (!y) throw new ApiError(401, 'sign in first');
      if (method === 'GET' && path === '/play') out = { kid: pub(y), progress: y.progress };
      else if (method === 'PUT' && path === '/play/progress') { y.progress = mergeProgress(y.progress, body.progress); out = { progress: y.progress }; }
      else if (method === 'POST' && path === '/play/signout') out = { signedOut: true };
      else nope();
    }
    else nope();
    this.save(); return JSON.parse(JSON.stringify(out));
  },
};
const WORDS_DEMO = ['maple', 'otter', 'pond', 'comet', 'tulip', 'fern', 'robin', 'acorn', 'meadow', 'lantern', 'pebble', 'willow'];
// progress only grows: every id from both sides, the earliest time (the same rule as the API's)
const PROGRESS_MAPS = ['stars', 'badges', 'critters', 'gardenSeen', 'hallSeen'];
function mergeProgress(a = {}, b = {}) {
  const out = {};
  for (const k of PROGRESS_MAPS) { const m = { ...(a[k] || {}) }; for (const [id, v] of Object.entries(b[k] || {})) m[id] = id in m ? (m[id] > 1 && v > 1 ? Math.min(m[id], v) : Math.max(m[id], v)) : v; out[k] = m; }
  return out;
}
function hasBadgeIn(a, stars) { const need = a.badgeNeed || a.stars.length; return a.stars.filter(s => stars[s.id]).length >= need; }

// ---------- the 9 pictures a secret is made from, drawn in a 60x60 box around (0, 0) ----------
const PICTURE_ART = {
  frog(c, t) { c.save(); c.scale(1.15, 1.15); c.translate(0, 6); drawFrog(c, 0, 0, t, false); c.restore(); },
  sun(c, t) { sun(c, 0, 0, 14, t, { face: false }); },
  rocket(c) {
    c.save(); c.rotate(.5); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.lineJoin = 'round';
    c.fillStyle = C.carrot; c.beginPath(); c.moveTo(-6, 14); c.lineTo(0, 24); c.lineTo(6, 14); c.fill(); c.stroke();
    c.fillStyle = '#E04B4B'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 8, 4); c.lineTo(s * 16, 16); c.lineTo(s * 8, 14); c.closePath(); c.fill(); c.stroke(); }
    const body = new Path2D('M0 -24 C10 -14 10 4 8 14 L-8 14 C-10 4 -10 -14 0 -24 Z'); c.fillStyle = '#F2F4F7'; c.fill(body); c.stroke(body);
    c.fillStyle = '#5BB8E8'; c.beginPath(); c.arc(0, -4, 4.5, 0, TAU); c.fill(); c.stroke(); c.restore();
  },
  apple(c) { c.save(); c.scale(2.6, 2.6); drawApple(c, 0, 2); c.strokeStyle = '#7A5230'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -5); c.lineTo(1, -9); c.stroke(); drawLeaf(c, 1, -8, -20, .06); c.restore(); },
  fish(c, t) { drawCritter(c, 'fish', t, 1.4); },
  star(c) { c.save(); c.scale(.42, .42); c.fillStyle = C.sun; c.fill(STAR_PATH()); c.strokeStyle = C.ink; c.lineWidth = 6; c.stroke(STAR_PATH()); c.restore(); },
  leaf(c) { drawLeaf(c, -18, 12, -40, .34); },
  moon(c) {
    const m = new Path2D(); m.arc(0, 0, 16, .9, TAU - .9); m.arc(9, -2, 13, TAU - 1.1, 1.1, true); m.closePath();
    c.fillStyle = '#FFE7A3'; c.fill(m); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke(m);
  },
  bee(c, t) { bee(c, -2, 2, t, .85); },
};
function drawPicture(cv, name, t = 1) {   // t = 1: everyone's eyes open
  const c = cv.getContext('2d'), s = cv.width / 60; c.setTransform(s, 0, 0, s, 0, 0); c.clearRect(0, 0, 60, 60); c.translate(30, 30); PICTURE_ART[name](c, t);
}
function drawKidPip(cv, look, t = 1) {
  const c = cv.getContext('2d'), s = cv.width / 100; c.setTransform(s, 0, 0, s, 0, 0); c.clearRect(0, 0, 100, 100); c.translate(50, 58); pipFigure(c, t, { tint: look });
}
