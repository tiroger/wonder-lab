/* ============ Pip's voice: natural recorded narration, sentence by sentence ============ */
const VOICE_MAP = __VOICE_MAP__; // filled in by build.py from voice/manifest.json
function plainText(h) { return h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\([^)]*\)/g, '').replace(/&amp;/g, '&').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim(); }
function splitSentences(t) { return (t.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []).map(s => s.trim()).filter(Boolean); }
function vkey(s) { s = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); }
const Voice = {
  auto: true, buf: null, loading: null, cache: new Map(), src: null, token: 0, speaking: false,
  load() {
    if (!this.loading) this.loading = fetch('voice/pip-voice.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(b => { this.buf = b; }).catch(() => { this.buf = null; });
    return this.loading;
  },
  keyFor(s) {
    const k = vkey(s); if (VOICE_MAP[k]) return k;
    if (/^hi\b.*!$/i.test(s)) return vkey('Hi!');
    if (/^nice to meet you/i.test(s)) return vkey('Nice to meet you!');
    return null;
  },
  async clip(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    const m = VOICE_MAP[key]; if (!m || !this.buf) return null;
    const ab = this.buf.slice(m[0], m[0] + m[1]);
    const audio = await new Promise((res, rej) => Sound.ctx.decodeAudioData(ab, res, rej)).catch(() => null);
    if (audio) { this.cache.set(key, audio); if (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value); }
    return audio;
  },
  play(audio, my) {
    return new Promise(res => {
      if (my !== this.token) return res();
      const c = Sound.ctx, src = c.createBufferSource(), g = c.createGain(); src.buffer = audio; g.gain.value = 1.25;
      src.connect(g).connect(c.destination); src.onended = () => res(); this.src = src; src.start();
      Pip.talkUntil = Loop.t + audio.duration;
    });
  },
  browser(s, my) { // fallback for anything not pre-recorded: the best voice this device has
    return new Promise(res => {
      try {
        if (my !== this.token || !('speechSynthesis' in window)) return res();
        const u = new SpeechSynthesisUtterance(s), v = bestVoice(); if (v) u.voice = v; u.rate = .95; u.pitch = 1.05;
        u.onend = u.onerror = () => res(); speechSynthesis.speak(u); Pip.talkUntil = Loop.t + s.split(' ').length * .38;
        setTimeout(res, 9000);
      } catch (e) { res(); }
    });
  },
  stop() {
    this.token++; if (this.src) { try { this.src.stop(); } catch (e) {} this.src = null; }
    try { speechSynthesis.cancel(); } catch (e) {}
    this.setSpeaking(false);
  },
  setSpeaking(on) {
    this.speaking = on; const b = $('#readBtn'); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (Sound.ctx && Sound.out) Sound.out.gain.setTargetAtTime(on ? .45 : .9, Sound.ctx.currentTime, .08); // duck effects + music under the voice
  },
  async speak(html) {
    this.stop(); const my = this.token; Sound.unlocked = true;
    if (!Sound.ensure()) return;
    this.setSpeaking(true);
    await this.load();
    for (const s of splitSentences(plainText(html))) {
      if (my !== this.token) return;
      const k = this.keyFor(s), audio = k ? await this.clip(k) : null;
      if (my !== this.token) return;
      if (audio) await this.play(audio, my); else await this.browser(s, my);
      await new Promise(r => setTimeout(r, 140));
    }
    if (my === this.token) this.setSpeaking(false);
  }
};
let _bestVoice;
function bestVoice() {
  if (_bestVoice !== undefined) return _bestVoice;
  try {
    const vs = speechSynthesis.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang)); if (!vs.length) return null;
    const score = v => (/natural|neural|premium|enhanced|siri/i.test(v.name) ? 50 : 0) + (/aria|jenny|ava|samantha|allison|google us english|zira/i.test(v.name) ? 20 : 0) + (/en-us/i.test(v.lang) ? 10 : 0) + (v.localService ? 0 : 3);
    _bestVoice = vs.sort((a, b) => score(b) - score(a))[0];
  } catch (e) { _bestVoice = null; }
  return _bestVoice;
}
try { speechSynthesis.onvoiceschanged = () => { _bestVoice = undefined; }; } catch (e) {}
