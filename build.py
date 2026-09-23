"""Build Wonder Lab from src/ into dist/.
  dist/index.html     full page, open it through a local web server (see README)
  dist/artifact.html  the same page without <html>/<head> wrappers, for publishing as a Claude artifact
Run: python3 build.py"""
import glob, hashlib, os, shutil
# the voice file gets a content hash in its name, so browsers and CloudFront never mix an old
# recording with a new index (that mismatch plays garbled audio)
voice = open('voice/pip-voice.mp3', 'rb').read()
voice_file = f"voice/pip-voice.{hashlib.sha1(voice).hexdigest()[:10]}.mp3"
os.makedirs('dist/voice', exist_ok=True)
for old in glob.glob('dist/voice/*.mp3'):
    if not old.endswith(voice_file): os.remove(old)
shutil.copyfile('voice/pip-voice.mp3', 'dist/' + voice_file)
parts = sorted(glob.glob('src/*'))
markup = ''.join(open(p).read() for p in parts if p.endswith('.html'))
js = ''.join(open(p).read() for p in parts if p.endswith('.js'))
js = js.replace('__VOICE_MAP__', open('voice/manifest.json').read().strip()).replace('__VOICE_FILE__', voice_file)
body = markup + '<script>\n' + js + '</script>\n'
os.makedirs('dist', exist_ok=True)
open('dist/artifact.html', 'w').write(body)
open('dist/index.html', 'w').write('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + body + '</body>\n</html>\n')
print('built dist/index.html and dist/artifact.html with', voice_file)
