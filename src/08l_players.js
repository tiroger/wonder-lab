/* ============ Kids: "Who's playing?", picture passwords, and sync ============ */
// A kid joins their family or class with its group code (typed, or a login card's QR link to #/join/<code>), taps their
// name, and taps their 2 secret pictures if the group uses them. From then on their progress lives under their own key
// on this device and syncs to the API a moment after each change, so it follows them to any device.
const WHO_PLAYING = 'Who\'s playing today? Tap your name!';
const TYPE_CODE = 'Type your group code, or scan your login card.';
const CODE_UNKNOWN = 'Hmm, I don\'t know that code. Check it and try again!';
const TAP_PICTURES = 'Tap your two secret pictures, in order!';
const PICTURES_WRONG = 'Not quite! Tap your pictures again, in order.';
const TOO_MANY = 'Let\'s take a little break. Try again soon, or ask your grown-up for help!';
const KEEP_STARS = 'I found stars from playing without signing in. Add them to your stars?';
const SIGN_IN_AGAIN = 'Let\'s sign in again! Type your group code. Your grown-up can help.';
const PLAYER_KEY = 'wonderlab.player', GROUP_KEY = 'wonderlab.group', GUEST_KEY = 'wonderlab.v1';
const DEMO_CODE = 'sunny-otter-pond-00';
const normalCode = c => String(c || '').toLowerCase().trim().replace(/[\s_–—]+/g, '-').replace(/-+/g, '-');

const Player = {
  p: store2.get(PLAYER_KEY),   // { token, kid: { id, nick, look }, group: { name, code }, demo }
  get on() { return !!(this.p && this.p.token); },
  get key() { return this.p ? `wonderlab.kid.${this.p.kid.id}` : GUEST_KEY; },
  // play as this kid: their own progress on this device, the device's settings, their nickname for Pip
  begin(p) { this.p = p; store2.set(PLAYER_KEY, p); Store.switchTo(this.key, { name: p.kid.nick }); App.greeted = false; Settings.apply(); },
  end() {
    const p = this.p; this.p = null; store2.set(PLAYER_KEY, null); Store.switchTo(GUEST_KEY); App.greeted = false; Settings.apply();
    if (p && p.token) Api.call('POST', '/play/signout', null, { device: p.token }).catch(() => {});
  },
};

// ---------- sync: a moment after every save, send this kid's progress; merge back whatever the API knows ----------
const Sync = {
  timer: null, busy: false,
  progress() { const d = Store.data; return Object.fromEntries(PROGRESS_MAPS.map(k => [k, d[k] || {}])); },
  schedule() { if (!Player.on) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 2000); },
  take(remote) {   // merge the API's copy into ours; anything new (a star earned on another device) shows up here
    const merged = mergeProgress(this.progress(), remote), before = JSON.stringify(this.progress());
    Object.assign(Store.data, merged); Store.save(true);
    if (JSON.stringify(merged) !== before) refresh();
  },
  async push() {
    if (!Player.on || this.busy) return; this.busy = true;
    try { this.take((await Api.call('PUT', '/play/progress', { progress: this.progress() }, { device: Player.p.token })).progress); }
    catch (e) { if (e.status === 401) lostPlayer(); else this.timer = setTimeout(() => this.push(), 30000); }   // offline: try again later
    this.busy = false;
  },
  async pull() {
    if (!Player.on) return;
    try { this.take((await Api.call('GET', '/play', null, { device: Player.p.token })).progress); }
    catch (e) { if (e.status === 401) lostPlayer(); }
  },
};
// the grown-up removed this kid or gave them new pictures: back to "Who's playing?"
function lostPlayer() { const p = Player.p; try { localStorage.removeItem(Player.key); } catch (e) {} Player.p = null; store2.set(PLAYER_KEY, null); Store.switchTo(GUEST_KEY); Settings.apply(); Players.st = { step: 'code' }; if (p) Players.lost = true; go('#/players'); }

