# Melodia data pipeline

Batch-convert OMR-exported **MusicXML** (partwise) into normalized JSON with validation flags and a human-readable summary (HRMF).

## Prerequisites

- Node 20+
- OMR output as `.xml` / `.musicxml` files in a folder (Audiveris, MuseScore, etc.)

## Run

```bash
npm run melodia:ingest -- <inputDir> <outputDir> [--level=1] [--fail-on-error]
```

Example:

```bash
npm run melodia:ingest -- ./my-melodia-xml ./dist/melodia-corpus --level=1 --fail-on-error
```

Outputs:

- One `<id>.json` per input file (**`NormalizedMelodiaExercise`** from `normalizePianoScore` — includes `score`, `hrmf`, `validation_report`; not identical to learner `curriculum/data` JSON).
- `corpus.jsonl` — all exercises concatenated.
- `REPORT.md` — human summary and flag counts.

## Textbook import — full status & checklist

For how this fits **shipping exercises in the app** (manual mapping to `MelodiaCurriculumExercise`, `path.json`, licensing, OMR caveats, and a full-port checklist), see **[`IMPORT_PIPELINE.md`](./IMPORT_PIPELINE.md)**.

## Licensing

Only commit corpus JSON you have the right to redistribute. Public-domain _Melodia_ editions exist, but specific PDF scans may carry separate terms—verify before publishing.

## LLM-assisted review

See [docs/llm-review-prompt.md](./docs/llm-review-prompt.md) for a copy-paste prompt to sanity-check HRMF + flags in an external chat model (optional; no API in this repo).
