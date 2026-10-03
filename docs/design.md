# Wonder Lab design guide

For anyone (agent or person) who changes Wonder Lab's look, adds a topic, or builds the home page.
Read it with `.claude/CLAUDE.md` (the rules) and the `wonder-lab-activity` skill (how an activity is built).
This file covers the parts above a single activity: the visual language, which parts belong to the platform and which to a topic, and the home page.

**Status (2026-10-03):** the home page is designed but not built, and the direction (A, B or C below) is not chosen yet.
Mockups: https://claude.ai/artifact/8mD2F3fKfsMHX11TgtKtLP (private to Roger; read it with the Artifact tool).
When the home page ships, update this file to describe what was built and delete the options that weren't chosen.

## 1. What Wonder Lab is

A learning platform for an 8-year-old (3rd grade). Each class topic (Plants & Seeds today, any subject later) is a set of hands-on activities with a guide character, Pip, who explains everything out loud.
The platform must never look like it's about one subject. Plants are one topic among many.

## 2. The look: rules that make it Wonder Lab

- **Everything is drawn in code.** Canvas 2D in the app, with no images and no libraries. (The mockups use inline SVG as a stand-in; the app draws the same shapes on a `<canvas>`.)
- **Sticker style.** Thick dark outlines (`--ink`, 3 px on cards and buttons, 4 px on the activity stage) and a solid offset shadow straight down (`0 3px 0` small controls, `0 5px 0` cards, `0 6px 0` stage). A pressed control moves down 3 px and loses its shadow.
- **Rounded.** Radii are 14 px (buttons), 16 px (tabs), 22 px (cards and the bubble) and 26 px (stage).
- **Warm paper ground with a dot grid**, `radial-gradient(dot 1.5px, transparent 1.6px)` at 22 px.
- **Two fonts.** Fredoka (display: titles, buttons, labels; weights 500 to 700) and Andika (body text, made for early readers; 17 px, line-height 1.5).
- **Small caps labels** above controls: Fredoka 12–13 px, weight 600, uppercase, letter-spacing .08em, `--ink-soft`.
- **Kid first.** Touch targets of at least 44 px (the app uses 48–50 px). Short sentences. Every screen has Pip saying what to do. Gentle motion, and none when `RM` (reduced motion) is on.
- **No emoji, no gradient washes, no stock icons.** Icons are small hand-drawn shapes with the same ink outline.

### Color tokens (`src/00_markup.html`, `:root`)

| Token | Value | Use |
|---|---|---|
| `--ground` | `#E8F3E1` | page background today (mint; see section 4 for the platform ground) |
| `--dot` | `#D3E8CB` | dot grid on the ground |
| `--card` | `#FFFDF5` | cards, bubble, buttons at rest |
| `--card-2` | `#FFF4D6` | default `.btn`, highlighted cards |
| `--ink` | `#243628` | text, outlines, shadows |
| `--ink-soft` | `#56705B` | secondary text (5.4:1 on `--card`) |
| `--leaf` / `--leaf-deep` | `#3E9B4F` / `#2A7340` | "Wonder" in the title, `.btn.go`, plant vocabulary |
| `--sun` / `--sun-soft` | `#FFC93C` / `#FFE7A3` | selected tab, star, pressed toggles |
| `--petal` | `#F2668B` | accents |
| `--sky` | `#A9DDF1` | pressed `.btn`, read-aloud button |
| `--carrot` | `#FF8A3D` | "Lab" in the title, hint labels drawn on the canvas |

Canvas colors live in `C` in `src/01_core.js`.

Contrast traps:
- `--carrot` on cream is about 2.3:1. Use it only for large display text or canvas labels with a white stroke.
- White on `--leaf` (`.btn.go`) is about 3.5:1, below AA for 17 px text. Prefer ink text on `--sun` for primary buttons on new screens.
- For bold words on platform pages (not inside a topic), the mockups use `#B4500F` (5:1 on cream).

### Existing components (`src/00_markup.html`)
- **Header:** logo canvas, the "Wonder Lab" title with letters that hop, the stars `.pill`, and `.icon-btn` toggles (voice, sound, music, settings).
- **Pip's guide:** the `#pip` canvas plus the `.bubble` (22 px radius, a tail drawn as a rotated square, `aria-live`), the read-aloud button and the listen bar.
- **`.tab`:** the activity tabs, with a canvas icon, name and star count. The selected tab is `--sun`.
- **`.btn`:** default `--card-2`. `.go` is the primary action, `.warn` the red armed state, and `[aria-pressed=true]` turns it `--sky`.
- **`.card`:** panels below the stage.
- **`.finds`:** the star checklist.
- **`.badge .disc`:** an 80 px circle. A locked badge has a dashed border, a grey fill and no shadow.
- **`.toast`:** the new-badge popup.
- **`.stage`:** the 800×560 canvas frame.

