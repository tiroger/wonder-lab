// The API end to end against an in-memory table: grown-ups, groups, kids, kid sign-in, sync and the guards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { routes } from '../lib/routes.mjs';
import { memoryStore } from '../lib/memory.mjs';
import { verifier } from '../lib/auth.mjs';
import { mergeProgress, cleanProgress, normalCode, validCode, newCode } from '../lib/rules.mjs';

// a pretend Cognito: our own key pair, served as the pool's JWKS
const POOL = 'us-east-1_TEST', CLIENT = 'client123', ISS = `https://cognito-idp.us-east-1.amazonaws.com/${POOL}`;
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function idToken(claims, { kid = 'k1', key = privateKey } = {}) {
  const head = b64({ alg: 'RS256', kid }), body = b64({ iss: ISS, aud: CLIENT, token_use: 'id', exp: Math.floor(Date.now() / 1000) + 3600, ...claims });
  return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url')}`;
}
const fetchFn = async url => ({ ok: url === `${ISS}/.well-known/jwks.json`, json: async () => ({ keys: [jwk] }) });

function setup() {
  const store = memoryStore(), app = routes({ store, verify: verifier({ region: 'us-east-1', poolId: POOL, clientId: CLIENT, fetchFn }) });
  const call = (method, path, { body, auth, ip = '1.2.3.4' } = {}) =>
    app({ method, path: `/api${path}`, headers: auth ? { authorization: auth } : {}, body: body ? JSON.stringify(body) : '', ip });
  const roger = `Bearer ${idToken({ sub: 'roger', email: 'r@example.com' })}`, other = `Bearer ${idToken({ sub: 'other', email: 'o@example.com' })}`;
  return { store, call, roger, other };
}
async function family(t, kind = 'family') {
  const g = (await t.call('POST', '/groups', { auth: t.roger, body: { name: 'The Lab Family', kind } })).body;
  const sam = (await t.call('POST', `/groups/${g.id}/kids`, { auth: t.roger, body: { nick: 'Sam', look: 'sun' } })).body;
  const ava = (await t.call('POST', `/groups/${g.id}/kids`, { auth: t.roger, body: { nick: 'Ava', look: 'petal' } })).body;
  return { g, sam, ava };
}

test('grown-ups must be signed in with a valid Cognito token', async () => {
  const t = setup();
  assert.equal((await t.call('GET', '/me')).status, 401);
  assert.equal((await t.call('GET', '/me', { auth: 'Bearer nonsense' })).status, 401);
  const forged = `Bearer ${idToken({ sub: 'x' }, { key: generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey })}`;
  assert.equal((await t.call('GET', '/me', { auth: forged })).status, 401, 'signed by someone else');
  assert.equal((await t.call('GET', '/me', { auth: `Bearer ${idToken({ sub: 'x', exp: 1 })}` })).status, 401, 'expired');
  assert.equal((await t.call('GET', '/me', { auth: `Bearer ${idToken({ sub: 'x', aud: 'another-app' })}` })).status, 401, 'another app');
  assert.equal((await t.call('GET', '/me', { auth: `Bearer ${idToken({ sub: 'x', token_use: 'access' })}` })).status, 401, 'an access token');
  const me = await t.call('GET', '/me', { auth: t.roger });
  assert.equal(me.status, 200); assert.deepEqual(me.body, { email: 'r@example.com', groups: [] });
});

test('a family: create it, add kids, and see it all from /me', async () => {
  const t = setup(), { g, sam } = await family(t);
  assert.equal(g.kind, 'family'); assert.equal(g.pictures, false); assert.ok(validCode(g.code), g.code);
  assert.deepEqual(sam.pictures.length, 2); assert.notEqual(sam.pictures[0], sam.pictures[1]);
  const me = (await t.call('GET', '/me', { auth: t.roger })).body;
  assert.equal(me.groups.length, 1); assert.deepEqual(me.groups[0].kids.map(k => k.nick), ['Sam', 'Ava'], 'in the order they were added');
  const cls = (await t.call('POST', '/groups', { auth: t.roger, body: { name: "Ms. Rivera's class", kind: 'class' } })).body;
  assert.equal(cls.pictures, true, 'classes use picture passwords');
  assert.equal((await t.call('POST', '/groups', { auth: t.roger, body: { name: '', kind: 'family' } })).status, 400);
  assert.equal((await t.call('POST', '/groups', { auth: t.roger, body: { name: 'X', kind: 'club' } })).status, 400);
  assert.equal((await t.call('POST', `/groups/${g.id}/kids`, { auth: t.roger, body: { nick: '<script>' } })).status, 400);
});

