# Flaky tests (Labs)

How to **fix** flaky Vitest/Playwright tests — not mask them with retries. Agents: read this when a test fails intermittently or when adding async/timer tests.

## Do not

- Increase timeouts blindly without fixing the root cause
- Set `findBy*` timeout **higher than** Vitest `testTimeout` (the whole test still aborts at `testTimeout`)
- Rely on CI `--retry=1` to green a PR without a code fix
- Use `Math.random()` or wall-clock sleeps without deterministic mocks

## Common root causes

| Symptom                                                         | Likely cause                                                                                                                                     | Fix                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passes locally, fails on CI                                     | Cold `import()` / lazy routes                                                                                                                    | Preload modules in `beforeAll`, or mock dynamic imports                                                                                                                                                                                                                   |
| Timeout at exactly 10s                                          | `findBy*` waits 15s but `testTimeout` is 10s                                                                                                     | Raise **test** timeout (`it(..., 20_000)`) _and_ preload/mocks                                                                                                                                                                                                            |
| Passes alone, fails in full suite                               | Leaked timers, rAF, BroadcastChannel                                                                                                             | Use `setupTestCleanup()`; global `MockBroadcastChannel` in `setupTests.ts`                                                                                                                                                                                                |
| Animation/timer flakes                                          | Real `setTimeout` / rAF                                                                                                                          | Mock rAF (see `setupTests.ts`) or use `vi.useFakeTimers()` with cleanup                                                                                                                                                                                                   |
| E2e perf budget flakes                                          | Single max frame / cold scroll or orbit                                                                                                          | Warmup burst before sampling; assert **p95** + separate spike max; CI-aware limits in `*PerfCore.ts`                                                                                                                                                                      |
| Playwright `expect.poll` never reaches its timeout              | `poll`/`toPass` timeout set **above** the 30s `testTimeout`                                                                                      | Raise the **test** budget too: `test.setTimeout(ms)` ≥ sum of internal waits (e.g. heavy GLB load)                                                                                                                                                                        |
| Muscle WebGL canvas `toBeVisible` flakes in `test:e2e:smoke`    | 5s default too tight; parallel muscle smokes contend on software WebGL after presubmit                                                           | Use `expectMuscleCanvasReady(page)` (`e2e/helpers/muscleCanvas.ts`, **40s** per gate) — never the 5s default; heavy describes `test.describe.configure({ timeout: 90_000 })`                                                                                              |
| Muscle full-body skeleton `Test timeout 90000ms exceeded` on CI | ~400k-tri atlas load + inventory publish runs ~2.5x slower on CI software WebGL; 90s cap with retries:0 red-failed the gate                      | **Removed** the spec (2026-06-29): the `missingRequiredBones` audit duplicated `fullBodyRuntimeInventory.test.ts` + `npm run muscle:audit-export`; atlas-loads smoke is covered by `muscle-study-journey`. Slow flaky e2e is the wrong tier for a data-completeness audit |
| Zinebox random unread under load                                | Stale `throttledReplaceState(#/library)` from debounced search overwrote `#/read/` after `openReader` (reader UI visible, URL still `#/library`) | Skip no-op search debounce; no-op `setLibraryParams`; `cancelPendingHistoryUpdates` in `openReader`                                                                                                                                                                       |
| Essentia/WASM slow                                              | Heavy integration in fast path                                                                                                                   | Name `*.integration.test.ts` — excluded from `test:fast`, run when beat files change                                                                                                                                                                                      |
| Mass Playwright `page.goto` `net::ERR_ABORTED` across apps      | Port **5173** held by a stale/`npm run dev` Vite that Playwright’s `webServer` cannot replace (`--strictPort`); or half-dead reused server       | Stop the process on 5173, re-run; or after green `presubmit`, push with `LABS_SKIP_PRESUBMIT_PUSH=1` and let CI smoke (`e2e-port-collision`)                                                                                                                              |
| Muscle `.muscle-canvas-wrap.is-ready` timeout under parallel CI | Full-body atlas + fundamentals smokes contend on software WebGL; 40s gate too tight when another muscle spec is loading GLBs on the same runner  | `expectMuscleCanvasReady` uses 90s on CI; `muscle-study-journey` runs serial within its describe                                                                                                                                                                          |

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

| Quarantined (fix in 7 days) | `*.flaky.test.ts` or `@flaky` in title | Excluded from `test:fast`; row in [`FLAKY_TEST_REGISTRY.md`](FLAKY_TEST_REGISTRY.md) |

Add new **slow** tests using these conventions so pre-commit stays fast.

## Quarantine policy

1. Rename to `*.flaky.test.ts` or tag `@flaky` in the test title.
2. Add a row to [`FLAKY_TEST_REGISTRY.md`](FLAKY_TEST_REGISTRY.md) with a **7-day fix deadline**.
3. Do **not** rely on Playwright retries (`playwright.config.ts` uses `retries: 0`).
4. Vitest CI may use `--retry=1` only for documented worker-teardown class until eliminated.
5. After deadline: fix root cause or delete the test.

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
