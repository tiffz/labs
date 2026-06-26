# ADR 0017: SPA in-app navigation with native link semantics

## Status

Accepted

## Context

Labs micro-apps are static SPAs on GitHub Pages ([ADR 0001](./0001-static-hosting-hash-routing.md)). Users expect **browser-native link behavior**:

- Plain click navigates in-app without a full reload.
- **Ctrl/Cmd+click**, **Shift+click**, and **middle-click** open the destination in a new tab/window.
- Right-click → “Copy link address” yields a **shareable URL**.
- Keyboard users get standard link affordances (focus ring, Enter to activate).

Historically many screens used `<button onClick={() => navigate(...)}>` or div/row click handlers. That breaks modifier keys, hides URLs from assistive tech and the context menu, and makes e2e tests depend on non-semantic selectors. A repo-wide rollout (Encore, Stanza, Zine Box, Gesture, Muscle, UI catalog) introduced shared helpers in [`src/shared/navigation/spaLinkClick.ts`](../../src/shared/navigation/spaLinkClick.ts).

**Requirements we must satisfy together:**

| Requirement          | Why it matters                                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shareable deep links | Hash routes (Encore) and query state (Drums, Chords, Muscle module) must round-trip through refresh and paste                                                                           |
| Static hosting       | No server rewrites; href must match what a cold load needs ([ADR 0001](./0001-static-hosting-hash-routing.md))                                                                          |
| SPA performance      | Plain in-app navigation must not reload the bundle                                                                                                                                      |
| Native modifiers     | Power users open library rows, song tabs, rhythm variations in background tabs                                                                                                          |
| Accessibility        | [WCAG 2.2 — Link Purpose (In Context)](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html): navigation targets should be links; actions without URLs stay buttons |
| Test stability       | Role-based selectors (`getByRole('link')`) track user-visible semantics; stale `button` selectors caused CI regressions after Stanza card migration                                     |

## Decision

### 1. Real `href` for every in-app destination that has a URL

- Set **`href`** to the full shareable location: hash fragment (`#/song/…`), query string (`?rhythm=…`), or path (only where hosting guarantees SPA fallback).
- **Do not** use `href="#"` or `javascript:` placeholders.
- Provide a **central href builder** per app (or shared module) so UI, copy-link, and tests serialize state the same way as the URL-sync hook.

Known builders (extend as apps adopt the pattern):

| App      | Builder                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Encore   | [`encoreAppHref`](../../src/encore/routes/encoreAppHash.ts)                                                              |
| Stanza   | [`stanzaSongHref`](../../src/stanza/utils/stanzaDriveUrlParams.ts)                                                       |
| Zine Box | [`zineboxReadHref`](../../src/zinebox/routes/zineboxHash.ts)                                                             |
| Muscle   | [`muscleModuleHref`](../../src/muscle/routes/muscleAppUrl.ts)                                                            |
| Drums    | [`drumsRhythmHref`](../../src/drums/routes/drumsAppUrl.ts) / [`buildDrumsAppUrl`](../../src/drums/routes/drumsAppUrl.ts) |

URL parse/serialize contract: [`docs/URL_STATE_PATTERN.md`](../URL_STATE_PATTERN.md).

### 2. Shared click helpers — one behavior everywhere

Module: [`src/shared/navigation/spaLinkClick.ts`](../../src/shared/navigation/spaLinkClick.ts).

| Helper                                      | Attach to                                                   | Plain primary click                 | Modifier / middle click                                                    |
| ------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `handleSpaLinkClick(e, onNavigate)`         | `<a href>` (or MUI `component="a"`)                         | `preventDefault()` + `onNavigate()` | **No** `preventDefault()` — browser follows `href` (new tab/window per UA) |
| `handleSpaRowActivate(e, href, onNavigate)` | Table/card **row** `onClick` when row is not a single `<a>` | `onNavigate()`                      | `openAppLinkInBackgroundTab(href)`                                         |
| `openAppLinkInBackgroundTab(href)`          | Programmatic only                                           | —                                   | `window.open` with `noopener,noreferrer`                                   |
| `isModifiedOrNonPrimaryClick(e)`            | Custom handlers                                             | —                                   | `metaKey \|\| ctrlKey \|\| shiftKey \|\| altKey \|\| button !== 0`         |

**Invariant:** never call `preventDefault()` before checking modifiers — that blocks Shift/Ctrl/Meta+click.

**Pattern (inline link):**

```tsx
<a
  href={encoreAppHref({ kind: 'song', id })}
  onClick={(e) => handleSpaLinkClick(e, () => navigateToSong(id))}
>
  {title}
</a>
```

**Pattern (whole row):**

