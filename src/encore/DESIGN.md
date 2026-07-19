# Encore — design contract

Encore diverges from the shared CSS-token stack: it is a **MUI-first app**. All chrome comes from MUI components themed by `getAppTheme('encore')` in [`src/shared/ui/theme/appTheme.ts`](../shared/ui/theme/appTheme.ts); it does not map the `--theme-*` CSS token palette (registered exception in `scripts/check-shared-theme-contract.mjs`).

## Rules

- **Palette:** change colors in `getAppTheme('encore')`, not in component `sx` hex. Keep the CSS mirror tokens in sync per the bridge policy in [`SHARED_UI_CONVENTIONS.md`](../shared/SHARED_UI_CONVENTIONS.md) § Theming bridge.
- **Components:** MUI primitives + shared `/ui/` catalog first; no app-local copies of shared controls.
- **Typography:** MUI defaults (Roboto); sentence case labels per [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md).
- **Layout:** library/list surfaces follow [`PERFORMANCE_UX.md`](PERFORMANCE_UX.md) and the CUJ budgets in [`CUJs.md`](CUJs.md).
- **Portals:** dialogs/menus inherit the MUI theme automatically — do not restyle portal papers with raw hex.

Architecture and sync design: [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`AGENTS.md`](AGENTS.md).