// ---------- the "Who's playing?" screen (#/players, #/join/<code>) ----------
const Players = { st: { step: 'code' }, busy: false, lost: false };
function showPlayers(code) {
  leaveActivity(); App.view = 'players'; App.topic = null; App.act = null; applyAccent(null);
  const root = document.documentElement; root.classList.remove('at-home', 'in-topic', 'at-hall', 'at-grownups', 'at-privacy'); root.classList.add('at-players');
  $('#crumbTopic').textContent = "Who’s playing?"; refresh();
  const g = store2.get(GROUP_KEY);
  // signed out because the grown-up removed them or reset their pictures: say so, and ask for the code again
  if (Players.lost) store2.set(GROUP_KEY, null);
  if (code) lookup(code);
  else if (g && !Players.lost) lookup(g.code, true);
  else { Players.st = { step: 'code' }; renderPlayers(); say(Players.lost ? SIGN_IN_AGAIN : TYPE_CODE, { lock: false }); }
  Players.lost = false;
}
async function lookup(code, quiet) {
  const c = normalCode(code), demo = c === DEMO_CODE;
  Players.busy = true; renderPlayers();
  try {
    const r = await Api.call('GET', `/join/${encodeURIComponent(c)}`, null, { anon: true, demo });
    Players.st = { step: 'kids', code: c, demo, group: r.group, kids: r.kids, pictures: r.pictures };
    store2.set(GROUP_KEY, { code: c, name: r.group.name });
    if (location.hash !== '#/players') history.replaceState(null, '', '#/players');   // keep the code out of the address bar
    say(WHO_PLAYING, { lock: false });
  } catch (e) {
    if (quiet && e.status === 404) store2.set(GROUP_KEY, null);   // the remembered code was changed by the grown-up
    Players.st = { step: 'code', typed: c };
    say(e.status === 429 ? TOO_MANY : e.status === 404 ? CODE_UNKNOWN : TYPE_CODE, { lock: false });
  }
  Players.busy = false; renderPlayers();
}
async function chooseKid(kid) {
  Sound.pop();
  if (Players.st.group.pictures) { Players.st = { ...Players.st, step: 'pics', kid, chosen: [] }; renderPlayers(); say(TAP_PICTURES, { lock: false }); return; }
  signInAs(kid, []);
}
async function signInAs(kid, pictures) {
  const st = Players.st; Players.busy = true; renderPlayers();
  try {
    const r = await Api.call('POST', `/join/${encodeURIComponent(st.code)}/kids/${encodeURIComponent(kid.id)}`, { pictures }, { anon: true, demo: st.demo });
    const guestStars = guestStarCount();
    Player.begin({ token: r.token, kid: r.kid, group: { name: r.group.name, code: st.code }, demo: st.demo });
    Sound.star();
    if (guestStars && !Store.data.guestAsked && !st.demo) { Players.st = { step: 'keep', kid: r.kid, guestStars }; Players.busy = false; renderPlayers(); say(KEEP_STARS, { lock: false }); return; }
    await Sync.pull(); Sync.schedule();
    Players.busy = false; go('#/');
  } catch (e) {
    Players.busy = false;
    if (e.status === 401) { Sound.oops(); Players.st = { ...st, chosen: [], shake: Loop.t }; renderPlayers(); say(PICTURES_WRONG, { lock: false }); }
    else if (e.status === 429) { Players.st = { ...st, chosen: [] }; renderPlayers(); say(TOO_MANY, { lock: false }); }
    else if (e.status === 404) lookup(st.code);
    else { renderPlayers(); }
  }
}
function guestStarCount() { try { const g = JSON.parse(localStorage.getItem(GUEST_KEY)); return Object.keys((g && g.stars) || {}).length; } catch (e) { return 0; } }
// stars earned as a guest on this device move into the kid's profile, once
async function keepGuestStars(yes) {
  Store.data.guestAsked = true;
  if (yes) {
    try {
      const g = JSON.parse(localStorage.getItem(GUEST_KEY)) || {};
      Object.assign(Store.data, mergeProgress(Sync.progress(), g)); if (!Store.data.last && g.last) Store.data.last = g.last;
      for (const k of PROGRESS_MAPS) g[k] = {}; g.last = ''; localStorage.setItem(GUEST_KEY, JSON.stringify(g));   // moved, so no one else claims them
    } catch (e) {}
    Sound.grow(2);
  } else Sound.pop();
  Store.save(true); await Sync.pull(); Sync.schedule(); go('#/');
}
function playAsGuest() { Sound.pop(); if (Player.on) Player.end(); go('#/'); }
function forgetGroup() { Sound.pop(); store2.set(GROUP_KEY, null); Players.st = { step: 'code' }; renderPlayers(); say(TYPE_CODE, { lock: false }); }

