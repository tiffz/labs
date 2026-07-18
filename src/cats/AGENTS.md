# Cats — agent context

Nested **`AGENTS.md`** for Cat Clicker. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — game loop, mechanics.
2. [`DEVELOPMENT.md`](DEVELOPMENT.md) — ECS / simulation ADRs.
3. **Furniture rendering:** [`components/rendering/UNIFIED_RENDERING_GUIDE.md`](components/rendering/UNIFIED_RENDERING_GUIDE.md) — invariants only (read when placing furniture).
4. **Copy:** [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md) (playful OK; still no em-dash essay voice).

## Pitfalls

- **ECS boundaries** — game logic in systems/components; do not bypass the world projection layer (see `WorldProjectionConsistency.test.ts`).
- **Large shell:** `App.tsx` (~740 lines) — use skill `labs-component-decomposition` before adding major UI blocks.
- **No cross-app imports** — shared code only via `src/shared/**`.

## Tests

- Unit: `npm test -- src/cats`
- Integration: `src/cats/integration/WorldProjectionConsistency.test.ts`, `noseClickRegression.test.ts`
