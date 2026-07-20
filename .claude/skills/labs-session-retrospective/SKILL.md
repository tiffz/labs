---
name: labs-session-retrospective
description: Runs a mandatory end-of-session retrospective and proposes durable process improvements. Use when a substantial session completes, the user asks for process feedback, or when codifying learnings into rules, tests, or docs.
---

<!-- AUTO-GENERATED from .cursor/skills/labs-session-retrospective/SKILL.md — do not edit directly. Edit the source and run `npm run generate:claude-guidance`. -->

# Labs session retrospective

## When to run (mandatory deliverable)

Run and **deliver** (not merely offer) when **any** apply:

- Fixed **two or more** bugs or touched **multiple** subsystems
- Same **root cause class** appeared more than once
- Investigation slowed because **docs, tests, or rules were missing**
- User asks for process / UX feedback — or session ends after substantial work
- UX revision churn (multiple human polish rounds on same screen)

Skip only for a **single obvious fix** with no friction (one sentence: "No retrospective — single-file fix.")

Always-on reminder: [`.cursor/rules/session-retrospective-mandatory.md`](../../rules/session-retrospective-mandatory.md).

## Workflow

1. Structure findings as **symptom → root cause class → durable fix**
2. Reuse labels from [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](../../../docs/CONTINUOUS_PROCESS_IMPROVEMENT.md) and [`docs/AGENT_INVARIANTS.md`](../../../docs/AGENT_INVARIANTS.md)
3. **Propose** artifacts in priority order: regression test → Cursor rule → doc checklist → skill → PR template → ADR (material only)
4. **Codify on second occurrence** — same root cause class twice in a session or across sessions → **implement** test/rule/smoke/doc (same PR when practical); do not only backlog
5. If user asked to codify process improvements, **implement** and run `npm run presubmit`
6. Record landed items in PR **Process improvements**; deferred items in [`docs/PROCESS_BACKLOG.md`](../../../docs/PROCESS_BACKLOG.md)

## Deliverable template (paste in chat + PR)

```markdown
## Session retrospective

### Quantitative (when available)

| Metric                          | Value                          |
| ------------------------------- | ------------------------------ |
| Human UX correction rounds      | …                              |
| Presubmit failures before green | …                              |
| CI success rate (30d)           | Run `npm run report:ci-health` |

### Human intervention / extra iterations

- …

### Token waste (re-discovery)

- …

### Obvious-bad UX (avoided or shipped)

- …

### Tech debt

- …

### Hard to change / easy to break

- …

### Durable fixes (this session or proposed)

| Root cause | Artifact |
| ---------- | -------- |
| …          | …        |

### Process backlog (deferred)

- …
```

## UX-specific review

When the session touched UI, also classify against [`docs/UX_AGENT_GUIDE.md`](../../../docs/UX_AGENT_GUIDE.md):

- `ux-gestalt` · `ux-redundancy` · `ux-visual-weight` · `ux-spec-violation` · `ux-journey-overload`

Recommend **`labs-ux-journey`** skill for future similar screens.

## Handoff types (do not conflate)

| Name                      | When                                  | Doc                                                                               |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| **Iteration handoff**     | Mid-refactor; next person needs state | `DEVELOPMENT.md` § Iteration handoff                                              |
| **Process retrospective** | Session complete; improve how we work | This skill + `CONTINUOUS_PROCESS_IMPROVEMENT.md`                                  |
| **Bug-fix handoff**       | Fixed a regression                    | PR template § Bug-fix handoff; skill `labs-playback-bugfix` when playback-related |

## Agent default at session end

1. **Deliver** the retrospective block using the template above.
2. Propose 1–3 **specific files** to add/update (rule, smoke, `UX_AGENT_GUIDE` section, etc.).
3. Implement when user asked to codify or same class hit twice this session.
4. PR **Process improvements** must not be empty on agent PRs — use `None` only for trivial single fixes.

Do not turn every typo fix into a process initiative. Scale effort to session complexity.