```tsx
<tr
  onClick={(e) => handleSpaRowActivate(e, href, () => navigateToSong(id))}
>
```

Prefer a single wrapping `<a>` when the whole row is one destination; use row activation when layout or nested controls forbid one link.

### 3. When `<button>` remains correct

Use a **button** (or disabled control) when there is **no shareable URL** or the control is an **action**, not navigation:

- Submit, play/stop, expand/collapse, toggle metronome, open a dialog.
- **Current selection** in a list where the selected item is not a link to “itself” (e.g. active rhythm variation — disabled button with `aria-current="true"`).
- Destinations that **lack URL state today** (document as backlog; do not fake `href="#"`).

### 4. Two routing shapes — same link rules

| Shape                    | Examples                          | `href` form                                                                                                   |
| ------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Hash client routes**   | Encore, Stanza, Zine Box, Gesture | `#/…` optionally with in-fragment `?scroll=` ([ADR 0001](./0001-static-hosting-hash-routing.md))              |
| **Query-only app state** | Drums, Chords, Muscle module tab  | `pathname?rhythm=…` / `?module=…` — omit default params per [`URL_STATE_PATTERN.md`](../URL_STATE_PATTERN.md) |

Both shapes use the **same** `handleSpaLinkClick` / `handleSpaRowActivate` helpers; only href builders differ.

### 5. External links

Keep `target="_blank"` and `rel="noopener noreferrer"`. Do not route external URLs through SPA helpers.

### 6. Documentation, conventions, and guardrails

- UI policy: [`SHARED_UI_CONVENTIONS.md` § In-app navigation links](../../src/shared/SHARED_UI_CONVENTIONS.md).
- Unit tests: [`spaLinkClick.test.ts`](../../src/shared/navigation/spaLinkClick.test.ts), per-app href tests (e.g. [`drumsAppUrl.test.ts`](../../src/drums/routes/drumsAppUrl.test.ts)).
- E2e: update selectors when changing roles; [`e2eSelectorGuardrails.test.ts`](../../src/shared/test/e2eSelectorGuardrails.test.ts) bans known stale patterns (e.g. `button.stanza-library-card`).

## Consequences

- **Positive:** Matches user-agent defaults and WCAG navigation semantics; shareable URLs work from context menu and modifier keys; consistent implementation across hash and query apps; fewer “works in dev, breaks on refresh” bugs.
- **Positive:** Plain click stays in SPA — no full reload; history/back behavior unchanged when paired with existing `urlHistory` debouncing.
- **Negative:** Slightly more boilerplate (`href` builder + `onClick` handler) than a one-line `button`.
- **Negative:** Row-as-link layouts need CSS (`text-decoration`, `color: inherit`) so anchors look like prior buttons; whole-row links vs row `onClick` must be chosen deliberately for nested controls.
- **Operational:** Any new navigable UI must add or reuse an href builder and migrate e2e to role-based selectors in the same change.

## Alternatives considered

| Alternative                                                | Verdict                                                                                                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React Router `<Link>` only**                             | Does not automatically unify hash vs query builders or row-click patterns; still need custom modifier handling for non-anchor rows. Rejected as the single abstraction. |
| **Always full page load (`<a>` without `preventDefault`)** | Correct for modifiers but reloads the app on every plain click — bad for large bundles and in-memory state. Rejected.                                                   |
| **`<button>` + manual `window.open` on Shift+click**       | Duplicates UA behavior, easy to miss Meta/Ctrl/middle-click, poor copy-link and screen-reader semantics. Rejected — this was the pre-rollout anti-pattern.              |
| **`href="#"` + `onClick` only**                            | Broken share URLs and accessibility; fails “Copy link address”. Rejected.                                                                                               |
| **Path-only URLs everywhere**                              | Requires SPA fallback on the host ([ADR 0001](./0001-static-hosting-hash-routing.md)); not available on default GitHub Pages. Deferred per app until hosting changes.   |
| **Central `<LabsLink>` component**                         | Reasonable future consolidation; today explicit `<a>` + helpers keeps tree-shaking and MUI `component="a"` interop simple. Not required for acceptance.                 |

## Links

- [ADR 0001 — Static hosting and hash routing](./0001-static-hosting-hash-routing.md)
- [`docs/URL_STATE_PATTERN.md`](../URL_STATE_PATTERN.md)
- [`src/shared/navigation/spaLinkClick.ts`](../../src/shared/navigation/spaLinkClick.ts)
- [`src/shared/SHARED_UI_CONVENTIONS.md` § In-app navigation links](../../src/shared/SHARED_UI_CONVENTIONS.md)
- [`docs/CI_RELIABILITY.md`](../CI_RELIABILITY.md) — e2e selector migrations after link rollout
