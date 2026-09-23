# Wonder Lab

A playful learning web app for a 3rd grader. Each class topic becomes a set of hands-on activities drawn entirely in JavaScript (Canvas 2D), with sound effects, a guide character (Pip the bean seed), stars and badges.

Live version (private Claude artifact): https://claude.ai/artifact/SG45qnd4mhnkxyjtpB3f1N

## Topic 1: Plants & Seeds
1. **Meet the Plant**: roots, stem, leaves, flower, fruit. Bonus worm, butterfly and sun.
2. **Open a Seed**: soak, peel the seed coat, split the bean, find the cotyledons, embryo, baby root and baby leaves. Magnifying glass and a sprouting animation.
3. **Flower Lab**: drag off petals and sepals, explore the stamen (anther, filament) and pistil (stigma, style, ovary), then help a bee pollinate.
4. **Grow a Bean**: water and sunlight meters, life cycle from seed to fruit and seeds.
5. **Seed Travel**: wind, animals, water, pop.
6. **Plant Quiz**: 12 questions, 8 per round, stars for first-try answers.

## Run it
The page loads `voice/pip-voice.mp3` with `fetch`, so open it through a small web server (not by double-clicking the file):

```
python3 build.py
cd dist && python3 -m http.server 8000
# open http://localhost:8000
```

## Layout
```
src/               page source, concatenated in file-name order
  00_markup.html   title, fonts, CSS and page markup
  01_core.js       helpers, colors, storage, Sound (all effects synthesized with Web Audio), Music, Stage class, shared drawing
  02_parts.js      Meet the Plant (+ drawPlant, shared with the quiz)
  03_seed.js       Open a Seed
  04_flower.js     Flower Lab
  05_grow.js       Grow a Bean
  06_travel.js     Seed Travel
  07_quiz.js       Plant Quiz + tab/badge icons
  08_voice.js      Pip's voice: plays pre-recorded sentences, falls back to the device's best voice
  09_app.js        TOPICS list, Pip, stars, badges, tabs, controls
build.py           builds dist/index.html (full page) and dist/artifact.html (for publishing as a Claude artifact)
voice/             narration pipeline: lines.py, synth.py, lines.json (every sentence), manifest.json (clip offsets)
dist/              built page + dist/voice/pip-voice.mp3
```

## How an activity works
Each activity is an object `{ id, name, icon, badge, stars[], intro, mount(host, ui) }`. `mount` creates a `Stage` (an 800x560 canvas that scales to fit) and returns `{ stage, destroy() }`. The `ui` object gives it `say(html)`, `award(starId, x, y)`, `button()`, `hint()` and `extraEl()`.

To add a topic: write new activity objects, add an entry to `TOPICS` in `09_app.js`, and drop the "coming soon" option from the dropdown.

## Pip's voice
Narration is recorded ahead of time with the open-source [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) neural voice (`af_heart`), one clip per sentence. All clips are packed into one mp3 with a byte-offset index, so any message plays sentence by sentence. Sentences without a recording (for example a new topic before re-recording) fall back to the device's built-in voice.

After adding or changing text, re-record:
```
pip install kokoro-onnx soundfile numpy      # plus ffmpeg on your PATH
mkdir -p voice/models && cd voice/models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ../..
python3 voice/lines.py && python3 voice/synth.py && python3 build.py
```
Templated lines (quiz hints, badge names, greetings) are added in the `extra` list in `voice/lines.py`.

## Progress
Stars, badges, the explorer name and sound settings are saved in the browser's localStorage, on that device only.
