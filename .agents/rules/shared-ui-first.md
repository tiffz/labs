---
description: Search shared UI before building new controls
globs:
  - src/**/components/**/*
  - src/**/App.tsx
---

# Shared UI first

Before adding a **new** control, menu, slider, popover, or playback field:

1. Search **`src/shared/components`** and open **`/ui/`** (or `src/ui/generatedSharedCatalog.ts`).
2. Read the matching section in [`SHARED_UI_CONVENTIONS.md`](../../src/shared/SHARED_UI_CONVENTIONS.md).
3. Prefer **token overrides** and documented class hooks over forking markup.

## Must reuse (do not copy)

| Need                                    | Use                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| 0–1 mix / gain rail                     | `AppLinearVolumeSlider` (+ `labs-volume-slider` / `PlaybackVolumeRow` for mute rows) |
| BPM / playback speed (portable toolbar) | `BpmInput`, `PlaybackSpeedControl`                                                   |
| Sound / style pickers                   | `PlaybackSoundSelect`, `ChordStyleInput` + `appearance`                              |
| Floating panel + nested menu            | `AnchoredPopover`, `playbackFloatingPanelSlotProps`                                  |
| Tooltips on icon buttons                | `AppTooltip` + **`aria-label`** on the control                                       |
| Multi-panel app shell                   | `AppShellLayout` + app `*-layout.css`                                                |

## Intentional diversions (do not “unify” away)

Shared controls are often **portable** versions of a flow that is **first-class** elsewhere. Before replacing an app-local control with a shared one, check the app `README.md` / `ARCHITECTURE.md` for an **Intentional diversions** section and [`SHARED_UI_CONVENTIONS.md`](../../src/shared/SHARED_UI_CONVENTIONS.md) § First-class vs portable.

Canonical example: **Count Me In** keeps custom `BpmControl` (always-visible slider / presets) — do **not** replace with compact `BpmInput`. Count’s subdivision mixer native ranges are similarly first-class.

When introducing a new diversion: document the shared alternative + journey reason in the owning app README before merging.

## Anti-patterns

- Raw `import Slider from '@mui/material/Slider'` for volume/gain — use `AppLinearVolumeSlider` (0–1 or pass `min`/`max` for 0–100).
- Using `AppSlider` for volume/mute rows — use `AppLinearVolumeSlider` / `PlaybackVolumeRow`.
- Hand-rolled popover menus for playback fields — use `PlaybackFieldSelectTrigger` / `playbackFieldSelectPopoverSlotProps`.
- Deep MUI selector overrides when a token family (`--pfs-*`, `--bpm-*`) exists.
- App-local duplicate of logic already in `src/shared/music/**` or `src/shared/notation/**`.
- Replacing a documented first-class control with its portable shared cousin “for consistency.”

Encore-only row primitives: [`src/encore/UI_PRIMITIVES.md`](../../src/encore/UI_PRIMITIVES.md).

New shared primitive → `/ui` demo + `SHARED_UI_CONVENTIONS.md` entry (see root `AGENTS.md` checklist).
