/* ============ Pip's voice: recorded narration in several voices (whole messages, plus short pieces for dynamic lines) ============ */
const VOICE_PACKS = __VOICE_PACKS__; // filled in by build.py: { name: { file, map: { clipKey: [byteOffset, byteLength] } } }
// the voices offered in Settings (recorded with voice/synth_openai.py); only packs that exist are shown
const VOICE_CHOICES = [
  { id: 'marin', name: 'Marin', note: 'warm and natural' },
  { id: 'coral', name: 'Coral', note: 'bright and upbeat' },
  { id: 'nova', name: 'Nova', note: 'clear and friendly' },
  { id: 'cedar', name: 'Cedar', note: 'calm, deeper voice' }
].filter(v => VOICE_PACKS[v.id]);
function plainText(h) { return h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\([^)]*\)/g, '').replace(/&amp;/g, '&').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim(); }
function splitSentences(t) { return (t.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []).map(s => s.trim()).filter(Boolean); }
function vkey(s) { s = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); }
const Voice = {
  auto: true, name: 'marin', volume: 1, bufs: {}, loading: {}, cache: new Map(), src: null, gain: null, token: 0, speaking: false,
  get map() { return (VOICE_PACKS[this.name] || {}).map || {}; },
  setVoice(name) { if (VOICE_PACKS[name]) { this.stop(); this.name = name; this.load(); } },
  setVolume(v) { this.volume = v; if (this.gain && this.src) this.gain.gain.value = 1.25 * v; },
  load(name = this.name) {
    const pack = VOICE_PACKS[name]; if (!pack) return Promise.resolve();
    if (!this.loading[name]) this.loading[name] = fetch(pack.file).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
      .then(b => { this.bufs[name] = skipId3(b); }).catch(() => { delete this.loading[name]; });
    return this.loading[name];
  },
  keyFor(s) {
    const map = this.map, k = vkey(s); if (map[k]) return k;
    if (/^hi\b.*!$/i.test(s)) return vkey('Hi!');
    if (/^nice to meet you/i.test(s)) return vkey('Nice to meet you!');
    return null;
  },
  async clip(key) {
    const ck = this.name + ':' + key; if (this.cache.has(ck)) return this.cache.get(ck);
    const m = this.map[key], buf = this.bufs[this.name]; if (!m || !buf) return null;
    const ab = buf.slice(m[0], m[0] + m[1]);
    const audio = await new Promise((res, rej) => Sound.ctx.decodeAudioData(ab, res, rej)).catch(() => null);
    if (audio) { this.cache.set(ck, audio); if (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value); }
    return audio;
  },
  play(audio, my) {
    return new Promise(res => {
      if (my !== this.token) return res();
      const c = Sound.ctx, src = c.createBufferSource(), g = c.createGain(), t = c.currentTime; src.buffer = audio; this.gain = g;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.25 * this.volume, t + .03); // no click at the start
      src.connect(g).connect(c.destination); src.onended = () => { if (this.src === src) this.src = null; res(); }; this.src = src; src.start(t);
      Pip.talkUntil = Loop.t + audio.duration;
    });
  },
  // fade the current clip out instead of cutting it mid-word
  fadeOut() {
    const src = this.src, g = this.gain; if (!src) return false; this.src = null;
    try { const t = Sound.ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + .18); src.stop(t + .2); } catch (e) {}
    return true;
  },
  stop() { this.token++; this.fadeOut(); this.setSpeaking(false); },
  setSpeaking(on) {
    this.speaking = on; const b = $('#readBtn'); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    Sound.levels(on); // duck effects + music under the voice
  },
  async speak(html) {
    // The newest request wins. A short settle pause means rapid taps don't each start a line and
    // get chopped: only the last one speaks, and whatever was playing fades out first.
    const my = ++this.token; Sound.unlocked = true;
    if (!Sound.ensure()) return;
    const wasTalking = this.fadeOut();
    this.setSpeaking(true);
    await new Promise(r => setTimeout(r, wasTalking ? 350 : 260));
    if (my !== this.token) return;
    await this.load();
    // play the longest recorded run of sentences each time, so whole messages keep their natural flow
    const S = splitSentences(plainText(html));
    for (let i = 0; i < S.length;) {
      if (my !== this.token) return;
      let k = null, j = S.length - 1;
      const map = this.map;
      for (; j >= i; j--) { const kk = vkey(S.slice(i, j + 1).join(' ')); if (map[kk]) { k = kk; break; } }
      if (!k) { j = i; k = this.keyFor(S[i]); }
      const audio = k ? await this.clip(k) : null;
      if (my !== this.token) return;
      // every line Pip says is pre-recorded; anything missing stays silent rather than switching to a robotic device voice
      if (audio) await this.play(audio, my); else console.warn('No recording for:', S.slice(i, j + 1).join(' '));
      i = j + 1; if (i < S.length) await new Promise(r => setTimeout(r, 120));
    }
    if (my === this.token) this.setSpeaking(false);
  }
};
// the clip offsets count from the first audio byte; skip an ID3 tag if one got added to the file
function skipId3(buf) {
  const u = new Uint8Array(buf, 0, Math.min(10, buf.byteLength));
  if (u.length < 10 || u[0] !== 0x49 || u[1] !== 0x44 || u[2] !== 0x33) return buf;
  const size = (u[6] & 127) << 21 | (u[7] & 127) << 14 | (u[8] & 127) << 7 | (u[9] & 127);
  return buf.slice(10 + size + (u[5] & 0x10 ? 10 : 0));
}
