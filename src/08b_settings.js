/* ============ Settings: name, voice, sounds, progress ============ */
const Settings = {
  // read saved choices (with defaults) into the sound, music and voice engines
  apply() {
    const d = Store.data;
    Sound.on = d.sound !== false; Sound.vol = d.soundVol ?? 1;
    Music.vol = d.musicVol ?? .8;
    Voice.auto = d.voiceAuto !== false; Voice.setVolume(d.voiceVol ?? 1);
    if (d.voice && VOICE_PACKS[d.voice]) Voice.name = d.voice; else Voice.name = (VOICE_CHOICES[0] || { id: 'marin' }).id;
    Sound.levels();
    this.sync();
  },
  // keep the header buttons and the dialog controls showing the same state
  sync() {
    $('#talkBtn').setAttribute('aria-pressed', Voice.auto); $('#soundBtn').setAttribute('aria-pressed', Sound.on); $('#musicBtn').setAttribute('aria-pressed', Music.on);
    $('#setAuto').checked = Voice.auto; $('#setWait').checked = waitForPip(); $('#setSound').checked = Sound.on; $('#setMusic').checked = Music.on;
    $('#setVoiceVol').value = Math.round(Voice.volume * 100); $('#setSoundVol').value = Math.round(Sound.vol * 100); $('#setMusicVol').value = Math.round(Music.vol * 100);
    document.querySelectorAll('.voice').forEach(b => b.setAttribute('aria-checked', b.dataset.id === Voice.name ? 'true' : 'false'));
  },
  save(k, v) { Store.data[k] = v; Store.save(); },
  setAuto(on) { Voice.auto = on; this.save('voiceAuto', on); this.sync(); if (on) Voice.speak('Okay! I\'ll read everything out loud for you.'); else Voice.stop(); },
  setSound(on) { Sound.on = on; this.save('sound', on); if (on) { Sound.unlocked = true; Sound.ensure(); Sound.boing(); } else Sound.buzz(false); this.sync(); },
  setMusic(on) { if (on) Music.start(); else Music.stop(); this.save('music', on); this.sync(); },
  setVoice(id) { Voice.setVoice(id); this.save('voice', id); this.sync(); Voice.speak("Hi! I'm Pip, a bean seed. Let's explore together."); },

  renderVoices() {
    const list = $('#voiceList'); list.innerHTML = '';
    for (const v of VOICE_CHOICES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'voice'; b.dataset.id = v.id; b.setAttribute('role', 'radio');
      b.innerHTML = `<span class="dot" aria-hidden="true"></span><span><b>${v.name}</b><small>${v.note}</small></span>`;
      b.onclick = () => this.setVoice(v.id); list.appendChild(b);
    }
    if (!VOICE_CHOICES.length) list.innerHTML = '<p class="set-note">No recorded voices yet, so Pip can\'t read out loud.</p>';
  },

  // ----- progress -----
  confirmBtn(btn, label, armedLabel, action) { // two taps: the first one arms the button for 4 seconds
    let armed = 0;
    btn.onclick = () => {
      if (Date.now() - armed < 4000) { armed = 0; btn.textContent = label; btn.classList.remove('warn'); action(); return; }
      armed = Date.now(); btn.textContent = armedLabel; btn.classList.add('warn'); Sound.oops();
      setTimeout(() => { if (armed && Date.now() - armed >= 3900) { btn.textContent = label; btn.classList.remove('warn'); } }, 4000);
    };
  },
  resetActivity(a) {
    for (const s of a.stars) delete Store.data.stars[s.id];
    const tp = TOPICS.find(t => t.activities.includes(a));
    delete Store.data.badges[a.badge.id]; delete Store.data.badges[tp.master.id]; Store.save();
    Sound.whoosh(); refresh(); this.renderProgress();
    const msg = 'Fresh start! Every star in this activity is ready to be found again.';
    if (App.act === a) mount(a, msg); else say(msg); // said with the intro, so one doesn't cut off the other
  },
  resetAll() {
    Store.data.stars = {}; Store.data.badges = {}; Store.save();
    Sound.whoosh(); refresh(); this.renderProgress();
    const msg = 'All clear! Every star is ready to be found again.';
    if (App.act) mount(App.act, msg); else say(msg);
  },
  renderProgress() {
    const ul = $('#progressList'); ul.innerHTML = '';
    for (const a of TOPICS.flatMap(t => t.activities)) {
      const n = a.stars.filter(s => Store.data.stars[s.id]).length;
      const li = document.createElement('li');
      li.innerHTML = `<canvas width="68" height="68" aria-hidden="true"></canvas><span>${a.name}</span><small>${n} of ${a.stars.length} stars</small>`;
      drawIcon(li.querySelector('canvas'), a.icon);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = 'Reset'; b.disabled = n === 0;
      b.setAttribute('aria-label', `Reset ${a.name}`);
      this.confirmBtn(b, 'Reset', 'Sure?', () => this.resetActivity(a));
      li.appendChild(b); ul.appendChild(li);
    }
  },

  init() {
    const dlg = $('#settings');
    this.renderVoices(); this.apply();
    // header quick toggles
    $('#talkBtn').onclick = () => this.setAuto(!Voice.auto);
    $('#soundBtn').onclick = () => this.setSound(!Sound.on);
    $('#musicBtn').onclick = () => this.setMusic(!Music.on);
    $('#settingsBtn').onclick = () => { Sound.fwip(); this.renderProgress(); this.sync(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); };
    // dialog controls
    $('#setAuto').onchange = e => this.setAuto(e.target.checked);
    $('#setWait').onchange = e => { this.save('waitForPip', e.target.checked); if (!e.target.checked) stopListening(); Sound.fwip(); };
    $('#setSound').onchange = e => this.setSound(e.target.checked);
    $('#setMusic').onchange = e => this.setMusic(e.target.checked);
    $('#setVoiceVol').oninput = e => { Voice.setVolume(e.target.value / 100); this.save('voiceVol', Voice.volume); };
    $('#setVoiceVol').onchange = () => Voice.speak('Okay!');
    $('#setSoundVol').oninput = e => { Sound.vol = e.target.value / 100; this.save('soundVol', Sound.vol); Sound.levels(); };
    $('#setSoundVol').onchange = () => Sound.pop();
    $('#setMusicVol').oninput = e => { Music.vol = e.target.value / 100; this.save('musicVol', Music.vol); Sound.levels(); };
    this.confirmBtn($('#resetAll'), 'Start over', 'Tap again to erase everything', () => this.resetAll());
    // explorer name
    const nm = $('#explorer'); nm.value = Store.data.name || '';
    nm.oninput = () => { this.save('name', nm.value.trim()); if (nm.value.length) Sound.tone(PENTA[nm.value.length % 10], .06, 'triangle', .05); };
    nm.onchange = () => { const n = explorerName(); if (n) say(`Nice to meet you, <b>${n}</b>! Let's explore together.`); };
    // tap outside the dialog to close it
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    // the grown-up page opens behind the dialog, so close Settings to show it
    $('#setGrownups').addEventListener('click', () => { Sound.pop(); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); });
    dlg.addEventListener('close', () => Sound.pop());
  }
};
