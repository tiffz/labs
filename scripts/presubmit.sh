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

echo "== presubmit: lint =="
npm run lint

echo "== presubmit: knip =="
npm run knip

echo "== presubmit: typecheck =="
npm run typecheck

echo "== presubmit: test:fast =="
npm run test:fast

echo "presubmit: all checks passed"
