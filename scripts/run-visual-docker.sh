#!/usr/bin/env sh
# Run the visual regression suite in the official Playwright Linux image so local
# captures match CI/nightly rendering (Linux Chromium is the canonical renderer —
# docs/VISUAL_REGRESSION_AGENT.md). Extra args pass through to the npm script,
# e.g.:  sh scripts/run-visual-docker.sh --update-snapshots
set -eu

PW_VERSION="$(node -p "require('@playwright/test/package.json').version")"
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-jammy"

# Named volume shadows the host node_modules (native binaries differ per OS).
docker run --rm \
  -v "$PWD":/work \
  -v labs-visual-node-modules:/work/node_modules \
  -w /work \
  "$IMAGE" \
  bash -lc "npm ci --no-audit --no-fund && npm run test:e2e:visual -- $*"
