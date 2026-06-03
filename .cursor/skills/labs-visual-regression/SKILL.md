---
name: labs-visual-regression
description: Verifies or updates Labs visual and audio regression baselines with explicit review. Use when running test:e2e:visual, updating snapshot PNGs, refreshing visual baselines, audio hash baselines, or when the user mentions screenshot regression or e2e/visual snapshots.
---

# Labs visual regression

## Ask first (always)

Do **not** update baselines without explicit user approval:

- `e2e/visual/*-snapshots/`
- `src/shared/beat/regression/baselines/synthetic-audio.hashes.json`

## Before updating

Read [references/regression-workflow.md](references/regression-workflow.md) for commands and review expectations.

## Verify (no baseline changes)

```bash
npm run test:e2e:visual          # screenshot baselines
npm run test:audio:regression      # audio hashes
npm run test:regression            # both
npx playwright test e2e/playback-ui-regressions.spec.ts  # playback smokes (not full visual)
```

## Update (intentional UI/audio changes only)

After user approves:

```bash
# Single route filter example:
npx playwright test --project=visual e2e/visual/apps.visual.spec.ts -g "cats desktop" --update-snapshots

# All visual baselines:
npm run test:e2e:visual:update

# Full PNG refresh (fonts/tooling changed globally):
npm run test:e2e:visual:update:fresh

# Audio hashes:
npm run test:audio:regression:update
```

## PR requirements

- Explain **why** each baseline changed in the PR summary
- Include before/after context or Playwright report artifacts when helpful
- Run `npm run presubmit` after updates
