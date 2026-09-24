# Wonder Lab

A playful learning web app for a 3rd grader, live at https://wonderlab.camp. Each class topic becomes a set of hands-on activities drawn entirely in JavaScript (Canvas 2D), with sound effects, a guide character (Pip the bean seed), stars and badges.

Live version (private Claude artifact): https://claude.ai/artifact/SG45qnd4mhnkxyjtpB3f1N

## Topic 1: Plants & Seeds
1. **Meet the Plant**: roots, stem, leaves, flower, fruit. Bonus worm, butterfly and sun.
2. **Open a Seed**: soak, peel the seed coat, split the bean, find the cotyledons, embryo, baby root and baby leaves. Magnifying glass and a sprouting animation.
3. **Flower Lab**: drag off petals and sepals, explore the stamen (anther, filament) and pistil (stigma, style, ovary), then help a bee pollinate.
4. **Grow a Bean**: water and sunlight meters, life cycle from seed to fruit and seeds.
5. **Seed Travel**: wind, animals, water, pop.
6. **Plant Quiz**: 12 questions, 8 per round, stars for first-try answers.

## Run it
The page loads its voice file with `fetch`, so open it through a small web server (not by double-clicking the file):

```
./serve.sh        # builds, serves at localhost:8000 and opens your browser (Ctrl+C to stop)
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
  08_voice.js      Pip's voice: plays the recorded messages for the chosen voice
  08b_settings.js  Settings dialog: name, voice, volumes, progress resets
  09_app.js        TOPICS list, Pip, stars, badges, tabs, controls
build.py           builds dist/index.html (full page) and dist/artifact.html (for publishing as a Claude artifact)
deploy.sh          builds and uploads to S3/CloudFront
infra/             Terraform: S3 bucket, CloudFront, ACM certificate, Route 53 records
voice/             narration pipeline: lines.py, synth_openai.py, check.py, lines.json (every message), packs/ (one mp3 + index per voice)
tests/             walkthrough.js end-to-end test
dist/              built page + hashed voice file
```

## How an activity works
Each activity is an object `{ id, name, icon, badge, stars[], intro, mount(host, ui) }`. `mount` creates a `Stage` (an 800x560 canvas that scales to fit) and returns `{ stage, destroy() }`. The `ui` object gives it `say(html)`, `award(starId, x, y)`, `button()`, `hint()` and `extraEl()`.

To add a topic: write new activity objects, add an entry to `TOPICS` in `09_app.js`, and drop the "coming soon" option from the dropdown.

## Pip's voice
Every line Pip says is recorded ahead of time with OpenAI's `gpt-4o-mini-tts`, steered to sound like a warm, playful teacher. There are four voices to pick from in **Settings**: Marin (default), Coral, Nova and Cedar. Each message is recorded in one take so it flows naturally, plus a few short pieces ("Hi!", "Nice to meet you!") for lines that include the explorer's name. Nothing falls back to the device's robotic voice: a line without a recording stays silent, and the walkthrough test fails on it.

Each voice is a pack: `voice/packs/<voice>.mp3` (all clips back to back) and `voice/packs/<voice>.json` (byte offsets). `build.py` publishes them as `dist/voice/<voice>.<hash>.mp3`, so a new recording never mixes with an old cached one.

After adding or changing any text Pip says, re-record (only new or changed lines cost anything):
```
# .env at the repo root holds OPENAI_API_KEY=sk-...   (git-ignored)
python3 voice/lines.py              # collect every message from src/
python3 voice/synth_openai.py       # record new lines in every voice
python3 voice/check.py --fix        # transcribe each clip, re-record any that came out wrong
python3 build.py
```
Templated lines (quiz feedback, badge messages, greetings) are built in `voice/lines.py`. To add a voice, add it to `VOICES` in `voice/synth_openai.py` and `VOICE_CHOICES` in `src/08_voice.js`.

## Settings
The gear button opens Settings: explorer name, Pip's voice, read-aloud on/off, voice/effects/music volume, and progress with a reset button per activity plus **Start over** for everything. Resets ask for a second tap.

## Test
`tests/walkthrough.js` plays every activity start to finish in a headless browser: it earns every star and badge, checks each Grow a Bean stage in order, checks that withered flower parts stop responding after pollination, that reminders never cut Pip off, and that every line said has a recording in every voice.
```
python3 build.py && (cd dist && python3 -m http.server 8799 &) && node tests/walkthrough.js
```

## Deploy (AWS + Terraform)
The site is served from a private S3 bucket through CloudFront at https://wonderlab.camp (www redirects to the root), with an ACM certificate and Route 53 records. All of it is defined in `infra/`.

First time:
```
infra/bootstrap.sh                     # creates the S3 bucket for Terraform state, prints the init command
cd infra
terraform init -backend-config="bucket=<state bucket from bootstrap>"
terraform apply
cd ..
```
Every release:
```
./deploy.sh                            # build, upload to S3, refresh CloudFront
```
Needs the AWS CLI and credentials for the account that owns the wonderlab.camp hosted zone.

## Progress
Stars, badges, the explorer name and sound settings are saved in the browser's localStorage, on that device only.
