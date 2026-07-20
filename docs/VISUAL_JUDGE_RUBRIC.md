# Visual judge rubric

Deterministic classification for screenshot diffs so agents (and humans) make the
same call every time. Distilled from [`UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md),
[`SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md),
[`RESPONSIVE_DESIGN.md`](RESPONSIVE_DESIGN.md), [`STYLE_GUIDE.md`](../STYLE_GUIDE.md),
and per-app `DESIGN.md`.

**Workflow home:** skill [`labs-visual-judge`](../.cursor/skills/labs-visual-judge/SKILL.md)
(obtain diffs → view PNGs → classify here → act). Baseline mechanics:
[`VISUAL_REGRESSION_AGENT.md`](VISUAL_REGRESSION_AGENT.md).

Every diff gets exactly one tier. When two tiers seem to apply, the higher
(more severe) tier wins.

## Tier 1 — Must fix (never baseline over)

Fix the code. Updating the baseline to absorb any of these is a policy violation.

| #    | Signal                                    | How to check in the PNG                                                                                                                                                                                                         |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | **Text / icon overflow / clipping**       | Truncated glyphs, labels cut mid-letter, text escaping its container, **Material Symbol / note-symbol icons cropped by `overflow: hidden` FOUC boxes**                                                                          |
| 1.2  | **Horizontal page scroll**                | Content wider than viewport on a primary surface (rule `layout-no-horizontal-scroll.mdc`)                                                                                                                                       |
| 1.3  | **Overlapping or misaligned containers**  | Controls covering each other, panels breaking the layout grid, baselines misaligned across columns                                                                                                                              |
| 1.4  | **Blank or error content**                | Empty main region where content existed, error banners (`Set VITE_…`, "Could not load", stack traces), broken-image icons                                                                                                       |
| 1.5  | **Tofu / unshaped glyphs**                | Squares, raw ligature text (`play_arrow` as words), missing music glyphs                                                                                                                                                        |
| 1.6  | **Obvious contrast failure**              | Body or meta text unreadable against its background                                                                                                                                                                             |
| 1.7  | **Theming violation**                     | Colors/radii/shadows contradicting the app `DESIGN.md` or shared tokens (one-off hex where a token family exists); **mixed control geometry in one panel** (different slider thumbs, mismatched field heights on parallel rows) |
| 1.11 | **Confusing slider chrome**               | Solid gray “dead” rail segments or orphan marks that look broken rather than a labeled constraint (`SHARED_UI_CONVENTIONS.md` § Linear volume slider)                                                                           |
| 1.8  | **Selection-tier violation**              | Multiple solid primary CTAs above the fold; settings/preset chips rendered as primary solid instead of secondary tint (`SELECTION_VISUAL_HIERARCHY.md`)                                                                         |
| 1.9  | **Duplicate status/progress UI**          | Same progress bar or status sentence repeated per card in one viewport (`UX_AGENT_GUIDE.md` § Redundancy)                                                                                                                       |
| 1.10 | **Touch-target collapse (mobile/tablet)** | Icon buttons visibly smaller than ~44px or controls colliding at 390/768px                                                                                                                                                      |

## Tier 2 — Acceptable (update baseline, one-line justification per PNG)

Update via `scripts/import-visual-baselines-from-artifacts.mjs` (Linux CI actuals)
and list **each PNG + why** in the commit body.

| #   | Signal                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------- |
| 2.1 | The intentional change itself (this PR's redesign, new component, copy change) rendered as designed        |
| 2.2 | Reflow downstream of an intentional change (content below a taller header shifts down)                     |
| 2.3 | Catalog/list growth from added entries (homepage cards, `/ui/` rows)                                       |
| 2.4 | Sub-pixel anti-aliasing or font-hinting drift with identical structure (compare DOM in `error-context.md`) |
| 2.5 | Baseline was stale (route changed in an earlier reviewed PR, refresh lagged)                               |

## Tier 3 — Escalate (stop; ask the user with images attached)

Do not fix or baseline. Post actual + expected + diff and a one-line hypothesis.

| #   | Signal                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------- |
| 3.1 | Diffs on routes **outside the PR's scope** with no shared-layer explanation                                   |
| 3.2 | Unexplained multi-app drift (many shells changed; you cannot name the shared cause)                           |
| 3.3 | Aesthetic judgment calls (spacing/color looks _different_ but no rubric row or `DESIGN.md` clause decides it) |
| 3.4 | Anything you cannot confidently classify after viewing all three images                                       |

## Judging procedure

1. **View the images** (Read tool on PNGs, or the `/ui/#regression/screenshots` gallery). Never classify from filenames or pixel ratios alone.
2. Check the **actual** against every Tier 1 row. Any hit → Tier 1, fix the code.
3. If clean, check the diff against Tier 2 rows and the PR's stated intent. Match → update with justification.
4. Otherwise Tier 3 — escalate.
5. Record the classification (tier + row number, e.g. `T2.1`) in the commit/PR body per PNG.

## Notes

- Pixel ratio ≤ 0.03 with an identical DOM snapshot is _evidence_ for T2.4, not proof — still view the images.
- A diff can be small and still Tier 1 (a clipped label is a few hundred pixels).
- Per-app `DESIGN.md` overrides generic taste questions; if the design doc allows it, it is not T1.7.
