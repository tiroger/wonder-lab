"""Rebuild the clip cache (voice/clips/<voice>/<key>.mp3) from the recorded packs in voice/packs/.
The clips folder is git-ignored, so a fresh checkout has none; without them synth_openai.py would re-record every line.
Run from the repo root before recording: python3 voice/unpack.py   (existing clips are left alone)"""
import glob, json, os

for man in sorted(glob.glob('voice/packs/*.json')):
    voice = os.path.basename(man)[:-5]
    data = open(f'voice/packs/{voice}.mp3', 'rb').read()
    if data[:3] == b'ID3':  # a tag some tools add; offsets count from the first audio byte
        size = (data[6] & 127) << 21 | (data[7] & 127) << 14 | (data[8] & 127) << 7 | (data[9] & 127)
        data = data[10 + size + (10 if data[5] & 0x10 else 0):]
    os.makedirs(f'voice/clips/{voice}', exist_ok=True)
    made = 0
    for key, (off, n) in json.load(open(man)).items():
        path = f'voice/clips/{voice}/{key}.mp3'
        if not os.path.exists(path):
            open(path, 'wb').write(data[off:off + n]); made += 1
    print(voice, made, 'clips unpacked')
