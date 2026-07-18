# Scrapboard

Rough comic page mockups: generated panel layouts, page cast + arrangements, and print-aware export.

**Agents:** [`AGENTS.md`](AGENTS.md)

## Features

- **Panel count → layout gallery** — enter 1–12 panels; browse and switch layouts anytime from the right rail
- **Page cast** — growable emoji cast in the Page finish bar; shared across panels
- **Panel inspector (left rail)** — who’s here (1–3), arrangement, dialogue/captions/SFX, panel photo
- **Page finish bar** — Cast · Palette · Page photo · print settings as chips (not mixed into the inspector)
- **Character arrangements** — count-filtered layouts (close-up, facing, trio-row, …); Scrapboard skips procedural blob scenery
- **Text overlays** — caption, dialogue balloon, and SFX; dialogue chips use cast emojis
- **Force bubble placement** — dialogue balloons placed with a headless fixed-tick `d3-force` collide solver (see [`SPEECH_BUBBLE_VALIDATION.md`](../shared/comic/SPEECH_BUBBLE_VALIDATION.md))
- **Print / export** — Export PNG opens a confirm sheet with trim/bleed/DPI summary
- **Randomize** — copy only (keeps cast), or everything (count + layout + arrangements + trim)
- **Palette** — Page chip → mood presets, surprise, seed, image, paste; soft wash on emoji markers
- **Background photo** — Wikimedia field on panel + page chip (search or **Random**); panels without a photo get a simple sky/ground horizon so cast isn’t floating

## Chrome model

| Zone            | Scope                                                           |
| --------------- | --------------------------------------------------------------- |
| Header          | Panels · Randomize menu · More (expert toggles) · Export        |
| Page finish bar | Cast · Palette · Page photo · Trim preset chip                  |
| Left rail       | Selected panel only (speakers, arrangement, lines, panel photo) |
| Stage           | Mockup only (selection via orange panel + sidebar **PANEL N**)  |
| Right rail      | Layouts (always visible)                                        |

## Shared code

- [`src/shared/comic/`](../shared/comic/) — layouts, cast/arrangements, `PanelMockupSvg`, `MockupFitCanvas`, force bubble placer
- [`src/shared/zine/labsPrintSpec.ts`](../shared/zine/labsPrintSpec.ts) — trim/bleed/DPI helpers

`ScrapboardBoardEditor` (this package) is a Scrapboard-only wrapper — Lyrefly Thumbs does not embed it.
Thumbs renders the shared `src/shared/comic` engine (`PanelMockupSvg`, `MockupFitCanvas`,
`buildPanelLayout`) directly with its own Riso Cube chrome, and maps script panels/dialogue/SFX
into mockup fills via `src/lyrefly/utils/lyreflyScriptMockup.ts`. Lyrefly still uses legacy
`PanelCompositionId` blob scenery when Scrapboard cast/arrangement fields are absent.

## Dev

```bash
npm run dev
# open /scrapboard/
```

Bubble quality gate:

```bash
npm run test:bubble-quality
```
