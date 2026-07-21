---
description: Playback UI — empty states, stable props, async stop, portal skins
globs:
  - src/shared/components/music/**/*
  - src/shared/hooks/useChartChordPlayback.ts
  - src/shared/notation/**/*
  - src/**/hooks/*Playback*
  - src/**/components/*Playback*
  - src/**/components/*Renderer*
  - src/encore/originals/**/*
---

# Playback UI regressions

Read [`PLAYBACK_HOOK_PATTERN.md`](../../src/shared/hooks/PLAYBACK_HOOK_PATTERN.md) and [`PLAYBACK_RENDERING_AUDIT.md`](../../src/shared/music/PLAYBACK_RENDERING_AUDIT.md) before editing playback hooks, notation renderers, or portaled pickers.

## Must

- **Loading:** never infer “not found” from `!data`; derive `activeSong = draft ?? live.entity` synchronously.
- **Stable props:** no inline `{}` into `DrumNotationMini`, VexFlow renderers, or portaled pickers; memoize rhythm/style objects.
- **Portal skins:** trigger + menu both use `appearance` → `resolvePlaybackFieldSelectMenuAppearance()`; allowlist `.shared-playback-field-select-popover` on click-outside. Nested drum Edit menus: allowlist `isDrumPatternEditMenuTarget` + resolve Text-node targets via `resolveEventTargetElement` (see `inline-drum-ux.md`).
- **Async stop:** `playbackGenerationRef` + check after every `await`; real `stopAll()` (abandon bus). Test: stop during slow `ensureInstrument`.
- **VexFlow order:** format → beams → draw → redraw stems → draw beams → highlight toggle.

Smokes: `e2e/playback-ui-regressions.spec.ts` (Encore drums settings, Stanza practice-rail highlight, Words host-input + presets).

Inline drum profiles: `.agents/rules/inline-drum-ux.md`, `inlineDrumUxContract.test.tsx`.
