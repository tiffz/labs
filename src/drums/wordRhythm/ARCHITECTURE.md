# Word Rhythm Architecture

## Scope

`wordRhythm` converts input lyrics into parseable darbuka notation and timing-aligned syllable metadata for score rendering and playback highlighting.

Primary implementation files:

- `src/words/utils/prosodyEngine.ts`
- `src/words/utils/prosodyEngine.test.ts`
- `src/words/App.tsx`
- `src/words/components/VexLyricScore.tsx`

## Core Data Flow

1. `generateWordRhythm()` tokenizes lyrics by lines, preserving line boundaries.
2. Each word is analyzed with dictionary-first prosody and heuristic fallback.
3. `buildNotationFromAnalyses()` maps syllables to:
   - darbuka strokes (`D`, `T`, `K`)
   - durations (16th/eighth/dotted-eighth/quarter)
   - start offsets (`startSixteenth`) and durations (`durationSixteenths`)
4. Notation is parsed by the shared rhythm parser for rendering/playback.
5. `App.tsx` can orchestrate multi-section generation by invoking `generateWordRhythm()` per section and merging notation/hits.
6. The merged score builds a `hitMap` keyed by rendered note position (`measureIndex-noteIndex`) for lyric tooltips and highlighting.

## Major Functional Rules

- **Prosody source precedence**
  - CMU dictionary first (`cmu-pronouncing-dictionary`)
  - heuristic fallback (`syllable`) when dictionary misses
- **Syllable integrity**
  - syllable chunks must rejoin to the original word (letter preservation)
  - input casing is preserved in display syllables
  - contractions are normalized for lookup and count (for example `won't`)
- **Rhythm shaping**
  - line-aware target duration biases each lyric line toward roughly two measures
  - long words may compress into faster subdivisions (for example `watermelon`)
  - small barline spill is allowed for tie-friendly phrasing
  - line breaks bias new words to start at measure boundaries
  - optional line-break gap bias can leave extra rest between dense lyric lines
- **Stroke heuristics**
  - major beats bias to `D` (1/3) and `T` (2/4)
  - off-beat fill uses `T`/`K` with anti-repetition guards (avoid repeated `K K`)
- **Variation model**
  - separate seeds for rhythm variation and sound variation
  - regenerate controls can vary rhythm only, sounds only, or both
  - section-aware orchestration can scope seeds/settings to individual sections

## Rendering Decisions

- Score rendering uses VexFlow and wraps measures into multiple lines based on available width.
- Beaming is generated before drawing and then rendered after voice draw.
- Lyrics are rendered in black text with active playback highlight backing.
- Sticky global controls span both columns; notation output remains below score and non-sticky.

## Test Coverage

`prosodyEngine.test.ts` covers:

- parseable notation output
- dictionary strict mode and heuristic fallback
- syllable integrity for representative words (`grapes`, `shoreline`)
- constrained isolated rests
- varied pulse values
- barline placement heuristics and line-break measure starts
- optional empty-space insertion between dense lyric lines
- casing preservation and contraction handling (`won't`)
- long-word speed-up behavior (`watermelon`)
- variation seed divergence
- major beat stroke heuristics
- anti-repetition for filler `K`

## Presubmit

Run these before shipping:

- `npm run lint`
- `npm run knip`
- `npm run test -- src/words/utils/prosodyEngine.test.ts`

`npm run build` also executes `knip` as part of this repository's build pipeline.
