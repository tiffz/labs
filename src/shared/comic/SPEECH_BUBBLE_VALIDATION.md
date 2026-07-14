# Speech bubble validation

How Labs verifies comic speech bubbles are **laid out** and **drawn** correctly without manual review.

## Placement pipeline

1. **Size/fit** — heuristic wrap + `fitDialogueLines*` (`speechBubblePath.ts`); no DOM measure.
2. **Place (default: force)** — headless fixed-tick `d3-force` in `speechBubbleForceLayout.ts` (markers fixed, bubbles movable, collide + soft targets). Legacy stack/overlap is available via `placeMode: 'legacy'` for A/B only.
3. **One post-clamp** — band clamp + AABB shove + caption sync; **do not** re-run the simulation.
4. **Draw** — `speechBubblePathForLayout` + SVG compose in `PanelMockupSvg`.

## Validation layers

| Layer                 | What it checks                                                                          | Where                                  |
| --------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- |
| **Layout invariants** | No overlap, reading order, bounds, tail in panel, character band                        | `panelTextLayoutInvariants.ts`         |
| **Quality rules**     | Text fit, aspect ratio, line length, blocks not dropped, tail length                    | `speechBubbleQuality.ts`               |
| **Path geometry**     | Closed path, no legacy arcs, tail tip present, mouth on ellipse, text not in tail wedge | `speechBubblePathGeometry.ts`          |
| **Matrix harness**    | Hundreds of layout preset × panel × dialogue combinations                               | `speechBubbleValidationHarness.ts`     |
| **E2e smoke**         | Rendered SVG paths in Scrapboard (closed, non-legacy)                                   | `e2e/smoke/scrapboard-bubbles.spec.ts` |

Run everything locally:

```bash
npm run test:bubble-quality
```

## Quality codes (extend when a visual defect becomes a rule)

### Layout (`panelTextLayoutInvariants`)

- `no_overlap` — bubble/caption boxes intersect
- `reading_order` — later item visually above earlier item
- `bubble_in_bounds` — body outside panel (soft when `allowBubbleEscape`)
- `tail_inside_panel` — tail anchor outside panel
- `character_below_bubble` — bubble intrudes on character band
- `no_character_overlap` — bubble covers character marker

### Readability (`speechBubbleQuality`)

- `text_fits_bubble` / `text_fits_bubble_height` — dialogue exceeds padding box
- `bubble_aspect_ratio` — too flat or too narrow
- `readable_line_length` — single-letter stacks or very short average lines
- `blocks_dropped` — layout omitted active text blocks
- `tail_too_long` — tail spans too much of panel height
- `tail_crosses_interior` — mouth chord cuts through body (legacy path bug)

### Path geometry (`speechBubblePathGeometry`)

- `path_not_closed` — SVG path missing `Z`
- `path_legacy_ellipse_arc` — old `A` arc commands (tail through text)
- `path_missing_tail_tip` — path does not reach character head
- `mouth_off_ellipse` — tail mouth not on ellipse boundary
- `tail_misaimed` — tail angle outside mouth wedge
- `text_in_tail_wedge` — dialogue center inside tail triangle

## Matrix harness

`runBubbleQualityMatrix()` builds cases from:

- Panel counts 1–12
- All generated layout presets (`generateLayoutsForPanelCount`)
- Five stress dialogue block sets (mad-libs style exchanges)

Infeasible micro-panels (dialogue zone shorter than `32px × block count`) are **skipped**, not failed.

Soft violations (logged in fuzz tests, not matrix failures):

- `no_overlap`, `reading_order`, `bubble_in_bounds`

## Adding a new check

1. Add a violation code + check function in the appropriate module.
2. Wire into `validateSpeechBubbleQuality` or `validateSpeechBubbleGeometry`.
3. Add a focused unit test in `speechBubblePathGeometry.test.ts` or `speechBubbleQuality.test.ts`.
4. If it should gate CI, ensure `speechBubbleValidationHarness.test.ts` matrix stays green.

## Visual regression (future)

Screenshot baselines for Scrapboard mockups are not committed yet. When added:

- Capture 10-up grid + mad-libs randomize in `e2e/visual/scrapboard.visual.spec.ts`
- Linux CI is canonical per [`docs/VISUAL_REGRESSION_AGENT.md`](../../docs/VISUAL_REGRESSION_AGENT.md)

Until then, path geometry + matrix harness catch structural defects; human review still needed for aesthetics.
