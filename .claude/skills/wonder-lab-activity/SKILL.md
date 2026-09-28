---
name: wonder-lab-activity
description: How to build a Wonder Lab activity (the activity object, Stage canvas, drawing helpers, stars, badges, Pip's narration rules). Use when adding or changing an activity or topic in this repo.
---
# Building a Wonder Lab activity

## The activity object
Each activity is a `const` in its own `src/0N_name.js`, listed in a topic's `activities` in `src/09_app.js`:
```js
const A_example = {
  id: 'example', name: 'Tab Name', icon: 'plant',          // icon = key in ICONS (src/07_quiz.js), drawn in a 100x100 box
  badge: { id: 'b.example', name: 'Badge Name', desc: 'You did the thing!' },
  stars: [{ id: 'example.first', name: 'First idea' }, ...],   // 3-6, each a real concept; ids are saved, never rename them
  badgeNeed: 10,                                            // optional; default = all stars
  html: true,                                               // optional; activity builds DOM instead of a canvas (the quiz)
  intro: 'What Pip says when the tab opens. <b>Bold</b> the action.',
  mount(host, ui) {
    const st = new Stage(host, 'Plain description of the scene for screen readers.');
    const s = { /* all state lives here; reset() rebuilds it */ };
    st.onDown = (x, y) => { /* x, y are logical 800x560 coords */ };
    st.onMove = (x, y) => {}; st.onUp = (x, y) => {};
    st.draw = (c, t, dt) => { /* draw the whole scene every frame; update state with dt */ };
    ui.button('Start again', () => { reset(); ui.say(A_example.intro); });
    return { stage: st, destroy() { st.destroy(); } };     // stop any sound loops (Sound.buzz(false)) in destroy
  }
};
```

## Stage and hit-testing
- Logical canvas is 800x560 (`W`, `H`), scaled to fit. Build `Path2D` shapes each frame and keep them for hit tests.
- `st.hit(path, x, y)`, `st.hitLine(path, x, y, width)`, `st.over(path)` (hover and pointer cursor), `st.p` = pointer `{x, y, down, inside}`, `st.client(x, y)` = screen coords (for `ui.award`), `st.cursor = 'grab'`.
- Shape helpers: `circle`, `ellipse`, `rrect`, `xf(path, x, y, rotDeg, sx, sy)` to move/rotate a base path. Reusable shapes: `LEAF`, `POD`, `kidney(w, h)`.
- Scene helpers: `sky`, `cloud(s)`, `sun`, `ground(c, y, t)`, `drawLeaf`, `drawFlowerHead`, `drawPod`, `drawPlant`, `bee`, `butterfly`, `worm`, `sparkle`, `arrow`, `label`, `tag` (labels a part with a dashed pointer), `pillLabel`, `glowOn(c)` (hover glow).
- Colors come from `C` in `src/01_core.js`; fonts are Fredoka (display) and Andika (body). Use `mix(a, b, t)` for colour transitions and `seeded(n)` for stable random scatter.
- Animation: use `t` (seconds) and `dt`; check `RM` and reduce motion when it's true.

## Stars, badges, narration
- `ui.award('example.first', ...st.client(x, y))` gives a star once (it returns false if already earned). Badges are awarded automatically when an activity's stars are complete.
- `ui.say(html)` sets Pip's bubble and plays the recording. Options: `{ polite: true }` for reminders (skipped if Pip is talking or the last message is fresh; returns false so you can retry later), `{ queue: true }` for news that must not interrupt.
- Lines of 8+ words lock input until Pip finishes ("listen first"); pass `{ lock: false }` for an instruction the kid must act on mid-gesture, or `{ lock: true }` to lock a short line. The Stage, `ui.button` buttons and the quiz already respect the lock; custom DOM controls should check `inputLocked()` and call `nudge(x, y)`.
- A line that follows another (the next step, the result of an animation) uses `{ queue: true }` so it starts after Pip finishes plus a breath. Don't chain lines with `setTimeout`.
- If a message depends on a star, award first, then say.
- Rapid taps are handled for you: the newest line wins after a short settle pause, the old one fades out, and repeating the line that's playing doesn't restart it. Pair every tap with an instant `Sound.*` effect.
- Reminders: show the need on screen first (bouncing label, visual change). Speak it once with `{ polite: true }`, and again only if it's been ignored for 20+ seconds.
- For tests, return `state: () => s` from `mount` so `tests/walkthrough.js` can set up a situation directly.
- Every string Pip says must be recorded (`/record-voice`). Keep lines static; if one must vary, add each variant in `voice/lines.py`.
- When a stage ends (parts removed, used up, transformed), those parts must stop responding to taps and hover.
- Show found parts with `tag(...)` and support `ui.showAll` (a "Show all labels" button) for learning.

## Sound
`Sound.pop/boing/hop/drip/splash/slurp/crack/peel/whoosh/fwip/plunk/squish/chirp/grow(n)/sparkle/star/badge/oops`, `Sound.buzz(true|false)` for a continuous bee, `Sound.tap(i)` for a xylophone note. They respect the effects toggle and volume.

## Done means
- Stages progress in order and can't be skipped or re-triggered in a broken way; a reset button restores the start.
- `tests/walkthrough.js` plays it end to end and asserts its stars, and the full run is all PASS.
- The `kid-content-reviewer` agent has no open issues.
