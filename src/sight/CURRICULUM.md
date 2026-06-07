# Color Sight Trainer — curriculum (schema v6)

Seven-phase scaffolding. **Temperature** (warm vs. cool) is a continuous Oklab axis from Phase 1 through Phase 7, not a one-off lesson.

## Phase map

| Phase                       | Levels | Module(s)                | Pedagogy                                                     |
| --------------------------- | ------ | ------------------------ | ------------------------------------------------------------ |
| **1 — Isolated dynamics**   | 1–7    | `flashcard` / `isolated` | Rapid multiple-choice: value, chroma, temperature undertones |
| **2 — Relational dynamics** | 8–11   | `flashcard` / `albers`   | Albers-style fields; identity + perceived diagnostics        |
| **3 — Calibration lab**     | 12–18  | `contextual`, `bridge`   | Slider matching, broken bridge                               |
| **4 — Creative harmony**    | 19–22  | `gamut`, `anchor-pivot`  | Scene gamut masks, harmony wheel pivot                       |
| **5 — Subtractive lab**     | 23–24  | `albers-equalizer`       | Perceived match across warm/cool fields                      |
| **6 — Dimensional slice**   | 25–26  | `munsell-slice`          | Value/chroma outlier in a 5-swatch grid                      |
| **7 — Atmospheric cast**    | 27–28  | `yot-cast`               | Light preset → flat scene color                              |

Level definitions live in [`levels.ts`](levels.ts). Profile migration bumps levels ≥ 5 when upgrading from schema &lt; 4 and **resets `passesAtLevel`** when the level changes. Migration runs eagerly on app mount via `ensureProfileMigrated()`.

## Judgment principles (implementation)

1. **Absolute objectivity** — Correct answers come from Oklch/Oklab math (`temperatureIndex`, ΔE, induction model), not taste.
2. **Micro-progression** — `IsolatedProfile` / `AlbersProfile` on each row tighten deltas and distractors (grayscale → hue noise → near-match).
3. **Procedural generators** — No static question bank; `generateIsolatedFlashcardChallenge` / `generateAlbersFlashcardChallenge`.
4. **Instant visual feedback** — `FlashcardProofStrip` shows true target colors on neutral gray after each tap.

## TypeScript payloads

See [`types.ts`](types.ts):

- `IsolatedFlashcardChallenge` — Phase 1 (`kind: 'flashcard-isolated'`)
- `AlbersFlashcardChallenge` — Phase 2 (`kind: 'flashcard-albers'`)
- `AlbersField` — `{ background, target }` per side
- `PracticeReveal` variants `flashcard-isolated` | `flashcard-albers`

## Phase 2 generator

Sample implementation: [`generators/albersFlashcard.ts`](generators/albersFlashcard.ts)

- **Identity** — Identical or ΔL-shifted targets on warm/cool fields; keyed `correctBinary: 'same' | 'different'`.
- **Perceived** — Mathematically identical targets; correct side from `chromaticInduction` (induced appearance in Oklab).

## Scoring utilities

- [`scoring/temperature.ts`](scoring/temperature.ts) — warm/cool index from Oklab a\*b\* poles
- [`scoring/chromaticInduction.ts`](scoring/chromaticInduction.ts) — perceived lighter/warmer/saturation under contrast
