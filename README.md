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
  08_voice.js      Pip's voice: plays pre-recorded sentences, falls back to the device's best voice
  09_app.js        TOPICS list, Pip, stars, badges, tabs, controls
build.py           builds dist/index.html (full page) and dist/artifact.html (for publishing as a Claude artifact)
deploy.sh          builds and uploads to S3/CloudFront
infra/             Terraform: S3 bucket, CloudFront, ACM certificate, Route 53 records
voice/             narration pipeline: lines.py, synth_openai.py, lines.json (every message), manifest.json (clip offsets)
dist/              built page + hashed voice file
```

## How an activity works
Each activity is an object `{ id, name, icon, badge, stars[], intro, mount(host, ui) }`. `mount` creates a `Stage` (an 800x560 canvas that scales to fit) and returns `{ stage, destroy() }`. The `ui` object gives it `say(html)`, `award(starId, x, y)`, `button()`, `hint()` and `extraEl()`.

To add a topic: write new activity objects, add an entry to `TOPICS` in `09_app.js`, and drop the "coming soon" option from the dropdown.

## Pip's voice
Narration is recorded ahead of time with OpenAI's `gpt-4o-mini-tts` model in the **Marin** voice, steered to sound like a warm, playful teacher. Each message is recorded in one take so it flows naturally, plus a few short pieces ("Hi!", "Nice to meet you!") for lines that include the explorer's name. All clips are packed into `voice/pip-voice.mp3` with a byte-offset index (`voice/manifest.json`). `build.py` publishes it as `dist/voice/pip-voice.<hash>.mp3`, so a new recording never mixes with an old cached one. Anything without a recording falls back to the device's built-in voice.

After adding or changing text, re-record (only new or changed lines cost anything):
```
# .env at the repo root holds OPENAI_API_KEY=sk-...   (git-ignored)
python3 voice/lines.py && python3 voice/synth_openai.py && python3 voice/check.py && python3 build.py
```
`voice/check.py` transcribes every clip and lists any that don't match the script. Delete a bad clip from `voice/clips-marin/` and run `synth_openai.py` again to re-record just that one.
Templated lines (quiz feedback, badge messages, greetings) are built in `voice/lines.py`.

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
