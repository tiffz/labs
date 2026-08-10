---
paths:
  - 'src/shared/beat/**'
  - 'src/stanza/components/StanzaSectionMetronomeRail.tsx'
  - 'src/stanza/components/StanzaSuggestSectionsDialog.tsx'
---

<!-- AUTO-GENERATED from .agents/rules/beat-analysis-scope.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> Shared tempo analysis — Stanza Analyze path and regression harness

# Shared tempo analysis scope

1. **Stanza is the product surface** — optional Analyze tempo, Suggest sections, and key detection run on uploaded audio only. Do not reintroduce a separate Find the Beat app.

2. **Regression harness** lives under `src/shared/beat/regression/` (synthetic audio hashes, BPM benchmark, CLI runners). Update CI/pre-commit paths when moving tests.

3. **Changing the detector? Read [`src/shared/beat/eval/README.md`](../../src/shared/beat/eval/README.md) first and MEASURE ON REAL AUDIO.** Synthetic fixtures cannot settle a tempo question — `drumPattern` voices a hihat every 8th regardless of tempo, so its onset density is a deterministic function of BPM and any "denser means faster" logic is correct there by construction. Measured: the same nominal 150 BPM reads 74.64 on the synthetic fixture and 150.0 on real audio. Run `__stanzaTempoEval()` against tapped ground truth before and after; three separate changes each measured as a no-op alone and only produced +60 points together.

4. **Tempo changes** — Update [`TEST_MATRIX.md`](../../src/shared/beat/TEST_MATRIX.md) and run `ioiTempoHint.test.ts` when touching octave/consensus logic. UX contract: [`src/stanza/ANALYZE.md`](../../src/stanza/ANALYZE.md).

5. **Import boundaries** — `src/stanza/**` must not import deleted app code; use `src/shared/beat/**` only.
