# Find the Beat — development notes

App behavior overview: [`README.md`](./README.md). Shared tempo/IOI contracts: [`../shared/beat/TEST_MATRIX.md`](../shared/beat/TEST_MATRIX.md).

## Background analysis UX contract

Do **not** call `loadStaleReanalysisQueue()` on mount. Stale library entries reanalyze only when the user explicitly refreshes stale items or opens a stale entry.

| Event                               | Queue                       | `backgroundIsReanalysis` banner | Floating task panel                      |
| ----------------------------------- | --------------------------- | ------------------------------- | ---------------------------------------- |
| New upload / ingest                 | Prepend entry id (priority) | No                              | Yes (`uploadTasks` or analyzing)         |
| Open stale library entry            | Single id appended          | No                              | Yes while analyzing                      |
| User clicks refresh stale (library) | Batch ids from selection    | **Yes**                         | Yes                                      |
| Mount / passive library load        | —                           | **No**                          | Only if `uploadTasks` or active analysis |

`isBackgroundReanalyzing` may be true for first-time analysis of the active file; the banner copy must check `backgroundIsReanalysis` so users do not see “Reanalyzing cached videos…” for a new upload.

## Shared beat code

- Tempo ensemble / octave selection: `src/shared/beat/tempoEnsemble.ts`
- IOI hint: `src/shared/beat/analysis/ioiTempoHint.ts`
- When changing consensus or estimators, extend [`TEST_MATRIX.md`](../shared/beat/TEST_MATRIX.md) and run `src/shared/beat/analysis/ioiTempoHint.test.ts`.

## Layout

Find the Beat does not use the shared workbench grid today. If adding a footer panel or fixed content width, start from [`../shared/layout/README.md`](../shared/layout/README.md).
