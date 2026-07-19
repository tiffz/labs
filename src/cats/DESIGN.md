# Cat Clicker — design contract

Cats diverges from the standard app shell: it is a **fullscreen 2D game viewport** (intentional body scroll lock) with Material 3–flavored game chrome layered on top.

## Rules

- **Surface language:** M3 tones — `#fef7ff` surface, Roboto, rounded cards — defined in [`styles/cats.css`](styles/cats.css); MUI chrome aligns via `getAppTheme('cats')`.
- **Game world vs chrome:** the side-view world (rooms, furniture, cat sprite) is canvas/absolute-positioned art; HUD panels (love, treats, jobs, achievements) are DOM and must stay keyboard/screen-reader reachable.
- **Viewport:** the game owns the viewport (`data-labs-scroll-lock-ok`); panels scroll internally — never reintroduce page scroll.
- **Cursor:** wand-toy mode overrides the cursor globally; keep the override scoped to `body.wand-mode-active`.
- **Copy:** playful but per [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md) caps; game terms (love, treats, merits) are canon — see [`README.md`](README.md).

Gameplay systems and engine notes: [`DEVELOPMENT.md`](DEVELOPMENT.md) · [`AGENTS.md`](AGENTS.md).