function renderPlayers() {
  const box = $('#players'); if (!box || App.view !== 'players') return;
  const st = Players.st, busy = Players.busy ? 'disabled' : '';
  const foot = `<div class="pl-foot">${st.step !== 'code' ? `<button class="linkish" id="plOther" type="button">Use a different code</button>` : ''}<button class="linkish" id="plGuest" type="button">${Player.on ? 'Stop playing as ' + esc(Player.p.kid.nick) : 'Play without signing in'}</button></div>`;
  if (st.step === 'code') {
    box.innerHTML = `<div class="card pl-card"><h2>Who's playing?</h2>
      <form id="plCode" class="pl-codeform"><label for="plCodeIn">Your group code</label>
        <input id="plCodeIn" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="maple-otter-pond-42" value="${esc(st.typed || '')}">
        <button class="btn go" ${busy}>Let's go!</button></form>
      <p class="pl-small">Your grown-up has the code. It's on your login card too.</p>
      <div class="pl-demo"><button class="btn" id="plDemo" type="button" ${busy}>Play the demo</button><small>Just visiting? Try it with a sample class.</small></div>
      ${foot}</div>`;
    $('#plCode').onsubmit = e => { e.preventDefault(); Sound.tap(4); lookup($('#plCodeIn').value); };
    $('#plDemo').onclick = () => { Sound.tap(5); DemoApi.load(); lookup(DEMO_CODE); };
  } else if (st.step === 'kids') {
    box.innerHTML = `<div class="card pl-card"><h2>Who's playing?</h2><p class="pl-group">${esc(st.group.name)}${st.demo ? ' <span class="gu-chip">Demo</span>' : ''}</p>
      <div class="pl-kids">${st.kids.map(k => `<button class="pl-kid" data-kid="${esc(k.id)}" type="button" ${busy}><canvas width="160" height="160" data-look="${esc(k.look)}" aria-hidden="true"></canvas><span>${esc(k.nick)}</span></button>`).join('') || '<p>No one here yet. Ask your grown-up to add you!</p>'}</div>
      ${foot}</div>`;
    box.querySelectorAll('.pl-kid').forEach(b => { b.onclick = () => chooseKid(st.kids.find(k => k.id === b.dataset.kid)); });
  } else if (st.step === 'pics') {
    const hint = st.demo && DemoApi.load().groups.flatMap(g => g.kids).find(k => k.id === st.kid.id);
    box.innerHTML = `<div class="card pl-card"><h2>Hi, ${esc(st.kid.nick)}!</h2><p class="pl-group">Tap your 2 secret pictures, in order.</p>
      <div class="pl-chosen" aria-live="polite">${[0, 1].map(i => st.chosen[i] ? `<canvas width="96" height="96" data-pic="${st.chosen[i]}" aria-label="${st.chosen[i]}"></canvas>` : '<i></i>').join('')}</div>
      <div class="pl-pics ${st.shake && Loop.t - st.shake < .6 ? 'shake' : ''}">${st.pictures.map(p => `<button class="pl-pic" data-pic-btn="${p}" type="button" aria-label="${p}" ${busy}><canvas width="120" height="120" data-pic="${p}" aria-hidden="true"></canvas></button>`).join('')}</div>
      ${hint ? `<p class="pl-small">Demo secret: ${hint.pictures.join(', then ')}</p>` : ''}
      <div class="pl-foot"><button class="linkish" id="plBack" type="button">That's not me</button></div></div>`;
    box.querySelectorAll('[data-pic-btn]').forEach(b => { b.onclick = () => {
      if (st.chosen.length >= 2 || Players.busy) return;
      Sound.tap(3 + st.chosen.length * 2); st.chosen.push(b.dataset.picBtn); renderPlayers();
      if (st.chosen.length === 2) setTimeout(() => signInAs(st.kid, st.chosen.slice()), 350);
    }; });
    $('#plBack').onclick = () => { Sound.pop(); Players.st = { ...st, step: 'kids' }; renderPlayers(); };
  } else if (st.step === 'keep') {
    box.innerHTML = `<div class="card pl-card"><h2>Hi, ${esc(st.kid.nick)}!</h2>
      <p class="pl-group">This device has ${st.guestStars} star${st.guestStars === 1 ? '' : 's'} from playing without signing in.</p>
      <div class="pl-keep"><button class="btn go" id="plKeep" type="button">Yes, add them!</button><button class="btn" id="plFresh" type="button">No thanks</button></div></div>`;
    $('#plKeep').onclick = () => keepGuestStars(true); $('#plFresh').onclick = () => keepGuestStars(false);
  }
  box.querySelectorAll('canvas[data-look]').forEach(cv => drawKidPip(cv, cv.dataset.look));
  box.querySelectorAll('canvas[data-pic]').forEach(cv => drawPicture(cv, cv.dataset.pic));
  if ($('#plGuest')) $('#plGuest').onclick = playAsGuest;
  if ($('#plOther')) $('#plOther').onclick = forgetGroup;
  if (st.step === 'code' && !Players.busy) setTimeout(() => { const i = $('#plCodeIn'); if (i && document.activeElement !== i) i.focus({ preventScroll: true }); }, 0);
}

// ---------- the player chip in the header: who's playing, tap to switch ----------
function renderPlayerChip() {
  const b = $('#playerBtn'); if (!b) return;
  const p = Player.p;
  b.innerHTML = p ? `<canvas width="72" height="72" aria-hidden="true"></canvas><span>${esc(p.kid.nick)}</span>${p.demo ? '<small>Demo</small>' : ''}`
    : `<canvas width="72" height="72" aria-hidden="true"></canvas><span>Who\u2019s playing?</span><b class="q" aria-hidden="true">?</b>`;
  b.setAttribute('aria-label', p ? `Playing as ${p.kid.nick}. Switch player` : "Who\u2019s playing? Sign in");
  drawKidPip(b.querySelector('canvas'), p ? p.kid.look : 'sun');
}
function playersInit() {
  Store.onSave = () => Sync.schedule();
  $('#playerBtn').onclick = () => { Sound.pop(); go('#/players'); };
  addEventListener('online', () => Sync.schedule());
  renderPlayerChip();
  if (Player.on) Sync.pull();
}
