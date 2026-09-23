#!/usr/bin/env bash
# Build Wonder Lab and serve it at http://localhost:8000 (Ctrl+C to stop).
set -euo pipefail
cd "$(dirname "$0")"
python3 build.py
PORT=${1:-8000}
(sleep 1; open "http://localhost:$PORT" 2>/dev/null || true) &
cd dist && python3 -m http.server "$PORT"
