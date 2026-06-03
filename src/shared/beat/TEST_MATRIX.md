# Shared beat analysis — test matrix

Regression fixtures for `src/shared/beat/**` tempo and analysis code. Extend this table when fixing estimator bugs or adding algorithms.

| Fixture / scenario                            | Expected BPM (approx)                           | Failure mode if wrong                         | Primary tests                   |
| --------------------------------------------- | ----------------------------------------------- | --------------------------------------------- | ------------------------------- |
| Steady 120 BPM quarter onsets (synthetic)     | 120                                             | Half/double octave                            | `ioiTempoHint.test.ts`          |
| Steady 150 BPM 8th-note drum grid (synthetic) | 150                                             | ~75 (half-time) from percival vs multifeature | `ioiTempoHint.test.ts`          |
| Steady 70 BPM 8th-note grid (synthetic)       | 70                                              | ~140 (double) from narrow IOI bins            | `ioiTempoHint.test.ts`          |
| 99.5 BPM mixed synthetic                      | 99.5                                            | ~188 when eighth IOI peak wins over quarter   | `bpmDetectionBenchmark.test.ts` |
| Sparse onsets (< few seconds)                 | null / low confidence                           | Garbage BPM                                   | `ioiTempoHint.test.ts`          |
| Estimators disagree by octave                 | Prefer higher-confidence / IOI-resolved quarter | Locked half or double tempo                   | `tempoEnsemble` + benchmark     |

## Commands

```bash
npx vitest run src/shared/beat/analysis/ioiTempoHint.test.ts
npm run test:fast
```

## Related

- [`src/stanza/ANALYZE.md`](../../stanza/ANALYZE.md) — optional Analyze UX contract (Stanza surface)
- [`tempoEnsemble.ts`](./tempoEnsemble.ts), [`analysis/ioiTempoHint.ts`](./analysis/ioiTempoHint.ts)
