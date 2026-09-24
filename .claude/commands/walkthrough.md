---
description: Build, serve and play every activity end to end in a headless browser
---
1. `python3 build.py`
2. Start a server if one isn't already on port 8799: `(cd dist && python3 -m http.server 8799 >/dev/null 2>&1 &)`
3. `node tests/walkthrough.js` (needs Playwright: `npm install --no-save playwright && npx playwright install chromium`)
4. Report the PASS/FAIL lines. For any FAIL, read the JSON report above them, find the cause in `src/`, fix it, and run again. Don't loosen a check to make it pass unless Roger agrees the check was wrong.
