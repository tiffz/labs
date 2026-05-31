# Stanza — agent context

Nested **`AGENTS.md`** for Stanza. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — product overview.
2. [`LAYOUT.md`](LAYOUT.md) — viewer shell tokens and layer table (**canonical for layout**).
3. `.cursor/rules/stanza-viewer-layout.mdc` — no viewer width in `sx`; CSS tokens only.

## Layout contract

- Shell: `StanzaViewerLayout` + `stanza-viewer-layout.css` (see `LAYOUT.md`).
- Workbench width is **CSS-only** (`--stanza-viewer-content-width`); do not set viewer width in MUI `sx`.

## Tests

- Layout smoke: `e2e/stanza-viewer-layout.spec.ts`
