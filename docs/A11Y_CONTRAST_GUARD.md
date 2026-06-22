# Accessibility contrast guardrails

Labs catches **obvious unreadable text** with automated checks, not a full design-system linter.

## Layers

| Layer                      | What it catches                                                        | Where                                                             |
| -------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Token unit tests**       | Design token pairs drift below WCAG AA                                 | `src/shared/test/contrastAuditCore.test.ts` (+ app-specific rows) |
| **Single-sample e2e**      | One known muted selector on a route                                    | `e2e/helpers/layoutHeuristics.ts` → Gesture, Encore smokes        |
| **DOM text audit e2e**     | Any visible text node under a root with computed fg/bg below threshold | `e2e/helpers/contrastAudit.ts` → `runContrastAuditInBrowser`      |
| **Component a11y (JSDOM)** | Roles, labels, axe rules where mounted                                 | `src/shared/test/a11y.ts` + `jest-axe` in Vitest                  |

## When to add a contrast smoke

Add `layout-heuristics-<app>.spec.ts` when an app has:

- Dark shell + light-on-light (or light shell + dark-on-dark) token mistakes
- Feedback readouts, metrics, or guidance outside the main panel
- User reports unreadable muted copy

Pattern:

```typescript
import { runContrastAuditInBrowser } from '../helpers/contrastAudit';

const result = await page.evaluate(runContrastAuditInBrowser, {
  rootSelector: '.my-app-main',
});
expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
```

Drive the UI into the **worst states** (error reveal, empty state, footer hints) before auditing.

## Limits (not a full contrast linter)

- Resolves **solid** computed `color` / ancestor `background-color` only (no gradients, images, or text over swatches).
- Does not evaluate **decorative** nodes (`aria-hidden="true"`), including Material icon ligatures.
- Cannot replace manual review for charts, color patches, or decorative overlays.

For deeper audits, use browser DevTools Accessibility tree or `@axe-core/playwright` on critical routes (optional; not in default presubmit today).

## CSS conventions

1. **Semantic text tokens** per theme (`--sight-text`, `--sight-text-muted`, `--sight-text-on-panel`).
2. Default to **shell text tokens**; scope dark-on-light overrides under surface classes (e.g. `.sight-neutral-panel`).
3. Add token pairs to Vitest when introducing a new app theme.

## Related

- [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md) § Layout heuristics
- [`STYLE_GUIDE.md`](../STYLE_GUIDE.md) § UI and Accessibility
- Root cause label: `ux-spec-violation` in [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md)
