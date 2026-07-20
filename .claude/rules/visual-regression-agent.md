<!-- AUTO-GENERATED from .agents/rules/visual-regression-agent.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Visual regression (agents)

Read skill [`labs-visual-judge`](../skills/labs-visual-judge/SKILL.md) (diff triage + rubric) and [`labs-visual-regression`](../skills/labs-visual-regression/SKILL.md) (baseline mechanics) before updating `e2e/visual/apps.visual.spec.ts-snapshots/`.

## Must do

1. **Review** actual + expected + diff (CI artifact or local `test-results/`) — never blind `--update-snapshots`.
2. **Classify** each failure with a [`docs/VISUAL_JUDGE_RUBRIC.md`](../../docs/VISUAL_JUDGE_RUBRIC.md) tier + row (`T1.3`, `T2.1`, …).
3. **Update from Linux CI** when Tier 2: `node scripts/import-visual-baselines-from-artifacts.mjs <test-results-dir>` (`--include-new` for first captures).
4. **Commit audit trail** — list each PNG, its tier row, and why it changed.
5. **Escalate** every Tier 3 (and Tier 1 you cannot fix in scope) with images attached.

## Must not

- Update baselines to absorb any Tier 1 (must-fix) signal.
- Run full `--update-snapshots` on macOS for repo-wide refresh (Linux CI is canonical; use `npm run test:e2e:visual:docker` locally).
- Skip review when `src/shared/**` or `/ui/**` changed.

## CI signals = agent todo

- Scoped PR visual step is **blocking** — a failure means judge now (skill `labs-visual-judge`).
- `Visual regression (advisory)` warning on cross-cutting diffs — download `visual-regression-artifacts` and judge before merge.
