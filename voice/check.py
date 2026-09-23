"""Transcribe every recorded clip with gpt-4o-transcribe and list the ones that don't match the script.
Run from the repo root: python3 voice/check.py   (costs a few cents)"""
import json, re, uuid, urllib.request, difflib
from concurrent.futures import ThreadPoolExecutor
KEY = re.search(r'(sk-[A-Za-z0-9_\-]+)', open('.env').read()).group(1)
lines = json.load(open('voice/lines.json'))
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', s.lower().replace('-', ' ')).split()

def check(item):
    k, text = item; b = uuid.uuid4().hex; audio = open(f'voice/clips-marin/{k}.mp3', 'rb').read()
    body = (f'--{b}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-4o-transcribe\r\n--{b}\r\nContent-Disposition: form-data; '
            f'name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode() + audio + f'\r\n--{b}--\r\n'.encode()
    req = urllib.request.Request('https://api.openai.com/v1/audio/transcriptions', data=body, headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': f'multipart/form-data; boundary={b}'})
    heard = json.load(urllib.request.urlopen(req, timeout=120))['text']
    return k, text, heard, difflib.SequenceMatcher(None, norm(text), norm(heard)).ratio()

with ThreadPoolExecutor(6) as ex: res = sorted(ex.map(check, lines.items()), key=lambda r: r[3])
bad = [r for r in res if r[3] < .9]
for k, text, heard, score in bad: print(f'{score:.2f}  voice/clips-marin/{k}.mp3\n  script: {text}\n  heard:  {heard}')
print(f'{len(bad)} of {len(res)} clips look off (numbers like "4" vs "four" can cause harmless mismatches).')
