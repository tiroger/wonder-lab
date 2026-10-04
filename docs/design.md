# Wonder Lab design guide

The reference for Wonder Lab's look, motion, sound and voice, so every screen and topic feels like the same app.
For anyone (agent or person) who changes the interface, builds the home page or adds a topic.
Read it with `.claude/CLAUDE.md` (the rules) and the `wonder-lab-activity` skill (how an activity is built).
When code and this guide disagree, the code is the truth: fix the guide in the same PR.

**Status (2026-10-03):** everything in this guide is built: the **Lab campus map** home page and the **Trophy Hall** (section 16), and per-topic accent colors and Pip costumes (section 15), plus campus life: the grounds, the Badge Garden, the living sky and the critter hunt (section 16). Space and Weather in the tables are examples until those topics exist.

---

## 1. Personality

Wonder Lab is a playful science lab for an 8-year-old. Every screen should feel:
- **Hand-made:** chunky ink outlines, sticker shadows, round shapes and slightly tilted labels. Nothing glossy or corporate.
- **Alive:** things sway, blink, bob and react to every tap with a sound.
- **Calm, not noisy:** a few bright colors on a soft paper ground. Motion is gentle, and nothing flashes or scolds.
- **Guided:** Pip always says what to do next, and the screen shows the need before Pip says it.
- **Honest science:** correct facts, explained with kid comparisons.

Wonder Lab is a platform for any subject. Plants are one topic among many, so shared screens must not look like they're about plants (section 15).

## 2. How it's built

Everything is made in code. There are no image files and no libraries. Three layers:

| Layer | What | Where |
|---|---|---|
| Pictures | Canvas 2D drawing in JavaScript: activity scenes, Pip, logo, tab and badge icons, quiz pictures, confetti | `src/01_core.js` (helpers), one file per activity, `ICONS` in `src/07_quiz.js` |
| Page layout and controls | HTML and CSS: header, Pip's bubble, buttons, cards, tabs, Settings, quiz, popups. Some are built by JS at runtime (tabs, badge shelf, toasts) | `src/00_markup.html` (all CSS lives here) |
| Small UI icons | inline SVG: header toggles, read-aloud, the star (`STAR_SVG`), the nudge hand | `src/00_markup.html`, `src/01_core.js`, `src/09_app.js` |

Canvases are sharp on high-density screens: they render at up to 2× device pixels (`Stage.resize`, Pip, the logo and icons draw at 2×).

## 3. Color

### Page tokens (`:root` in `src/00_markup.html`)

| Token | Value | Role |
|---|---|---|
| `--ground` | `#E8F3E1` | page background (mint today; see section 15) |
| `--dot` | `#D3E8CB` | dot grid on the ground |
| `--card` | `#FFFDF5` | cards, bubble, dialogs, buttons at rest |
| `--card-2` | `#FFF4D6` | default `.btn` and `.choice`, warm highlight |
| `--ink` | `#243628` | all text, outlines and shadows |
| `--ink-soft` | `#56705B` | secondary text, small caps labels (5.4:1 on `--card`) |
| `--leaf` | `#3E9B4F` | "on" and "go": `.btn.go`, checked switch, listen bar, current life-cycle chip, chosen voice dot |
| `--leaf-deep` | `#2A7340` | "Wonder" in the title, bold vocabulary in Pip's bubble |
| `--sun` | `#FFC93C` | selected tab, stars, Settings header, quiz dot for a first-try answer |
| `--sun-soft` | `#FFE7A3` | pressed header toggles, earned badge disc |
| `--sky` | `#A9DDF1` | pressed `.btn`, chosen voice, read-aloud icon |
| `--petal` | `#F2668B` | decorative accent |
| `--carrot` | `#FF8A3D` | attention: "Lab" in the title, focus outline, hints on the canvas, current quiz question, badge popup kicker |

### State colors
| State | Color |
|---|---|
| Right answer | `#9BE0A6` |
| Wrong answer | `#F4D3D3`, at 75% opacity |
| Armed "are you sure?" button (`.btn.warn`) | `#F7B9B9` |
| Locked badge | `#EEF1EA`, dashed border |
| Off toggle / switch track | `#E6E6E0` / `#E3E7DF` |
| Dialog backdrop | `rgba(36,54,40,.45)` |

### Canvas palette (`C` in `src/01_core.js`)
Nature colors used by the scenes: `ink`, leaf greens (`leaf`, `leafDeep`, `leafLight`, `stem`), sun (`sun`, `sunDeep`), petal pinks (`petal`, `petalDeep`, `petalLight`), soil browns (`soil`, `soilDeep`, `soilLight`), roots, sky (`sky1` → `sky2` gradient), grass, `water`, bean tones, `pollen` and `carrot`.
Use `C` instead of new hex values, and `mix(a, b, t)` for color changes over time (drying, dimming, ripening).
A new topic adds its own named colors next to `C` instead of overloading the plant ones.

### Contrast rules
- Text is `--ink` or `--ink-soft` on light fills. Never put grey text on a colored fill.
- `--carrot` on cream is about 2.3:1. Use it for large display text, the focus outline, or canvas labels with a white stroke, never for body text.
- White on `--leaf` (`.btn.go`, the current chip) is about 3.5:1, below AA for 17 px text. On new screens, put ink text on `--sun` for primary buttons.
- On shared (non-topic) screens, bold words use `#B4500F` (5:1 on cream). Inside a topic they use the topic's bold color (section 15).
- Colors that must be told apart also differ in lightness, not hue alone.

## 4. Typography

Two Google fonts, loaded in `src/00_markup.html`:
- **Fredoka** (`--display`, fallback Trebuchet MS / Arial Rounded): titles, buttons, labels, numbers, canvas text (`FONT` in `src/01_core.js`).
- **Andika** (`--body`, fallback Verdana): body text and Pip's bubble. It's designed for early readers.

