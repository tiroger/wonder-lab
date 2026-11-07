// Exercise the actual browser storage/sync code with controlled network replies and timers.
// These tests live with the API suite so CI always runs the client/server merge contract too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { mergeProgress as serverMerge } from '../lib/rules.mjs';

const source = name => readFileSync(new URL(`../../src/${name}`, import.meta.url), 'utf8');
function client() {
  const storage = new Map(), timers = new Map(), calls = []; let next = 0, now = 1000, refreshes = 0;
  const c = vm.createContext({ console, window: {}, Date: class extends Date { static now() { return now; } },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    setTimeout(fn, delay) { const id = ++next; timers.set(id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); },
    App: { view: 'topic' }, refresh() { refreshes++; }, renderCritters() {}, say() {}, mount() {}, Sound: { whoosh() {}, pop() {}, grow() {} },
    go() {},
  });
  vm.runInContext(source('01_core.js').split('/* ============ sound kit')[0], c);
  vm.runInContext(source('08j_api.js') + source('08b_settings.js') + source('08l_players.js'), c);
  c.queue = (method, path, body, opts) => new Promise((resolve, reject) => calls.push({ method, path, body, opts, resolve, reject }));
  vm.runInContext("Api.call = queue; Settings.apply = () => {}; Settings.renderProgress = () => {}; const TOPICS = [{ activities: [{ stars: [{ id: 'parts.roots' }], badge: { id: 'b.parts' } }], master: { id: 'b.botanist' } }]; Store.onSave = () => Sync.schedule();", c);
  const run = code => vm.runInContext(code, c), json = code => JSON.parse(run(`JSON.stringify(${code})`));
  const begin = id => { c.profile = { token: `token-${id}`, kid: { id, nick: id } }; run('Player.begin(profile)'); };
  const tick = () => { const [id, timer] = timers.entries().next().value || []; assert.ok(timer, 'a sync was scheduled'); timers.delete(id); return timer.fn(); };
  return { run, json, begin, calls, timers, tick, storage, c, advance() { now += 100; }, get refreshes() { return refreshes; } };
}

for (const method of ['push', 'pull']) {
  for (const result of ['success', 'unauthorized']) test(`a stale ${method} ${result} cannot change the next player`, async () => {
    const t = client(); t.begin('a'); t.run("Store.data.stars = { 'a.star': 10 }");
    const pending = t.run(`Sync.${method}()`);
    t.begin('b'); t.run("Store.data.stars = { 'b.star': 20 }");
    if (result === 'success') t.calls[0].resolve({ progress: { stars: { 'a.star': 10 } } });
    else t.calls[0].reject({ status: 401 });
    await pending;
    assert.equal(t.run('Player.p.kid.id'), 'b'); assert.deepEqual(t.json('Store.data.stars'), { 'b.star': 20 });
    assert.equal(t.run('Store.key'), 'wonderlab.kid.b');
  });
}

test('signing out ignores a pending reply and cancels the old player’s timer', async () => {
  const t = client(); t.begin('a'); t.run('Sync.schedule()');
  const pending = t.run('Sync.pull()'); t.run('Player.end()');
  t.calls[0].resolve({ progress: { stars: { 'a.star': 10 } } }); await pending;
  assert.equal(t.run('Player.on'), false); assert.deepEqual(t.json('Store.data.stars'), {}); assert.equal(t.timers.size, 0);
});

test('a new player can sync while the previous player’s request is still pending', async () => {
  const t = client(); t.begin('a'); const a = t.run('Sync.push()');
  t.begin('b'); const b = t.run('Sync.push()');
  t.calls[0].resolve({ progress: { stars: { a: 10 } } }); await a;
  assert.ok(t.run('Sync.busy'), 'the old completion does not unlock the new request');
  t.calls[1].resolve({ progress: { stars: { b: 20 } } }); await b;
  assert.deepEqual(t.json('Store.data.stars'), { b: 20 });
});

test('changes made during a slow upload are sent after it finishes', async () => {
  const t = client(); t.begin('a'); t.run('Store.data.stars.a = 10');
  const first = t.run('Sync.push()');
  t.run('Store.data.stars.b = 20; Store.save()'); t.tick(); // debounce expires while the upload is busy
  assert.deepEqual(JSON.parse(JSON.stringify(t.calls[0].body.progress.stars)), { a: 10 }, 'the request holds a snapshot');
  t.calls[0].resolve({ progress: { stars: { a: 10 } } }); await first;
  t.tick(); assert.equal(t.calls.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(t.calls[1].body.progress.stars)), { a: 10, b: 20 });
  t.calls[1].resolve({ progress: t.calls[1].body.progress });
});

