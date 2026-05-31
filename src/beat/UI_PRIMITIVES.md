# Beat — UI primitives

App-local components for Find the Beat. **Shared controls:** [`/ui/`](/ui/) and [`SHARED_UI_CONVENTIONS.md`](../shared/SHARED_UI_CONVENTIONS.md).

## Primitives

- **`BeatMixerChannel`** — per-channel mute + volume row; uses `AppLinearVolumeSlider` (0–100). Do not hand-roll MUI `Slider` mix rails.
- **`PlaybackBar`** — transport, sync anchor, section navigation. Extend here for new playback chrome.
- **`UploadLanding`** — first-run / library empty landing.
- **`BeatVisualizer`** — waveform + section overlay.

Prefer **`AnchoredPopover`** for new floating panels (mixer popover already uses it in `App.tsx`).

## Agent context

[`README.md`](README.md) · [`DEVELOPMENT.md`](DEVELOPMENT.md) · [`../../AGENTS.md`](../../AGENTS.md)
