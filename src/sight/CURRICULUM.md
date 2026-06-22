# Color Sight Trainer — curriculum (schema v7)

Seven-phase scaffolding. **Temperature** (warm vs. cool) is a continuous Oklab axis from Phase 1 through Phase 7, not a one-off lesson.

## Phase map

| Phase                       | Levels | Module(s)                | Pedagogy                                                     |
| --------------------------- | ------ | ------------------------ | ------------------------------------------------------------ |
| **1 — Isolated dynamics**   | 1–7    | `flashcard` / `isolated` | Rapid multiple-choice: value, chroma, temperature undertones |
| **2 — Relational dynamics** | 8–11   | `flashcard` / `albers`   | Albers-style fields; identity + perceived diagnostics        |
| **3 — Calibration lab**     | 12–20  | `contextual`, `bridge`   | Slider matching, broken bridge                               |
| **4 — Creative harmony**    | 21–24  | `gamut`, `anchor-pivot`  | Scene gamut masks, harmony wheel pivot                       |
| **5 — Subtractive lab**     | 25–26  | `albers-equalizer`       | Perceived match across warm/cool fields                      |
| **6 — Dimensional slice**   | 27–28  | `munsell-slice`          | Value/chroma outlier in a 5-swatch grid                      |
| **7 — Atmospheric cast**    | 29–30  | `yot-cast`               | Light preset → flat scene color                              |

Level definitions live in [`levels.ts`](levels.ts). Profile migration bumps levels when the schema changes and **resets `passesAtLevel`** when the level changes. Migration runs eagerly on app mount via `ensureProfileMigrated()`.

## Calibration ladder (12–18) — one axis at a time

| Level | Label                 | Sliders   | Context        |
| ----- | --------------------- | --------- | -------------- |
| 12    | Match side by side    | L         | Gray, adjacent |
| 13    | Match on gray         | L         | Gray, flat     |
| 14    | Value in context      | L         | Colored field  |
| 15    | Saturation in context | C         | Colored field  |
| 16    | Value + saturation    | L + C     | Colored field  |
| 17    | Hue in context        | H         | Colored field  |
| 18    | Full match            | L + C + H | Colored field  |

Schema v7 inserted **15** (chroma-only) and **17** (hue-only) so production practice follows the same micro-progression as Phases 1–2 discrimination drills.

## Curriculum gap review (schema v7)

| Transition       | Gap class                                                                                                                            | Action                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 14 → old 15      | **Recognition → dual-axis production** — MCQ chroma (4–5, 11) did not teach slider matching for C; value-only matching jumped to L+C | **Fixed:** level 15 `chromaLocked`                                             |
| 16 → old 16 full | **Dual-axis → tri-axis** — adding hue as third slider at once                                                                        | **Fixed:** level 17 `lightnessChromaLocked`                                    |
| 11 → 12          | MCQ → first slider — large mode shift                                                                                                | **Intentional** — 12–13 introduce sliders on neutral gray before context (14+) |
| 20 → 21          | Bridge → gamut — new module                                                                                                          | **Intentional** — phase boundary                                               |
| 24 → 25          | Harmony → subtractive equalizer                                                                                                      | **Intentional** — different skill (perceived match across fields)              |
| 26 → 27          | Slice outliers → atmospheric cast                                                                                                    | **Intentional** — phase boundary                                               |

No additional levels added beyond 15 and 17 in v7. Future watch: if users stall at **11 → 12**, consider a optional “first slider” tutorial rep at level 11 review — not a new level yet.

## Judgment principles (implementation)

1. **Absolute objectivity** — Correct answers come from Oklch/Oklab math (`temperatureIndex`, ΔE, induction model), not taste.
2. **Micro-progression** — `IsolatedProfile` / `AlbersProfile` / `ContextualProfile` on each row tighten deltas and distractors (grayscale → hue noise → near-match).
3. **Procedural generators** — No static question bank; `generateIsolatedFlashcardChallenge` / `generateAlbersFlashcardChallenge` / `generateContextualMatchChallenge`.
4. **Instant visual feedback** — After Albers perceived items, `AlbersInductionReveal` shows the physical chip on gray **and** the model’s induced read side by side, with a one-line note that the ground shifted appearance. Isolated items still use `FlashcardProofStrip` only.

## Phase 2 perceived difficulty floor

Perceived Albers items (levels 9–11) are regenerated up to 48 times until `inducedDeltaForQuestion` meets `MIN_INDUCED_DELTAS` in [`scoring/chromaticInduction.ts`](scoring/chromaticInduction.ts). This keeps binary “which looks warmer?” prompts above guess threshold while preserving identical physical targets.

## TypeScript payloads

See [`types.ts`](types.ts):

- `IsolatedFlashcardChallenge` — Phase 1 (`kind: 'flashcard-isolated'`)
- `AlbersFlashcardChallenge` — Phase 2 (`kind: 'flashcard-albers'`)
- `AlbersField` — `{ background, target }` per side
- `ContextualLocks` — `{ lightness, chroma, hue }` booleans for slider matching
- `PracticeReveal` variants `flashcard-isolated` | `flashcard-albers`

## Phase 2 generator

Sample implementation: [`generators/albersFlashcard.ts`](generators/albersFlashcard.ts)

- **Identity** — Identical or ΔL-shifted targets on warm/cool fields; keyed `correctBinary: 'same' | 'different'`.
- **Perceived** — Mathematically identical targets; correct side from `chromaticInduction` (induced appearance in Oklab).

## Scoring utilities

- [`scoring/temperature.ts`](scoring/temperature.ts) — warm/cool index from Oklab a\*b\* poles
- [`scoring/chromaticInduction.ts`](scoring/chromaticInduction.ts) — perceived lighter/warmer/saturation under contrast
