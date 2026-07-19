#!/usr/bin/env sh
# Presubmit gate for agents and humans — catches failures before `git commit`.
# Usage: npm run presubmit   (or ./scripts/presubmit.sh)
#
# The actual checks live in scripts/presubmit-parallel.mjs (staged parallel
# runner; same checks as the old sequential script, ~30% faster wall clock).
# Set LABS_PRESUBMIT_SEQUENTIAL=1 to debug checks one at a time.

set -e

if [ "${LABS_PRESUBMIT_SEQUENTIAL:-}" = "1" ]; then
  exec sh scripts/presubmit-sequential.sh
fi

exec node scripts/presubmit-parallel.mjs
