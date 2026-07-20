---
name: labs-ux-journey
description: Mandatory before non-trivial Labs UI — journey sketch in chat, then implement with gestalt/redundancy checks. Use for new screens, layout changes, upload/sync UX, or repeated UX feedback.
---

<!-- AUTO-GENERATED from .cursor/skills/labs-ux-journey/SKILL.md — do not edit directly. Edit the source and run `npm run generate:claude-guidance`. -->

# Labs UX journey

## Hard gate (read first)

**Do not create or edit UI files until you post the journey sketch in chat.**

Read [`docs/UX_AGENT_GUIDE.md`](../../../docs/UX_AGENT_GUIDE.md). Always-on rule: [`.cursor/rules/ux-journey-mandatory.md`](../../rules/ux-journey-mandatory.md).

If the user waived the sketch explicitly, note that in chat and proceed.

## When to activate

- New screen, tab, panel, or multi-step flow
- Upload/sync/progress UI
- User reports gestalt, redundancy, heavy chrome, or cramped layout
- Agent is unsure which action should be primary

## Workflow

### 1. Journey sketch (required — post in chat before coding)

Answer before coding:

| Question                  | Your answer |
| ------------------------- | ----------- |
| User + context            |             |
| Primary goal (one verb)   |             |
| Secondary actions (max 2) |             |
| Background/async work     |             |
| What we deliberately hide |             |

**If primary goal is ambiguous → `AskQuestion`** with 2–3 options. Do not guess and stack every button.

### 2. Layout plan

- One **primary** CTA per viewport
- **Aggregate** background status (one banner/bar), not N duplicate progress UIs
- Related fields in one `<section>` (gestalt proximity)
- Parallel rows → shared component shell (STYLE_GUIDE § Parallel surfaces)
- **Mobile parity**: the journey's primary goal must be completable at 390px with a coarse pointer ([`docs/RESPONSIVE_DESIGN.md`](../../../docs/RESPONSIVE_DESIGN.md) § Mobile interaction parity); plan the stacked/degraded layout now, not after desktop ships

### 3. Visual weight check

- [ ] No card-in-card without reason
- [ ] Shadow/border budget (UX guide)
- [ ] App tokens only (`--gesture-*`, MUI theme, `DESIGN.md`)
- [ ] Padding/contrast/grid (UX guide § Spec hygiene)

### 4. Copy check

- [ ] No repeated phrases on same screen
- [ ] [`docs/USER_COPY_STYLE.md`](../../../docs/USER_COPY_STYLE.md) + app `COPY_STYLE.md`
- [ ] Long help in tooltips, not stacked paragraphs

### 5. Verify

- [ ] **`npm run verify:layout`** when layout/CSS changed on primary surfaces (mandatory before done)
- [ ] Responsive floor for the app: `npx playwright test e2e/smoke/responsive-all-apps.spec.ts --grep "/<app>/"`
- [ ] Screenshot / browser snapshot for changed route when UI is user-visible
- [ ] Add or extend e2e smoke if invariant is testable (see [`docs/E2E_SMOKE_CONVENTIONS.md`](../../../docs/E2E_SMOKE_CONVENTIONS.md))
- [ ] If grid + controls on same screen → read [`docs/PERFORMANCE.md`](../../../docs/PERFORMANCE.md); consider CUJ row + interaction smoke
- [ ] `npx eslint` zero warnings on touched files

## Red flags (stop and redesign)

- More than one full-width progress bar visible at once
- Same status string on every card in a grid
- Three+ equally prominent contained buttons above the fold
- New hex colors not in design tokens
- Implementing a second upload/sync UI when shell already has one

## Root cause labels for retrospectives

`ux-gestalt` · `ux-redundancy` · `ux-visual-weight` · `ux-spec-violation` · `ux-journey-overload`

## Related skills

- `labs-ui-design-variations` — palette/theme exploration (dev preview picker)
- `labs-performance` — CUJ budgets + interaction smokes after journey ships
- `labs-session-retrospective` — codify repeated UX pain into rules/smokes
