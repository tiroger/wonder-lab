"""Record each sentence in voice/lines.json with the Kokoro neural voice (af_heart),
then pack all clips into dist/voice/pip-voice.mp3 plus voice/manifest.json (byte offsets).
Run from the repo root: python3 voice/synth.py   (see README for setup)"""
import json, re, subprocess, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro('voice/models/kokoro-v1.0.onnx', 'voice/models/voices-v1.0.bin')
lines = json.load(open('voice/lines.json'))
os.makedirs('voice/clips', exist_ok=True); os.makedirs('dist/voice', exist_ok=True)
man = {}; blob = bytearray()
for key, text in lines.items():
    if text.startswith('→'): continue
    say = re.sub(r'\s+([.!?,…])', r'\1', text).replace('…', '...')
    mp3 = f'voice/clips/{key}.mp3'
    if not os.path.exists(mp3):
        s, sr = k.create(say, voice='af_heart', speed=0.95, lang='en-us')
        a = np.abs(s) > 0.01; idx = np.where(a)[0]
        if len(idx): s = s[max(0, idx[0] - int(.04*sr)): idx[-1] + int(.08*sr)]
        sf.write('voice/tmp.wav', s, sr)
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i','voice/tmp.wav','-ac','1','-ar','24000','-b:a','48k','-write_xing','0','-id3v2_version','0','-map_metadata','-1','-f','mp3', mp3], check=True)
    b = open(mp3,'rb').read()
    man[key] = [len(blob), len(b)]; blob += b
open('dist/voice/pip-voice.mp3','wb').write(blob)
json.dump(man, open('voice/manifest.json','w'), separators=(',',':'))
print(len(man), 'clips', len(blob)//1024, 'KB')
