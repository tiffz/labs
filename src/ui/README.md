# UI

Internal shared-UI catalog and demo workspace. Think of this as Labs's mini Storybook: a live route that renders and documents the shared primitives, so contributors can see what exists before writing something new.

Route: `/ui/`.

## Purpose

- **Single source of truth** for what "shared" primitives look like (buttons, tooltips, popovers, sliders, notation renderers, etc.).
- **Safe sandbox** to iterate on shared UI without touching a consumer app.
- **Visual-regression reference** — baselines in `e2e/visual/apps.visual.spec.ts-snapshots/` cover the catalog so drift in shared components is caught centrally.

## When To Update

You should touch this app whenever you:

1. Add a new primitive under `src/shared/components/`.
2. Change the visual or interaction contract of an existing shared primitive.
3. Introduce a new shared convention (e.g. `AnchoredPopover`) — add a demo here and link to it from `src/shared/SHARED_UI_CONVENTIONS.md`.

If your change is purely internal (shared hooks, non-visual utilities), you do not need to update this app.

## File Layout

```text
src/ui/
├── App.tsx                       # Catalog shell + section registry
├── App.test.tsx                  # Smoke tests for the catalog route
├── RegressionPanel.tsx           # Manual visual-regression helpers
├── generatedSharedCatalog.ts     # Codegen'd list of shared primitives
├── sharedCatalog.config.json     # Config driving the catalog generator
└── styles/                       # ui-only layout CSS
```

## Testing

- Unit: `npx vitest run src/ui`
- Visual regression: the catalog itself is the source of truth; baselines live next to other app snapshots.

## Related Docs

- `src/shared/SHARED_UI_CONVENTIONS.md` — the written conventions; this app is the visual counterpart.
- `STYLE_GUIDE.md` (repo root) — global style guide.
