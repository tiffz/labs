# Documentation Source of Truth

Use this file as the canonical map for where engineering guidance lives.

## Precedence

When guidance conflicts, resolve in this order:

1. Enforced configuration and code
   - `package.json` scripts
   - `.github/workflows/*.yml`
   - `.husky/*`
   - `vite.config.ts`, `playwright.config.ts`, `tsconfig.json`
   - `eslint.config.js` (includes enforced `jsx-a11y` rules)
   - Cursor rules in `.cursor/rules/*.mdc` (app-entry-html, spa-css-conventions, react-a11y, pre-commit-checks)
   - Test-based guardrails: `src/shared/importBoundaries.test.ts`, `src/shared/spaGuardrails.test.ts`
2. `DEVELOPMENT.md` (repo-level architectural decisions)
3. `STYLE_GUIDE.md` (TypeScript + UI/A11y conventions for editing code)
4. Root `README.md` (onboarding and command quick reference)
5. App-level docs (`src/<app>/README.md`, `src/<app>/DEVELOPMENT.md`)
6. AI-assistant helper docs — canonical: `AGENTS.md` (legacy: `GEMINI.md`, which defers to `AGENTS.md`)

## Scope by Document Type

- `README.md`
  - Quick start, repo layout, core commands, top-level links.
  - Keep concise and stable.
- `DEVELOPMENT.md`
  - Architecture decisions, guardrails, policy, and rationale.
  - Must match enforced automation in CI/hooks/config.
- App docs under `src/<app>/`
  - Feature behavior, app-specific architecture, known constraints.
  - Must not redefine global policy.
- AI helper docs
  - Task-oriented guidance for agents.
  - Should reference canonical docs instead of duplicating policy text.

## Consistency Rules

- If a workflow/script changes, update related docs in the same PR.
- Avoid duplicating policy across multiple files; prefer linking to one canonical section.
- Keep examples accurate to current versions and commands.
- Remove stale migration notes once migration is complete.

## Audit Targets

During code review and periodic maintenance, verify:

- CI behavior described in docs matches `.github/workflows/*`.
- Hook behavior described in docs matches `.husky/*`.
- Shared boundary documentation matches `src/shared/importBoundaries.test.ts`.
- App-level docs still match actual entrypoints and dependencies.
- Micro-app font and responsive UI policy in `DEVELOPMENT.md` (Micro-app UI stability) still matches `src/shared/ui/fonts/appFonts.ts` and `e2e/visual/` practices.
- SPA shell policy in `DEVELOPMENT.md` ("SPA Shell Hardening", "Accessibility Baseline", "Cross-Platform Viewport", "Bundle Splitting") matches:
  - `src/shared/spaGuardrails.test.ts` (asserts every `src/*/index.html` and `App.tsx` follows the policy)
  - `src/shared/templates/app-index.starter.html` (canonical HTML starter)
  - `.cursor/rules/app-entry-html.mdc`, `.cursor/rules/spa-css-conventions.mdc`, `.cursor/rules/react-a11y.mdc`
  - `eslint.config.js` enforced `jsx-a11y` rule set
  - `vite.config.ts` `manualChunks` map and `transformIndexHtml` install-block script
