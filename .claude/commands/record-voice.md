---
description: Re-record Pip's narration after any text change, check every clip, rebuild
---
Pip's lines are pre-recorded with OpenAI (gpt-4o-mini-tts) in four voices; nothing falls back to a device voice. After text changes:

0. On a fresh checkout (or a new machine), `voice/clips/` is empty because it's git-ignored. Run `python3 voice/unpack.py` first: it rebuilds the clip cache from `voice/packs/`, so the next step records only new lines instead of all of them. Recording needs `ffmpeg`.
1. `python3 voice/lines.py`: shows how many messages exist. Look at `git diff voice/lines.json` and make sure only the lines you meant to change moved. Canvas labels or aria text sneaking in is fine but worth trimming in `lines.py` filters if it's a lot.
2. `python3 voice/synth_openai.py`: records only new or changed lines, in every voice. It reads the API key from `.env` itself. Never print the key.
3. `python3 voice/check.py --fix`: transcribes each clip and re-records the ones that came out wrong. Mismatches like "4" vs "four", "OK" vs "okay", "petal" heard as "pedal" or "Wonderlab" as one word are harmless (the transcriber, not the audio); anything else that's still flagged after the fix rounds, tell Roger.
4. `python3 build.py`, then `/walkthrough` to confirm "Every line recorded in every voice".
