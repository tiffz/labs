# Vocal Agility Trainer

Practice vocal subdivision against a live metronome grid: latency-aware rhythmic feedback (speaker→mic calibration), transpose patterns into your comfort range, YIN pitch “ink,” post-run timing heatmaps, and duet playback. Visual design is a single **Proof Grid** surface (subtle orchard stripes, notebook grid overlay, tombstone panels).

Base path: `/agility/`.

## Look & feel

Tokens and structure live in [`agility.css`](./agility.css) (JetBrains Mono, stone + emerald + red accent). MUI chrome is aligned via `getAppTheme('agility')` in [`src/shared/ui/theme/appTheme.ts`](../shared/ui/theme/appTheme.ts). The shared skip link is intentionally omitted (`SKIP_TO_MAIN_OPT_OUT` in [`spaGuardrails.test.ts`](../shared/spaGuardrails.test.ts)) so the calibration UI stays above the fold; `<main id="main">` is unchanged.

## Shared engines

- [../shared/music/pitch/pitchDetection.ts](../shared/music/pitch/pitchDetection.ts) (YIN)
- [../shared/audio/singInTimeClock.ts](../shared/audio/singInTimeClock.ts)
- [../shared/audio/rhythmGuard.ts](../shared/audio/rhythmGuard.ts)
- [../shared/audio/precisionScore.ts](../shared/audio/precisionScore.ts)
- [../shared/audio/latencyCalibration.ts](../shared/audio/latencyCalibration.ts)
- [../shared/audio/vocalDuetPlayback.ts](../shared/audio/vocalDuetPlayback.ts)
