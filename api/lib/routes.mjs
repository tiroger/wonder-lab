// Every API route. `store` is the table (DynamoDB in production, an in-memory map in tests):
//   get(pk, sk), put(item), putNew(item) -> false if it exists, del(pk, sk), query(pk, skPrefix), bump(pk, sk, ttlSeconds) -> count
// `verify(idToken)` returns { sub, email } for a signed-in grown-up, or null.
// Errors are 400, 401, 404 and 429, never 403: CloudFront turns 403s into the app's page (docs/accounts.md).
import { KINDS, MAX_GROUPS, LOOKS, PICTURES, newId, newCode, newPictures, newToken, hashToken, normalCode, validCode,
  cleanNick, cleanGroupName, cleanProgress, mergeProgress } from './rules.mjs';

const TOKEN_DAYS = 400, JOIN_FAILS_PER_HOUR = 20, PICTURE_FAILS = 5, PICTURE_WINDOW = 300;
const ok = body => ({ status: 200, body });
const fail = (status, error) => ({ status, body: { error } });
const NOT_FOUND = fail(404, 'not found');

export function routes({ store, verify, config = {} }) {
  // --- loading and checking ---
  const groupMeta = gid => store.get(`GROUP#${gid}`, 'META');
  const kidsOf = async gid => (await store.query(`GROUP#${gid}`, 'KID#')).map(publicKid);
  const publicKid = k => ({ id: k.kid, nick: k.nick, look: k.look });
  const fullKid = k => ({ ...publicKid(k), pictures: k.pics });
  const fullGroup = async g => ({ id: g.gid, name: g.name, kind: g.kind, code: g.code, pictures: g.pictures,
    kids: (await store.query(`GROUP#${g.gid}`, 'KID#')).map(fullKid) });
  async function owned(adult, gid) { const g = await groupMeta(gid); return g && g.owner === adult.sub ? g : null; }
  async function ownedKid(adult, kid) {
    const m = await store.get(`KID#${kid}`, 'META'); if (!m) return null;
    const g = await owned(adult, m.gid); if (!g) return null;
    const k = await store.get(`GROUP#${m.gid}`, `KID#${kid}`); return k ? { g, k } : null;
  }
  async function claimCode(gid) {
    for (let i = 0; i < 8; i++) { const code = newCode(); if (await store.putNew({ pk: `CODE#${code}`, sk: 'META', gid })) return code; }
    throw new Error('could not find a free group code');
  }
  async function removeKid(gid, kid) {
    await store.del(`GROUP#${gid}`, `KID#${kid}`); await store.del(`KID#${kid}`, 'META'); await store.del(`KID#${kid}`, 'PROGRESS');
  }
  async function removeGroup(g) {
    for (const k of await store.query(`GROUP#${g.gid}`, 'KID#')) await removeKid(g.gid, k.kid);
    await store.del(`CODE#${g.code}`, 'META'); await store.del(`GROUP#${g.gid}`, 'META'); await store.del(`ADULT#${g.owner}`, `GROUP#${g.gid}`);
  }
  // a kid device: its token must exist and match the kid's current epoch (a reset bumps it)
  async function device(headers) {
    const m = /^Device\s+(\S+)$/.exec(headers.authorization || ''); if (!m) return null;
    const t = await store.get(`TOKEN#${hashToken(m[1])}`, 'META'); if (!t) return null;
    const k = await store.get(`GROUP#${t.gid}`, `KID#${t.kid}`); if (!k || k.epoch !== t.epoch) return null;
    return { t, k, hash: hashToken(m[1]) };
  }

  // --- grown-up routes ---
  const adultRoutes = {
    'GET /me': async (a) => {
      await store.putNew({ pk: `ADULT#${a.sub}`, sk: 'META', email: a.email, created: Date.now() });
      const links = await store.query(`ADULT#${a.sub}`, 'GROUP#'), groups = [];
      for (const l of links) { const g = await groupMeta(l.gid); if (g) groups.push(await fullGroup(g)); }
      return ok({ email: a.email, groups });
    },
    'DELETE /me': async (a) => {
      for (const l of await store.query(`ADULT#${a.sub}`, 'GROUP#')) { const g = await groupMeta(l.gid); if (g) await removeGroup(g); }
      await store.del(`ADULT#${a.sub}`, 'META'); return ok({ deleted: true });
    },
    'POST /groups': async (a, body) => {
      const name = cleanGroupName(body.name), kind = KINDS[body.kind] ? body.kind : null;
      if (!name || !kind) return fail(400, 'a group needs a name and a kind (family or class)');
      if ((await store.query(`ADULT#${a.sub}`, 'GROUP#')).length >= MAX_GROUPS) return fail(400, 'too many groups');
      const gid = newId(), code = await claimCode(gid);
      const g = { pk: `GROUP#${gid}`, sk: 'META', gid, owner: a.sub, name, kind, code, pictures: KINDS[kind].pictures, created: Date.now() };
      await store.put(g); await store.put({ pk: `ADULT#${a.sub}`, sk: `GROUP#${gid}`, gid });
      return ok(await fullGroup(g));
    },
    'PATCH /groups/:id': async (a, body, id) => {
      const g = await owned(a, id); if (!g) return NOT_FOUND;
      if (body.name != null) { const n = cleanGroupName(body.name); if (!n) return fail(400, 'bad name'); g.name = n; }
      if (body.pictures != null) g.pictures = !!body.pictures;
      if (body.newCode) { const old = g.code; g.code = await claimCode(g.gid); await store.del(`CODE#${old}`, 'META'); }
      await store.put(g); return ok(await fullGroup(g));
    },
    'DELETE /groups/:id': async (a, body, id) => { const g = await owned(a, id); if (!g) return NOT_FOUND; await removeGroup(g); return ok({ deleted: true }); },
    'POST /groups/:id/kids': async (a, body, id) => {
      const g = await owned(a, id); if (!g) return NOT_FOUND;
      const nick = cleanNick(body.nick), look = LOOKS.includes(body.look) ? body.look : LOOKS[0];
      if (!nick) return fail(400, 'a kid needs a nickname (up to 24 letters)');
      const kids = await store.query(`GROUP#${g.gid}`, 'KID#');
      if (kids.length >= KINDS[g.kind].maxKids) return fail(400, 'this group is full');
      const kid = newId(), k = { pk: `GROUP#${g.gid}`, sk: `KID#${kid}`, kid, nick, look, pics: newPictures(), epoch: 1 };
      await store.put(k); await store.put({ pk: `KID#${kid}`, sk: 'META', gid: g.gid });
      return ok(fullKid(k));
    },
    'PATCH /kids/:id': async (a, body, id) => {
      const o = await ownedKid(a, id); if (!o) return NOT_FOUND; const k = o.k;
      if (body.nick != null) { const n = cleanNick(body.nick); if (!n) return fail(400, 'bad nickname'); k.nick = n; }
      if (body.look != null) { if (!LOOKS.includes(body.look)) return fail(400, 'bad look'); k.look = body.look; }
      if (body.resetPictures) { k.pics = newPictures(); k.epoch++; }   // new pictures sign the kid out everywhere
      await store.put(k); return ok(fullKid(k));
    },
    'DELETE /kids/:id': async (a, body, id) => { const o = await ownedKid(a, id); if (!o) return NOT_FOUND; await removeKid(o.g.gid, id); return ok({ deleted: true }); },
    'GET /groups/:id/progress': async (a, body, id) => {
      const g = await owned(a, id); if (!g) return NOT_FOUND;
      const kids = [];
      for (const k of await store.query(`GROUP#${g.gid}`, 'KID#')) kids.push({ ...publicKid(k), progress: mergeProgress((await store.get(`KID#${k.kid}`, 'PROGRESS'))?.p) });
      return ok({ kids });
    },
  };

  // --- kid routes ---
  async function findGroup(code, ip) {
    const c = normalCode(code), rate = `RATE#join#${ip}`, hour = String(Math.floor(Date.now() / 3_600_000));
    if (((await store.get(rate, hour))?.n || 0) >= JOIN_FAILS_PER_HOUR) return { error: fail(429, 'too many tries, wait a bit') };
    const link = validCode(c) && await store.get(`CODE#${c}`, 'META'), g = link && await groupMeta(link.gid);
    if (!g) { await store.bump(rate, hour, 3600); return { error: NOT_FOUND }; }
    return { g };
  }
  const kidRoutes = {
    // what the app needs to sign grown-ups in with Cognito (public values)
    'GET /config': async () => ok({ region: config.region || '', clientId: config.clientId || '' }),
    'GET /join/:code': async (body, code, ip) => {
      const { g, error } = await findGroup(code, ip); if (error) return error;
      return ok({ group: { name: g.name, kind: g.kind, pictures: g.pictures }, kids: await kidsOf(g.gid), pictures: g.pictures ? PICTURES : [] });
    },
    'POST /join/:code/kids/:kid': async (body, code, ip, kid) => {
      const { g, error } = await findGroup(code, ip); if (error) return error;
      const k = await store.get(`GROUP#${g.gid}`, `KID#${kid}`); if (!k) return NOT_FOUND;
      if (g.pictures) {
        const rate = `RATE#pics#${kid}`, slot = String(Math.floor(Date.now() / (PICTURE_WINDOW * 1000)));
        if (((await store.get(rate, slot))?.n || 0) >= PICTURE_FAILS) return fail(429, 'too many tries, wait a bit');
        const p = Array.isArray(body.pictures) ? body.pictures : [];
        if (p.length !== 2 || p[0] !== k.pics[0] || p[1] !== k.pics[1]) { await store.bump(rate, slot, PICTURE_WINDOW); return fail(401, 'wrong pictures'); }
      }
      const token = newToken();
      await store.put({ pk: `TOKEN#${hashToken(token)}`, sk: 'META', kid: k.kid, gid: g.gid, epoch: k.epoch, ttl: Math.floor(Date.now() / 1000) + TOKEN_DAYS * 86400 });
      return ok({ token, kid: publicKid(k), group: { name: g.name } });
    },
  };
  const deviceRoutes = {
    'GET /play': async (d) => ok({ kid: publicKid(d.k), progress: mergeProgress((await store.get(`KID#${d.k.kid}`, 'PROGRESS'))?.p) }),
    'PUT /play/progress': async (d, body) => {
      const p = cleanProgress(body.progress); if (!p) return fail(400, 'bad progress');
      const cur = await store.get(`KID#${d.k.kid}`, 'PROGRESS'), merged = mergeProgress(cur?.p, p);
      await store.put({ pk: `KID#${d.k.kid}`, sk: 'PROGRESS', p: merged, updated: Date.now() });
      return ok({ progress: merged });
    },
    'POST /play/signout': async (d) => { await store.del(`TOKEN#${d.hash}`, 'META'); return ok({ signedOut: true }); },
  };

  // --- dispatch: "METHOD /path" with :params ---
  const match = (table, method, path) => {
    for (const [key, fn] of Object.entries(table)) {
      const [m, pattern] = key.split(' '); if (m !== method) continue;
      const ps = pattern.split('/'), xs = path.split('/'); if (ps.length !== xs.length) continue;
      const args = []; let hit = true;
      for (let i = 0; i < ps.length; i++) { if (ps[i].startsWith(':')) args.push(decodeURIComponent(xs[i])); else if (ps[i] !== xs[i]) { hit = false; break; } }
      if (hit) return { fn, args };
    }
    return null;
  };
  return async function handle({ method, path, headers = {}, body = '', ip = '' }) {
    try {
      const p = path.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
      let data = {}; if (body) { if (body.length > 64_000) return fail(400, 'too big'); data = JSON.parse(body); if (!data || typeof data !== 'object') return fail(400, 'bad body'); }
      let r = match(adultRoutes, method, p);
      if (r) {
        const m = /^Bearer\s+(\S+)$/.exec(headers.authorization || ''), adult = m && await verify(m[1]);
        return adult ? await r.fn(adult, data, ...r.args) : fail(401, 'sign in first');
      }
      r = match(deviceRoutes, method, p);
      if (r) { const d = await device(headers); return d ? await r.fn(d, data) : fail(401, 'sign in first'); }
      r = match(kidRoutes, method, p);
      if (r) { const [code, kid] = r.args; return await r.fn(data, code, ip, kid); }
      return NOT_FOUND;
    } catch (e) {
      if (e instanceof SyntaxError) return fail(400, 'bad json');
      console.error(e); return fail(500, 'something went wrong');
    }
  };
}
