---
paths:
  - 'vite.config.ts'
  - 'src/shared/debug/**'
  - 'src/shared/utils/serverLogger.ts'
---

<!-- AUTO-GENERATED from .agents/rules/dev-debug-artifact-pipe.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> Retrieve runtime debug data from a local dev session through a /__debug_* dev-server pipe you read yourself — never ask the user to forward artifacts

# Dev debug artifact pipe

When you need runtime debug data from a **local dev session** — logs, a
screenshot/snapshot, a heap/perf trace, a state dump — use (or add) a `/__debug_*`
dev-server pipe and **read the written file yourself**. Do **not** ask the user to
download, screenshot, copy-paste, or otherwise forward the artifact by hand when a
pipe exists or you can add one in a few lines.

## Existing pipes

| Endpoint               | Writes to              | Use for                        |
| ---------------------- | ---------------------- | ------------------------------ |
| `/__debug_log`         | dev console (terminal) | structured logs / ServerLogger |
| `/__debug_snapshot`    | `.debug-snapshots/`    | screenshot + meta JSON         |
| `/__debug_audio_trace` | `.debug-audio-traces/` | audio scheduling traces\*      |

\* `/__debug_audio_trace` lands in a sibling PR; the first two are on `main` today.

## Add a new one (mirror `/__debug_snapshot`)

1. Register the middleware in `vite.config.ts` `configureServer` — this keeps it on
   the **dev server only**, never in the prod build.
2. Browser side POSTs gated on `import.meta.env.DEV`. Use
   `fetch(url, { keepalive: true })` or `navigator.sendBeacon` so the POST survives a
   tab OOM or unload.
3. `.gitignore` the output dir.
4. **Sanitize the payload** — no tokens or PII; scrub any route/url like
   `sanitizeRouteForBeacon` (`src/shared/utils/labsCrashLog.ts`).

## Prod boundary

This pipe is **local dev only**. In production there is **no** browser→disk or
browser→LLM pipe — use LabsDebugDock **Copy bundle** (tiered debug,
[ADR 0026](../../docs/adr/0026-tiered-debug-access.md)). Never expose `/__debug_*`
endpoints in a prod build.

Root cause class: `manual-artifact-forwarding` — asking the user to hand-carry debug
data a dev pipe could deliver.
