---
description: Re-record Pip's narration after any text change, check every clip, rebuild
---
Pip's lines are pre-recorded with OpenAI (gpt-4o-mini-tts) in four voices; nothing falls back to a device voice. After text changes:

1. `python3 voice/lines.py`: shows how many messages exist. Look at `git diff voice/lines.json` and make sure only the lines you meant to change moved. Canvas labels or aria text sneaking in is fine but worth trimming in `lines.py` filters if it's a lot.
2. `python3 voice/synth_openai.py`: records only new or changed lines, in every voice. It reads the API key from `.env` itself. Never print the key.
3. `python3 voice/check.py --fix`: transcribes each clip and re-records the ones that came out wrong. Mismatches like "4" vs "four" or "OK" vs "okay" are harmless; anything else that's still flagged after the fix rounds, tell Roger.
4. `python3 build.py`, then `/walkthrough` to confirm "Every line recorded in every voice".
