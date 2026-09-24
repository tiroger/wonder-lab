#!/usr/bin/env bash
# After Claude edits a file under src/ or build.py: rebuild and make sure the page's script still parses.
# Exit code 2 sends the error back to Claude so it fixes it right away.
input=$(cat)
path=$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("tool_input") or {}).get("file_path",""))' 2>/dev/null)
case "$path" in
  */src/*|*/build.py) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! out=$(python3 build.py 2>&1); then echo "build.py failed after editing $path:" >&2; echo "$out" >&2; exit 2; fi
tmp="${TMPDIR:-/tmp}/wonder-lab-check-$$.js"
sed -n '/<script>/,/<\/script>/p' dist/artifact.html | sed '1d;$d' > "$tmp"
if ! err=$(node --check "$tmp" 2>&1); then echo "The page script no longer parses after editing $path:" >&2; echo "$err" >&2; rm -f "$tmp"; exit 2; fi
rm -f "$tmp"
exit 0
