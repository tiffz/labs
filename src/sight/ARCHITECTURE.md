# Color Sight Trainer — architecture

## Color math

All generators and scoring use **Oklch** via [culori](https://github.com/Evercoder/culori). Perceptual distance uses **CIEDE2000** (`differenceCiede2000`).

Level thresholds and generator profiles live in [`levels.ts`](levels.ts) (28 levels, schema v6). Adaptive progress (skill matrix, diagnostics) lives under [`progress/`](progress/); see [ADR 0010](../../docs/adr/0010-sight-adaptive-progress.md). Each row may set `compareProfile`, `contextualProfile`, `bridgeProfile`, or `gamutProfile` so generators do not rely on magic level numbers.

## Phases (`App.tsx`)

| Phase      | Entry                    |
| ---------- | ------------------------ |
| `home`     | Default                  |
| `practice` | After **Practice**       |
| `map`      | Curriculum map from home |
| `sandbox`  | `?debug` + `#sandbox`    |

## Layout + debug mode (`?debug`)

[`components/SightDebugPanel.tsx`](components/SightDebugPanel.tsx) uses shared [`LabsDebugDock`](../../shared/components/LabsDebugDock.tsx).

**Layout (practice shell)**

- **`.sight-app`** — full viewport flex column; height `calc(100dvh - var(--labs-debug-dock-height, 0px))` always (Scales pattern).
- **`.sight-main`** — `display: contents` so practice header / body / footer are direct flex children of `.sight-app`.
- **Debug dock** — fixed overlay; shrinks shell via CSS variable only when mounted. Non-debug URLs must match full-viewport layout (`--labs-debug-dock-height` defaults to `0px`).
- **Sandbox** — `.sight-sandbox` wrapper (not nested `.sight-app`).

**Debug tools**

- **Local storage** (collapsed in dock body): **Clear Sight localStorage** — `resetProfile()`; **Clear all Labs localStorage** — `localStorage.clear()`. Both confirm before running.
- **Set level / Set + practice** — jump to any curriculum level
- **+1 pass / Complete level** — fast curriculum walkthrough
- **Sandbox** — open `#sandbox` at current level
- Practice **S** key — cycle simulate pass / fail / off

## Scoring UX

- **Practice:** module views hide live ΔE / accuracy / variance / overlap (`showLiveMetrics={false}`).
- **After submit:** `PracticeReveal` drives `components/reveal/*` (contextual slide-in pair, compare highlights, bridge slot diff, gamut overlap summary).
- **Sandbox:** `showLiveMetrics={true}` plus telemetry.

## Challenge selection

`session/practiceChallenge.ts` picks one challenge from `profile.level` (occasional review at `level - 1`). Level advances after seven consecutive passes at the current level.

`storage.ts` migrates profiles on mount (`ensureProfileMigrated()`): legacy 10-level map (schema &lt; 2), +1 for levels ≥ 5 when schema &lt; 3, +7 when schema &lt; 4. **`passesAtLevel` resets to 0** when migration changes level.

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
