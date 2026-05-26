# Shared app shell layout

Column → workbench → scroll → content + footer pattern for micro-apps with a fixed content width and an optional sticky footer (library, status bar).

## Files

| File                                  | Role                                    |
| ------------------------------------- | --------------------------------------- |
| `AppShellLayout.tsx`                  | Structural React shell (no layout `sx`) |
| `app-shell-layout.css`                | Default `.app-shell-*` classes + tokens |
| `../templates/app-layout.starter.css` | Copy into new apps; set `--app-shell-*` |
| `../templates/app-main.starter.tsx`   | Copy into new apps; import layout CSS   |

## Model

```
.app-shell-root
  .app-shell-column          ← max width + gutter (page padding lives here once)
    [alerts]
    [header]
    .app-shell-workbench      ← width: var(--app-shell-content-width); max-width: 100%
      .app-shell-scroll       ← overflow + scrollbar-gutter: stable
        .app-shell-content    ← grid / editor
      [footer]                ← same obligationally be inside workbench, not column
```

**Rule:** Never set horizontal width or `mx: auto` on inner content alone — the workbench owns the shared width.

## New app checklist

1. Copy `src/shared/templates/app-index.starter.html` → `src/<app>/index.html`
2. Copy `app-main.starter.tsx` → `src/<app>/main.tsx` (adjust paths)
3. Copy `app-layout.starter.css` → `src/<app>/<app>-layout.css`; set tokens
4. Import layout CSS from `main.tsx` or app root CSS
5. Use `<AppShellLayout>` when the app has header + scroll + optional footer
6. Document app-specific grid areas in `src/<app>/LAYOUT.md` if non-trivial

## In-content sticky chrome

When a panel scrolls but toolbars inside it should stick (not the global app header), use [`in-content-sticky.css`](in-content-sticky.css):

- `.in-scroll-region` — flex child with `overflow: auto`
- `.in-scroll-region__band` — non-sticky block above chrome (e.g. stepper rail)
- `.in-scroll-region__sticky-surface` — sticky stack (toolbar + palette)

Encore Originals chords stage imports this from `originals.css`. Override `--in-scroll-sticky-*` tokens on a parent if needed.

## Stanza reference

Stanza uses `StanzaViewerLayout` (maps Stanza class names) + `stanza-viewer-layout.css`. See [`src/stanza/LAYOUT.md`](../../stanza/LAYOUT.md).
