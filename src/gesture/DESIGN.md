# The Gesture Room — Linen design system

Canonical visual language for The Gesture Room. **Read this before adding or changing UI** in `src/gesture/`.

Tokens live in [`design/linenTheme.ts`](design/linenTheme.ts). Layout and component rules live in [`gesture.css`](gesture.css). MUI palette mirrors tokens via `getAppTheme('gesture')` in [`appTheme.ts`](../shared/ui/theme/appTheme.ts).

## Mood

**Nordic calm, studio-grade** — airy linen canvas with whisper-light sage washes. Feels like a quiet atelier: restrained, editorial, expensive through spacing and typography — not through drop shadows or loud color.

## Polished Linen (current tier)

Elevated defaults within the same family:

- **Canvas wash** — dual radial gradients on `--gesture-app-bg` (sage + warm linen); fixed attachment. No headline gradients.
- **Display type** — **Fraunces** for wordmark + section display; Cormorant for debrief stats / empty titles; Inter for UI.
- **Wordmark** — `GestureWordmark`: Fraunces text-only **“The Gesture Room”** (no logomark; “The” slightly lighter). Favicon: monoline italic **g** (O2 upward hook, open tail) in [`design/gestureLogomarkPath.ts`](design/gestureLogomarkPath.ts).
- **Tabs** — segmented pill control on frosted paper, not underline tabs.
- **Surfaces** — paper cards with hairline borders + optional `backdrop-filter`; still **no drop shadows** on chrome.
- **Motion** — transform/opacity only (`--gesture-ease-out`); preview zoom on hover; card stagger on grid load. Respect `prefers-reduced-motion`.
- **Depth substitute** — inset hairlines, `color-mix` washes, subtle `translateY` hover — never zine offsets or heavy box-shadow on UI chrome (zen image theater excepted).

## Palette

| Role         | Token / value                     | Use                                |
| ------------ | --------------------------------- | ---------------------------------- |
| Canvas       | `#e8e4dc` `--gesture-bg`          | Page background                    |
| Surface      | `#f7f5f1` `--gesture-card-bg`     | Cards, menus, inputs               |
| Ink          | `#2f332c` `--gesture-ink`         | Headings, primary text             |
| Muted        | `#6f6c65` `--gesture-text-muted`  | Secondary copy, meta               |
| Accent       | `#5f8566` `--gesture-accent`      | Buttons, links, progress, selected |
| Accent hover | `#4d7154`                         | Button hover                       |
| Soft sage    | `#d8e0d9` `--gesture-accent-soft` | Selection wash, drop zone          |
| Warm neutral | `#e5dfd6` `--gesture-accent-warm` | Error banners, subtle fills        |

**Do not** introduce berry, plum, gold, neon, or high-contrast black rules. Stay in this family.

## Typography

- **UI:** Inter (via app shell).
- **Display:** Fraunces — wordmark (`GestureWordmark`); Cormorant for debrief h1, empty stat titles, debrief stat numbers only.
- **Wordmark:** text-only Fraunces — `gesture-wordmark-*` in CSS. Favicon path in [`design/gestureLogomarkPath.ts`](design/gestureLogomarkPath.ts).
- **Section labels:** 0.68rem, uppercase, wide letter-spacing (`gesture-practice-label`).
- **Body:** 0.92–0.98rem, relaxed line-height (~1.5–1.6).

## Shape and depth

- **Border radius:** `0.625rem` (`--gesture-card-radius`, `--gesture-button-radius`).
- **Borders:** Hairline only when needed (`--gesture-border`). Collection cards are **borderless**.
- **Shadows:** **None.** Never add `box-shadow` or zine offset shadows.
- **Max content width:** `44rem` (`--gesture-shell-max`).

## Components

### Buttons

- Primary: solid sage (`--gesture-accent`), no shadow, radius `0.5rem`.
- Outlined: hairline border, transparent/paper background.
- Use shared MUI `Button`; style via `.gesture-app .MuiButton-*` in CSS, not one-off hex in TSX.

### Collection cards

- Borderless, transparent background; **preview strip** carries the visual weight.
- Preview: 3:2 aspect, 6px gap, rounded strip (`overflow: hidden` on strip).
- Selected state (Practice tab): inset sage wash — `color-mix` on `--gesture-accent-soft`, not a heavy ring.

### Drop zone

- No dashed border; soft sage wash background.
- Copy stays short; one line title + optional helper.

### Tabs

- Segmented **pill** bar: frosted paper track, selected tab on `--gesture-card-bg`.
- No underline indicator (hidden).
- Tab labels: weight 500, sentence case.

### Account menu

- Class: `gesture-account-menu` on menu paper.
- Same as surfaces: paper bg, **1px** `--gesture-border-strong`, **no shadow**, radius `0.5rem`.
- Account icon button: `#gesture-account-menu-button` — minimal border, no offset shadow.
- Labs app links: sage for inactive; **bold ink** for current app.
- Backup button: contained sage (MUI primary).

### Zen mode

- Background `--gesture-zen-bg` (`#3d4039`).
- Timer accent: `--gesture-accent-soft` (sage), not lavender or neon.

## CSS conventions

1. **Use CSS variables** from `linenTheme.ts` / `:root` fallbacks in `gesture.css`. No hardcoded colors in new component CSS unless documented here.
2. **Scope under `.gesture-app`** so shared Labs components (account menu) pick up overrides.
3. **Prefer `gesture.css`** over inline `sx` for app-wide patterns; use `sx` only for layout one-offs.
4. **MUI theme:** `primary` = sage, `background.paper` = linen surface — keeps shared widgets aligned.

## Adding new UI

Checklist for agents:

- [ ] Read this file + [`COPY_STYLE.md`](COPY_STYLE.md)
- [ ] Colors from `--gesture-*` tokens only
- [ ] No box-shadow; no 2px+ black borders; no gradient titles
- [ ] Sans-serif; title weight ≤ 600 (prefer 500)
- [ ] Spacing: generous vertical rhythm (match `gesture-shell` / `gesture-tab-panel`)
- [ ] Shared controls from `/ui/` catalog when available ([`SHARED_UI_CONVENTIONS.md`](../shared/SHARED_UI_CONVENTIONS.md))
- [ ] Account or Drive chrome: reuse `GestureAccountMenu` / `LabsDriveAccountMenu` with Linen appearance — do not fork

## Exploring alternatives (dev only)

Use skill [`labs-ui-design-variations`](../../.cursor/skills/labs-ui-design-variations/SKILL.md) to prototype themes in-app. **When a direction is chosen**, fold tokens into `linenTheme.ts` + this doc, remove the preview picker, and delete unused theme files.
