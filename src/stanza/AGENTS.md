# Stanza — agent context

Nested **`AGENTS.md`** for Stanza. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — product overview.
2. [`LAYOUT.md`](LAYOUT.md) — viewer shell tokens and layer table (**canonical for layout**).
3. [`../../docs/STANZA_PLAYBACK.md`](../../docs/STANZA_PLAYBACK.md) — transport clocks, loop/skip invariants, test map.
4. [`../../docs/STANZA_RESILIENCE.md`](../../docs/STANZA_RESILIENCE.md) — long-session stability, wake lock, crash observability.
5. **Undo:** [`../shared/undo/README.md`](../shared/undo/README.md) — keyboard-first; `persistSong` commit boundaries.
6. `.cursor/rules/stanza-viewer-layout.mdc` — no viewer width in `sx`; CSS tokens only.

## Layout contract

- Shell: `StanzaViewerLayout` + `stanza-viewer-layout.css` (see `LAYOUT.md`).
- Workbench width is **CSS-only** (`--stanza-viewer-content-width`); do not set viewer width in MUI `sx`.
- Large shell splits live under `components/stanzaWorkspace/` (see `docs/COMPONENT_DECOMPOSITION_PATTERN.md`).

## Theming + shared CSS

Stanza uses **rose** as the sole accent. Follow the repo-wide patterns from this session:

- **In-app shell:** `.stanza-app` bridges `--theme-*`, `--labs-selection-*`, and `--labs-popover-*` to Stanza paper/rose tokens (`stanza.css` §1).
- **Selection tiers:** loop mode chips, beat counts, BPM/key preset rows → `--labs-selection-secondary-*`; solid transport on-states → primary. See [`docs/SELECTION_VISUAL_HIERARCHY.md`](../../docs/SELECTION_VISUAL_HIERARCHY.md).
- **Portaled pickers:** BPM/key dropdowns and metronome settings render outside `.stanza-app` — duplicate rose + selection tokens on `.stanza-bpm-dropdown` / `.stanza-key-dropdown` (not `:root` purple). Metronome uses `appearance="stanza"` + `metronome-themes.css`.
- **Focus rings:** `--labs-focus-ring-bleed` on metronome strip and playback toolbar; `overflow: visible` on chip/toolbar wrappers. See [`docs/FOCUS_THEMING.md`](../../docs/FOCUS_THEMING.md) and [`docs/A11Y_MENU_PATTERNS.md`](../../docs/A11Y_MENU_PATTERNS.md).
- **Shared music inputs:** `KeyInput` / `BpmInput` use `appearance="stanza"` + `dropdownClassName="stanza-*-dropdown"`. Tokens in `appSharedThemes.css`; rail layout in `stanza-practice-rail.css`. See [`DESIGN.md`](DESIGN.md).

Do not add ad-hoc `rgba(232, 72, 160, …)` for selection states when `--labs-selection-secondary-*` is available on the same surface.

## Tests

- Layout smoke: `e2e/stanza-viewer-layout.spec.ts`
- Loop playback smoke: `e2e/smoke/stanza-loop-whole-song.spec.ts`
- Transport policy: `stanzaTransportLoop.integration.test.ts`, `useStanzaTransportLoop.test.ts`
- Drive sync unit: `stanzaDriveMainMediaSync.test.ts`, `stanzaDriveStemSync.test.ts`, `stanzaDriveMerge.test.ts`

## Drive sync checklist (agents)

When changing Stanza backup / restore:

1. **Every blob tier needs upload + hydrate** — mirror `stem_audio/` (`stanzaDriveStemSync.ts`) and `main_audio/` (`stanzaDriveMainMediaSync.ts`). Metadata-only rows without bytes are a sync bug.
2. **Merge paths must hydrate** — auto-pull, conflict merge, and undo restore call `hydrateStanzaLibraryMainMediaFromDrive` + stems (see `useStanzaDriveBackup.tsx`).
3. **Push before envelope** — `flushDriveWrite` uploads main media and stems before writing `progress.json`.
4. **Conflict merge must `markPullSucceeded()`** — otherwise auto-push stays gated on a fresh device.
5. **README + envelope comments** stay aligned with on-disk folders (`main_audio/`, `stem_audio/`).

Rule: `.cursor/rules/stanza-drive-sync.mdc`

## Viewer layout checklist (agents)

1. Song viewer layout is **CSS-only** — see `LAYOUT.md` and `stanza-viewer-layout.css`.
2. E2e asserts horizontal alignment and that the media stack sits above the library footer (`e2e/stanza-viewer-layout.spec.ts`).
3. **Never** cap the library panel with `max-height: *vh` + viewport lock — it obscures the video (see `.cursor/rules/stanza-viewer-layout.mdc`).
