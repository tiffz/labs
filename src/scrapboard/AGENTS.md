# Scrapboard — agent context

Nested **`AGENTS.md`**. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — chrome model (page cast, panel inspector, always-on layout rail).
2. [`CUJs.md`](CUJs.md) — cast + arrangement + Wikimedia journeys.
3. Shared comic: [`../shared/comic/`](../shared/comic/) — cast/arrangements, `PanelMockupSvg` (pass `cast` for Scrapboard sketchy path).

## Pitfalls

- **Character-first:** Scrapboard passes `cast` into `PanelMockupSvg` and skips procedural blob scenery; Lyrefly still uses legacy `PanelCompositionId` when cast is absent — do not break that path.
- **Always-open layout strip** — do not reintroduce collapse-behind-“Change layout” (`UX_AGENT_GUIDE` § Always-available pickers).
- **Horizon / emoji:** panels without a photo need sky/ground; native emoji without grey tint discs.
- **No Drive persistence** for boards in this app (session-local unless documented elsewhere).

## Tests

- Unit: `src/shared/comic/comicCast.test.ts`, `characterArrangements.test.ts`
- E2e: `e2e/smoke/scrapboard.spec.ts`, `scrapboard-bubbles.spec.ts`
