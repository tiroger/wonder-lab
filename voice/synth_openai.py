"""Record every message in voice/lines.json with OpenAI's gpt-4o-mini-tts, one pack per voice:
voice/packs/<voice>.mp3 (all clips back to back) + voice/packs/<voice>.json (byte offsets).
Usage: python3 voice/synth_openai.py [voice ...]   (default: every voice in VOICES)
Needs an OpenAI API key in .env at the repo root (OPENAI_API_KEY=sk-... or just the key).
Run from the repo root: python3 voice/synth_openai.py   (only new or changed lines are recorded)"""
import json, os, re, subprocess, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

MODEL = 'gpt-4o-mini-tts-2025-12-15'
TEACHER = ("You are Pip, a friendly little bean seed who guides a curious 8-year-old through hands-on science activities. "
         "Speak warmly and naturally, like a favorite elementary school teacher reading to one child: a smiling voice, playful, "
         "with real wonder at the cool facts. Clear pronunciation, relaxed moderate pace, natural pauses. Friendly, not cartoonish or over the top.")
CARTOON = ("You are Pip, a little bean seed: the star of a cartoon science show for kids. Voice: a bright, young, kid-like cartoon voice, "
           "like a cheerful 8-year-old hero of an animated show. Lighter and higher than a grown-up, bouncy and curious, with real excitement "
           "and wonder on the fun parts and a big smile in the voice. Natural and playful, quick but always clear, never robotic or shouty.")
# each pack: which OpenAI voice reads it, how, and how many semitones to raise it afterwards (keep in sync with VOICE_CHOICES in src/08_voice.js)
# 'kid' is Pip's default since 2026-11: coral with the cartoon prompt, 3 semitones higher, so Pip sounds like a kid
VOICES = {'kid': ('coral', CARTOON, 3), 'marin': ('marin', TEACHER, 0), 'coral': ('coral', TEACHER, 0), 'nova': ('nova', TEACHER, 0), 'cedar': ('cedar', TEACHER, 0)}
KEY = re.search(r'(sk-[A-Za-z0-9_\-]+)', open('.env').read()).group(1)
lines = json.load(open('voice/lines.json'))

def record(VOICE, CLIPS, item):
    key, text = item; mp3 = f'{CLIPS}/{key}.mp3'
    if os.path.exists(mp3): return key, 'cached'
    oa_voice, instr, semis = VOICES[VOICE]
    body = json.dumps({'model': MODEL, 'voice': oa_voice, 'input': text, 'instructions': instr, 'response_format': 'wav'}).encode()
    for attempt in range(6):
        try:
            req = urllib.request.Request('https://api.openai.com/v1/audio/speech', data=body, headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
            wav = urllib.request.urlopen(req, timeout=180).read(); break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503): time.sleep(2 ** attempt); continue
            raise
    tmp = f'{CLIPS}/{key}.wav'; open(tmp, 'wb').write(wav)
    # raising the pitch with the sample rate also moves the formants up (a smaller, younger-sounding voice); atempo keeps the speed
    r = 2 ** (semis / 12); lift = f'asetrate=24000*{r:.5f},aresample=24000,atempo={1 / r:.5f},' if semis else ''
    trim = lift + 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.1'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', trim, '-ac', '1', '-ar', '24000', '-b:a', '56k',
                    '-write_xing', '0', '-id3v2_version', '0', '-map_metadata', '-1', '-f', 'mp3', mp3], check=True)
    os.remove(tmp); return key, 'new'

for VOICE in sys.argv[1:] or VOICES:
    CLIPS = f'voice/clips/{VOICE}'; os.makedirs(CLIPS, exist_ok=True); os.makedirs('voice/packs', exist_ok=True)
    with ThreadPoolExecutor(4) as ex: res = list(ex.map(lambda it: record(VOICE, CLIPS, it), lines.items()))
    man, blob = {}, bytearray()
    for key in lines:
        b = open(f'{CLIPS}/{key}.mp3', 'rb').read(); man[key] = [len(blob), len(b)]; blob += b
    open(f'voice/packs/{VOICE}.mp3', 'wb').write(blob)
    json.dump(man, open(f'voice/packs/{VOICE}.json', 'w'), separators=(',', ':'))
    print(VOICE, sum(r[1] == 'new' for r in res), 'recorded,', len(man), 'clips,', len(blob) // 1024, 'KB')
