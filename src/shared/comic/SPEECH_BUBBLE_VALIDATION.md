# Speech bubble validation

How Labs verifies comic speech bubbles are **laid out** and **drawn** correctly without manual review.

## Hard bar (~98% product target)

Must hold for Scrapboard (and matrix with `placeMode: 'slots'`):

1. Dialogue **text** never clipped / unreadably cut.
2. Bubbles’ **text regions** do not overlap (`no_overlap`).
3. Tail tip on the correct speaker; path geometry clean.
4. **Tails do not overlap** each other or cut another bubble’s text (`tail_overlap`).
5. Bubble does not cover the character marker.
6. Reading order preserved (`reading_order`).

Soft (ok when Bubble escape is on): bubble **body** outside panel horizontally / slightly below (`bubble_in_bounds`).
**Never** escape upward — `bubble_above_panel` and `text_outside_panel` are hard (top clip makes dialogue invisible).

## Placement pipeline

1. **Size/fit** — heuristic wrap + `fitDialogueLines*` (`speechBubblePath.ts`); no DOM measure. Bodies default to **`roundRect`** (`pickBubbleShape` always returns `roundRect`) — ellipse is legacy-only, kept for the `shape` param and its validation branch.
2. **Place** — Scrapboard sketchy boards use discrete **`slots`** (`speechBubbleSlotLayout.ts`). Shared default remains headless `d3-force` (`speechBubbleForceLayout.ts`). Legacy stack via `placeMode: 'legacy'` for A/B only. Both placers treat **captions and SFX as first-class obstacles** during placement (`obstacleBoxesFromItems` in slots, `ForceObstacle[]` in force), not just a post-sync bump.
3. **Post-sync** — caption/SFX sync + caption overlap resolve; force path also runs `postClampBubbles` → `resolveTailOverlaps`, which fans, then widens vertical gap, then swaps left/right order as needed so different-speaker tails never cross (same hard bar `bubblesTailsOverlap` enforces for `slots`). Body-box non-overlap is never sacrificed to clear a tail cross — if no fan/nudge/swap can clear it without reintroducing overlap, the tail cross is left in place rather than regressing the harder invariant.
4. **Draw** — `speechBubblePathForLayout` returns a `{ body, tail }` pair where **`body` is one continuous outline** (bubble + tail, single stroke) and `tail` is empty. The mouth is notched into the bottom edge so there is no chord seam. SFX via `SfxLayoutGraphic` + loudness; `sfxLayoutBBox` is the single source of truth for SFX obstacle/overlap boxes.

## Validation layers

| Layer                 | What it checks                                                                          | Where                                  |
| --------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- |
| **Layout invariants** | No overlap, reading order, bounds, tail in panel, character band                        | `panelTextLayoutInvariants.ts`         |
| **Quality rules**     | Text fit, aspect ratio, line length, blocks not dropped, tail length, **tail overlap**  | `speechBubbleQuality.ts`               |
| **Path geometry**     | Closed path, no legacy arcs, tail tip present, mouth on ellipse, text not in tail wedge | `speechBubblePathGeometry.ts`          |
| **Matrix harness**    | Hundreds of layout preset × panel × dialogue combinations (`placeMode: 'slots'`)        | `speechBubbleValidationHarness.ts`     |
| **E2e smoke**         | Rendered SVG paths in Scrapboard (closed, non-legacy)                                   | `e2e/smoke/scrapboard-bubbles.spec.ts` |

Run everything locally:

```bash
npm run test:bubble-quality
```

## Quality codes (extend when a visual defect becomes a rule)

### Layout (`panelTextLayoutInvariants`)

- `no_overlap` — bubble/caption boxes intersect (**hard**)
- `reading_order` — later item visually above earlier item (**hard**)
- `bubble_in_bounds` — body outside panel left/right/below (**soft** when escape)
- `bubble_above_panel` — body extends above panel (**hard** — clips under stroke/gutter)
- `tail_inside_panel` — tail anchor outside panel
- `character_below_bubble` — bubble intrudes on character band
- `no_character_overlap` — bubble covers character marker
- `text_outside_panel` — dialogue text leaves panel (**hard**; bbox matches top-anchored render)
- `character_in_panel` — emoji/arrangement marker extends outside panel (**hard**)

