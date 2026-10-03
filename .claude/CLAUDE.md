# Wonder Lab

A playful learning web app for Roger's son (3rd grade). Each class topic becomes a set of hands-on activities drawn entirely with Canvas 2D, with a guide character (Pip the bean seed), stars, badges, synthesized sound effects and recorded narration. Live at https://wonderlab.camp. Topic 1 is Plants & Seeds.

## Commands
- Build: `python3 build.py` (src/ → dist/index.html, dist/artifact.html, dist/voice/<voice>.<hash>.mp3)
- Preview locally: `./serve.sh` (localhost:8000; the voice loads with fetch, so file:// won't work)
- Script check: `sed -n '/<script>/,/<\/script>/p' dist/artifact.html | sed '1d;$d' > /tmp/app.js && node --check /tmp/app.js`
- Walkthrough test: `python3 build.py && (cd dist && python3 -m http.server 8799 &) && node tests/walkthrough.js` (must print only PASS lines)
- Voice: `python3 voice/lines.py && python3 voice/synth_openai.py && python3 voice/check.py --fix && python3 build.py`
- Terraform: `terraform fmt -recursive infra && (cd infra && terraform validate)`

## Layout
- `src/` is concatenated in file-name order into one page: `00_markup.html` (CSS + markup), `01_core.js` (helpers, palette `C`, Store, Sound, Music, Loop, Stage, shared drawing), one file per activity (`02_parts` … `07_quiz`), `08_voice.js`, `08b_settings.js`, `09_app.js` (TOPICS, Pip, stars, badges, tabs, `say`).
- `voice/` narration pipeline; `voice/packs/<voice>.{mp3,json}` are the recorded packs.
- `infra/` site Terraform (S3 + CloudFront + ACM + Route 53); `infra/bootstrap/` one-time state bucket + OIDC roles.
- `.github/workflows/` CI on PRs, Deploy on push to main.

## Rules that matter
- **No libraries, no images.** Everything is drawn in JS on an 800×560 logical `Stage`. Hit-test with `Path2D` (`st.hit`, `st.hitLine`, `st.over`). Respect `RM` (reduced motion).
- **Every line Pip says must be recorded.** There is no device-voice fallback on purpose. Whenever you add or change any text passed to `say()`/`ui.say()` (including templated lines built in `voice/lines.py`), run the voice pipeline, then the walkthrough ("Every line recorded in every voice" must PASS). Keep lines static where possible; if a line must include a runtime value, add each variant to `voice/lines.py`.
- **Don't cut Pip off, don't nag.** Reminders use `say(msg, { polite: true })`; follow-up news uses `{ queue: true }`; sequences inside an activity queue their own lines (see Grow a Bean's `factQ`). Show a need visually first (bouncing "Water me!" label, drooping plant); Pip says a reminder once, and again only if it's been ignored for a while (see Grow a Bean's `dryT`/`told`).
- **Listen first.** Any `say()` line of 8+ words (or `{ lock: true }`) holds taps on the stage, the Tools buttons and quiz answers until Pip finishes (voice on) or there's been time to read it (voice off). A held tap shows a "Listen to Pip first" nudge; stars earned meanwhile are saved at once but celebrated when he finishes. Parents can turn it off in Settings ("Wait for Pip…", `Store.data.waitForPip`). Short reactions (under 8 words) and `polite` reminders don't lock. Anything that should follow a line (next step, result of an animation) uses `{ queue: true }`, which waits for Pip to finish plus a short breath (`ready()`; with the voice off, until the last line has had time to be read), never a `setTimeout`.
- **Taps must feel smooth.** The voice player crossfades and waits a short settle pause so rapid taps start one line (newest wins); `say()` ignores the same line while it's still playing. Give every tap an instant sound effect so the delay before speech never feels laggy. Don't bypass `say()` to call `Voice.speak` from activities.
- **Award before you say** when the message depends on star state (see Flower Lab's `maybeBee`).
- **Parts that are gone stop responding.** When a stage of an activity ends (petals removed, flower pollinated…), hit-tests for the old parts must return nothing.
- **Voice files are content-hashed** by `build.py`, and `build.py`/the player strip ID3 tags (file transfers to macOS add one). Never reference `voice/*.mp3` by a fixed name.
- **Secrets:** `.env` holds `OPENAI_API_KEY`. Never print, cat or echo it; scripts read it themselves. It is git-ignored.
- **Deploys go through CI/CD only.** Merge to `main` → `.github/workflows/deploy.yml`. Never run `terraform apply` on `infra/` locally, never upload to S3 by hand. `infra/bootstrap/` is the only root applied by hand, once, by Roger.
- Remote tools can't write `.github/workflows/`; if a workflow must change, write it elsewhere and ask Roger to move it.

## Content for an 8-year-old
Short sentences, one idea each, warm and playful, scientifically correct. Bold the vocabulary word (`<b>cotyledon</b>`). Explain a hard word right away with a kid comparison ("like a packed lunch"). Praise effort, never scold ("Not quite. Hint: …"). Match what the class is doing (e.g. soaking and splitting a lima bean, dissecting a flower).

## Adding a topic or activity
Use `/new-topic` or `/new-activity`, and the `wonder-lab-activity` skill for the activity contract and drawing helpers.
