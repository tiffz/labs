---
name: labs-e2e-smoke
description: Adds or extends Labs Playwright e2e smokes — fixtures, routeRegistry, scoped e2e map, and presubmit gates. Use when adding app journey smokes, Drive import stubs, or updating run-scoped-e2e.mjs.
---

# Labs e2e smoke

## Canonical docs

- [`docs/E2E_SMOKE_CONVENTIONS.md`](../../../docs/E2E_SMOKE_CONVENTIONS.md) — when to add smokes, examples
- [`e2e/routeRegistry.ts`](../../../e2e/routeRegistry.ts) — app boot routes (`smoke: true` rows)
- [`docs/CI_PATH_SCOPING.md`](../../../docs/CI_PATH_SCOPING.md) — `APP_SMOKE_SPECS` in `scripts/run-scoped-e2e.mjs`

## Checklist (new journey smoke)

1. **Fixture** — dev-only gate (`?e2eSeed=1`, `?e2eInterruptedUpload=1`, etc.) in `src/<app>/` + seed module; never ship fixtures in production UX.
2. **Helper** — `e2e/helpers/<app><Surface>.ts` for reusable chrome assertions or Drive/API stubs.
3. **Spec** — `e2e/smoke/<app>-<surface>.spec.ts`; assert user-visible outcomes, not implementation.
4. **routeRegistry** — update notes when boot coverage changes; `app-shells.spec.ts` picks up `smoke: true` rows automatically.
5. **Scoped map** — add app entry to `APP_SMOKE_SPECS` in [`scripts/run-scoped-e2e.mjs`](../../../scripts/run-scoped-e2e.mjs) when the spec exists (required for CI scoped e2e).
6. **CUJs.md** — link spec path in `src/<app>/CUJs.md` when the journey is durable.
7. **Verify** — `npm run test:e2e:smoke` (or targeted `npx playwright test e2e/smoke/<spec>.ts` while iterating).

## Drive / blocking-job smokes

- Persist Google session via `page.addInitScript` + `encore_google_oauth_v1` / `encore_google_identity_v1` (see `e2e/helpers/gestureUploadOfflineResume.ts`, `zineboxDriveImport.ts`).
- Stub `googleapis.com/drive/v3` + expose CORS headers (`Access-Control-Expose-Headers: ETag, Location` when uploads resume).
- Blocking jobs: assert `role="progressbar"` from `LabsBlockingJobProgressBar`, not duplicate `LinearProgress` in app code (`labsBlockingJobGuardrails.test.ts`).

## Presubmit / push

- Shell, provider, or `e2e/` changes → `npm run presubmit:push` before push (see [`.cursor/rules/pre-commit-checks.mdc`](../../rules/pre-commit-checks.mdc)).