| Use | Font | Size / weight |
|---|---|---|
| App title | Fredoka | `clamp(30px, 5vw, 42px)` / 700, letter-spacing .5px |
| Quiz question | Fredoka | `clamp(22px, 3.2vw, 30px)` / 600, `text-wrap: balance` |
| Popup and dialog titles | Fredoka | 26–30 px |
| Card titles (`h2`) | Fredoka | 19 px / 600 |
| Buttons, tabs, answers | Fredoka | 17 px (answers 20 px) / 600 (answers 500) |
| Pip's bubble | Andika | `clamp(17px, 2.1vw, 20px)` |
| Body | Andika | 17 px, line-height 1.5 |
| Notes, hints, counts | Andika | 13–15 px, `--ink-soft` |
| Small caps labels | Fredoka | 12–14 px / 600, uppercase, letter-spacing .08–.1em, `--ink-soft` |
| Canvas labels (`label`) | Fredoka | 22 px default / 600, white outline 30% of the size |
| Canvas part tags (`tag`) | Fredoka | 19 px / 600 in a 34 px pill |

Numbers that change use `font-variant-numeric: tabular-nums`.

## 5. Shape, outline, shadow, spacing

The sticker look comes from three things used together: an ink outline, a solid offset shadow straight down, and round corners.

| Element | Border | Radius | Shadow |
|---|---|---|---|
| Activity stage | 4 px | 26 px | `0 6px 0` |
| Badge popup, Settings dialog | 4 px | 28 / 26 px | `0 8px 0` |
| Cards, Pip's bubble | 3 px | 22 px (`--r-lg`) | `0 5px 0` (`--shadow`) |
| Tabs | 3 px | 16 px (`--r-md`) | `0 5px 0` |
| Answer choices | 3 px | 16 px | `0 4px 0` |
| Buttons, icon buttons, inputs | 3 px | 14 px | `0 3px 0` |
| Pills (stars, nudge tip) | 3 px | 999 px | `0 3px 0` |
| Chips (life cycle, quiz dots) | 2 px | 999 px | none |
| Badge disc | 3 px (dashed when locked) | circle | `0 3px 0` (none when locked) |

- **Shadows are always `--ink`**, solid, straight down. Never use blurred or colored shadows on interface elements.
- **Pressed:** move down 3 px and drop the shadow (`:active { transform: translateY(3px); box-shadow: 0 0 0 }`).
- **Hover on big targets:** lift 2 px, and tabs also tilt (`translateY(-2px) rotate(-.7deg)`).
- **Spacing:** an 8 px base with 10–16 px between controls and 16 px between page sections. Card padding is 14–16 px. Pages are padded 18 px on top, 16 px at the sides and 48 px at the bottom.
- **Background:** the ground color plus the dot grid, `radial-gradient(var(--dot) 1.5px, transparent 1.6px)` every 22 px.

## 6. Layout

- **Page:** one column, `.wrap` (max-width 1060 px, centered, 16 px gap). From top to bottom:
  1. header
  2. activity tabs
  3. Pip's guide
  4. stage
  5. Tools and "Things to discover" cards side by side
  6. badge shelf
  7. footer
- **Stage:** fills the width with `aspect-ratio: 800/560`. Activities draw in that 800×560 logical space, and `Stage` scales it.
- **Grids** use `repeat(auto-fit, minmax(...))`: tabs 155 px, answers 210 px, voices 150 px, star checklist 140 px.
- **Breakpoint:** below 720 px the two cards under the stage stack. Everything else wraps on its own (header rows, tab grid, quiz body).
- **Phone:** no sideways scrolling, a 16 px gutter, touch targets of at least 44 px (most are 48–50 px).
- **Layering (z-index):** confetti canvas 60, badge popup 65, flying star 70, "Listen to Pip first" tip 80. The confetti and flying star never catch taps (`pointer-events: none`).

## 7. Components

All styles live in `src/00_markup.html`. Reuse these before inventing new ones.

- **Header (`.top`).**
  - The brand is a link home (`#homeLink`): a 58 px animated logo canvas (the bubbling flask, `ICONS.flask`) and the title. Each title letter is a span that hops and plays a note on hover or tap, with "Wonder" in leaf-deep and "Lab" in carrot, and a small caps subtitle, "Explore · Tinker · Discover".
  - Inside a topic, a breadcrumb (`#crumbs`): a Home button, then the topic name.
  - Controls on the right, each under a small caps label: the stars pill (all topics on the map, the open topic inside one) and `.icon-btn` toggles (voice, sound, music, settings). Toggles show their on or off icon with `aria-pressed`.
- **Stars pill (`.pill`):** a star icon, the count, and "of N" at 55% opacity. It bumps when a star lands.
- **Tabs (`.tab`):** one per activity, with a 48 px icon canvas, the name, and "n of N stars". Selected is `--sun`, and a finished tab's count turns leaf-deep and bold.
- **Pip's guide (`.guide`):**
  - Pip's 108 px canvas next to the speech bubble (`.bubble`). The bubble's tail is a 22 px rotated square on the left with two ink borders.
  - Inside the bubble: the text (`aria-live`), the read-aloud `.icon-btn`, and the listen bar (a 5 px leaf bar along the bottom that fills while taps are held).
  - The bubble pops on every new line and wiggles on a held tap.
