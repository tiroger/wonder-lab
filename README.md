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
./serve.sh        # local preview only: builds, serves at localhost:8000 and opens your browser (Ctrl+C to stop)
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
  08c_home.js      Home page: the Lab campus map (a building per topic), Keep going
  09_app.js        TOPICS list, Pip, stars, badges, tabs, controls
build.py           builds dist/index.html (full page) and dist/artifact.html (for publishing as a Claude artifact)
infra/             Terraform: S3 bucket, CloudFront, ACM certificate, Route 53 records; infra/bootstrap: state bucket + CI roles
.github/workflows/ CI (pull requests) and Deploy (main)
voice/             narration pipeline: lines.py, synth_openai.py, check.py, lines.json (every message), packs/ (one mp3 + index per voice)
tests/             walkthrough.js end-to-end test
dist/              built page + hashed voice file
```

## How an activity works
Each activity is an object `{ id, name, icon, badge, stars[], intro, mount(host, ui) }`. `mount` creates a `Stage` (an 800x560 canvas that scales to fit) and returns `{ stage, destroy() }`. The `ui` object gives it `say(html)`, `award(starId, x, y)`, `button()`, `hint()` and `extraEl()`.

To add a topic: write new activity objects and add an entry to `TOPICS` in `09_app.js` with a `building(c, t)` drawing; it appears as a building on the home map (see `docs/design.md`).

## Pip's voice
Every line Pip says is recorded ahead of time with OpenAI's `gpt-4o-mini-tts`, steered to sound like a warm, playful teacher. There are four voices to pick from in **Settings**: Marin (default), Coral, Nova and Cedar. Each message is recorded in one take so it flows naturally, plus a few short pieces ("Hi!", "Nice to meet you!") for lines that include the explorer's name. Nothing falls back to the device's robotic voice: a line without a recording stays silent, and the walkthrough test fails on it.

Each voice is a pack: `voice/packs/<voice>.mp3` (all clips back to back) and `voice/packs/<voice>.json` (byte offsets). `build.py` publishes them as `dist/voice/<voice>.<hash>.mp3`, so a new recording never mixes with an old cached one.

After adding or changing any text Pip says, re-record (only new or changed lines cost anything):
```
# .env at the repo root holds OPENAI_API_KEY=sk-...   (git-ignored)
python3 voice/unpack.py             # fresh checkout only: rebuild the clip cache from the packs
python3 voice/lines.py              # collect every message from src/
python3 voice/synth_openai.py       # record new lines in every voice
python3 voice/check.py --fix        # transcribe each clip, re-record any that came out wrong
python3 build.py
```
Templated lines (quiz feedback, badge messages, greetings) are built in `voice/lines.py`. To add a voice, add it to `VOICES` in `voice/synth_openai.py` and `VOICE_CHOICES` in `src/08_voice.js`.

## Settings
The gear button opens Settings: explorer name, Pip's voice, read-aloud on/off, voice/effects/music volume, and progress with a reset button per activity plus **Start over** for everything. Resets ask for a second tap.

## Test
`tests/walkthrough.js` plays every activity start to finish in a headless browser: it earns every star and badge, checks each Grow a Bean stage in order, checks that withered flower parts stop responding after pollination, that reminders never cut Pip off, and that every line said has a recording in every voice. It runs on every pull request and fails the check if anything is off.
```
python3 build.py && (cd dist && python3 -m http.server 8799 &) && node tests/walkthrough.js
```

## Deploy: CI/CD with GitHub Actions + Terraform
Everything ships through GitHub Actions, with no AWS keys on a laptop or in GitHub. The site is served from a private S3 bucket through CloudFront at https://wonderlab.camp (www redirects to the root), with an ACM certificate and Route 53 records, all defined in `infra/`.

| Workflow | When | What it does |
|---|---|---|
| `.github/workflows/ci.yml` | every pull request | builds the page, checks the script, `terraform fmt` + `validate`, plays every activity end to end (`tests/walkthrough.js`), and posts a `terraform plan` to the run summary using the read-only plan role |
| `.github/workflows/deploy.yml` | push to `main` (or run by hand) | in the `production` environment: `terraform apply`, build, upload to S3, refresh CloudFront |

AWS access comes from two roles the workflows assume through GitHub OIDC with short-lived sessions. Workflow actions are pinned to commit SHAs (Dependabot proposes updates):
- `wonder-lab-ci-plan`: trusted only for pull requests from this repo. Reads the Terraform state and this site's settings, nothing else in the account.
- `wonder-lab-ci-deploy`: trusted only for the repo's `production` environment. It can change only this site's resources: the site bucket, the wonderlab.camp DNS records, and CloudFront and certificate resources tagged `Project = wonderlab` (functions by name). It has no IAM permissions.

### One-time bootstrap (by hand)
`infra/bootstrap/` creates the Terraform state bucket and the two roles. It reuses the account's existing GitHub OIDC provider (an account has only one). It is the only thing ever applied from a laptop, because CI can't create the role it logs in with.
```
aws sso login
aws sts get-caller-identity                 # confirm the account first
cd infra/bootstrap
terraform init
terraform plan                              # read it: it creates IAM roles
terraform apply
```
Then create the GitHub repo and point it at the account:
```
gh repo create tiroger/wonder-lab --private
git remote add origin git@github.com-personal:tiroger/wonder-lab.git
terraform output -raw github_variable_commands    # run the commands it prints
git push -u origin main                           # first deploy
```
Keep `infra/bootstrap/terraform.tfstate` (git-ignored) somewhere safe; it only matters if the bootstrap ever changes.

After that, every change ships by merging to `main`.

## Progress
Stars, badges, the explorer name and sound settings are saved in the browser's localStorage, on that device only.
