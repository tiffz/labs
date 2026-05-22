# Color Sight Trainer — architecture

## Color math

All generators and scoring use **Oklch** via [culori](https://github.com/Evercoder/culori). Perceptual distance uses **CIEDE2000** (`differenceCiede2000`).

Level thresholds and generator profiles live in [`levels.ts`](levels.ts) (28 levels, schema v6). Adaptive progress (skill matrix, diagnostics) lives under [`progress/`](progress/); see [ADR 0010](../../docs/adr/0010-sight-adaptive-progress.md). Each row may set `compareProfile`, `contextualProfile`, `bridgeProfile`, or `gamutProfile` so generators do not rely on magic level numbers.

## Phases (`App.tsx`)

| Phase      | Entry                 |
| ---------- | --------------------- |
| `home`     | Default               |
| `practice` | After **Practice**    |
| `sandbox`  | `?debug` + `#sandbox` |

## Scoring UX

- **Practice:** module views hide live ΔE / accuracy / variance / overlap (`showLiveMetrics={false}`).
- **After submit:** `PracticeReveal` drives `components/reveal/*` (contextual slide-in pair, compare highlights, bridge slot diff, gamut overlap summary).
- **Sandbox:** `showLiveMetrics={true}` plus telemetry.

## Challenge selection

`session/practiceChallenge.ts` picks one challenge from `profile.level` (occasional review at `level - 1`). Level advances after seven consecutive passes at the current level.

`storage.ts` migrates profiles: legacy 10-level map (schema &lt; 2), then +1 for levels ≥ 5 when schema &lt; 3 (adjacent-match insert).

## File layout

```
src/sight/
  generators/       # compare, contextual, bridge, gamut
  scoring/
  modules/
  components/reveal/
  phases/
  storage.ts
```