- **Buttons (`.btn`):** Fredoka 17/600, 48 px tall, `--card-2`. Variants: `.go` (primary, `--leaf`, white text), `[aria-pressed=true]` (`--sky`), `.warn` (armed "Sure?" state, `#F7B9B9`), `:disabled` (45% opacity). Activity buttons sit in the Tools card (`ui.button`).
- **Cards (`.card`):** a panel with an `h2`. Inside: hint paragraphs (`.hint`, 15 px soft) and extras (`ui.extraEl`), such as the life-cycle chips (`.cycle`).
- **Star checklist (`.finds`):** a star icon and name per star. Not found is soft text with an empty star, found is ink with a gold star, and a newly found star spins in.
- **Badge shelf (`.shelf`, `.badge`):** an 80 px disc with a 54 px icon canvas and the name below. Locked badges are dashed and grey (icon greyscale at 35%), and the title attribute explains how to earn one.
- **Badge popup (`.toast`):** centered and 360 px wide. Inside: a 120 px canvas with a spinning sunburst and the badge icon, a "New badge!" kicker in carrot, the name (30 px), the description, and a "Hooray!" button. It bounces in, closes by itself after 7 s, and queues behind any other popup.
- **Settings (`dialog#settings`):**
  - 560 px wide, with a `--sun` header bar and sections separated by dashed lines.
  - Rows are 44 px tall, with the label on the left and the control on the right.
  - Switches (`.switch`) are 56×32 pills that turn leaf when on. Voices are radio cards (`.voice`). Each progress row has its own Reset, and "Start over" asks twice (it turns into the red `.warn` button).
  - Tapping outside closes it.
- **Quiz (`.quiz-box`):**
  - "Question n of 8" with progress dots: gold for right first time, sky for right later, and a carrot ring on the current one.
  - An optional 200 px picture canvas, then the question (30 px), then answer cards (`.choice`). A right answer turns green and bumps; a wrong one turns pink, shakes and is disabled.
  - A "Next question" `.btn.go` button. The end screen shows a star row, a score, and "Play again".
- **"Listen to Pip first" tip (`.nudge-tip`):** a pill with a hand icon that appears where a held tap landed, floats up and fades out.

## 8. Drawing on the canvas

Rules for anything drawn on a `Stage` (800×560) or an icon canvas (a 100×100 box, `drawIcon`).

- **Outlines:** shapes the kid can tap get an ink or deep-tone outline. Use 2–4 px for parts, 1.5–2 px for fine details, and thick strokes for stems and roots, drawn twice: a dark wide stroke, then a lighter narrow one on top. Use `lineCap`/`lineJoin: 'round'`.
- **Fills:** flat colors from `C`, with soft gradients allowed for volume (leaves, the sun, sky, beans). Highlights are white at 25–45% opacity. Scenes, unlike the interface, may use gradients.
- **Faces:** friendly things get a face, like Pip and the sun: dot eyes with a white glint, pink cheeks at 45%, a small smile, and a blink every few seconds.
- **Scene building blocks:** `sky`, `cloud`/`clouds` (drifting), `sun` (rays turn, face blinks), `ground` (soil specks plus swaying grass), `sparkle`, `arrow`, `drawLeaf`, `drawFlowerHead`, `drawPod`, `drawPlant`, `bee`, `butterfly`, `worm`. Random-looking scatter uses `seeded(n)`, so it doesn't jitter from frame to frame.
- **Text on the canvas:** `label()` for words (Fredoka with a white outline, so it reads on any background), `tag()` to name a part (a white pill with a dashed pointer line to the part), and `pillLabel()` for small headings.
- **Hover:** a part under the pointer glows (`glowOn(c)`: a soft yellow shadow, blur 26) and the cursor becomes a pointer, or `grab`/`grabbing` while dragging.
- **Hints:** when the kid is idle, show where to act on the canvas before Pip says anything:
  - a dashed carrot circle with "Try here!" after 7 s (Meet the Plant)
  - carrot instruction labels ("Tap the bean!", "Drag to split!", "Rub to peel!")
  - bouncing need labels ("Water me!", "Tap the sun!")
- **Labels:** found parts get a `tag`, and a "Show all labels" button (`ui.showAll`) turns them all on for review.
- **Parts that are gone stop responding:** once a stage of an activity ends, hit tests for its old parts return nothing.
- **Icons** for tabs and badges are tiny scenes in a 100×100 box, in the same style, registered in `ICONS`. Topic buildings for the home map follow the same rules (section 16).

## 9. Motion

Two systems, used for different jobs:

| What | How | Where |
|---|---|---|
| Anything drawn on a canvas: scenes, Pip, logo, badge sunburst, confetti | the shared `Loop` (`requestAnimationFrame` in `src/01_core.js`), animated from `t` (seconds) and `dt` | activity `draw`, `drawPip`, `fxInit` |
| Flying star (stage → stars pill) | Web Animations API, `el.animate()`, 1050 ms ease-in-out arc | `flyStar` in `src/09_app.js` |
| Small interface reactions | CSS `@keyframes`, started by adding a class (`pop`, `bump`, `hop`, `fresh`, `nudge`) and forcing a reflow to restart it | `src/00_markup.html` |
| Hover and press | CSS `transition` (0.12–0.2 s) | `src/00_markup.html` |

**CSS keyframes:**

| Name | Feel | Used by |
|---|---|---|
| `hop` | jump 9 px with a tilt, 0.5 s | title letters |
| `bump` | grow to 120% with a tilt, 0.45 s | stars pill when a star lands, right quiz answer |
| `pop` | 97% → 101.5% → 100%, 0.35 s | Pip's bubble on every new line |
| `nudge` | quick side wiggle, 0.45 s | Pip's bubble when a tap is held |
| `shake` | ±7 px shake, 0.4 s | wrong quiz answer |
| `spinin` | spin in from 20% size, 0.7 s | a newly found star in the checklist |
| `toastin` | zoom in from 30% with a twist and overshoot, 0.35–0.55 s | badge popup, Settings |
| `tipin` | rise, hold, fade, 1.4 s | "Listen to Pip first" tip |

