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

echo "== presubmit: shared theme contract =="
npm run check:shared-theme-contract

echo "== presubmit: chrome UI contract =="
npm run check:chrome-ui

echo "== presubmit: menu a11y contract =="
npm run check:menu-a11y

echo "== presubmit: volume slider contract =="
npm run check:volume-slider

echo "== presubmit: app quality contract =="
npm run check:app-quality

echo "== presubmit: css important baseline =="
npm run check:css-important

echo "== presubmit: css import order =="
npm run check:css-import-order

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

CHANGE_CLASS="$(node scripts/diff-change-class.mjs --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).classification||'default')}catch{console.log('default')}})")"
echo "== presubmit: diff class = ${CHANGE_CLASS} =="

if [ "$CHANGE_CLASS" = "docs-only" ]; then
  echo "presubmit: docs-only diff — skipping build, Vitest, and e2e (see docs/CI_PATH_SCOPING.md)"
  echo "presubmit: all checks passed"
  exit 0
fi

echo "== presubmit: production build =="
npm run build

if [ "$CHANGE_CLASS" != "e2e-only" ]; then
  echo "== presubmit: test:changed-apps (scoped Vitest vs main) =="
  npm run test:changed-apps
else
  echo "== presubmit: skipping test:changed-apps (e2e-only diff) =="
fi

echo "== presubmit: scoped e2e smoke =="
npm run test:e2e:scoped

echo "presubmit: all checks passed"
