# Color Sight Trainer

Perceptual color training in Oklch space: isolated flashcards, Albers relational drills, contextual matching, bridges, gamut masking, harmony pivot, subtractive equalizer, Munsell slice, and atmospheric cast scenes.

Base path: `/sight/`.

## Curriculum (30 levels)

See [CURRICULUM.md](./CURRICULUM.md). Phases: isolated flashcards (1–7), Albers relational (8–11), calibration (12–20), gamut + harmony pivot (21–24), Albers equalizer (25–26), Munsell slice (27–28), Yot cast (29–30).

## Practice flow

- Home follows a **Learn Your Scales–style layout**: hero **Practice** button, current-section progress bars, readable skill tiles, and a **curriculum map** for all 30 levels.
- **Keyboard:** arrow keys pick swatches; Enter/Space submits or continues. **Ctrl/Cmd + ?** opens shortcuts help.
- **Restudy** any unlocked level from **Exercises**; passes count toward that level’s gate. Use the level chevron or footer hint to skip back to your peak level.
- **Focus hints** may appear when diagnostics detect a pattern (e.g. warm-background value reads); adaptive data still updates in the background.
- After submit or tap, compact feedback and auto-advance; daily sessions end with a short summary.

Profile persists in `localStorage` (`sight:profile`). Older curriculum saves are migrated on mount; use **Clear Sight localStorage** in the debug dock to start over.

## Developer debug workflow

Debug mode uses shared [`LabsDebugDock`](../shared/components/LabsDebugDock.tsx). **Regular `/sight/` layout must not depend on debug being mounted** — the app shell always uses `height: calc(100dvh - var(--labs-debug-dock-height, 0px))` (zero when dock absent). See [`CUJs.md`](./CUJs.md) CUJ-003.

| URL / action                     | Purpose                                                                   |
| -------------------------------- | ------------------------------------------------------------------------- |
| `/sight/?debug`                  | Debug dock: reset progress, set level, +pass, complete level, copy bundle |
| `/sight/?debug#sandbox`          | Level picker (1–28) + legacy compare; live metrics and telemetry          |
| `/sight/?debug#sandbox&level=21` | Open sandbox at a specific curriculum level                               |
| Practice + `?debug`, **S** key   | Cycle forced pass → forced fail → normal scoring                          |

**Clear Sight localStorage** resets only `sight:profile`. **Clear all Labs localStorage** wipes all `localStorage` for the origin (every Labs app) after confirmation. Both live under **Local storage** in the expanded debug dock (not the main toolbar).

## Developer sandbox

`/sight/?debug#sandbox`

- Seed, Regen, curriculum level picker (all 30 levels + legacy compare)
- Live metrics visible in sandbox only
- Telemetry panel with ground-truth values

## Development

```bash
npm run dev          # http://localhost:5173/sight/
npx vitest run src/sight
npm run presubmit
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [ADR 0010](../../docs/adr/0010-sight-adaptive-progress.md).
