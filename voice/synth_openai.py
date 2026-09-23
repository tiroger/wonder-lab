"""Record every message in voice/lines.json with OpenAI's gpt-4o-mini-tts (voice: marin),
then pack all clips into dist/voice/pip-voice.mp3 plus voice/manifest.json (byte offsets).
Needs an OpenAI API key in .env at the repo root (OPENAI_API_KEY=sk-... or just the key).
Run from the repo root: python3 voice/synth_openai.py   (only new or changed lines are recorded)"""
import json, os, re, subprocess, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

MODEL, VOICE = 'gpt-4o-mini-tts-2025-12-15', 'marin'
INSTR = ("You are Pip, a friendly little bean seed who guides a curious 8-year-old through hands-on science activities. "
         "Speak warmly and naturally, like a favorite elementary school teacher reading to one child: a smiling voice, playful, "
         "with real wonder at the cool facts. Clear pronunciation, relaxed moderate pace, natural pauses. Friendly, not cartoonish or over the top.")
KEY = re.search(r'(sk-[A-Za-z0-9_\-]+)', open('.env').read()).group(1)
CLIPS = f'voice/clips-{VOICE}'
os.makedirs(CLIPS, exist_ok=True); os.makedirs('dist/voice', exist_ok=True)
lines = json.load(open('voice/lines.json'))

def record(item):
    key, text = item; mp3 = f'{CLIPS}/{key}.mp3'
    if os.path.exists(mp3): return key, 'cached'
    body = json.dumps({'model': MODEL, 'voice': VOICE, 'input': text, 'instructions': INSTR, 'response_format': 'wav'}).encode()
    for attempt in range(6):
        try:
            req = urllib.request.Request('https://api.openai.com/v1/audio/speech', data=body, headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
            wav = urllib.request.urlopen(req, timeout=180).read(); break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503): time.sleep(2 ** attempt); continue
            raise
    tmp = f'{CLIPS}/{key}.wav'; open(tmp, 'wb').write(wav)
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.1'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', trim, '-ac', '1', '-ar', '24000', '-b:a', '56k',
                    '-write_xing', '0', '-id3v2_version', '0', '-map_metadata', '-1', '-f', 'mp3', mp3], check=True)
    os.remove(tmp); return key, 'new'

with ThreadPoolExecutor(4) as ex: res = list(ex.map(record, lines.items()))
man, blob = {}, bytearray()
for key in lines:
    b = open(f'{CLIPS}/{key}.mp3', 'rb').read(); man[key] = [len(blob), len(b)]; blob += b
open('dist/voice/pip-voice.mp3', 'wb').write(blob)
json.dump(man, open('voice/manifest.json', 'w'), separators=(',', ':'))
print(sum(r[1] == 'new' for r in res), 'recorded,', len(man), 'clips,', len(blob) // 1024, 'KB')
