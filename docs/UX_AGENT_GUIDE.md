# UX guide for agents (Labs)

How agents should design and implement UI so humans spend less time on gestalt, redundancy, and “obviously bad” fixes.

**Canonical human docs:** [`STYLE_GUIDE.md`](../STYLE_GUIDE.md) (parallel surfaces, density), app `DESIGN.md`, [`docs/USER_COPY_STYLE.md`](USER_COPY_STYLE.md).  
**Workflow skill:** [`labs-ux-journey`](../.cursor/skills/labs-ux-journey/SKILL.md).  
**Durable journeys:** [`docs/CRITICAL_USER_JOURNEYS.md`](CRITICAL_USER_JOURNEYS.md) → `src/<app>/CUJs.md` after the flow stabilizes.  
**Performance:** [`docs/PERFORMANCE.md`](PERFORMANCE.md), skill [`labs-performance`](../.cursor/skills/labs-performance/SKILL.md).  
**Scoped rule:** [`.cursor/rules/ux-agent-guide.mdc`](../.cursor/rules/ux-agent-guide.mdc).

**Hard gate (always-on):** [`.cursor/rules/ux-journey-mandatory.mdc`](../.cursor/rules/ux-journey-mandatory.mdc) — post journey sketch in chat **before UI code**.

## Before you layout (mandatory for new screens / major UX)

Run skill **`labs-ux-journey`** and **post the journey sketch in chat** (not only in PR):

1. **Who** is on this screen and **what just happened**?
2. **Primary goal** (one verb) — the single action that completes the visit.
3. **Secondary** actions (≤2) — everything else is tertiary or hidden.
4. **Background work** (uploads, sync) — one aggregate status surface, not N copies.
5. **Uncertainty** — if primary vs secondary priority is unclear, **ask the user** (`AskQuestion`) before implementing.

Do not “throw all controls on the page.” Hierarchy beats completeness.

When the journey ships, **promote** steps + success criteria to `src/<app>/CUJs.md` (see [`docs/CRITICAL_USER_JOURNEYS.md`](CRITICAL_USER_JOURNEYS.md)). Add performance budget rows if the screen has grids, media, or Dexie live queries.

## Gestalt & consistency

| Principle          | Agent rule                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Proximity**      | Controls that configure the same task live in one `<section>` with a shared label. Do not scatter related fields across the viewport.                                                                               |
| **Similarity**     | Same semantic thing → same component shell (see STYLE_GUIDE § Parallel surfaces). Match verb labels exactly (`Sign in again`, not mixed synonyms).                                                                  |
| **Common region**  | Prefer one panel per concern. Avoid nested cards that repeat the same boundary (card-in-card). **Max one elevated surface per section** — inner content uses hairline dividers, not nested Papers/borders/shadows.  |
| **Theme**          | Use app CSS variables and MUI theme tokens. Read app `DESIGN.md` first. No one-off hex/radius/shadow unless the design doc allows it.                                                                               |
| **Selection tier** | Popover/settings toggles and preset chips → **secondary** selected (tint + brand text). Transport on-state and one CTA → **primary** (solid). See [`SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md). |

### Workbench: selection inspector vs page finish

When a stage has a **selected item** (panel, pack, page), the primary side rail must be **selection-scoped only** (that item’s content — e.g. speakers, arrangement, lines). Page- or board-level finish controls (cast, palette, print/export settings, whole-page photo, expert toggles) belong in a **separate chip bar or header/overflow menu** — not stacked unlabeled in the same inspector. Reference: Scrapboard Page finish bar + panel-only left rail (`src/scrapboard/README.md` § Chrome model).

### Always-available pickers stay open

If the primary journey is **pick anytime** (layout gallery, cast strip, arrangement options), do **not** collapse the chooser behind a secondary CTA (“Change layout”, “Done”). Collapsing to free stage width is a false win when it adds a re-entry step. Keep the strip visible; shrink thumbnails before hiding the whole rail. Root cause class: `ux-journey-overload`.

### Mockup cast grounding

Character-first comic mockups (emoji cast) need a **simple ground plane** (sky/horizon/ground or a photo) when no Wikimedia fill is set — bare white makes figures float. Prefer native color emoji without opaque tint discs/halos (those read as grey circles). Soft palette wash belongs on photos, not as a silhouette behind glyphs.

## Redundancy (copy & UI)

**Never duplicate in one viewport:**

- The same **status sentence** (e.g. “Uploading… 3 of 10” on four cards).
- The same **progress bar** per row when one **aggregate** bar at shell/tab level suffices.
- The same **section heading + body** that repeats tooltip content.

**Pattern — aggregate background work:**

```text
Tab shell:  [ Uploading 3 collections · 12 of 40 files ████░░ ]
Card grid:  per-card thumbnail + name + select — no per-card upload bar unless card is the only active upload
```

Encore/Gesture upload sessions: one `GestureStatusBanner` or tab-level progress; cards show **state icon** only (spinner/check), not full duplicate bars.

**Progress bars with known totals:** always report **current and total** (`3 of 50`) via `reportBlockingJobItemProgress` — the shared blocking-job snackbar derives a **complete · remaining** caption automatically. Indeterminate bars are only for work with unknown totals.

## Visual weight budget

Per screen, default caps (unless design doc says otherwise):

| Element           | Budget                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Drop shadows      | ≤1 elevation level on primary content; previews flat or inset                                                                           |
| Borders           | Prefer spacing + background wash over extra outlines                                                                                    |
| Nested containers | Max **one** framed region per logical group                                                                                             |
| Accent color      | One primary CTA + semantic states (error/warning); brand color on marks, not every button                                               |
| Selected state    | Settings/preset chips: tinted secondary; transport on: primary solid — [`SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md) |

