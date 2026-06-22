# Shared UX patterns (Labs)

Index of cross-app patterns — **reuse by default**, diverge in app `DESIGN.md` when identity requires it.

**Primitives catalog:** [`src/shared/SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md) · `/ui/` gallery

## Three layers

| Layer          | Shared                                                          | App-specific                           |
| -------------- | --------------------------------------------------------------- | -------------------------------------- |
| **Primitives** | `/ui/` catalog, `AppShellLayout`, playback controls, Drive menu | —                                      |
| **Patterns**   | Blocking jobs snackbar, list loading, keyboard shortcuts, undo  | Copy, density                          |
| **Identity**   | Token names (`--theme-*`)                                       | Token values, typography, illustration |

## Pattern registry

| Pattern                      | Canonical implementation                        | Allowed divergence                                 |
| ---------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| **App shell**                | `AppShellLayout` + `SkipToMain` + `main#main`   | App `*-layout.css`, density bucket                 |
| **Upload / sync progress**   | `LabsBlockingJobContext` snackbar               | Encore completion toasts only                      |
| **Empty vs loading (Dexie)** | `resolveDexieLiveQuery`, `LabsListLoadingState` | App-specific empty copy                            |
| **Drive account**            | `LabsDriveAccountMenu`                          | OAuth scope split per app README                   |
| **Keyboard shortcuts**       | `LabsKeyboardShortcutsDialog` + app sections    | App-specific shortcut rows                         |
| **Undo (CRUD apps)**         | `LabsUndoProvider`, `LabsUndoControls`          | —                                                  |
| **Error recovery**           | `LabsErrorBoundary` in `main.tsx`               | Panel-level boundaries for isolated panels (Zines) |
| **Crash log (local)**        | `labsCrashLog.ts` + debug export                | Prod telemetry: ADR 0016 (deferred)                |
| **Layout verification**      | `npm run verify:layout`                         | Opt-out: `data-labs-allow-horizontal-scroll`       |

## When to diverge

Document in app `DESIGN.md` when:

- Shared primitive cannot meet app identity without fork
- Performance requires app-local virtualizer (still follow `PERFORMANCE.md` invariants)
- OAuth or sync scope differs (Zine Box dual-scope pattern)

## Enforcement

- `shared-ui-first.mdc` — search catalog before new controls
- `labsBlockingJobGuardrails.test.ts` — no duplicate progress UI with blocking jobs
- `sharedUxPatternGuardrails.test.ts` — no app-local MUI `Slider` for volume/gain outside allowlist
- `spaGuardrails.test.ts` — shell landmarks, error boundary, scroll lock

## New app checklist

See skill [`labs-new-micro-app`](../.cursor/skills/labs-new-micro-app/SKILL.md):

1. `AppShellLayout` or documented shell equivalent
2. `LabsErrorBoundary` + `installLabsCrashHandlers` in `main.tsx`
3. `CUJs.md` skeleton + app-shell smoke in `routeRegistry.ts`
4. Layout smoke stub when primary UI lands