test("a grown-up can't see or change someone else's group or kids", async () => {
  const t = setup(), { g, sam } = await family(t);
  for (const [m, p, body] of [['PATCH', `/groups/${g.id}`, { name: 'Mine now' }], ['DELETE', `/groups/${g.id}`], ['POST', `/groups/${g.id}/kids`, { nick: 'Spy' }],
    ['PATCH', `/kids/${sam.id}`, { nick: 'Spy' }], ['DELETE', `/kids/${sam.id}`], ['GET', `/groups/${g.id}/progress`]])
    assert.equal((await t.call(m, p, { auth: t.other, body })).status, 404, `${m} ${p}`);
  assert.equal((await t.call('GET', '/me', { auth: t.other })).body.groups.length, 0);
});

test('a kid signs in with the group code, plays, and progress merges across devices', async () => {
  const t = setup(), { g, sam } = await family(t);
  const join = await t.call('GET', `/join/${g.code.toUpperCase().replace(/-/g, ' ')}`);   // kids type codes loosely
  assert.equal(join.status, 200); assert.equal(join.body.group.pictures, false);
  assert.deepEqual(Object.keys(join.body.kids[0]).sort(), ['id', 'look', 'nick'], 'no secrets in the kid list');
  const tablet = (await t.call('POST', `/join/${g.code}/kids/${sam.id}`)).body.token, phone = (await t.call('POST', `/join/${g.code}/kids/${sam.id}`)).body.token;
  assert.ok(tablet && phone && tablet !== phone);
  assert.equal((await t.call('PUT', '/play/progress', { auth: `Device ${tablet}`, body: { progress: { stars: { 'parts.roots': 500, 'parts.stem': 600 }, critters: { owl: 900 } } } })).status, 200);
  const r = await t.call('PUT', '/play/progress', { auth: `Device ${phone}`, body: { progress: { stars: { 'parts.roots': 300, 'seed.peel': 700 } } } });
  assert.deepEqual(r.body.progress.stars, { 'parts.roots': 300, 'parts.stem': 600, 'seed.peel': 700 }, 'union, earliest time wins');
  assert.deepEqual((await t.call('GET', '/play', { auth: `Device ${tablet}` })).body.progress.critters, { owl: 900 });
  const prog = (await t.call('GET', `/groups/${g.id}/progress`, { auth: t.roger })).body.kids.find(k => k.id === sam.id);
  assert.equal(Object.keys(prog.progress.stars).length, 3, 'the grown-up sees it too');
  assert.equal((await t.call('PUT', '/play/progress', { auth: `Device ${tablet}`, body: { progress: { stars: { 'bad id!': 1 } } } })).status, 400);
  assert.equal((await t.call('POST', '/play/signout', { auth: `Device ${phone}` })).status, 200);
  assert.equal((await t.call('GET', '/play', { auth: `Device ${phone}` })).status, 401, 'signed out');
  assert.equal((await t.call('GET', '/play', { auth: `Device ${tablet}` })).status, 200, 'the other device stays in');
});

test('picture passwords: right pictures sign in, wrong ones count, five misses lock for a while', async () => {
  const t = setup(), { g, ava } = await family(t, 'class');
  assert.equal((await t.call('POST', `/join/${g.code}/kids/${ava.id}`)).status, 401);
  const wrong = [ava.pictures[1], ava.pictures[0]];
  for (let i = 0; i < 3; i++) assert.equal((await t.call('POST', `/join/${g.code}/kids/${ava.id}`, { body: { pictures: wrong } })).status, 401);   // 4 misses so far
  assert.equal((await t.call('POST', `/join/${g.code}/kids/${ava.id}`, { body: { pictures: ava.pictures } })).status, 200);
  assert.equal((await t.call('POST', `/join/${g.code}/kids/${ava.id}`, { body: { pictures: wrong } })).status, 401, 'the fifth miss');
  assert.equal((await t.call('POST', `/join/${g.code}/kids/${ava.id}`, { body: { pictures: ava.pictures } })).status, 429, 'even with the right ones, for now');
});