## 3. Platform versus topic

The platform owns everything that stays the same whatever the subject. A topic owns its content and one accent.

**Platform (shared by every topic):**
- the header and logo
- the home page, Settings and the routing
- Pip and the narration rules
- stars, badges and the trophy shelf
- the neutral ground
- the sticker style and fonts

**Topic (an entry in `TOPICS`, `src/09_app.js`):**
- its activities and their scenes
- a cover drawing for its home card
- an accent palette
- a costume for Pip
- its master badge

Proposed shape of a topic entry (current fields plus the new ones):

```js
{ id: 'space', name: 'Space & Planets', tagline: 'Short line for the home card.',
  accent: { ground: '#E7E8F7', dot: '#D4D7F0', tab: '#AEB6F2', stage: '#2E3A6B', bold: '#3F4FB8' },
  cover(c, t) { /* draw in a 200x140 box; animate gently with t, still when RM */ },
  pip: 'helmet',            // costume key, or null for plain Pip
  activities: [...], master: { id: 'space.b.master', name: '...', icon: '...', desc: '...' } }
```

Accent palettes from the mockups (Plants is today's app; the others are examples):

| Topic | ground | dot | selected tab | stage | bold word |
|---|---|---|---|---|---|
| Plants & Seeds | `#E8F3E1` | `#D3E8CB` | `#FFC93C` | `#BFE6F4` | `#2A7340` |
| Space (example) | `#E7E8F7` | `#D4D7F0` | `#AEB6F2` | `#2E3A6B` | `#3F4FB8` |
| Weather (example) | `#E3F2F9` | `#CBE5F1` | `#8FD0EE` | `#BFE6F4` | `#1D6E99` |

Accent rules:
- Text on an accent is always `--ink`.
- A tint must keep ink at 4.5:1 or better.
- Accents that sit side by side must differ in lightness, not only in hue.
- Apply an accent by setting CSS variables on `body` when the topic opens. The shared styles already read `--ground`, `--dot` and friends, so a topic overrides a few variables and nothing else.

### IDs must be unique across topics
Activity IDs, star IDs, badge IDs and `Store.data.last` are global today (`quiz`, `quiz.q1`, `b.quiz`). A second topic with a quiz would share saved progress with Plants & Seeds.
- New topics prefix every ID with the topic ID (`space.quiz`, `space.quiz.q1`, `space.b.quiz`).
- Plants & Seeds keeps its current IDs, so saved stars survive.
- `Store.data.last` becomes `{ topic, activity }`. Read the old string form as a Plants & Seeds activity.

## 4. The home page

### Content, in order
1. **Header.** Logo plus title; tapping either goes home. The stars pill shows all stars across topics; the toggles and Settings stay as they are. No topic dropdown.
2. **Pip's greeting**, in the usual bubble. Different lines for a first visit and a return visit.
3. **Keep going.** Shown only if there's a last activity: its icon, its name, the topic and its stars, plus one big "Jump back in" button.
4. **Pick a topic.** One card per topic, then "Coming soon" placeholders.
5. **My trophies.** One master badge per topic (Botanist for Plants & Seeds). Locked ones are dashed and grey, with "Finish <topic>" under them.
6. **Footer** note that progress is saved on this device.

### Platform look on the home page
- **Neutral logo:** a bubbling flask (in the mockups) instead of the growing plant.
- **Neutral ground:** proposed warm paper `#F6F1E4` with dots `#E6DCC4`. Board A has a tweak to compare it with today's mint and a pale sky.
- **"Wonder" and "Lab"** keep their colors.

### Three directions (mockup boards A, B, C)
| | A. Topic cards | B. Lab shelf | C. Lab campus map |
|---|---|---|---|
| Idea | a grid of big cards, like today's tabs grown up | each topic is a kit box (colored lid, label sticker) on wooden shelves | each topic is a building on a map of the Lab (greenhouse, observatory, weather station) joined by a trail |
| Cost per new topic | one cover drawing | one cover drawing plus box colors | one custom building drawing plus a place on the map |
| Scales to many topics | yes, the grid wraps | yes, add shelves | poorly past about 6–8 buildings, and phones need horizontal scrolling |
| Whimsy | medium | high | highest |
| Code change | smallest (reuses `.tab`, `.card`, `.badge`) | medium | largest (positioned layout, map art) |

Recommendation, pending Roger's choice: **A for the first version**, since it's cheap per topic and closest to the current code. B's kit boxes could later restyle A's cards without changing the structure.

### Topic card anatomy (A)
- **The whole card is one link.** Ink border 3 px, radius 22, shadow `0 5px 0`.
- **Cover:** 156 px tall, filled with the topic's stage color, with a 3 px ink line under it. The cover drawing sits centered in a 200×140 box.
- **Body:** title in Fredoka 23 px, tagline in Andika 15 px `--ink-soft`, then progress: a star, "12 of 37" and a bar filled in the topic accent. A topic not started shows "Not started yet"; a new one gets a "NEW!" corner ribbon (`--sun`, ink text).
- **Coming soon card:** a dashed `#8C9A8F` border, no shadow, a `#F3F1EA` fill and a mystery box drawing with a "?". It's not a link.

### Pip on the home page
- Pip stays the guide for every topic, and a topic may give him a costume (section 5).
- Every home line must be recorded (the voice pipeline), static where possible, and checked by the `kid-content-reviewer` agent.
- Names are never spoken. A line with the name starts with a separate greeting sentence, and the rest is its own recorded sentence. `Voice.keyFor` (`src/08_voice.js`) maps "Hi <name>!" and "Nice to meet you, <name>!" to their nameless recordings; a new greeting such as "Welcome back, <name>!" needs its own mapping there plus a recording of "Welcome back!".
- **Listen first applies here too.** Any line of 8 or more words holds taps until Pip finishes. A long greeting would hold the first tap on a topic card, so keep greetings under 8 words, or pass `{ lock: false }`.
- The mockup text in brackets, like `[Name]` and `[Pip's intro…]`, is placeholder copy, not final lines.

### Navigation
- **Hash routes:** `#/` is home, `#/<topic>` is a topic (opens its first or last activity) and `#/<topic>/<activity>` is an activity. The back button works, a refresh keeps your place, and links can be bookmarked. It needs no CloudFront change and also works in `dist/artifact.html`.
- **First visit and every return** land on home. Keep going is the one-tap path back.
- **Topic pages** get a breadcrumb at the top: a "Home" button (house icon, at least 44 px) › the topic name. The stars pill switches to that topic's stars.
- **Switching routes** must call the current activity's `destroy()`, stop Pip (`Voice.stop()`, clear `App.sayQ`, `stopListening()`) and stop sound loops, the same way `mount()` does now.

## 5. Pip's costumes
- **Drawing:** a costume is drawn after Pip in `drawPip`, chosen by the open topic, with no costume on the home page. Examples from the mockups: a glass space helmet (a translucent circle around Pip with a white shine), a yellow rain hat (crown plus brim, which hides the sprout), and lab goggles.
- **Pip must stay readable.** Never cover his eyes or mouth, since they carry his expressions (talking, wow, poke). Keep the outline weight. Respect `RM`.
- **No new recordings:** costumes don't change Pip's voice, so they need none.

## 6. Building the home page: checklist
- **Markup and styles** in `src/00_markup.html`: a `#home` section hidden while a topic is open, reusing `.card`, `.badge` and `.btn`.
- **Home rendering, routing and per-topic CSS variables** in `src/09_app.js`. Covers are drawn with a `drawIcon`-style helper (a `COVERS` map next to `ICONS`).
- **Header:** remove the `#topic` select and its "More topics coming soon…" option. The logo and title link to `#/`.
- **Voice:** run the pipeline for the new lines (`voice/lines.py`, synth, check, build). The walkthrough's "Every line recorded in every voice" check must pass.
- **Tests** in `tests/walkthrough.js`:
  - the page opens on home
  - tapping Plants & Seeds opens the last or first activity
  - the back button returns home
  - Keep going opens the last activity
  - a refresh on `#/plants/grow` reopens Grow a Bean
  - the first-tap narration check still passes on the home greeting
- **Accessibility:**
  - cards are real links or buttons with visible focus (`:focus-visible` dashed carrot outline, as today)
  - the cover canvases are `aria-hidden`
  - the card text carries the meaning
- **Phone width:** the grid drops to one column, the header wraps, and nothing scrolls sideways.
