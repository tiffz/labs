# Flaky tests (Labs)

How to **fix** flaky Vitest/Playwright tests — not mask them with retries. Agents: read this when a test fails intermittently or when adding async/timer tests.

## Do not

- Increase timeouts blindly without fixing the root cause
- Set `findBy*` timeout **higher than** Vitest `testTimeout` (the whole test still aborts at `testTimeout`)
- Rely on CI `--retry=1` to green a PR without a code fix
- Use `Math.random()` or wall-clock sleeps without deterministic mocks

## Common root causes

| Symptom                           | Likely cause                                 | Fix                                                                                  |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| Passes locally, fails on CI       | Cold `import()` / lazy routes                | Preload modules in `beforeAll`, or mock dynamic imports                              |
| Timeout at exactly 10s            | `findBy*` waits 15s but `testTimeout` is 10s | Raise **test** timeout (`it(..., 20_000)`) _and_ preload/mocks                       |
| Passes alone, fails in full suite | Leaked timers, rAF, BroadcastChannel         | Use `setupTestCleanup()`; global `MockBroadcastChannel` in `setupTests.ts`           |
| Animation/timer flakes            | Real `setTimeout` / rAF                      | Mock rAF (see `setupTests.ts`) or use `vi.useFakeTimers()` with cleanup              |
| Essentia/WASM slow                | Heavy integration in fast path               | Name `*.integration.test.ts` — excluded from `test:fast`, run when beat files change |

## Async + dynamic imports (React)

Pattern documented in [`STYLE_GUIDE.md`](../STYLE_GUIDE.md). Reference implementation: [`src/story/App.test.tsx`](../src/story/App.test.tsx).

1. **`beforeAll`** — await the same dynamic `import()` paths the component uses
2. **`it(..., timeoutMs)`** — Vitest test timeout ≥ expected async work
3. **`findBy*` timeout** — ≤ test timeout, with headroom for assertions after

## Slow tests vs fast presubmit

| Tier                                    | Filename convention             | When it runs                       |
| --------------------------------------- | ------------------------------- | ---------------------------------- |
| Fast (default)                          | `*.test.ts`                     | `test:fast`, scoped pre-commit     |
| Integration                             | `*.integration.test.ts`         | Beat-folder scoped runs, manual    |
| Regression / audit / stress / benchmark | in filename                     | Full `npm test`, CI, nightly       |
| BPM benchmark                           | `bpmDetectionBenchmark.test.ts` | `INCLUDE_BEAT_BENCHMARK=true` only |

Add new **slow** tests using these conventions so pre-commit stays fast.

## Agent checklist when a test flakes

1. Reproduce once with the **smallest** command (single file, not whole presubmit)
2. Read failure: timeout vs assertion vs worker teardown
3. Fix root cause (preload, mock, cleanup, deterministic fixture)
4. Run the file **3×** in a row: `for i in 1 2 3; do npx vitest run path/to/file.test.ts || break; done`
5. If full-suite only: check timer/BroadcastChannel leaks in `afterEach`

## Related

- [`.cursor/rules/flaky-tests.mdc`](../.cursor/rules/flaky-tests.mdc) — agent rule on test files
- [`docs/CI_PATH_SCOPING.md`](CI_PATH_SCOPING.md) — scoped pre-commit / presubmit
- [`docs/CI_RELIABILITY.md`](CI_RELIABILITY.md) — CI retries (last resort)
- [`src/shared/test/setupTests.ts`](../src/shared/test/setupTests.ts) — global mocks