### Readability (`speechBubbleQuality`)

- `text_fits_bubble` / `text_fits_bubble_height` — dialogue exceeds padding box
- `bubble_aspect_ratio` — too flat or too narrow
- `readable_line_length` — single-letter stacks or very short average lines
- `blocks_dropped` — layout omitted active text blocks
- `tail_too_long` — tail spans too much of panel height
- `tail_crosses_interior` — mouth chord cuts through body (legacy path bug)
- `tail_overlap` — pairwise tails cross, or a tail cuts another bubble’s **body** or text (**hard**)

### Path geometry (`speechBubblePathGeometry`)

`validateBubblePathD` takes the `{ body, tail }` pair from `speechBubblePathForLayout`.

- `path_not_closed` — body path missing `Z`
- `tail_not_closed` — legacy separate tail path missing `Z`
- `path_legacy_ellipse_arc` — old `A` arc commands (ellipse shape only)
- `path_missing_tail_tip` — unified outline (or legacy tail) does not reach character head
- `tail_not_unified` — unified outline missing the curved tail segment
- `mouth_off_ellipse` — tail mouth not on ellipse boundary (ellipse shape only)
- `tail_misaimed` — tail angle outside mouth wedge (ellipse shape only)
- `text_in_tail_wedge` — dialogue center inside tail triangle

## Matrix harness

`runBubbleQualityMatrix()` builds cases from:

- Panel counts 1–12
- All generated layout presets (`generateLayoutsForPanelCount`)
- Five stress dialogue block sets (mad-libs style exchanges)
- Defaults `placeMode: 'slots'` + `allowBubbleEscape: true`

Infeasible micro-panels (dialogue zone shorter than `32px × block count`) are **skipped**, not failed.

Soft violations (not matrix failures):

- `bubble_in_bounds` — body overhang with Bubble escape
- `blocks_dropped` — intentional trim when the panel cannot host every line cleanly

Hard among feasible cases: target **≥98%** pass; slots + budget path aims for zero hard failures.

### Scrapboard story audit (100 pages)

`src/scrapboard/audits/scrapboardLayoutAudit.ts` generates ~100 Randomize-all story pages
(weighted panel counts + layouts + `generateStoryPage`) and validates every panel with
arrangement-aware marker placement. Included in `npm run test:bubble-quality`.

**Conflict resolution order:** both placers prefer **fan** (nudge apart horizontally) → **nudge** (widen vertical gap / push along the stack) → **shrink** (rewrap/resize) over **truncation** (`blocks_dropped`). Truncation is a last resort, not a first-line strategy, and stays a soft violation when it does happen.

## SFX loudness

`PanelSfxBlock.loudness`: `quiet` | `normal` | `loud` (default `normal`).

- Layout: `sfxBaseFontSize` / `sfxLoudnessFontScale` in `sfxLoudness.ts`
- Render: `SfxLayoutGraphic` (size, letter-spacing, tilt, burst ticks, outline for loud)
- Scrapboard editor: Q / N / L chips
- Mad-libs: occasional loud punch words; mad-libs page copy is **budgeted** via `adaptBlocksToPanelBudget` (also applied at layout/render time). Panels narrower than ~72px drop all text rather than emitting `…` micro-balloons with spaghetti tails. Extreme 1×N / N×1 page grids are demoted in layout ranking.

## Adding a new check

1. Add a violation code + check function in the appropriate module.
2. Wire into `validateSpeechBubbleQuality` or `validateSpeechBubbleGeometry`.
3. Add a focused unit test in `speechBubblePathGeometry.test.ts` or `speechBubbleQuality.test.ts`.
4. If it should gate CI, ensure `speechBubbleValidationHarness.test.ts` matrix stays green (≥98% among feasible with hard overlap/order/tails).

## Visual regression (future)

Screenshot baselines for Scrapboard mockups are not committed yet. When added:

- Capture 10-up grid + mad-libs randomize in `e2e/visual/scrapboard.visual.spec.ts`
- Linux CI is canonical per [`docs/VISUAL_REGRESSION_AGENT.md`](../../docs/VISUAL_REGRESSION_AGENT.md)

Until then, path geometry + matrix harness catch structural defects; human review still needed for aesthetics.