test('network failures and write conflicts retain local progress and retry', async () => {
  for (const error of [new Error('offline'), { status: 409 }]) {
    const t = client(); t.begin('a'); t.run('Store.data.stars.a = 10'); const pending = t.run('Sync.push()');
    t.calls[0].reject(error); await pending;
    assert.deepEqual(t.json('Store.data.stars'), { a: 10 });
    assert.equal([...t.timers.values()][0].delay, 30000);
    t.begin('b'); assert.equal(t.timers.size, 0, 'a retry cannot follow the old player into the next session');
  }
});

test('an unchanged sync reply leaves the current scene alone', () => {
  const t = client(); t.begin('a'); t.run('Sync.take({})'); assert.equal(t.refreshes, 0);
  t.run('Sync.take({ stars: { a: 10 } })'); assert.equal(t.refreshes, 1);
  t.run('Sync.take({ stars: { a: 10 } })'); assert.equal(t.refreshes, 1);
});

test('Settings resets survive late replies, preserve settings, and allow stars to be earned again', async () => {
  const t = client(); t.begin('a');
  t.run("Store.data.stars = { 'parts.roots': 10, 'seed.coat': 12 }; Store.data.badges = { 'b.parts': 14, 'b.botanist': 16 }; Store.data.soundVol = .4;");
  const pending = t.run('Sync.pull()'); t.run('Settings.resetActivity(TOPICS[0].activities[0])');
  t.calls[0].resolve({ progress: { stars: { 'parts.roots': 10 }, badges: { 'b.parts': 14 } } }); await pending;
  assert.deepEqual(t.json('Store.data.stars'), { 'seed.coat': 12 }); assert.deepEqual(t.json('Store.data.badges'), {});
  t.run("Store.data.stars['parts.roots'] = Store.data.resets['parts.roots'] + 1; Sync.take({ stars: { 'parts.roots': 10 } })");
  assert.ok(t.run("Store.data.stars['parts.roots'] > 10"));
  t.advance(); t.run('Store.data.critters = { owl: 10 }; Store.data.hallSeen = { badge: 1 }; Settings.resetAll()');
  for (const k of ['stars', 'badges', 'critters', 'gardenSeen', 'hallSeen']) assert.deepEqual(t.json(`Store.data.${k}`), {});
  assert.equal(t.run('Store.data.soundVol'), .4);
  assert.ok(JSON.parse(t.storage.get('wonderlab.kid.a')).resets['*']);
});

test('guest-star import does not import the guest’s reset markers into a kid’s account', async () => {
  const t = client(); t.begin('a'); t.run('Store.data.stars.existing = 10');
  t.storage.set('wonderlab.v1', JSON.stringify({ stars: { guest: 30 }, resets: { '*': 20 } }));
  const pending = t.run('keepGuestStars(true)'); t.calls[0].resolve({ progress: {} }); await pending;
  assert.deepEqual(t.json('Store.data.stars'), { existing: 10, guest: 30 }); assert.deepEqual(t.json('Store.data.resets'), {});
});

test('browser, demo and server apply identical reset-aware merge rules', async () => {
  const t = client();
  const a = { stars: { old: 10, again: 10, keep: 1 }, resets: { old: 20, again: 20 }, hallSeen: { old: 1 } };
  const b = { stars: { old: 10, again: 30, fresh: 40 }, resets: { old: 15 } };
  t.c.left = a; t.c.right = b;
  assert.deepEqual(t.json('mergeProgress(left, right)'), serverMerge(a, b));
  assert.deepEqual(serverMerge(a, b), serverMerge(b, a), 'merge order cannot change the result');
  t.run("DemoApi.d = { groups: [{ kids: [{ id: 'a', progress: left }] }] }");
  const demo = await t.run("DemoApi.handle('PUT', '/play/progress', { progress: right }, 'demo:a')");
  assert.deepEqual(JSON.parse(JSON.stringify(demo.progress)), serverMerge(a, b));
});
