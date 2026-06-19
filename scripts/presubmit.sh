#!/usr/bin/env sh
# Mirror .husky/pre-commit so agents and humans can catch failures before `git commit`.
# Usage: npm run presubmit   (or ./scripts/presubmit.sh)

set -e

echo "== presubmit: import boundaries =="
npm run check:import-boundaries

echo "== presubmit: ui copy (em dash) =="
npm run check:ui-copy

echo "== presubmit: doc links =="
npm run check:doc-links

echo "== presubmit: agent docs =="
npm run check:agent-docs

echo "== presubmit: css important baseline =="
npm run check:css-important

echo "== presubmit: workflow guardrails =="
npm run check:workflows

echo "== presubmit: lint =="
npm run lint

echo "== presubmit: knip config comments =="
npm run check:knip-config

echo "== presubmit: knip =="
npm run knip

if [ -f src/muscle/main.tsx ]; then
  echo "== presubmit: muscle public assets =="
  npm run muscle:validate-assets
fi

echo "== presubmit: typecheck =="
npm run typecheck

echo "== presubmit: test:fast =="
npm run test:fast

echo "== presubmit: css parse (when *.css changed) =="
node scripts/presubmit-css-if-needed.mjs

echo "presubmit: all checks passed"
