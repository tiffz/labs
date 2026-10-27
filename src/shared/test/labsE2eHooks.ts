/**
 * True when this bundle carries the Playwright seed hooks: the dev server, or a production build
 * made with `VITE_LABS_E2E_HOOKS=1`.
 *
 * The flag exists so CI can run the e2e smokes against a real production bundle (`npm run
 * test:e2e:prod`). Dev hides bugs that only a production build shows: StrictMode runs every layout
 * effect twice, which masked an MRT table that drew 0 rows after the card view.
 *
 * Vite replaces both operands statically, so with the flag unset this is the literal `false` and
 * every hook behind it is dead-code-eliminated. No deploy sets the flag, and
 * `scripts/check-prod-build-mode.mjs` fails any `dist/` that still contains a hook.
 *
 * Gate on this constant directly (`if (!LABS_E2E_HOOKS_COMPILED_IN) return`), not through a
 * wrapper function: a call cannot be folded across modules, a constant can.
 */
export const LABS_E2E_HOOKS_COMPILED_IN: boolean =
  import.meta.env.DEV || import.meta.env.VITE_LABS_E2E_HOOKS === '1';
