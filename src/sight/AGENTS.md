# Color Sight Trainer — agent context

Nested context for Sight. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — curriculum, practice flow, debug URLs.
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) — phases, scoring, generators.
3. [`CUJs.md`](CUJs.md) — critical journeys + performance budgets.
4. [`COPY_STYLE.md`](COPY_STYLE.md) — user-facing copy.
5. **Layout / debug dock:** [`sight.css`](sight.css) — `.sight-app` uses `calc(100dvh - var(--labs-debug-dock-height, 0px))`; `.sight-main` + `.sight-practice-shell` flex column. Debug must not change non-debug layout.

## Pitfalls

- **Never** remove full-viewport height from `.sight-app` and rely only on `html:has(.labs-debug-dock)` — normal mode loses pinned footer.
- **Practice** uses `.sight-practice-shell` inside `.sight-main` (not `display: contents` on main).
- **Sandbox** uses `.sight-sandbox`, not nested `.sight-app`.
- Profile in `localStorage` (`sight:profile`); migrations on mount.

## Tests

- Unit: `src/sight/**/*.test.ts`
- Interaction: `e2e/smoke/sight-practice-interaction.spec.ts` (CUJ-001)
- Contrast: `e2e/smoke/layout-heuristics-sight.spec.ts` + token tests in `contrastAuditCore.test.ts`
- Performance skill: `labs-performance` when touching practice layout or tap latency
