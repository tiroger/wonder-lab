"""Build Wonder Lab from src/ into dist/.
  dist/index.html            full page, open it through a local web server (see README)
  dist/artifact.html         the same page without <html>/<head> wrappers, for publishing as a Claude artifact
  dist/voice/<name>.<hash>.mp3  one narration pack per voice in voice/packs/
Run: python3 build.py"""
import glob, hashlib, json, os


def strip_id3(data):
    # Some tools prepend an ID3 tag to mp3 files (file transfers to macOS can add one). The clip
    # offsets in voice/packs/<name>.json count from the first audio byte, so drop any tag first.
    if data[:3] == b'ID3':
        size = (data[6] & 127) << 21 | (data[7] & 127) << 14 | (data[8] & 127) << 7 | (data[9] & 127)
        return data[10 + size + (10 if data[5] & 0x10 else 0):]
    return data


# Each voice pack gets a content hash in its file name, so browsers and CloudFront never mix an old
# recording with a new clip index (that mismatch plays garbled audio).
os.makedirs('dist/voice', exist_ok=True)
packs, keep = {}, set()
for man in sorted(glob.glob('voice/packs/*.json')):
    name = os.path.basename(man)[:-5]
    data = strip_id3(open(f'voice/packs/{name}.mp3', 'rb').read())
    fname = f"voice/{name}.{hashlib.sha1(data).hexdigest()[:10]}.mp3"
    open('dist/' + fname, 'wb').write(data)
    keep.add('dist/' + fname)
    packs[name] = {'file': fname, 'map': json.load(open(man))}
for old in glob.glob('dist/voice/*.mp3'):
    if old not in keep:
        os.remove(old)

parts = sorted(glob.glob('src/*'))
markup = ''.join(open(p).read() for p in parts if p.endswith('.html'))
js = ''.join(open(p).read() for p in parts if p.endswith('.js'))
js = js.replace('__VOICE_PACKS__', json.dumps(packs, separators=(',', ':')))
body = markup + '<script>\n' + js + '</script>\n'
open('dist/artifact.html', 'w').write(body)
open('dist/index.html', 'w').write('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
                                   '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                                   '</head>\n<body>\n' + body + '</body>\n</html>\n')
print('built dist/index.html and dist/artifact.html with voices:', ', '.join(p['file'] for p in packs.values()))
