"""Collect every message Pip can say from the app source -> voice/lines.json.
Whole messages are recorded in one take so the intonation flows; a few short pieces cover dynamic lines.
Run from the repo root: python3 voice/lines.py"""
import re, json, glob
code = ''.join(open(f).read() for f in sorted(glob.glob('src/*.js')) if not f.endswith('_voice.js'))

def plain(h):
    h = re.sub(r'<br\s*/?>', ' ', h, flags=re.I); h = re.sub(r'<[^>]+>', '', h); h = re.sub(r'\([^)]*\)', '', h)
    h = h.replace('&amp;','&').replace('‘',"'").replace('’',"'"); return re.sub(r'\s+',' ',h).strip()
def sentences(t): return [s.strip() for s in re.findall(r'[^.!?…]+[.!?…]+|[^.!?…]+$', t) if s.strip()]
def b36(n):
    d='0123456789abcdefghijklmnopqrstuvwxyz'; s=''
    while True:
        s=d[n%36]+s; n//=36
        if n==0: return s
def vkey(s):
    s = re.sub(r'[^a-z0-9]+',' ', s.lower()).strip(); h=5381
    for ch in s: h = ((h*33) & 0xffffffff) ^ ord(ch)
    return b36(h)

raw = []
for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'", code): raw.append(m.group(1).replace("\\'", "'"))
for m in re.finditer(r"`([^`]*)`", code):
    if '${' not in m.group(1): raw.append(m.group(1))
cands = [s for s in raw if len(s) > 10 and ' ' in s and ('<b>' in s or re.search(r'[.!?…]$', s)) and not s.startswith('A ') and 'Stars and badges' not in s]
# templated lines
quiz = re.findall(r"hint: '((?:[^'\\]|\\.)*)'", code)
extra = ['Okay!', "I'll read everything out loud for you.", 'Yes!', 'You got it!', 'Not quite.', 'Hi!', "I'm Pip, a bean seed.", 'Nice to meet you!', "Let's explore together.", "Sorry, this browser can't read out loud."]
extra += ['Hint: ' + h.replace("\\'", "'") for h in quiz]
for name in re.findall(r"badge: \{ id: '[^']+', name: '([^']+)'", code) + ['Botanist']:
    extra.append(f'You earned the {name} badge!')
# templated messages, recorded whole
whys = [w.replace("\\'", "'") for w in re.findall(r"why: '((?:[^'\\]|\\.)*)'", code)]
combos = [f'Yes! {w}' for w in whys] + [f'You got it! {w}' for w in whys] + [f'Not quite. Hint: {h}' for h in [q.replace("\\'", "'") for q in quiz]]
descs = dict(re.findall(r"badge: \{ id: '[^']+', name: '([^']+)', desc: '((?:[^'\\]|\\.)*)'", code))
descs['Botanist'] = re.search(r"name: 'Botanist', icon: 'trophy', desc: '((?:[^'\\]|\\.)*)'", code).group(1)
combos += [f'You earned the {n} badge! ' + d.replace("\\'", "'") for n, d in descs.items()]
out = {}
for s in cands + extra + combos:
    t = ' '.join(sentences(plain(s)))
    if len(t) > 1: out.setdefault(vkey(t), t)
json.dump(out, open('voice/lines.json','w'), indent=1)
print(len(out), 'messages')
