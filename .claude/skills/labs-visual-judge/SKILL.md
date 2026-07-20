---
name: labs-visual-judge
description: Judges Labs screenshot diffs against the visual rubric — obtain diffs, view PNGs, classify must-fix vs acceptable vs escalate, then fix or import baselines. Use when a visual regression check fails in CI or locally, when triaging visual-regression-artifacts, or when deciding whether a screenshot change is an acceptable baseline update.
---

<!-- AUTO-GENERATED from .cursor/skills/labs-visual-judge/SKILL.md — do not edit directly. Edit the source and run `npm run generate:claude-guidance`. -->

# Labs visual judge

Classify every screenshot diff with [`docs/VISUAL_JUDGE_RUBRIC.md`](../../../docs/VISUAL_JUDGE_RUBRIC.md) (canonical tiers — read it now). Baseline mechanics live in [`docs/VISUAL_REGRESSION_AGENT.md`](../../../docs/VISUAL_REGRESSION_AGENT.md); update-approval policy in skill [`labs-visual-regression`](../labs-visual-regression/SKILL.md).

## 1. Obtain the diffs

**From CI** (blocking scoped visual step or advisory warning):

```bash
gh run download <run-id> -n visual-regression-artifacts -D /tmp/labs-visual
# triplets: /tmp/labs-visual/test-results/**/<id>-<viewport>-{expected,actual,diff}.png
```

**Locally** (Linux-identical rendering, requires Docker):

```bash
npm run test:e2e:visual:docker            # full suite
npm run test:e2e:visual:scoped            # scoped to changed apps (Linux/CI context)
```

macOS-native runs drift from Linux baselines — use them only for rough triage, never to update.

## 2. View, then classify

For each failing snapshot: **Read all three PNGs** (expected, actual, diff) and the
`error-context.md` DOM snapshot. Assign exactly one rubric tier + row (`T1.3`, `T2.1`, …).
Never classify from filenames, pixel ratios, or diff percentages alone. Check the
app's `DESIGN.md` when judging theming (T1.7) or aesthetics (T3.3).

## 3. Act by tier

| Tier              | Action                                                                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T1 must-fix**   | Fix the code in this PR. Do not touch the baseline. Re-run the scoped visual check.                                                                                                                                        |
| **T2 acceptable** | Import Linux CI actuals: `node scripts/import-visual-baselines-from-artifacts.mjs /tmp/labs-visual/test-results` (add `--include-new` for first-capture routes). Commit body lists every PNG + tier row + one-line reason. |
| **T3 escalate**   | Stop. Post actual + expected + diff images in chat with your hypothesis; wait for the user.                                                                                                                                |

## 4. Verify

- Re-run the failing check (`test:e2e:visual:scoped` in CI, or push and watch the scoped visual step).
- New routes with no baseline yet are skipped by the scoped runner — land their baselines through the reviewed refresh flow, not silently.

## Wired entry points

- CI scoped visual step failure → this skill (see `ci.yml` comment).
- `ci:watch` FAIL sentinel naming the e2e job's visual step → this skill.
- `/ui/#regression/screenshots` → "Copy LLM prompt" embeds the rubric pointer.
