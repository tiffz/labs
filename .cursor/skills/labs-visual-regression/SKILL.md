---
name: labs-visual-regression
description: Verifies or updates Labs visual and audio regression baselines with explicit review. Use when running test:e2e:visual, updating snapshot PNGs, refreshing visual baselines, audio hash baselines, CI visual warnings, or when the user mentions screenshot regression or e2e/visual snapshots.
---

# Labs visual regression

**Read first:** [`docs/VISUAL_REGRESSION_AGENT.md`](../../docs/VISUAL_REGRESSION_AGENT.md) (agent playbook). Canonical human doc: [`docs/REGRESSION_WORKFLOW.md`](../../docs/REGRESSION_WORKFLOW.md).

## Approval policy

| Situation                                                  | Baseline update OK?                 |
| ---------------------------------------------------------- | ----------------------------------- |
| User explicitly asks to review CI diffs and update if good | Yes, after review                   |
| PR implements intentional UI change in scoped routes       | Yes, with `-g` filter + audit trail |
| Diff shows error banners, blank content, overlap           | **No** — fix code                   |
| Agent cannot explain why a route changed                   | **No** — escalate                   |
| Routine “refresh everything” without review                | **No**                              |

## Canonical platform

**Linux CI** is the source of truth for PNG baselines. macOS local runs may pixel-drift; prefer importing CI actuals:

```bash
gh run download <run-id> -n visual-regression-artifacts -D /tmp/labs-visual-artifacts
node scripts/import-visual-baselines-from-artifacts.mjs /tmp/labs-visual-artifacts/test-results
```

## Agent workflow (summary)

1. **Gather** — CI artifacts (`visual-regression-artifacts`) or local `test-results/**/{expected,actual,diff}.png`; read `error-context.md` for DOM.
2. **Review** — Vision or Playwright report; classify each failure (expected / platform / bug / uncertain).
3. **Update** — Import CI actuals (preferred) or `--update-snapshots` on Linux with `-g` filter when possible.
4. **Commit** — List each PNG + reason in PR/commit body.
5. **Verify** — CI visual step clean (cross-cutting) or nightly visual green.

## Verify (no baseline changes)

```bash
npm run test:e2e:visual
npm run test:audio:regression
npm run test:regression
npx playwright test e2e/playback-ui-regressions.spec.ts
```

## Update commands

```bash
# Single route (example):
npx playwright test --project=visual e2e/visual/apps.visual.spec.ts -g "encore desktop" --update-snapshots

# All visual baselines (Linux only in practice):
npm run test:e2e:visual:update

# Delete all PNGs then regenerate (global font/tooling change):
npm run test:e2e:visual:update:fresh

# Promote CI failure actuals → committed baselines:
node scripts/import-visual-baselines-from-artifacts.mjs /path/to/test-results

# Audio hashes:
npm run test:audio:regression:update
```

## CI signals

- **`Visual regression (advisory)` warning** on `main` → download artifacts and run this skill.
- **Nightly `Run visual regression baselines`** red → blocking; fix or update baselines before ignoring.

## Local dashboard

`http://127.0.0.1:5173/ui/#regression/screenshots` — baseline / latest / diff gallery when dev server runs.

## PR requirements

- Explain **why** each baseline changed.
- Attach or reference actual screenshots when non-obvious.
- Run `npm run presubmit` after PNG commits.
