---
description: Add one activity (a new tab) to an existing Wonder Lab topic
argument-hint: <topic id> <what the kid does>
---
Add an activity to Wonder Lab: $ARGUMENTS

Follow the `wonder-lab-activity` skill. Plan first (hands-on action, stages, stars, badge, Pip's lines) and confirm with Roger in a few lines. Then build it in its own `src/` file, add it to the topic's `activities` in `src/09_app.js`, run the `kid-content-reviewer` agent on the text, `/record-voice`, extend `tests/walkthrough.js` to play it end to end, `/walkthrough`, and `/ship`.
