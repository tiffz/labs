---
paths:
  - 'src/encore/components/performance/**/*'
  - 'src/encore/components/PerformanceEditorDialog.tsx'
  - 'src/encore/components/song/SongPerformances*.tsx'
  - 'src/encore/theme/encoreUiTokens.ts'
  - 'src/shared/components/DragDropFileUpload.tsx'
---

<!-- AUTO-GENERATED from .agents/rules/encore-performance-ux.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> Encore performance log/edit/video UX — gestalt, tokens, shared components

# Encore performance UX

Read [`src/encore/PERFORMANCE_UX.md`](../../src/encore/PERFORMANCE_UX.md) before changing performance logging, video stacks, or list playback.

## Extend, do not fork

- Reuse components in `src/encore/components/performance/` — no third link/upload block on the dialog.
- Upload: [`DragDropFileUpload`](../../src/shared/components/DragDropFileUpload.tsx) with `tone="soft"` (editor) or `tone="brand"` (bulk import).
- Primary control: [`PerformanceVideoPrimaryRowAction`](../../src/encore/components/performance/PerformanceVideoPrimaryStar.tsx) — **same** button slot for active vs promote (no mismatched star/font sizes).
- List/browse playback: [`PerformanceVideoPlayableThumb`](../../src/encore/components/performance/PerformanceVideoPlayableThumb.tsx) — play overlay on thumbnail; hide duplicate play icon in [`PerformanceMediaActions`](../../src/encore/components/performance/PerformanceMediaActions.tsx) via `hidePlay`.
- Styling: tokens in [`encoreUiTokens.ts`](../../src/encore/theme/encoreUiTokens.ts) (`encoreSoftPinkWash`, `encorePerformanceSourceLabelSx`, …) — not ad-hoc purple/violet from `text.primary`.

## Theme

Encore `primary` is fuchsia (`#c026d3`); `text.primary` is dark violet — **do not** use `text.primary` for upload labels or soft surfaces. Use fuchsia-tinted tokens or `alpha(primary.main, …)`.

## Before finishing

1. Run `npm run presubmit` (required).
2. If you touched list/editor performance UI or Encore shell/providers, also run `npm run build` and `npm run test:e2e:smoke` (or hard-refresh `#/library` and `#/practice` in dev — HMR can hide provider/catch bugs that typecheck misses).
3. Add or extend Vitest in the matching `performance/*.test.ts` or `utils/*performance*.test.ts` when behavior is new.
