# Labs responsive design

Canonical responsive practices for Labs micro-apps. Agents and humans use this when adding or changing layout/CSS.

**Enforcement:** the registry-driven floor `e2e/smoke/responsive-all-apps.spec.ts` (every smoke route at 390px: no horizontal scroll + no sub-24px touch targets), layout smokes (`npm run verify:layout`), [`.cursor/rules/layout-no-horizontal-scroll.mdc`](../.cursor/rules/layout-no-horizontal-scroll.mdc), [`.cursor/rules/responsive-design.mdc`](../.cursor/rules/responsive-design.mdc).

## Breakpoints (shared scale)

Use these **width** breakpoints unless an app `DESIGN.md` / `LAYOUT.md` documents a deliberate exception. Values match common Labs CSS (`stanza`, `lyrefly`, shells).

| Token name (docs) | Width    | Typical use                                 |
| ----------------- | -------- | ------------------------------------------- |
| `--labs-bp-xs`    | `480px`  | Narrow phones; force single-column grids    |
| `--labs-bp-sm`    | `640px`  | Phones / small landscape; stack toolbars    |
| `--labs-bp-md`    | `900px`  | Tablets; collapse dual panes / dense chrome |
| `--labs-bp-lg`    | `1200px` | Optional wide desktops                      |

CSS **cannot** read custom properties inside `@media` queries. Keep the numeric values in sync with [`src/shared/layout/labs-breakpoints.css`](../src/shared/layout/labs-breakpoints.css) comments and app tokens for padding/gaps.

Prefer **mobile-first** `min-width` enhancement when starting a new surface. Existing apps may use `max-width` collapse — either is fine if breakpoints match the table.

## Principles

1. **No accidental horizontal page scroll** — see layout-no-horizontal-scroll rule. Wide tables/notation get an opt-in host.
2. **Fluid type and space** — prefer `clamp()` for titles; reduce shell padding on small viewports via tokens, not one-off magic numbers.
3. **Stack before squash** — toolbars, header + account, and master–detail become columns under `--labs-bp-sm` / `--labs-bp-md`.
4. **Grids that fit** — `auto-fill` + `minmax()` with a **smaller min** under 640px (or `1fr` under 480px when two columns would fight, as on Lyrefly shelf).
5. **Touch targets** — ≥44px on coarse pointers for icon controls (`pointer: coarse`).
6. **Safe areas** — sticky footers / zen docks use `env(safe-area-inset-bottom)`.
7. **One primary CTA per viewport** — do not “solve” small screens by adding more chrome ([`UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md)).

## Mobile interaction parity

Every **primary CUJ** (the app's `CUJs.md`, or the obvious core loop when none exists) must be
completable at **390px** with a coarse pointer. Graceful degradation is encouraged — collapse dual
panes to tabs/accordion, move dense desktop chrome behind a menu, stack toolbars — but "desktop
only" for a primary journey needs an explicit note in the app's `LAYOUT.md` / `DESIGN.md` naming
the degraded path (e.g. notation editors may degrade to view + basic controls).

The enforced floor (`e2e/smoke/responsive-all-apps.spec.ts`, runs per app in scoped e2e):

- **No page-level horizontal scroll** at 390x844. Legit wide regions (tables, notation, film
  strips) opt in with `data-labs-allow-horizontal-scroll` or `.labs-horizontal-scroll-host`.
- **No interactive element below 24x24px** (WCAG 2.5.8 floor; 44px stays the comfort target for
  icon controls per the coarse-pointer rule). Grow hit areas with `@media (pointer: coarse)`
  blocks so desktop density is unchanged — see `bpmInput.css`, `drums.css`, `pulse.css` for the
  pattern. Canvas content that legitimately renders tiny (thumbnail mockups, stage figures) opts
  out with `data-labs-allow-small-touch-target` plus a source comment.

Route floors come from `e2e/routeRegistry.ts` — a new app registered for smoke inherits these
checks with zero extra spec code. Per-app `layout-heuristics-*.spec.ts` files stay for
app-specific assertions (padding, contrast, deeper routes).

## Default checklist (before done)

When you touch layout or CSS on a primary route:

- [ ] Resize to ~390px and ~768px (or run the app’s layout-heuristics smoke at mobile).
- [ ] No page-level horizontal scrollbar.
- [ ] Primary actions reachable without covering content awkwardly.
- [ ] Images/media use `max-width: 100%` / `object-fit` containment.
- [ ] Flex/grid children that should shrink have `min-width: 0`.
- [ ] Sticky footers’ negative margins track shell horizontal padding tokens.

## New / refactored apps

1. Import or copy breakpoint comments from `labs-breakpoints.css`.
2. Start from [`app-layout.starter.css`](../src/shared/templates/app-layout.starter.css) (already steps gutter at 600px — align new apps to **640** when convenient).
3. Add `e2e/smoke/layout-heuristics-<app>.spec.ts` covering **desktop and mobile** viewports + horizontal scroll on the main shell.
4. Document app-specific panes in `src/<app>/LAYOUT.md` when non-trivial.

## Verification

```bash
npm run verify:layout
```

Gesture example: `e2e/smoke/layout-heuristics-gesture.spec.ts` (includes a narrow viewport + horizontal-scroll check).
