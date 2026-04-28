# Melodia textbook / corpus import pipeline — status & backlog

End-to-end path from **publisher material** (typically via **OMR**) to exercises running in **`src/melodia/`**:

```text
Source (PDF scan) → OMR export (MusicXML) → ingest script → normalized JSON artifacts
                                                           ↓ (manual mapping today)
                                               curriculum/*.json → path.json → app runtime
```

This document describes **what exists in the repo**, **what is intentionally manual**, and **what remains before a textbook can be confidently said to be fully ported**.

---

## 1. Implemented pieces

### 1.1 Shared parsing & Melodia-specific normalization

| Piece                    | Location                                                                                                 | Role                                                                                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MusicXML → `PianoScore`  | [`src/shared/music/parseMusicXml.ts`](../../src/shared/music/parseMusicXml.ts)                           | Used by both the batch CLI and the UI review tool. Expects **partwise** MusicXML-style input (typical OMR/MuseScore export).                                                                                   |
| Melody part selection    | [`src/shared/music/melodiaPipeline/partUtils.ts`](../../src/shared/music/melodiaPipeline/partUtils.ts)   | Picks the “melody” part (prefers `hand: 'voice'`, etc.) so one line drives HRMF and validation.                                                                                                                |
| Normalization & metadata | [`src/shared/music/melodiaPipeline/normalize.ts`](../../src/shared/music/melodiaPipeline/normalize.ts)   | Produces [`NormalizedMelodiaExercise`](../../src/shared/music/melodiaPipeline/types.ts): `score`, `hrmf`, `pitch_sequence`, `rhythmic_profile`, `measure_count`, `validation_report`, optional `manualReview`. |
| HRMF line                | [`src/shared/music/melodiaPipeline/hrmf.ts`](../../src/shared/music/melodiaPipeline/hrmf.ts)             | Compact human review string (beats + pitch/rest tokens per measure).                                                                                                                                           |
| Validators               | [`src/shared/music/melodiaPipeline/validators.ts`](../../src/shared/music/melodiaPipeline/validators.ts) | Pedagogical flags: measure rhythm integrity, pickup hint, large melodic leaps (level-1 heuristic), “suspicious” accidentals vs **major** diatonic collection of `score.key`, etc.                              |
| Unit tests               | `src/shared/music/melodiaPipeline/*.test.ts`                                                             | Guardrails for normalize, validate, categorize, HRMF.                                                                                                                                                          |

**Auto-fix:** If validators report **`measure_rhythm_mismatch`** (duration sum ≠ bar length), normalization **pads** the measure by **greedily inserting synthetic rests** (see `fillUnderfilledMeasures`). That sets **`manualReview: true`** on the **`NormalizedMelodiaExercise`** — meaning “automated correction applied; deserves human confirmation against the source engraving.” Note: **`validation_report` is computed on the score _before_ that padding**; **`hrmf` / emitted `score` reflect the post-fix part**. Operators should reconcile flags with the fixed bars when auditing.

### 1.2 Batch CLI

| Script        | Command                                                                                                                          | Outputs                                                                                                                                                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingest folder | [`ingest-folder.mts`](./ingest-folder.mts) via `npm run melodia:ingest -- <inputDir> <outputDir> [--level=N] [--fail-on-error]`  | Per-file `<id>.json` (**`NormalizedMelodiaExercise`**), **`corpus.jsonl`**, **`REPORT.md`** (per-file summaries + aggregated flag counts). IDs are `melodia-ingest-<sanitized-basename>` (not book/lesson ids).                                                                                                |
| Categorize    | [`categorize-corpus.mts`](./categorize-corpus.mts) · `npx tsx scripts/melodia/categorize-corpus.mts <corpus.jsonl> <outputJson>` | Writes a **`path.json`-style** object: `version`, `generatedBy`, **`exerciseIds`** only. Buckets are computed internally but **not** written to the slim file; exercises with **`manualReview: true` are excluded** from `exerciseIds` but remain in the in-memory `categorized` list for console diagnostics. |

**Note:** Only **`melodia:ingest`** is wired in root [`package.json`](../../package.json); categorize is run with `npx tsx` as above (worth adding an npm script when this pipeline is used regularly).

### 1.3 Interactive / review tooling (not a substitute for source verification)

| Tool                           | Location                                                                                 | Purpose                                                                                                                                                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI catalog — Melodia tab**   | [`src/ui/melodia/MelodiaCorpusReview.tsx`](../../src/ui/melodia/MelodiaCorpusReview.tsx) | Load a single MusicXML file in the browser: **`normalizePianoScore`**, list **`validation_report`**, show **HRMF**, edit JSON, **VexFlow** first-measure preview (`drawMelodiaFirstMeasurePreview`). Download JSON for **manual** placement under `src/melodia/curriculum/data/`. |
| **LLM-assisted review prompt** | [`docs/llm-review-prompt.md`](./docs/llm-review-prompt.md)                               | Copy/paste HRMF + `validation_report` into an external chat to triage flags (no API in-repo).                                                                                                                                                                                     |

### 1.4 What the learner app actually loads

