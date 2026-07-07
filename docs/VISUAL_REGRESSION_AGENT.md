# Visual regression — agent playbook

How AI agents review screenshot diffs, decide update vs bug, and keep baselines aligned with **Linux CI** (canonical).

Related: [`REGRESSION_WORKFLOW.md`](REGRESSION_WORKFLOW.md) · skill [`labs-visual-regression`](../.cursor/skills/labs-visual-regression/SKILL.md) · rule [`.cursor/rules/visual-regression-agent.mdc`](../.cursor/rules/visual-regression-agent.mdc)

## Why agents care

Shared UI (`src/shared/components/`, `/ui/` catalog, fonts, tokens) can change **many app shells at once**. Screenshot baselines catch layout, typography, and empty-state regressions that unit tests miss. Agents editing shared components should treat visual diffs as part of the definition of done.

## Canonical environment

| Environment                     | Role                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Linux CI** (Ubuntu, Chromium) | **Source of truth** for committed `e2e/visual/apps.visual.spec.ts-snapshots/*.png`                                     |
| **macOS local**                 | Verify + triage; expect pixel drift vs Linux baselines — do not `--update-snapshots` on Mac unless you accept CI churn |
| **Nightly**                     | Full visual matrix on cold runner (`nightly-portfolio-audit.yml`)                                                      |

Baselines were last refreshed April 2026; catalog and Encore landing changes will legitimately drift until updated from CI.

## When to run

| Trigger                                                                | Action                                                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| User asks to review CI visual warning                                  | Download artifacts → review → import or fix                                          |
| PR touches `src/shared/**`, `/ui/**`, app CSS, fonts, homepage catalog | Run or inspect visual diffs before merge                                             |
| Intentional UI redesign in one app                                     | Filter update: `-g "encore desktop"`                                                 |
| Global font/tooling change                                             | `npm run test:e2e:visual:update:fresh` **from Linux** (CI artifact import or CI job) |

## Agent workflow (mandatory sequence)

### 1. Gather artifacts

```bash
# Latest main CI run with visual-regression-artifacts
gh run list --branch main --limit 5
gh run download <run-id> -n visual-regression-artifacts -D /tmp/labs-visual-artifacts
```

Or locally after `npm run test:e2e:visual`:

- `test-results/**/<name>-{expected,actual,diff}.png`
- `playwright-report/index.html`
- `/ui/#regression/screenshots` when dev server is up

### 2. Review each failure (human or vision)

For every diff triplet, classify:

| Verdict            | Signals                                                                                                | Action                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| **Expected**       | Matches PR intent; catalog entries added; copy/layout redesign; shared token change across many routes | Update baseline                                         |
| **Platform drift** | Subpixel font/AA only; structure identical; fails on Mac but CI actual looks correct                   | Update from **CI actual**                               |
| **Bug**            | Overlap, clipping, missing content, error banners, wrong empty state, layout collapse                  | Fix code; **do not** update baseline                    |
| **Uncertain**      | Cannot explain diff                                                                                    | Escalate to user with actual + expected + diff attached |

**Red flags (never auto-approve):**

- Error text (`Set VITE_…`, stack traces, “Could not load”)
- Broken images / blank main content
- Controls overlapping or off-screen
- Diff touches routes outside the PR scope with no shared-layer explanation

**Green lights (safe to update):**

- Homepage height change from new catalog cards / Unlisted filter
- Encore landing redesign (centered card vs old dev placeholder)
- `/ui/` catalog rows shift together (shared component spacing)
- Pixel ratio ≤ 0.03 with same DOM snapshot in `error-context.md`

### 3. Update baselines (Linux authoritative)

**Preferred — import CI actuals for failed snapshots only:**

```bash
node scripts/import-visual-baselines-from-artifacts.mjs /tmp/labs-visual-artifacts/test-results
```

**Single route (must run on Linux or accept CI re-run):**

```bash
npx playwright test --project=visual e2e/visual/apps.visual.spec.ts -g "encore desktop" --update-snapshots
```

**Full refresh (rare — fonts, wait helpers, global CSS):**

```bash
npm run test:e2e:visual:update:fresh
```

### 4. Commit with audit trail

PR / commit body must list:

- Each updated snapshot (`home-desktop.png`, …)
- **Why** (catalog expansion, Encore redesign, shared slider padding, …)
- Confirm no bug red flags in actual screenshots

### 5. Verify

- Push and confirm CI visual step has **no warning** (cross-cutting diffs) or inspect nightly visual job
- `npm run presubmit` (unit tests; visual is separate)

## CI integration (current)

- **PR / main cross-cutting diffs:** advisory visual run; mismatches → `::warning::`, artifacts uploaded, job stays green
- **Scoped single-app PRs:** visual skipped
- **Nightly:** visual regression is **blocking**

Agents should treat CI warnings as a **todo**, not noise.

## Best practices (industry + Labs)

1. **Never blind `--update-snapshots`** — always inspect actual vs expected; Playwright diffs highlight changed pixels for a reason.
2. **One canonical OS** — Linux CI; avoids Mac↔Linux font wars.
3. **Scope updates** — prefer `-g "route formfactor"` over full refresh.
4. **Pair with smokes** — `test:e2e:smoke` and `playback-ui-regressions.spec.ts` catch functional breaks; visual catches layout.
5. **Shared change → many baselines** — if only one app changed but 10 diffs appear, suspect shared CSS/components first.
6. **Use DOM snapshots** — `error-context.md` YAML shows accessibility tree; use when diff PNG is ambiguous.
7. **Artifacts are the review surface** — agents without local Playwright can review downloaded PNGs.
8. **Escalate ambiguous diffs** — false-negative baselines are cheaper to fix than shipping a layout bug.

## Quick reference

| Command                                                   | Purpose                |
| --------------------------------------------------------- | ---------------------- |
| `npm run test:e2e:visual`                                 | Verify baselines       |
| `npm run test:e2e:visual:update`                          | Regenerate all (Linux) |
| `node scripts/import-visual-baselines-from-artifacts.mjs` | Promote CI actuals     |
| `gh run download … -n visual-regression-artifacts`        | Fetch CI diffs         |
| `http://127.0.0.1:5173/ui/#regression/screenshots`        | Local gallery          |
