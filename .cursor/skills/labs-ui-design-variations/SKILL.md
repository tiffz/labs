---
name: labs-ui-design-variations
description: Builds multiple in-app UI design themes with a live preview selector for Labs micro-apps. Use when exploring visual direction, comparing palettes, or the user asks for design iterations to preview inline before picking a winner.
---

# Labs UI design variations

Use this workflow when the user wants to **compare visual directions in the running app** (not static mocks). Goal: 4–6 distinct, production-quality themes switchable without reload.

## When to activate

- User asks to explore design options, palettes, or “make it look more expensive / cohesive”
- User wants a selector to preview themes inline
- You are iterating on branding for a single micro-app (`src/<app>/`)

## Architecture (repeat per app)

1. **Token registry** — `src/<app>/design/<app>DesignThemes.ts`
   - Export `DesignThemeId`, `DesignTheme` (label, tagline, MUI palette fields, `cssVars` record)
   - 4–6 themes that differ in **mood**, not just hue shifts (e.g. brasserie vs gallery vs noir)
   - `loadStored*Theme()` / `store*Theme()` via `localStorage`
   - `apply*Theme(el, theme)` sets `data-<app>-theme` + CSS custom properties on the app root

2. **CSS uses variables only** — `src/<app>/<app>.css`
   - Layout, typography scale, component structure in CSS
   - Colors, radii, shadows via `--<app>-*` variables (no hardcoded hex in component rules)
   - Optional per-theme tweaks: `[data-<app>-theme="gallery"] .title { … }`

3. **React provider** — `src/<app>/context/<App>DesignThemeContext.tsx`
   - State + `ThemeProvider` from MUI synced to active theme’s `muiPrimary`, backgrounds, mode (light/dark)
   - Move `CssBaseline` here; remove duplicate `ThemeProvider` from `main.tsx`

4. **Preview picker** — `src/<app>/components/<App>DesignThemePicker.tsx`
   - Fixed bar or header control: `<Select>` or chips with theme label + tagline
   - Show on home/shell only during exploration; gate with `import.meta.env.DEV` or `?designPreview` when shipping

5. **Apply on root** — `App.tsx` ref on `.<app>-app` + `useEffect` calling `apply*Theme`

## Theme design rules

- **Distinct axes:** warmth, contrast, radius (sharp vs soft), serif vs sans title, light vs dark
- **Cohesion:** each theme sets _all_ tokens (background wash, card, border, accent, zen room, preview placeholders)
- **Reference palettes:** cite source (e.g. Coolors URL) in theme tagline or README
- **Avoid:** rainbow gradients, zine offset shadows, mixed unrelated accents — reads amateur
- **Target:** one primary accent, neutral surfaces, restrained motion

## Default starter set (adapt names to app)

| Id          | Mood                             |
| ----------- | -------------------------------- |
| `atelier`   | Soft color washes, art-studio    |
| `brasserie` | Warm cream + brass — fine dining |
| `gallery`   | White walls, one bold accent     |
| `salon`     | Plum + champagne — evening arts  |
| `linen`     | Neutral Scandinavian             |
| `noir`      | Dark studio variant              |

## Checklist before finishing

- [ ] All themes switch instantly (CSS vars + MUI palette)
- [ ] Picker persists choice in `localStorage`
- [ ] Zen/fullscreen phases inherit zen tokens
- [ ] Document in app `README.md` § Design + note picker is preview/dev
- [ ] After user picks winner: **`DESIGN.md`** + scoped Cursor rule, remove picker, delete unused themes

## Gesture Room reference (Linen — locked in)

- Design doc: [`src/gesture/DESIGN.md`](../../src/gesture/DESIGN.md)
- Tokens: [`src/gesture/design/linenTheme.ts`](../../src/gesture/design/linenTheme.ts)
- CSS: [`src/gesture/gesture.css`](../../src/gesture/gesture.css)
- Cursor rule: [`.cursor/rules/gesture-linen-design.mdc`](../../.cursor/rules/gesture-linen-design.mdc)

## Folder drag-and-drop (collections upload)

Browser folder drops require **`dataTransfer.items` + `webkitGetAsEntry()`** — `dataTransfer.files` alone is empty for folders.

- Shared helper: [`src/shared/utils/readDataTransferEntryFiles.ts`](../../src/shared/utils/readDataTransferEntryFiles.ts)
- Use `suggestedFolderName` when a single directory is dropped; pass to upload as collection name
- Surface: dedicated drop zone on Collections tab, not only file input

## After user selects a theme

1. Ask which theme id to keep (or merge traits)
2. **Write `src/<app>/DESIGN.md`** — palette, typography, spacing, component rules, do/don't for future agents
3. Add **`.cursor/rules/<app>-<name>-design.mdc`** (globs: `src/<app>/**`) linking to `DESIGN.md`
4. Fold tokens into `design/<name>Theme.ts` + CSS fallbacks; update `getAppTheme('<app>')` in `appTheme.ts`
5. Merge winning theme CSS into main stylesheet; **remove picker** and delete multi-theme registry/provider files
6. Update app `AGENTS.md` + `README.md` § Design

## References

- [`STYLE_GUIDE.md`](../../../STYLE_GUIDE.md) — UI/a11y
- [`docs/USER_COPY_STYLE.md`](../../../docs/USER_COPY_STYLE.md) — copy stays stable across themes
- [`src/shared/SHARED_UI_CONVENTIONS.md`](../../shared/SHARED_UI_CONVENTIONS.md) — shared controls