**Idle life on the canvas:** Pip bobs (`sin(t·2.2)`) and his sprout sways, he blinks every 3.7 s, and his eyes follow the pointer on the stage. Grass and leaves sway, clouds drift, and the sun's rays turn and its face blinks. Talking makes Pip's mouth move; "wow" (after a star) makes him jump with big eyes; a tap on him makes him wiggle.

**Rules:**
- Motion explains something (water rises, a seed sprouts, a star flies to its counter) or makes the world feel alive. Never flash, strobe or move fast across the screen.
- Use easing (`ease`, `easeOut` in JS). Overshoot is only for celebrations (toast, Settings).
- **Reduced motion is required.** Canvas code checks `RM` and freezes sway, drift, bounce and wiggle, keeping only what explains the science. Confetti drops to 12 pieces, and the flying star is skipped. CSS: one rule in `src/00_markup.html` cuts every animation and transition to 0.01 ms. New CSS motion gets that for free; new canvas motion must check `RM` itself.
- Animation that should follow narration waits for Pip (`{ queue: true }`, `ready()`). Never time it with `setTimeout`.

## 10. Sound

Every sound is synthesized with Web Audio (`Sound` in `src/01_core.js`). There are no audio files except Pip's recorded voice.

- **Every tap makes an instant sound**, so the short pause before Pip speaks never feels laggy. Misses still make a soft xylophone note (`Sound.tap(i)`).
- **Musical palette:** a C-major pentatonic scale (`PENTA`), so overlapping notes never clash. Xylophone-like tones (sine plus a quiet high partial), and soft wobbles for boings.
- **Meaning:**
  - Success: `star` (rising arpeggio), `badge` (fanfare plus sparkle), `grow(n)` (rising run).
  - Tools and actions: `pop`, `fwip`, `whoosh`, `hop`, `boing`, `plunk`, `crack`, `peel`.
  - Nature: `drip`, `splash`, `slurp`, `chirp`, `buzz` (continuous bee).
  - Gentle "not quite": `oops` (soft falling tone, never a buzzer).
  - The "your turn" chime when a listen hold ends.
- **Ambient life:** a bird chirps now and then (every 9 s, 50% chance, not during the quiz). Hovering a tab plays a tiny note, and title letters play notes.
- **Garden music** (optional, off by default): a slow pentatonic loop on its own volume.
- **Mixing:** effects and music each have a volume and go through a compressor. Both dip to 50% while Pip talks, so the voice always wins.
- **Toggles:** effects and music respect their switches and volumes. Stop continuous sounds (`Sound.buzz(false)`) in `destroy` and on reset.

A new topic adds sounds to `Sound` in the same style: short, soft, rounded, pentatonic where pitched.

## 11. Rewards and feedback

| Moment | What happens |
|---|---|
| Correct action | an instant sound, plus a visual change in the scene |
| Star earned | `Sound.star`, Pip makes his "wow" face and jumps, a few confetti pieces, and a star flies from the spot to the stars pill, which bumps. The checklist row spins in. If Pip is explaining, all of this waits until he finishes. |
| Badge earned | a popup with a spinning sunburst, a fanfare and three confetti bursts; Pip then reads the badge name and description. Popups queue one after another. |
| Quiz right | confetti and a bump, and Pip says "Yes!" plus why. |
| Quiz wrong | `oops`, a shake, the answer is disabled, and Pip says "Not quite. Hint: …". Never scold. |
| Kid is stuck | the canvas shows a hint first (section 8). Pip says a reminder once, politely, and repeats it only after it's been ignored for a while. |
| Tap during an explanation | the tap is held: a gentle tone, Pip wiggles, the bubble nudges, and the tip says "Listen to Pip first". |

Confetti colors: sun, petal, leaf, carrot, purple `#8D6CD9` and water, with about a third shaped like leaves (a plant touch; see section 15).

## 12. Pip

- **Look:** a kidney-shaped bean (gradient `#F8E6AE` → `#E3C27A`, ink outline 3 px, white highlight) with a sprout of two leaves on top. Big white eyes with dark pupils and a glint, pink cheeks, a small smile, two little bean feet, and a soft ground shadow. Drawn by `drawPip` in a 108×108 box at 2×.
- **States:** idle (bob, sway, blink, eyes follow the pointer), talking (mouth opens and closes, small bounce), wow (big pupils, O mouth, jump; after a star) and poked (wiggle; tap Pip to hear the line again).
- **Voice:** recorded (four voices, chosen in Settings), warm and playful like a favorite teacher. No robotic device voice ever.
- **Role:** the guide for every topic and the home page. A topic can give Pip a costume (section 15), but he stays the same character.

## 13. Writing and narration

From `.claude/CLAUDE.md`, applied everywhere:
- **Style:** short sentences, one idea each, warm and playful, scientifically correct.
- **Vocabulary:** bold the vocabulary word (`<b>cotyledon</b>`) and explain hard words right away with a kid comparison ("like a packed lunch").
- **Praise effort, never scold:** "Not quite. Hint: …".
- **Instructions:** bold the action in Pip's line ("**Tap the watering can**"). Canvas hints use 2–4 words ending in "!" ("Drag me!").
- **Recording:** every line Pip says is recorded. Keep lines static. A line with a runtime value needs each variant in `voice/lines.py`. Names are never spoken (see `Voice.keyFor`).
- **Listen first:** a line of 8 or more words holds taps until Pip finishes. Keep short reactions under 8 words. Follow-up lines use `{ queue: true }` and reminders use `{ polite: true }`.
- **Interface labels:** sentence case, short, friendly ("Get a new bean", "Show all labels", "Start over").
- **Checks:** run the `kid-content-reviewer` agent on new text.

