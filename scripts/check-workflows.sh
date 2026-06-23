#!/usr/bin/env sh
# Ensures GitHub Pages deploy is single-sourced and concurrency is configured.
set -eu

WORKFLOW_DIR=".github/workflows"
DEPLOY_WORKFLOWS=0
MISSING_CONCURRENCY=0

for f in "$WORKFLOW_DIR"/*.yml "$WORKFLOW_DIR"/*.yaml; do
  [ -f "$f" ] || continue
  if grep -q 'actions/deploy-pages' "$f"; then
    base="$(basename "$f")"
    if [ "$base" = "rollback.yml" ]; then
      # Manual rollback only — still must serialize with CI deploy via same concurrency group.
      if ! grep -q 'pages-deploy-' "$f"; then
        echo "check:workflows: $f uses deploy-pages but missing pages-deploy- concurrency group"
        MISSING_CONCURRENCY=1
      fi
      continue
    fi
    DEPLOY_WORKFLOWS=$((DEPLOY_WORKFLOWS + 1))
    if ! grep -q 'pages-deploy-' "$f"; then
      echo "check:workflows: $f uses deploy-pages but missing pages-deploy- concurrency group"
      MISSING_CONCURRENCY=1
    fi
  fi
done

if [ "$DEPLOY_WORKFLOWS" -ne 1 ]; then
  echo "check:workflows: expected exactly one automatic workflow with actions/deploy-pages, found $DEPLOY_WORKFLOWS"
  exit 1
fi

if [ "$MISSING_CONCURRENCY" -ne 0 ]; then
  exit 1
fi

CI_YML="$WORKFLOW_DIR/ci.yml"
if [ ! -f "$CI_YML" ]; then
  echo "check:workflows: missing $CI_YML"
  exit 1
fi

if ! grep -q 'run-scoped-e2e.mjs "${{ github.event.before }}"' "$CI_YML"; then
  echo "check:workflows: ci.yml must pass github.event.before to run-scoped-e2e on push"
  exit 1
fi

if ! grep -q 'run-scoped-e2e.mjs "origin/${{ github.base_ref }}"' "$CI_YML"; then
  echo "check:workflows: ci.yml must pass origin/base_ref to run-scoped-e2e on pull_request"
  exit 1
fi

echo "check:workflows: ok (single Pages deploy path, scoped e2e base-ref parity)"
