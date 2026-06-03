# Stanza viewer layout

Canonical reference for the song viewer shell (video + practice rail + timeline + library). CSS lives in [`stanza-viewer-layout.css`](./stanza-viewer-layout.css); structure in [`StanzaViewerLayout.tsx`](./components/StanzaViewerLayout.tsx) (wraps shared [`AppShellLayout`](../shared/layout/AppShellLayout.tsx)).

## Layer table

| Layer       | Class                      | Role                                                                   |
| ----------- | -------------------------- | ---------------------------------------------------------------------- |
| Shell root  | `.stanza-viewer-shell`     | Flex column, fills app                                                 |
| Page column | `.stanza-viewer-column`    | Max width 1320px + horizontal gutter                                   |
| Workbench   | `.stanza-viewer-workbench` | **Fixed** width `--stanza-viewer-content-width` (768 + 392 + 14px gap) |
| Scroll      | `.stanza-viewer-scroll`    | `overflow: auto`, `scrollbar-gutter: stable`                           |
| Grid        | `.stanza-viewer-body-grid` | `main` (video + timeline) / `rail` areas                               |
| Library     | `.stanza-library-panel`    | Footer inside workbench, `width: 100%`                                 |

## Tokens (`stanza.css` on `.stanza-app`)

- `--stanza-viewer-max-width`, `--stanza-viewer-gutter`
- `--stanza-viewer-media-max-width`, `--stanza-viewer-rail-width`, `--stanza-viewer-grid-gap`
- `--stanza-viewer-playback-stack-estimate`, `--stanza-viewer-rail-max-height` (video + gap + playback)
- `--stanza-viewer-content-width` (media + rail + gap)

Default caps (desktop): media **768px**, rail **392px**, page **1320px**, gutters **8–10px**.

## Desktop grid (≥900px)

```text
┌──────────────┬──────┐
│ video        │ rail │
│ playback bar │      │
└──────────────┴──────┘
```

- **Main column** (`.stanza-viewer-main-column`) — video stack + timeline/playback at natural height; playback stays compact directly under the video.
- **Rail** — right column height matches the main column on desktop (`--stanza-viewer-rail-max-height` synced from a `ResizeObserver` on the main column). Scrolls internally when modules exceed that height.

Mobile stacks: `main` (video then playback) → `rail`.

## Rules

1. **No layout `sx` on the viewer shell** — spacing and width belong in CSS tokens.
2. **Do not use `width: 100%` + `max-width` on the workbench** — use `width: var(--stanza-viewer-content-width); max-width: 100%`.
3. **Do not put `mx: auto` on the grid alone** — centers the grid while the library stays left-aligned.
4. **Library stays inside the workbench** — not a direct child of the column.
5. **Video height** — 16:9 at media cap (`--stanza-viewer-media-height`). No arbitrary `dvh` caps on the video (letterboxing). A tall rail must not stretch the main column or playback card — cap the rail and scroll inside it; do not stretch the scrub track or transport.

## Related

- [`PRACTICE_RAIL.md`](./PRACTICE_RAIL.md) — practice rail, drums notation, tap tempo
- [`../shared/layout/README.md`](../shared/layout/README.md) — shared shell for new apps