## 14. Accessibility

- Real `<button>`s and links. Icon-only buttons get an `aria-label` and a `title`. Toggles use `aria-pressed`, tabs `role="tab"`/`aria-selected`, and voices `role="radio"`/`aria-checked`.
- Visible focus everywhere: `:focus-visible { outline: 3px dashed var(--carrot); outline-offset: 3px }`.
- Every stage canvas has `role="img"` and an `aria-label` describing the scene (passed to `new Stage(host, desc)`). Decorative canvases are `aria-hidden`.
- Pip's bubble is `aria-live="polite"`, and so is the stars pill.
- Touch targets are at least 44 px. Contrast is 4.5:1 for text (section 3).
- Reduced motion is honored in both canvas and CSS (section 9).

## 15. Platform versus topic

The platform owns everything that stays the same whatever the subject. A topic owns its content and one accent.

**Platform (shared by every topic):**
- the header and logo
- the home page, the Trophy Hall, Settings and the routing
- Pip and the narration rules
- stars, badges, the trophy shelf and the reward choreography
- the sticker style, fonts, sounds, and the "on/go" green

**Topic (an entry in `TOPICS`, `src/09_app.js`):**
- its activities and scenes
- its building on the campus map
- an accent palette
- a costume for Pip
- its master badge

### Plant touches in today's shared interface
These need a neutral version (or a topic-supplied one) once more topics exist:
- **The logo** was the growing plant icon; it's now the bubbling flask.
- **The page ground** is warm paper on the map (`#F6F1E4`, dots `#E6DCC4`, set by `:root.at-home`) and still mint inside Plants & Seeds; per-topic grounds come with the accents.
- **The music toggle** says "Garden music".
- **Confetti** includes leaf shapes. A topic could supply its own confetti shape.
- **Settings section dividers** are tinted green (`#CFE0C8`).

Leaf green as the shared "on/go" color (switches, `.go`, listen bar) can stay: green means go in any subject.

### Topic entry (as built)
```js
{ id: 'space', name: 'Space & Planets', pip: 'helmet',
  accent: { ground: '#E7E8F7', dot: '#D4D7F0', tab: '#AEB6F2', stage: '#2E3A6B', bold: '#3F4FB8', plate: '#3F4FB8' },
  building(c, t) { /* its building on the campus map, about 220x170; section 16 */ },
  activities: [...], master: { id: 'space.b.master', name: '...', icon: '...', desc: '...' } }
```

Chosen accent palettes (Roger approved these and the costumes on 2026-10-03; Space and Weather are examples until those topics exist):

| Topic | ground | dot | selected tab | stage | bold word |
|---|---|---|---|---|---|
| Plants & Seeds (today) | `#E8F3E1` | `#D3E8CB` | `#FFC93C` | `#BFE6F4` | `#2A7340` |
| Space (example) | `#E7E8F7` | `#D4D7F0` | `#AEB6F2` | `#2E3A6B` | `#3F4FB8` |
| Weather (example) | `#E3F2F9` | `#CBE5F1` | `#8FD0EE` | `#BFE6F4` | `#1D6E99` |

Accent rules:
- Text on an accent is always `--ink`, at 4.5:1 or better.
- The bold word color reaches 4.5:1 on `--card`.
- Accents that sit side by side differ in lightness.
- `applyAccent(tp)` (`src/09_app.js`) sets `--ground`, `--dot`, `--tab-on`, `--stage-bg` and `--bold` on the root element when a topic opens, and removes them on the map and in the Trophy Hall. `plate` colors the topic's name plate in the Hall (white text, so it must reach 4.5:1 with white). Shared styles read the variables, so a topic changes nothing else.
- `checkIds()` reports, at startup, a topic missing its `building`, any accent color, or with an unknown costume; the walkthrough fails on it.

**Pip's costumes:**
- **Drawing:** `PIP_COSTUMES` in `src/09_app.js`: `helmet` (a glass space helmet with a shine and a blinking light), `rainhat` (a yellow rain hat; `hidesSprout`), `goggles` (lab goggles with tinted lenses). `pipFigure` draws the costume over Pip, only inside a topic (never on the map or in the Hall). A new costume is one more entry, drawn around Pip's origin.
- **Pip must stay readable.** Never cover his eyes or mouth, which carry his expressions. Keep the 3 px outline. Respect `RM`.

### IDs must be unique across topics
Activity, star and badge IDs and `Store.data.last` are global today (`quiz`, `quiz.q1`, `b.quiz`), so a second topic's quiz would share Plants & Seeds' progress.
- New topics prefix every ID with the topic ID (`space.quiz`, `space.quiz.q1`, `space.b.quiz`).
- Plants & Seeds keeps its current IDs, so saved stars survive.
- `Store.data.last` becomes `{ topic, activity }`. Read the old string form as a Plants & Seeds activity.

## 16. The home page: the Lab campus map and the Trophy Hall (built)

Roger chose the **Lab campus map** (mockup board C) on 2026-10-03. Wonder Lab's home is a map of the Lab's grounds seen from above. Each topic is a building, and a sandy trail joins them.
The mockup's other boards (A topic cards, B lab shelf) were not chosen.

