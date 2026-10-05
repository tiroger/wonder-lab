/* ============ The grown-up page (#/grownups) ============ */
// For parents and teachers: sign in with an emailed code, make a family or a class, add kids, hand out the group code or
// print login cards. Plain, calm HTML for adults: no Pip narration here. "Try the demo" runs it all in this browser.
const GU = { flow: null, me: null, busy: false, msg: '', starsOf: {}, invites: null, invited: '' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const joinLink = code => `${location.origin}/#/join/${code}`;
const KIND_LABEL = { family: 'Family', class: 'Class' };

function showGrownups() {
  leaveActivity(); App.view = 'grownups'; App.topic = null; App.act = null; applyAccent(null);
  const root = document.documentElement; root.classList.remove('at-home', 'in-topic', 'at-hall', 'at-privacy', 'at-players'); root.classList.add('at-grownups');
  $('#crumbTopic').textContent = 'Grown-ups'; refresh();
  GU.msg = ''; renderGrownups(); if (Grownup.signedIn) loadGroups();
}
function showPrivacy() {
  leaveActivity(); App.view = 'privacy'; App.topic = null; App.act = null; applyAccent(null);
  const root = document.documentElement; root.classList.remove('at-home', 'in-topic', 'at-hall', 'at-grownups', 'at-players'); root.classList.add('at-privacy');
  $('#crumbTopic').textContent = 'Privacy'; refresh();
}
async function loadGroups() {
  try {
    GU.me = await Api.call('GET', '/me');
    GU.invites = GU.me.admin ? (await Api.call('GET', '/invites')).invites : null;
    for (const g of GU.me.groups) { const p = await Api.call('GET', `/groups/${g.id}/progress`); for (const k of p.kids) GU.starsOf[k.id] = Object.keys(k.progress.stars || {}).length; }
  } catch (e) { GU.msg = e.message; }
  renderGrownups();
}
// run an action, show its error if it fails, then redraw
async function guDo(fn) {
  if (GU.busy) return; GU.busy = true; GU.msg = ''; renderGrownups();
  try { await fn(); } catch (e) { GU.msg = e.status === 401 && !Grownup.signedIn ? "Please sign in again." : e.message; }
  GU.busy = false; renderGrownups();
}

function renderGrownups() {
  const box = $('#grownups'); if (!box || App.view !== 'grownups') return;
  const err = GU.msg ? `<p class="gu-msg" role="alert">${esc(GU.msg)}</p>` : '';
  if (!Grownup.signedIn) {
    const f = GU.flow;
    box.innerHTML = `<div class="card gu-card gu-signin">
      <h2>For grown-ups</h2>
      <p>Set up a profile for each child, or for a whole class. Their stars then follow them to any device, even an incognito window.</p>
      <p class="gu-fine">Wonder Lab is invite-only for now. If you've been invited, sign in with that email.</p>
      ${!f ? `<form id="guEmail" class="gu-form"><label for="guEmailIn">Your email</label>
        <div class="gu-row"><input id="guEmailIn" type="email" autocomplete="email" required placeholder="you@example.com"><button class="btn go" ${GU.busy ? 'disabled' : ''}>Send me a code</button></div>
        <small>No password. We email you a 6-digit code each time you sign in.</small></form>`
      : `<form id="guCode" class="gu-form"><label for="guCodeIn">We emailed a 6-digit code to <b>${esc(f.email)}</b></label>
        <div class="gu-row"><input id="guCodeIn" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" maxlength="8" required placeholder="123456"><button class="btn go" ${GU.busy ? 'disabled' : ''}>Sign in</button></div>
        <small>Can't find it? Check the spam folder. <button type="button" class="linkish" id="guAgain">Use a different email</button></small></form>`}
      ${err}
      <div class="gu-demo"><b>Just looking?</b> <button class="btn" id="guDemo" type="button">Try the demo</button><small>A sample class to explore. Nothing leaves this browser.</small></div>
      <p class="gu-fine">We keep your email only to send sign-in codes. Kids' profiles hold a nickname, a Pip color and their progress, nothing else. <a href="#/privacy">Privacy</a></p>
    </div>`;
    const ef = $('#guEmail'), cf = $('#guCode');
    if (ef) ef.onsubmit = e => { e.preventDefault(); const email = $('#guEmailIn').value.trim(); guDo(async () => { GU.flow = await Grownup.start(email); }); };
    if (cf) { cf.onsubmit = e => { e.preventDefault(); const code = $('#guCodeIn').value.trim(); guDo(async () => { try { await Grownup.finish(GU.flow, code); GU.flow = null; await loadGroups(); } catch (x) { throw new Error(codeTrouble(x)); } }); }; setTimeout(() => $('#guCodeIn') && $('#guCodeIn').focus(), 0); }
    const again = $('#guAgain'); if (again) again.onclick = () => { GU.flow = null; GU.msg = ''; renderGrownups(); };
    $('#guDemo').onclick = () => { Grownup.startDemo(); loadGroups(); };
    return;
  }
  const me = GU.me;
  box.innerHTML = `${Grownup.demo ? `<div class="gu-ribbon" role="note"><b>Demo:</b> saved in this browser only. <button class="linkish" id="guDemoReset" type="button">Reset the demo</button></div>` : ''}
    <div class="gu-top"><span>Signed in as <b>${esc(Grownup.s.email)}</b></span><button class="btn" id="guOut" type="button">${Grownup.demo ? 'Leave the demo' : 'Sign out'}</button></div>
    ${err}
    ${!me ? '<p class="gu-loading">Loading…</p>' : me.groups.map(groupCard).join('') || '<div class="card gu-card"><h2>Welcome!</h2><p>Make a family for your own kids, or a class for your students. You can have both.</p></div>'}
    ${me ? `<div class="gu-add"><button class="btn go" id="guAddFamily" type="button">Add a family</button><button class="btn" id="guAddClass" type="button">Add a class</button></div>
    ${GU.invites ? invitesCard() : ''}
    <div class="card gu-card gu-account"><h3>Your account</h3><p>Deleting your account deletes every group, every kid profile and their progress, right away.</p>
      <button class="btn danger" id="guDelete" type="button">${Grownup.demo ? 'Delete the demo data' : 'Delete my account'}</button></div>` : ''}`;
  box.querySelectorAll('canvas[data-look]').forEach(cv => drawKidPip(cv, cv.dataset.look));
  box.querySelectorAll('canvas[data-pic]').forEach(cv => drawPicture(cv, cv.dataset.pic));
  $('#guOut').onclick = () => guDo(async () => { await Grownup.signOut(); GU.me = null; });
  if ($('#guDemoReset')) $('#guDemoReset').onclick = () => guDo(async () => { DemoApi.reset(); await loadGroups(); });
  if (!me) return;
  $('#guAddFamily').onclick = () => addGroup('family'); $('#guAddClass').onclick = () => addGroup('class');
  $('#guDelete').onclick = () => guAsk({ title: Grownup.demo ? "Delete the demo data?" : "Delete your account?", text: "Every group, kid profile and their progress will be deleted. This can’t be undone.", ok: 'Delete', danger: true })
    .then(yes => yes && guDo(async () => { await Grownup.deleteAccount(); GU.me = null; }));
  for (const g of me.groups) wireGroup(g);
  if (GU.invites) wireInvites();
}
// for admins: who may make a grown-up account (invite-only). Wonder Lab doesn't email invitations; copy the note instead.
function invitesCard() {
  const note = GU.invited ? `Hi! I've invited you to Wonder Lab. Go to ${location.origin}/#/grownups and sign in with ${GU.invited}. You'll get a 6-digit code by email, with no password needed.` : '';
  return `<section class="card gu-card gu-invites"><h2>Invites</h2>
    <p>Wonder Lab is invite-only. Only these emails (and admins) can make a grown-up account.</p>
    <form class="gu-form" id="guInvite"><label for="guInviteIn">Invite a parent or teacher</label>
      <div class="gu-row"><input id="guInviteIn" type="email" required placeholder="teacher@school.org"><button class="btn go">Invite</button></div></form>
    ${note ? `<div class="gu-note"><p><b>Invite added.</b> Send them this:</p><p class="gu-copytext" id="guNote">${esc(note)}</p><button class="btn" id="guCopyNote" type="button">Copy message</button></div>` : ''}
    <ul class="gu-invlist">${GU.invites.map(i => `<li><span>${esc(i.email)}</span><span class="gu-chip">${i.joined ? 'Joined' : 'Invited'}</span><button class="linkish" data-uninvite="${esc(i.email)}" type="button">Remove</button></li>`).join('') || '<li class="gu-empty">No invites yet.</li>'}</ul>
    <p class="gu-fine">Removing an invite stops someone from signing up. It doesn't delete an account they've already made.</p>
  </section>`;
}
function wireInvites() {
  $('#guInvite').onsubmit = e => { e.preventDefault(); const email = $('#guInviteIn').value.trim().toLowerCase(); guDo(async () => { await Api.call('POST', '/invites', { email }); GU.invited = email; await loadGroups(); }); };
  if ($('#guCopyNote')) $('#guCopyNote').onclick = e => { navigator.clipboard && navigator.clipboard.writeText($('#guNote').textContent); e.target.textContent = 'Copied!'; };
  document.querySelectorAll('[data-uninvite]').forEach(b => { b.onclick = () => guAsk({ title: `Remove the invite for ${b.dataset.uninvite}?`, ok: 'Remove', danger: true })
    .then(yes => yes && guDo(async () => { await Api.call('DELETE', `/invites/${encodeURIComponent(b.dataset.uninvite)}`); GU.invited = ''; await loadGroups(); })); });
}
function codeTrouble(e) {
  if (e.code === 'CodeMismatchException') return "That code didn’t match. Check the email and try again.";
  if (e.code === 'ExpiredCodeException' || e.code === 'NotAuthorizedException') return "That code has expired. Use a different email or send a new code.";
  return e.message;
}
function groupCard(g) {
  const kids = g.kids.map(k => `<li class="gu-kid">
      <canvas width="96" height="96" data-look="${esc(k.look)}" aria-hidden="true"></canvas>
      <span class="gu-nick">${esc(k.nick)}</span>
      <span class="gu-stars" title="Stars earned">${STAR_SVG(true)}${GU.starsOf[k.id] || 0}</span>
      ${g.pictures ? `<span class="gu-pics" aria-label="Secret pictures: ${esc(k.pictures.join(' then '))}">${k.pictures.map(p => `<canvas width="72" height="72" data-pic="${p}" aria-hidden="true"></canvas>`).join('')}</span>` : ''}
      <span class="gu-kid-btns"><button class="linkish" data-edit="${k.id}" type="button">Edit</button><button class="linkish" data-remove="${k.id}" type="button">Remove</button></span>
    </li>`).join('');
  return `<section class="card gu-card gu-group" data-group="${g.id}">
    <div class="gu-ghead"><h2>${esc(g.name)}</h2><span class="gu-chip">${KIND_LABEL[g.kind]}</span><button class="linkish" data-rename type="button">Rename</button></div>
    <div class="gu-code"><span>Group code</span><code>${esc(g.code)}</code><button class="btn" data-copy type="button">Copy</button><button class="linkish" data-newcode type="button">New code</button></div>
    <p class="gu-hint">Kids go to <b>wonderlab.camp</b>, tap <b>Who's playing?</b> and enter this code, or scan their login card.</p>
    <label class="gu-toggle"><input type="checkbox" data-pictures ${g.pictures ? 'checked' : ''}> Secret pictures: each kid taps 2 pictures to sign in${g.kind === 'class' ? ' (keeps classmates out of each other’s profiles)' : ''}</label>
    <ul class="gu-kids">${kids || '<li class="gu-empty">No kids yet. Add one below.</li>'}</ul>
    <form class="gu-addkid" data-addkid><label>Nickname <input name="nick" maxlength="24" required placeholder="${g.kind === 'class' ? "e.g. Maya R." : "e.g. Sam"}"></label>
      <fieldset class="gu-looks"><legend>Pip color</legend>${LOOK_NAMES.map((l, i) => `<label class="gu-look" title="${l}"><input type="radio" name="look" value="${l}" ${i === 0 ? 'checked' : ''}><i style="background:${PIP_LOOKS[l][1]}"></i><span class="sr">${l}</span></label>`).join('')}</fieldset>
      <button class="btn go">Add</button></form>
    <div class="gu-gfoot"><button class="btn" data-print type="button" ${g.kids.length ? '' : 'disabled'}>Print login cards</button><button class="linkish" data-delgroup type="button">Delete this ${g.kind}</button></div>
  </section>`;
}
function wireGroup(g) {
  const el = document.querySelector(`.gu-group[data-group="${g.id}"]`), q = s => el.querySelector(s);
  q('[data-rename]').onclick = () => guAsk({ title: `Rename ${g.name}`, input: g.name, ok: 'Save' }).then(v => v && guDo(async () => { await Api.call('PATCH', `/groups/${g.id}`, { name: v }); await loadGroups(); }));
  q('[data-copy]').onclick = e => { navigator.clipboard && navigator.clipboard.writeText(g.code); e.target.textContent = 'Copied!'; setTimeout(() => { e.target.textContent = 'Copy'; }, 1500); };
  q('[data-newcode]').onclick = () => guAsk({ title: "Make a new group code?", text: "The old code stops working. Kids already signed in stay signed in.", ok: 'New code' })
    .then(yes => yes && guDo(async () => { await Api.call('PATCH', `/groups/${g.id}`, { newCode: true }); await loadGroups(); }));
  q('[data-pictures]').onchange = e => guDo(async () => { await Api.call('PATCH', `/groups/${g.id}`, { pictures: e.target.checked }); await loadGroups(); });
  q('[data-addkid]').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); guDo(async () => { await Api.call('POST', `/groups/${g.id}/kids`, { nick: f.get('nick'), look: f.get('look') }); await loadGroups(); }); };
  q('[data-print]').onclick = () => printCards(g);
  q('[data-delgroup]').onclick = () => guAsk({ title: `Delete ${g.name}?`, text: "Every kid profile in it and their progress will be deleted. This can’t be undone.", ok: 'Delete', danger: true })
    .then(yes => yes && guDo(async () => { await Api.call('DELETE', `/groups/${g.id}`); await loadGroups(); }));
  el.querySelectorAll('[data-remove]').forEach(b => { const k = g.kids.find(x => x.id === b.dataset.remove);
    b.onclick = () => guAsk({ title: `Remove ${k.nick}?`, text: `${k.nick}'s profile and progress will be deleted.`, ok: 'Remove', danger: true }).then(yes => yes && guDo(async () => { await Api.call('DELETE', `/kids/${k.id}`); await loadGroups(); })); });
  el.querySelectorAll('[data-edit]').forEach(b => { const k = g.kids.find(x => x.id === b.dataset.edit); b.onclick = () => editKid(g, k); });
}
function addGroup(kind) {
  guAsk({ title: kind === 'family' ? 'Name your family' : 'Name your class', input: kind === 'family' ? 'Our family' : "Room 12", ok: 'Create' })
    .then(name => name && guDo(async () => { await Api.call('POST', '/groups', { name, kind }); await loadGroups(); }));
}
function editKid(g, k) {
  guAsk({ title: `Edit ${k.nick}`, input: k.nick, looks: k.look, extra: g.pictures ? 'New secret pictures (signs them out on every device)' : '', ok: 'Save' })
    .then(v => v && guDo(async () => { await Api.call('PATCH', `/kids/${k.id}`, { nick: v.text, look: v.look, resetPictures: !!v.extra }); await loadGroups(); }));
}

// a small dialog for confirmations and names; resolves to true, the text, { text, look, extra }, or null
function guAsk({ title, text = '', input = null, looks = null, extra = '', ok = 'OK', danger = false }) {
  return new Promise(resolve => {
    const d = document.createElement('dialog'); d.className = 'gu-dialog';
    d.innerHTML = `<form method="dialog"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}
      ${input != null ? `<input name="text" value="${esc(input)}" maxlength="40" required>` : ''}
      ${looks ? `<fieldset class="gu-looks"><legend>Pip color</legend>${LOOK_NAMES.map(l => `<label class="gu-look"><input type="radio" name="look" value="${l}" ${l === looks ? 'checked' : ''}><i style="background:${PIP_LOOKS[l][1]}"></i><span class="sr">${l}</span></label>`).join('')}</fieldset>` : ''}
      ${extra ? `<label class="gu-toggle"><input type="checkbox" name="extra"> ${esc(extra)}</label>` : ''}
      <div class="gu-dbtns"><button class="btn" value="cancel" formnovalidate>Cancel</button><button class="btn ${danger ? 'danger' : 'go'}" value="ok">${esc(ok)}</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => {
      const f = new FormData(d.querySelector('form')), yes = d.returnValue === 'ok', t = f.get('text');
      d.remove(); if (!yes) return resolve(null);
      if (looks) return resolve({ text: String(t || '').trim(), look: f.get('look'), extra: !!f.get('extra') });
      resolve(input != null ? String(t || '').trim() || null : true);
    });
    d.showModal(); const i = d.querySelector('input[name=text]'); if (i) i.select();
  });
}

// login cards: one per kid, 8 to a page, with the group code, a QR code and the kid's secret pictures
function printCards(g) {
  let sheet = $('#cardsSheet'); if (!sheet) { sheet = document.createElement('div'); sheet.id = 'cardsSheet'; document.body.appendChild(sheet); }
  sheet.innerHTML = g.kids.map(k => `<div class="login-card">
      <div class="lc-head"><b>Wonder <span>Lab</span></b><small>${esc(g.name)}</small></div>
      <div class="lc-body"><canvas width="160" height="160" data-look="${esc(k.look)}"></canvas><div><div class="lc-hi">Hi, ${esc(k.nick)}!</div>
        <div class="lc-step">1. Go to <b>wonderlab.camp</b></div><div class="lc-step">2. Tap <b>Who's playing?</b></div><div class="lc-step">3. Scan me, or type:</div><code>${esc(g.code)}</code></div>
        <canvas class="lc-qr" data-qr="${esc(joinLink(g.code))}"></canvas></div>
      ${g.pictures ? `<div class="lc-pics">My secret pictures: ${k.pictures.map(p => `<canvas width="96" height="96" data-pic="${p}"></canvas>`).join('<span>then</span>')}</div>` : ''}
    </div>`).join('');
  sheet.querySelectorAll('canvas[data-look]').forEach(cv => drawKidPip(cv, cv.dataset.look));
  sheet.querySelectorAll('canvas[data-pic]').forEach(cv => drawPicture(cv, cv.dataset.pic));
  sheet.querySelectorAll('canvas[data-qr]').forEach(cv => drawQr(cv, cv.dataset.qr, 4));
  document.documentElement.classList.add('printing'); window.print();
  setTimeout(() => document.documentElement.classList.remove('printing'), 500);
}
