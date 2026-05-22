#!/usr/bin/env sh
# Mirror .husky/pre-commit so agents and humans can catch failures before `git commit`.
# Usage: npm run presubmit   (or ./scripts/presubmit.sh)

set -e

echo "== presubmit: import boundaries =="
npm run check:import-boundaries

echo "== presubmit: lint =="
npm run lint

echo "== presubmit: knip =="
npm run knip

echo "== presubmit: typecheck =="
npm run typecheck

echo "== presubmit: test:fast =="
npm run test:fast

echo "presubmit: all checks passed"