### What's on the page, in order
1. **Header.** Logo (a bubbling flask, replacing the growing plant) plus the title; tapping either goes home. The stars pill shows all stars across topics; the toggles and Settings stay. No topic dropdown.
2. **Pip's greeting** in the usual bubble: one line for a first visit, another for a return visit.
3. **The campus map**, inside a stage-like frame (4 px ink border, radius 26, `0 6px 0` shadow):
   - **Lawn and paths:** a lawn (`#CDEBAE` with lighter dots) and a sandy trail (`#F1DDB0` with an ink edge and a dashed white center line) from the entrance gate to every building.
   - **Topic buildings:** one per topic, each matching its subject. In the mockup: a greenhouse for Plants & Seeds, an observatory for Space, a weather station with a wind sock for Weather.
   - **Name pills:** each building has a pill under it with the topic name and progress (a star and "12/37"), or "NEW!" for a topic not started.
   - **Coming soon:** an empty lot with a fence, a crane and a "?" sign, its pill dashed and soft.
   - **The Trophy Hall:** a platform building (not a topic) at the end of the trail, after the topics and coming-soon lots. It has columns, a gold trophy on the roof and a door in the bold platform color. Its pill reads "Trophy Hall" with the badge count, and it sparkles when a badge was earned since the last visit. It opens the Trophy Hall page (below).
   - **The entrance gate** with a "Wonder Lab" sign at the bottom of the trail.
   - **Small Pip** stands by the last building visited, under a "Last stop" flag.
   - **Decoration:** trees, a pond and flowers, never on the trail or a building.
4. **Keep going.** A strip under the map: the last activity, its building and stars, and a big "Jump back in" button.
5. **Footer** note that progress is saved on this device.

### How it's built
Follows the layering rule in section 2: pictures on a canvas, controls in HTML.
- **The map picture is one canvas** drawn in the shared `Loop`: lawn, trail, decorations, buildings and small Pip. It uses the same drawing conventions as a stage (section 8).
- **Each building's link is real HTML** (`<a href="#/<topic>">`), positioned over the building in percentages, containing the name pill. That keeps keyboard focus, screen readers and 44 px targets working. The canvas is `aria-hidden`; the links carry the meaning.
- **Hover and focus on a building:** the canvas draws the building with `glowOn` and a small hop, and the pill lifts 2 px. Tapping plays a door sound (a soft `plunk` plus `pop`), small Pip walks along the trail to the building, and the topic opens. With `RM` on, the walk is skipped and the topic opens at once.
- **Idle life:** clouds' shadows drift across the lawn, trees sway, the observatory's telescope turns slowly, the wind sock flutters, and small Pip bobs. All of it is frozen when `RM` is on. Each building animates through its own `building(c, t)`.

### Where buildings go: lots
A fixed list of **lots** (positions along the trail), defined once in the home page code, not in each topic.
- Topics take lots in `TOPICS` order. Free lots show the "Coming soon" construction site, at most two.
- The trail is drawn through the lots in use, so adding a topic extends it.
- Lot size gives a building about 220×170 logical pixels at desktop width. A building's art must fit that box and read clearly at half size.

### Growing past the first screen
The map is a wide landscape (16:9) that fits about six lots. When there are more topics, it gets taller: new rows of lots continue the trail downward (the trail winds back and forth like a board game). The page scrolls vertically, never sideways.

### Phone (below 720 px)
The landscape map doesn't fit a phone. Below 720 px the same buildings are drawn smaller, stacked along a winding vertical trail, one building per row, alternating left and right, with the pill beside each. Same canvas and same links, just a different lot list.

### A building's art (what a topic must supply)
- `building(c, t)`, drawn in a 220×170 box with its base on the bottom edge and a soft ground shadow.
- **Style:** sticker style like everything else: 3.5–4 px ink outlines, flat colors with white highlights, the topic's accent somewhere visible (the greenhouse's plants, the observatory's dome, the weather station's wind sock), a door. Something inside or on top shows the subject at a glance.
- **Motion:** gentle, from `t`, and still when `RM` is on.
- **Small version:** the same art scaled down is used for the Keep going strip and the trophy shelf.

### The Trophy Hall page (`#/trophies`)
Every badge and trophy across all topics, in one room. Mockup board "Trophy Hall".
- **Header:** breadcrumb Home › Trophy Hall, and the all-stars pill.
- **Pip's line:** welcomes the kid and says to tap a badge.
- **The room** sits in a stage-like frame. The background is warm striped wallpaper (`#F3E3C3` / `#EEDAB4`), a pennant garland strung across the top in the palette colors, and a wood plank floor (`#C9955A`).
- **Display cases:** one per topic, in `TOPICS` order.
  - **Case:** a wooden case (4 px ink, `0 6px 0` shadow) with a name plate in the topic's accent color.
  - **Badges:** behind glass (`rgba(221,243,247,.85)`), on wooden shelves, three per row. An earned badge is its `--sun-soft` disc with the activity's icon. A locked one is a dashed grey disc with "?", and its name stays visible so the kid knows what to aim for.
  - **Master trophy:** on a pedestal on top of the case, with a plaque ("Botanist · 2 of 6"). It's gold when earned, grey at 45% when not.