test('resetting pictures signs the kid out everywhere; removing a kid or group removes everything', async () => {
  const t = setup(), { g, sam, ava } = await family(t);
  const tok = (await t.call('POST', `/join/${g.code}/kids/${sam.id}`)).body.token;
  await t.call('PATCH', `/kids/${sam.id}`, { auth: t.roger, body: { resetPictures: true } });
  assert.equal((await t.call('GET', '/play', { auth: `Device ${tok}` })).status, 401);
  await t.call('DELETE', `/kids/${ava.id}`, { auth: t.roger });
  assert.ok(![...t.store.rows.values()].some(r => r.pk === `KID#${ava.id}` || r.sk === `KID#${ava.id}`));
  await t.call('DELETE', `/groups/${g.id}`, { auth: t.roger });
  assert.equal((await t.call('GET', `/join/${g.code}`)).status, 404, 'the old code stops working');
  assert.deepEqual([...t.store.rows.values()].filter(r => !r.pk.startsWith('ADULT#') && !r.pk.startsWith('TOKEN#') && !r.pk.startsWith('RATE#')), []);
});

test('a new group code retires the old one; deleting the account deletes everything', async () => {
  const t = setup(), { g } = await family(t);
  const g2 = (await t.call('PATCH', `/groups/${g.id}`, { auth: t.roger, body: { newCode: true } })).body;
  assert.notEqual(g2.code, g.code);
  assert.equal((await t.call('GET', `/join/${g.code}`)).status, 404); assert.equal((await t.call('GET', `/join/${g2.code}`)).status, 200);
  await t.call('DELETE', '/me', { auth: t.roger });
  assert.deepEqual([...t.store.rows.values()].filter(r => !r.pk.startsWith('RATE#') && !r.pk.startsWith('TOKEN#')), []);
});

test('guessing group codes is limited per address', async () => {
  const t = setup(), { g } = await family(t);
  for (let i = 0; i < 20; i++) assert.equal((await t.call('GET', `/join/${newCode()}`, { ip: '9.9.9.9' })).status, 404);
  assert.equal((await t.call('GET', `/join/${g.code}`, { ip: '9.9.9.9' })).status, 429, 'too many misses, even for a real code');
  assert.equal((await t.call('GET', `/join/${g.code}`, { ip: '8.8.8.8' })).status, 200, 'other addresses are fine');
});

test('the rules: merging, cleaning, codes', () => {
  assert.deepEqual(mergeProgress({ stars: { a: 1 } }, { stars: { a: 500 } }).stars, { a: 500 }, 'a time beats an old-style 1');
  assert.deepEqual(mergeProgress({}, {}), { stars: {}, badges: {}, critters: {}, gardenSeen: {}, hallSeen: {} });
  assert.equal(cleanProgress([]), null); assert.equal(cleanProgress({ stars: { a: -1 } }), null); assert.equal(cleanProgress({ stars: { a: 'x' } }), null);
  assert.deepEqual(cleanProgress({ stars: { 'quiz.q1': true }, junk: 1 }).stars, { 'quiz.q1': 1 }, 'unknown keys dropped');
  assert.equal(normalCode('  Maple  Otter—Pond 42 '), 'maple-otter-pond-42');
  for (let i = 0; i < 50; i++) assert.ok(validCode(newCode()));
});

test('unknown routes are 404, bad JSON is 400, and nothing ever answers 403', async () => {
  const t = setup();
  const cfg = await routes({ store: memoryStore(), verify: async () => null, config: { region: 'us-east-1', clientId: 'abc' } })({ method: 'GET', path: '/api/config' });
  assert.deepEqual(cfg.body, { region: 'us-east-1', clientId: 'abc' });
  assert.equal((await t.call('GET', '/nowhere')).status, 404);
  const r = await routes({ store: memoryStore(), verify: async () => null })({ method: 'POST', path: '/api/join/a-b-c-12/kids/x', body: '{oops', headers: {} });
  assert.equal(r.status, 400);
});