**Anti-patterns:** card inside card inside card; border + shadow + inset on the same strip; heavy `backdrop-filter` on hot paths (see Gesture perf notes).

## Spec hygiene (“obviously bad”)

Check before declaring UI done:

- [ ] **Padding:** no text/buttons flush to container edges (use app spacing tokens / `--gesture-*`, MUI `sx` theme spacing).
- [ ] **Contrast:** body text meets readable contrast on its background (especially muted/meta lines).
- [ ] **Alignment:** labels and inputs share a grid; baselines line up across columns.
- [ ] **Touch targets:** ≥44px on coarse pointers for icon buttons (STYLE_GUIDE).
- [ ] **Density:** long help in tooltips, not repeated paragraphs (STYLE_GUIDE § Information density).
- [ ] **Copy:** no repeated phrases on the same screen; follow USER_COPY_STYLE.
- [ ] **Responsive:** ~390px and ~768px (or layout-heuristics mobile smoke) — no page horizontal scroll; stack toolbars; see [`RESPONSIVE_DESIGN.md`](RESPONSIVE_DESIGN.md).

**Required for non-trivial UI** (same trigger list as the journey sketch, rule `ux-journey-mandatory.mdc`): capture a **Playwright or browser screenshot** of each changed route and **attach it in chat before declaring done**, evaluated against this checklist and [`VISUAL_JUDGE_RUBRIC.md`](VISUAL_JUDGE_RUBRIC.md) Tier 1 rows. Copy-only tweaks and bug fixes restoring documented behavior are exempt.

## Action hierarchy template

Use in PR description or journey sketch:

```markdown
### Screen: [name]

- Primary: [one button / one flow]
- Secondary: [≤2]
- Deferred: [menus, advanced, destructive]
- Background: [single aggregate status UI]
```

## Root cause classes (UX)

Use `ux-gestalt`, `ux-redundancy`, `ux-visual-weight`, `ux-spec-violation`, `ux-journey-overload`, `ux revision churn` in retrospectives and PR **Process improvements** — definitions live in [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md) § Root cause classes (canonical).

## References (external practices)

These inform our process; Labs enforcement is the docs/rules above.

- **Nielsen heuristics** — visibility of status, match to real world, user control, consistency, error prevention, recognition over recall, flexibility, minimalism.
- **Gestalt** — proximity, similarity, continuity, closure, common region.
- **Progressive disclosure** — show primary path first; advanced options in menus/dialogs.
- **Jobs-to-be-done** — one screen should answer one job; secondary jobs get another surface or step.

## Related

- [`docs/SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md) — primary vs secondary selection tiers
- [`docs/RESPONSIVE_DESIGN.md`](RESPONSIVE_DESIGN.md) — shared breakpoints + responsive checklist
- [`docs/AGENT_INVARIANTS.md`](AGENT_INVARIANTS.md)
- [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md)
- [`src/encore/PERFORMANCE_UX.md`](../src/encore/PERFORMANCE_UX.md) — performance-specific UX checklist
