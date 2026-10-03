"""Transcribe every recorded clip with gpt-4o-transcribe and list the ones that don't match the script.
Usage: python3 voice/check.py [--fix] [voice ...]   (default: every voice with a pack; a few cents per voice)
  --fix   delete clips that look wrong and re-record them (up to 3 tries each)"""
import glob, json, os, re, subprocess, sys, uuid, urllib.request, difflib
from concurrent.futures import ThreadPoolExecutor
KEY = re.search(r'(sk-[A-Za-z0-9_\-]+)', open('.env').read()).group(1)
lines = json.load(open('voice/lines.json'))
NUM = {'1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '8': 'eight', '10': 'ten', '12': 'twelve', 'ok': 'okay'}
# transcripts sometimes join the app's name into one word; that's not a recording problem
norm = lambda s: [NUM.get(w, w) for w in re.sub(r'[^a-z0-9 ]', '', s.lower().replace('-', ' ').replace('wonderlab', 'wonder lab')).split()]

def check(voice, item):
    k, text = item; b = uuid.uuid4().hex; audio = open(f'voice/clips/{voice}/{k}.mp3', 'rb').read()
    body = (f'--{b}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-4o-transcribe\r\n--{b}\r\nContent-Disposition: form-data; '
            f'name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode() + audio + f'\r\n--{b}--\r\n'.encode()
    req = urllib.request.Request('https://api.openai.com/v1/audio/transcriptions', data=body, headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': f'multipart/form-data; boundary={b}'})
    heard = json.load(urllib.request.urlopen(req, timeout=120))['text']
    return k, text, heard, difflib.SequenceMatcher(None, norm(text), norm(heard)).ratio()

args = sys.argv[1:]; fix = '--fix' in args; voices = [a for a in args if a != '--fix'] or [os.path.basename(p)[:-5] for p in sorted(glob.glob('voice/packs/*.json'))]
for voice in voices:
    todo = list(lines.items())
    for attempt in range(4 if fix else 1):
        with ThreadPoolExecutor(6) as ex: res = sorted(ex.map(lambda it: check(voice, it), todo), key=lambda r: r[3])
        bad = [r for r in res if r[3] < .9]
        for k, text, heard, score in bad: print(f'{score:.2f}  voice/clips/{voice}/{k}.mp3\n  script: {text}\n  heard:  {heard}')
        print(f'{voice}: {len(bad)} of {len(res)} checked clips look off' + (f' (round {attempt + 1})' if fix else ''))
        if not fix or not bad or attempt == 3: break
        for k, *_ in bad: os.remove(f'voice/clips/{voice}/{k}.mp3')
        subprocess.run([sys.executable, 'voice/synth_openai.py', voice], check=True)
        todo = [(k, lines[k]) for k, *_ in bad]