- **Shipped shape** is **`MelodiaCurriculumExercise`** ([`types.ts`](../../src/shared/music/melodiaPipeline/types.ts)): `id`, `book`, `number`, optional `title`, `melodiaLevel`, `key`, `timeSignature`, `tempoSuggestion`, **`score`**, optional `sourceOmHash`.
- JSON files live in [`src/melodia/curriculum/data/*.json`](../../src/melodia/curriculum/data/); the catalog is glob-loaded in [`src/melodia/curriculum/catalog.ts`](../../src/melodia/curriculum/catalog.ts).
- Linear order is [`src/melodia/curriculum/path.json`](../../src/melodia/curriculum/path.json) (list of `exerciseIds`), resolved by [`linearPath.ts`](../../src/melodia/curriculum/linearPath.ts). Seeded development content uses a small static set (e.g. `melodia-b1-001` …).

**Important:** The **ingest output** (`NormalizedMelodiaExercise`) is **not** the same JSON shape as **`MelodiaCurriculumExercise`**. There is **no checked-in script** that maps ingest JSON → curriculum files (book/number/title/tempo, stable ids like `melodia-b1-042`, etc.).

---

## 2. What has _not_ been verified as a full textbook pass

From product/process perspective (not a code deficiency alone):

1. **No recorded “golden” textbook run** — e.g. bulk OMR → ingest → spot-check measures against the physical or PDF edition for every flagged file.
2. **No single owner sign-off** on **licensing/redistribution** for a specific scanned edition ([`README.md`](./README.md) already warns to verify rights before committing corpus JSON).
3. **Curriculum metadata** (book lesson numbers, pedagogical titles) is **orthogonal** to OMR filenames; aligning them is editorial work **outside** the parsers.
4. **Categorizer** uses a **simple max melodic interval** heuristic into buckets (stepwise / thirds / fourths / mixed); it does not encode **Melodia book progression rules** from a human teacher’s table of contents.

---

## 3. Pending work to “fully port” a textbook (checklist)

Use this as a practical gate before claiming the textbook is represented in-app.

### A. Source & legal

- [ ] Confirm **which edition** of _Melodia_ (or other source) is the **canonical** import and that **redistribution** of derived JSON (and any bundled MusicXML) is allowed for your deployment.

### B. OMR / export quality

- [ ] Choose an OMR or export path (Audiveris, MuseScore transcription, etc.) and document it for repeatability.
- [ ] Export **partwise MusicXML** (or equivalent the parser accepts) per exercise or per batch; avoid mixed score layouts that split the intended single melody line across parts **without** adjusting `partUtils` if your export differs.

### C. Batch ingest & triage

- [ ] Run **`npm run melodia:ingest -- <xmlDir> <outDir> --level=1`** (tune level as needed).
- [ ] Read **`REPORT.md`** and prioritize files with **error**-severity flags or **`manualReview`** after auto-rest padding.
- [ ] For each exercise, either:
  - fix **OMR** and re-ingest, or
  - hand-edit MusicXML / generated JSON with traceability, or
  - **accept** with written rationale (especially for `pickup_measure_candidate`, `suspicious_accidental` on chromatic pedagogy).

### D. Map to curriculum JSON (manual until automated)

For every exercise to ship:

- [ ] Assign stable **`id`** (e.g. `melodia-b1-012`), **`book`**, **`number`**, **`title`**, **`tempoSuggestion`**, and ensure **`score`** matches the reviewed `PianoScore` (copy from normalized output or merge fields).
- [ ] Optional: store **`sourceOmHash`** or file provenance for regression tracking.
- [ ] Add one file per exercise under **`src/melodia/curriculum/data/`**.

### E. Linear path

- [ ] Build **`corpus.jsonl`** from normalized rows (ingest already emits this) or from accepted curriculum scores re-serialized consistently.
- [ ] Run **`categorize-corpus.mts`** if you want **interval-based** ordering; merge or hand-edit **`path.json`** to match **pedagogical** order if it should differ from the categorizer.
- [ ] Ensure every id in **`path.json`** exists in **`curriculum/data/`**.

### F. QA in the app

- [ ] Smoke a sample of lessons in **Melodia** (audiation + sing) after transpose/comfort features, not only Vex preview.
- [ ] Optional: add/extend Playwright coverage for `/melodia` when the corpus stabilizes.

### G. Automation opportunities (future code)

- [ ] **Converter script**: `NormalizedMelodiaExercise` → `MelodiaCurriculumExercise` stub (fill `score` + metadata template) to reduce copy/paste errors.
- [ ] **npm script** for `categorize-corpus.mts`.
- [ ] **Re-validate after auto-fix**: re-run validators on **`fixedScore`** so `validation_report` matches shipped `score`, or document the two-phase semantics explicitly in code.
- [ ] **Minor key / non-major** validator heuristics if the textbook uses minor keys heavily (current accidental check is **major-diatonic** bias).

---

## 4. Related docs

- [`README.md`](./README.md) — quick CLI usage and licensing reminder.
- [`src/melodia/README.md`](../../src/melodia/README.md) — learner-facing curriculum overview.
- [`src/melodia/DEVELOPMENT.md`](../../src/melodia/DEVELOPMENT.md) — in-app Melodia engineering decisions (transpose, overlays, debug URL merge).
