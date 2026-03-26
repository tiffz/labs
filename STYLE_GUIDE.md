# TypeScript Style Guide

This repo follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) with repo-specific defaults below.

## Project Defaults

- Prefer named exports for new modules.
- Use `import type` for type-only imports.
- Prefer relative imports inside a feature/app.
- Keep files simple: imports first, then implementation.
- Add JSDoc only when it clarifies behavior, trade-offs, or constraints.

## Migration Policy

- Do not mass-convert untouched files.
- When refactoring a file, prefer converting default exports to named exports.
- Keep import style consistent inside the edited module group.

## UI and Accessibility Rules

- Reuse shared primitives from `src/shared/components` before creating app-local variants.
- Use MUI primitives for complex interaction surfaces (`Dialog`, `Menu`, `Popover`, `Autocomplete`, `Select`).
- Preserve app-specific identity through theme tokens, not custom focus/interaction mechanics.
- Keyboard access, visible focus states, and semantic labeling are required in touched UI code.

## References

- `DEVELOPMENT.md`
- `GEMINI.md`
- `src/shared/SHARED_UI_CONVENTIONS.md`