- **Coming soon:** a pedestal under a cloth with a "?".
- **Totals strip** under the room: stars, badges and trophies as pills.
- **Tapping a badge:** an instant sound, the disc hops, and Pip explains it.
  - **Earned:** Pip says the recorded badge line ("You earned the **Plant Pal** badge! You found every part of a plant!"). A topic's top badge is a **trophy** everywhere: "You won the **Botanist** trophy! …", and its popup says "New trophy!" (`earnedLine` in `src/09_app.js`).
  - **Locked:** Pip says how to earn it ("Not yet! Find every part of the plant in **Meet the Plant**."). Each badge has a `how` line next to its `desc`, recorded like any other line.
  - **Locked trophy:** "Not yet! Earn all 6 Plants and Seeds badges to win the **Botanist** trophy. A botanist is a scientist who studies plants." (the master's `how`).
  - Tapping during an explanation follows listen first, as everywhere.
- **Celebration:** a badge earned since the last visit glows and spins in (`spinin`) the first time the Hall is opened afterwards.
- **Phone:** cases stack one per row. The badge grid stays three across, discs 56 px.
- **Inside a topic:** the badge shelf under the activity stays (that topic's badges only), with a small "See the Trophy Hall" link.

### Pip on the home page
- Pip in the bubble wears no costume on the home page. Small Pip on the map doesn't either.
- Every line must be recorded, static where possible, and checked by the `kid-content-reviewer` agent.
- Greetings with the name start with a separate greeting sentence. `Voice.keyFor` maps "Hi <name>!" and "Nice to meet you, <name>!" to nameless recordings; a new one such as "Welcome back, <name>!" needs its own mapping plus a "Welcome back!" recording.
- Keep greetings under 8 words, or pass `{ lock: false }`. Otherwise the listen-first hold blocks the first tap on a building.
- Bracketed copy in the mockups (`[Name]`, `[Pip's intro…]`) is placeholder, not final.

### Navigation
- **Hash routes:** `#/` is home, `#/<topic>` is a topic (opens its last or first activity) and `#/<topic>/<activity>` is an activity. The back button works, a refresh keeps your place, and links can be bookmarked. It needs no CloudFront change and also works in `dist/artifact.html`.
- **Every visit** lands on home. Keep going is the one-tap path back.
- **Topic pages** get a breadcrumb: a "Home" button (house icon, at least 44 px) › the topic name. The stars pill switches to that topic's stars, the page takes the topic's accent colors (section 15), and Pip puts on the topic's costume.
- **Switching routes** must call the activity's `destroy()`, stop Pip (`Voice.stop()`, clear `App.sayQ`, `stopListening()`) and stop sound loops, as `mount()` does today.

### As built (src/08c_home.js)
- `campusLayout(cols, count)` places lots: three per row on a wide map (1600 logical px, building scale 1.3), one per row alternating left and right on a narrow one (600 px, scale .95, below 600 CSS px of map width). The trail is a smooth curve through the gate, each door and turn points, rising and dipping between buildings.
- `homeLots` adds "coming soon" lots to round out a row (one or two; one on a phone). `drawConstruction` draws them.
- Links (`.lot`) are positioned in percentages over each building and its name pill; the canvas is `aria-hidden`.
- Tapping a building plays a door sound and little Pip (`pipFigure`, scaled .5–.55) walks the trail samples to the door in 0.5–1.3 s, then `go('#/<topic>')`; with reduced motion he skips the walk.
- Lines: `HOME_HELLO` and `PIP_HELLO` on a first visit, "Welcome back!" plus `HOME_BACK` on a return, `HOME_NEXT` when coming back from a topic, `HOME_SOON` for a construction lot. All are said with `{ lock: false }`.
- `showHome()`, `showHall()` (`src/08d_hall.js`) and `route()` (in `src/09_app.js`) switch views: `:root.at-home`, `:root.at-hall` or `:root.in-topic`, `App.view`, and `leaveActivity()` stops everything before switching.
- The Trophy Hall (`src/08d_hall.js`): `drawTrophyHall` on the map (it sparkles while `hallNew()`), `renderHall()` builds the cases as HTML buttons with canvas icons, `Store.data.hallSeen` remembers which earned badges were shown, so new ones glow (`spinin`) once.

### Campus grounds (as built, src/08e_grounds.js)
The map is a place to explore, not just a menu. Everything here is decoration: the canvas stays `aria-hidden`, and the buildings' links carry the meaning.
- **Garden strip:** `groundsLayout(L)` adds a band under the buildings (290 logical px tall, 460 on a phone) with a pond, a flower bed, a rock and more trees. Keep the bottom-left corner plain grass: the walkthrough's first tap lands there.
- **Things to poke** (`groundsHit` / `groundsTap`), each with an instant sound and no speech:
  - a **tree** shakes and drops two leaves; every third tap on the same tree, a bird flies out (`chirp`).
  - the **frog** hops to another lily pad (`croak`), with a ripple where it lands; tapping the **water** makes a ripple (`drip`).
  - each **flower bud** blooms (`pop` plus a note); once all five are open, a **bee** visits each one and flies off (`buzz`, stopped by `leaveActivity`).
  - the **rock** flips aside to show a damp spot with a **pill bug**, which curls into a ball when tapped, then uncurls and wanders.
  - the **crane** on a coming-soon lot swings when its button is tapped.
  - plain **grass** plays a xylophone note.
- **Pip:** tapping a spot on the trail walks him there (`strollTo`; a building tapped mid-stroll still opens). Tapping him uses his own HTML button (`#pipBtn`, kept over him by `placePipBtn`), since he usually stands inside a building's link. He wiggles and says a "Did you know?" fact from an activity with at least one star (each activity's `facts`), a different one each time until all have been heard; with nothing played yet he says `PIP_TICKLE`. Said with `{ lock: false }`.
- **State** lives in `Grounds` for the session (a reload resets the blooms and the rock). With `RM` on, nothing flies or falls: blooms, hops and flips happen at once.

### The campus grows (as built, src/08f_garden.js)
- **The building fills in:** `building(c, t, p)` gets `p`, the share of the topic's stars earned. The greenhouse adds a seedling pot (15%), a tomato plant (35%), a hanging basket (60%) and a bean pole (85%).
- **The Badge Garden:** a row under the grounds (9 across, 3 on a phone, more rows as it fills) that starts with a "Badge Garden" sign. Each earned badge plants its `reward`, oldest first. The pieces live in `GARDEN`, a shared library any topic can pick from: birdhouse, wheelbarrow, beehive, pumpkins, scarecrow, dandelions, appleTree, sprinkler, beanTeepee, gnome, starFlag. Each one is drawn in a 100×130 box and does something when tapped (a bird peeks out, the dandelions blow away and grow back, the sprinkler sprays), with a sound and no speech. Tapping the sign: Pip says `GARDEN_SIGN`.
- **Landmarks:** a topic's `landmark` (a `GARDEN` piece flagged `tall`) rises beside its building when its trophy is won, taking the place of the tree there. Plants & Seeds: the giant `sunflower`.
- **News:** pieces that weren't there on the last visit sparkle until they're tapped, and Pip says `GARDEN_NEW` once, in place of "Where should we explore…" (`Store.data.gardenSeen`).
- `checkIds()` checks that every `reward` and `landmark` names a real piece.

### A living sky (as built, src/08g_sky.js)
- **The clock:** a warm wash at dawn (around 6:30) and a sunset glow (around 19:00), and a navy tint from 19:00 that is full from 21:00 to 5:30. At night fireflies drift over the grounds, clouds dim, and little Pip is drawn above the tint so he stays bright. `Sky.night()` gives 0 to 1. Tests set `Sky.fake` to a `Date`.
- **Clouds** (three wide, two on a phone) drift across with soft shadows on the lawn. Tapping one makes it rain for 5 s: it turns grey, with a soft rain sound. A daytime shower leaves two puddles on the nearest open lawn (`openGrass`: never on a building, the trail, the pond, the bed or a garden piece) that splash when tapped, and a rainbow over the garden that fades after 14 s. In winter the cloud snows instead, with no puddles. On about one home visit in five, a cloud rains by itself after 6–14 s.
- **Seasons** by month: spring trees have pink blossoms, autumn trees turn orange, red and gold and drop a leaf every few seconds, winter trees are dark green with snow caps.
- **Layers:** the rainbow and puddles sit on the lawn, under everything; the light tint, cloud shadows and fireflies go over the buildings and under Pip; rain and clouds are on top. Cloud taps come first; puddle taps come last.
- No speech, so nothing to record. With `RM` on, clouds stay still, rain and snow aren't drawn (the cloud still greys), and fireflies don't move.

### The critter hunt (as built, src/08h_critters.js)
- **Six critters** hide in the grounds. Each one comes out when you play with its hiding place, and you find it by tapping it while it's out:
  - the **ladybug** lands on the middle flower once it blooms.
  - the **snail** crawls out when the pond reeds are tapped.
  - the **pill bug** is under the rock.
  - the **owl** peeks out of the lowest tree when it's shaken, and shows all night.
  - the **earthworm** pokes out of the flower bed's soil when it's tapped, and after a shower.
  - a **fish** jumps on every third tap on the pond.
- **Finding one:** a sparkle sound, and Pip says its `found` line, a fact ("Owls sleep in the day…"). Saved in `Store.data.critters`.
- **The Critter hunt strip** under the map: six round buttons (a grey silhouette with "?" until found). An unfound one gives its `tip` (a hint); a found one repeats its fact. On a phone it's three across.
- **The Explorer badge:** finding all six earns it (toast plus the recorded badge line). It sits in the Trophy Hall's **Campus** case, after the topic cases; `CAMPUS_BADGES` holds badges for the map itself, and `hallAll()` counts them everywhere the hall counts badges.
- Critter taps come before the grounds' own taps, so a critter sitting on a flower or tree gets found rather than poked.
- **Voice note:** don't name a key `hint` outside the quiz. `voice/lines.py` turns every `hint:` into "Hint: …" and "Not quite. Hint: …" lines.

### Building it: checklist
- **Markup:** in `src/00_markup.html`, a `#home` section (map frame, Keep going strip) and a `#trophies` section, hidden while a topic is open. Remove the `#topic` select and its "More topics coming soon…" option.
- **Logic:** in `src/09_app.js`: routing (including `#/trophies`), the campus canvas and its lots, the Trophy Hall building and room, the link overlay, per-topic CSS variables and Pip costumes. Each topic's `building(c, t)` lives with the topic, and each badge gains a `how` line for the Trophy Hall. Plants & Seeds gets the greenhouse.
- **Drawing:** the flask logo replaces `drawIcon(logo, 'grow')`.
- **Voice:** run the pipeline for the new lines. "Every line recorded in every voice" must pass.
- **Tests** in `tests/walkthrough.js`:
  - the page opens on home
  - tapping the greenhouse link opens Plants & Seeds
  - the back button returns home
  - Keep going opens the last activity
  - a refresh on `#/plants/grow` reopens Grow a Bean
  - the first-tap narration check still passes
  - at phone width the map stacks vertically with no sideways scrolling
  - the Trophy Hall opens from the map, shows every badge in the right state, and tapping a locked badge plays its recorded "how" line

## 17. Checklist for anything new

- [ ] Uses the tokens, fonts, outlines, radii and shadows above. No new greys, blurred shadows, gradients on interface elements, emoji or image files.
- [ ] Reuses an existing component, or matches one's anatomy.
- [ ] Canvas art follows section 8: ink outlines, `C` colors, faces where friendly, `label`/`tag` for text, hover glow, idle hint.
- [ ] Every tap has an instant sound. Continuous sounds stop on reset and leave.
- [ ] Motion has a reason, uses the `Loop` (canvas) or a CSS class (interface), and respects reduced motion.
- [ ] Pip says what to do. Lines are short, bold the action or word, recorded, and reviewed.
- [ ] Contrast at least 4.5:1, targets at least 44 px, focus visible, labels on icon buttons and canvases.
- [ ] Works at phone width with no sideways scrolling.
- [ ] Nothing plant-specific in shared screens. Topic-specific color comes from the topic's accent.
- [ ] The walkthrough covers it and all checks pass.
