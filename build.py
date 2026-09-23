"""Build Wonder Lab from src/ into dist/.
  dist/index.html     full page, open it through a local web server (see README)
  dist/artifact.html  the same page without <html>/<head> wrappers, for publishing as a Claude artifact
Run: python3 build.py"""
import glob, os
parts = sorted(glob.glob('src/*'))
markup = ''.join(open(p).read() for p in parts if p.endswith('.html'))
js = ''.join(open(p).read() for p in parts if p.endswith('.js'))
js = js.replace('__VOICE_MAP__', open('voice/manifest.json').read().strip())
body = markup + '<script>\n' + js + '</script>\n'
os.makedirs('dist', exist_ok=True)
open('dist/artifact.html', 'w').write(body)
open('dist/index.html', 'w').write('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + body + '</body>\n</html>\n')
print('built dist/index.html and dist/artifact.html')
