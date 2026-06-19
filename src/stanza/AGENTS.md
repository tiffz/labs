# Stanza — agent context

Nested **`AGENTS.md`** for Stanza. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — product overview.
2. [`LAYOUT.md`](LAYOUT.md) — viewer shell tokens and layer table (**canonical for layout**).
3. `.cursor/rules/stanza-viewer-layout.mdc` — no viewer width in `sx`; CSS tokens only.

## Layout contract

- Shell: `StanzaViewerLayout` + `stanza-viewer-layout.css` (see `LAYOUT.md`).
- Workbench width is **CSS-only** (`--stanza-viewer-content-width`); do not set viewer width in MUI `sx`.
- Large shell splits live under `components/stanzaWorkspace/` (see `docs/COMPONENT_DECOMPOSITION_PATTERN.md`).

## Tests

- Layout smoke: `e2e/stanza-viewer-layout.spec.ts`
- Drive sync unit: `stanzaDriveMainMediaSync.test.ts`, `stanzaDriveStemSync.test.ts`, `stanzaDriveMerge.test.ts`

## Drive sync checklist (agents)

When changing Stanza backup / restore:

1. **Every blob tier needs upload + hydrate** — mirror `stem_audio/` (`stanzaDriveStemSync.ts`) and `main_audio/` (`stanzaDriveMainMediaSync.ts`). Metadata-only rows without bytes are a sync bug.
2. **Merge paths must hydrate** — auto-pull, conflict merge, and undo restore call `hydrateStanzaLibraryMainMediaFromDrive` + stems (see `useStanzaDriveBackup.ts`).
3. **Push before envelope** — `flushDriveWrite` uploads main media and stems before writing `progress.json`.
4. **Conflict merge must `markPullSucceeded()`** — otherwise auto-push stays gated on a fresh device.
5. **README + envelope comments** stay aligned with on-disk folders (`main_audio/`, `stem_audio/`).

Rule: `.cursor/rules/stanza-drive-sync.mdc`

## Viewer layout checklist (agents)

1. Song viewer layout is **CSS-only** — see `LAYOUT.md` and `stanza-viewer-layout.css`.
2. E2e asserts horizontal alignment and that the media stack sits above the library footer (`e2e/stanza-viewer-layout.spec.ts`).
3. **Never** cap the library panel with `max-height: *vh` + viewport lock — it obscures the video (see `.cursor/rules/stanza-viewer-layout.mdc`).
