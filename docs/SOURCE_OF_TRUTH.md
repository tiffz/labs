# Documentation Source of Truth

Use this file as the canonical map for where engineering guidance lives.

## Precedence

When guidance conflicts, resolve in this order:

1. Enforced configuration and code
   - `package.json` scripts
   - `.github/workflows/*.yml`
   - `.husky/*`
   - `vite.config.ts`, `playwright.config.ts`, `tsconfig.json`
   - Test-based guardrails such as `src/shared/importBoundaries.test.ts`
2. `DEVELOPMENT.md` (repo-level architectural decisions)
3. Root `README.md` (onboarding and command quick reference)
4. App-level docs (`src/<app>/README.md`, `src/<app>/DEVELOPMENT.md`)
5. AI-assistant helper docs (for example `GEMINI.md`)

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
