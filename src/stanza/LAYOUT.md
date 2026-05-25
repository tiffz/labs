# Stanza viewer layout

Canonical reference for the song viewer shell (video + practice rail + timeline + library). CSS lives in [`stanza-viewer-layout.css`](./stanza-viewer-layout.css); structure in [`StanzaViewerLayout.tsx`](./components/StanzaViewerLayout.tsx) (wraps shared [`AppShellLayout`](../shared/layout/AppShellLayout.tsx)).

## Layer table

| Layer       | Class                      | Role                                                                   |
| ----------- | -------------------------- | ---------------------------------------------------------------------- |
| Shell root  | `.stanza-viewer-shell`     | Flex column, fills app                                                 |
| Page column | `.stanza-viewer-column`    | Max width 1160px + horizontal gutter                                   |
| Workbench   | `.stanza-viewer-workbench` | **Fixed** width `--stanza-viewer-content-width` (720 + 360 + 20px gap) |
| Scroll      | `.stanza-viewer-scroll`    | `overflow: auto`, `scrollbar-gutter: stable`                           |
| Grid        | `.stanza-viewer-body-grid` | `media` / `rail` / `timeline` areas                                    |
| Library     | `.stanza-library-panel`    | Footer inside workbench, `width: 100%`                                 |

## Tokens (`stanza.css` on `.stanza-app`)

- `--stanza-viewer-max-width`, `--stanza-viewer-gutter`
- `--stanza-viewer-media-max-width`, `--stanza-viewer-rail-width`, `--stanza-viewer-grid-gap`
- `--stanza-viewer-content-width` (calc of the three above)

## Rules

1. **No layout `sx` on the viewer shell** — spacing and width belong in CSS tokens.
2. **Do not use `width: 100%` + `max-width` on the workbench** — use `width: var(--stanza-viewer-content-width); max-width: 100%`.
3. **Do not put `mx: auto` on the grid alone** — centers the grid while the library stays left-aligned.
4. **Library stays inside the workbench** — not a direct child of the column.
5. **Video height** — 16:9 at media cap; rail uses `--stanza-viewer-media-height`. No arbitrary `dvh` caps (letterboxing).

## Related

- [`PRACTICE_RAIL.md`](./PRACTICE_RAIL.md) — practice rail, drums notation, tap tempo
- [`../shared/layout/README.md`](../shared/layout/README.md) — shared shell for new apps
