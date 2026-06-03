#!/usr/bin/env sh
# Fail when new !important declarations appear beyond the audited baseline.
# Refresh baseline only after intentional CSS_IMPORTANT_AUDIT.md update.

set -e

ROOT="$(CDPATH= cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASELINE=258

if command -v rg >/dev/null 2>&1; then
  COUNT=$(rg -c '!important' src --glob '*.css' 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')
else
  COUNT=$(grep -r '!important' src --include='*.css' 2>/dev/null | wc -l | tr -d ' ')
fi

if [ -z "$COUNT" ]; then
  COUNT=0
fi

if [ "$COUNT" -gt "$BASELINE" ]; then
  echo "check:css-important failed: ${COUNT} !important uses (baseline ${BASELINE})" >&2
  echo "See docs/CSS_IMPORTANT_AUDIT.md — fix specificity or update baseline intentionally." >&2
  exit 1
fi

echo "check:css-important: ok (${COUNT}/${BASELINE})"
