---
description: Add a new class topic to Wonder Lab (a dropdown entry with its own activities, stars and badges)
argument-hint: <topic, e.g. "the water cycle"> [what the class is doing this week]
---
Add a new topic to Wonder Lab: $ARGUMENTS

1. **Understand the week.** Ask Roger (one short question) what the class is doing hands-on if it isn't in the arguments: experiments, vocabulary list, anything his son found hard or exciting. Build around those.
2. **Plan 4 to 6 activities** before writing code, in the same spirit as Plants & Seeds: one "meet the parts" explorer, one or two hands-on simulations of the real class activity, one cause-and-effect sandbox, and a quiz. For each: what the kid does with their hands (tap, drag, rub, pour), the stages it moves through, the stars (3 to 6, each a real concept), the badge, and every line Pip says. Share the plan in a few lines and wait for a go-ahead.
3. **Build** each activity as its own `src/0N_<name>.js` file following the `wonder-lab-activity` skill and the look in `docs/design.md`. Prefix every activity, star and badge id with the topic id (`space.quiz`, `space.quiz.q1`, `space.b.quiz`); ids are saved progress, and `checkIds()` reports clashes at startup. Draw everything in Canvas, reuse helpers from `src/01_core.js`, add icons to `ICONS` in `src/07_quiz.js` (or a new shared file), and register the topic in `TOPICS` in `src/09_app.js` with a master badge. Remove the "More topics coming soon…" option only if no other topics are planned.
4. **Content check:** run the `kid-content-reviewer` agent on every new line.
5. **Record Pip:** `/record-voice`.
6. **Test:** extend `tests/walkthrough.js` so it plays the new topic end to end (open it with `location.hash = '#/<topic>/<activity>'`) and asserts its stars, stage order and badges; then `/walkthrough`. Everything must PASS.
7. **Ship:** `/ship` with a short summary of what the kid can now do.
