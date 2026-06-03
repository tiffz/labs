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
   - Cursor rules — see [`.cursor/rules/README.md`](../.cursor/rules/README.md) (not a partial list here)
   - Test-based guardrails: `src/shared/importBoundaries.test.ts`, `src/shared/spaGuardrails.test.ts`
2. `DEVELOPMENT.md` (repo-level architectural decisions)
   2a. `docs/adr/*.md` — accepted Architecture Decision Records ([`docs/adr/README.md`](adr/README.md)); durable context and alternatives. If an ADR and `DEVELOPMENT.md` diverge on intent, reconcile in one PR; default to the **newer accepted ADR** for architectural intent until `DEVELOPMENT.md` is updated.
3. `STYLE_GUIDE.md` (TypeScript + UI/A11y conventions for editing code)
4. `docs/USER_COPY_STYLE.md` (default voice and patterns for user-visible copy; app `COPY_STYLE.md` files add domain-only rules)
5. Root `README.md` (onboarding and command quick reference)
6. App-level docs (`src/<app>/README.md`, `src/<app>/AGENTS.md`, `src/<app>/DEVELOPMENT.md`)
7. Root `AGENTS.md` (cross-cutting agent workflow; legacy: `GEMINI.md` redirects here)

### Agent precedence (coding assistants)

When **AI agents** receive conflicting instructions, use [`AGENTS.md`](../AGENTS.md) § Agent precedence (user chat → user rules/skills → nearest AGENTS.md + scoped rules → app README → DEVELOPMENT.md). Human doc precedence above still applies when the user has not given explicit chat overrides.

## Scope by Document Type

- [`docs/DOCUMENTATION_STRATEGY.md`](DOCUMENTATION_STRATEGY.md)
  - Where new documentation belongs, what to avoid (duplication, low-signal history), and how to promote app-local notes to repo-wide guides.
- `README.md`
  - Quick start, repo layout, core commands, top-level links.
  - Keep concise and stable.
- `DEVELOPMENT.md`
  - Architecture decisions, guardrails, policy, and rationale.
  - Must match enforced automation in CI/hooks/config.
- `docs/adr/`
  - Short, numbered ADRs for material cross-cutting decisions (routing/hosting, contracts, boundaries).
  - See [`docs/adr/README.md`](adr/README.md) for when to add one; [ADR 0002](adr/0002-historical-decisions-in-development.md) explains backfill vs `DEVELOPMENT.md`.
- `STYLE_GUIDE.md`
  - TypeScript + UI/A11y conventions for editing code.
- `docs/USER_COPY_STYLE.md`
  - Default Labs voice for user-facing copy; app `src/<app>/COPY_STYLE.md` files add domain-only rules and must not redefine global policy.
- App docs under `src/<app>/`
  - Feature behavior, app-specific architecture, known constraints.
  - Must not redefine global policy.
- `docs/design-explorations/`
  - Non-binding design notes and spikes (see [`docs/design-explorations/README.md`](design-explorations/README.md)). Below ADRs and `DEVELOPMENT.md` in precedence. Example: [`local-first-session-and-bff.md`](design-explorations/local-first-session-and-bff.md) (OAuth / BFF / source-of-truth options).
- AI helper docs
  - Task-oriented guidance for agents: root [`AGENTS.md`](../AGENTS.md), nested `src/<app>/AGENTS.md` where present, [`.cursor/rules/README.md`](../.cursor/rules/README.md), [`.cursor/skills/README.md`](../.cursor/skills/README.md).
  - Should reference canonical docs instead of duplicating policy text (see [`DOCUMENTATION_STRATEGY.md`](DOCUMENTATION_STRATEGY.md) § Agent context map).

## Consistency Rules

- If a workflow/script changes, update related docs in the same PR.
- Avoid duplicating policy across multiple files; prefer linking to one canonical section.
- Keep examples accurate to current versions and commands.
- Remove stale migration notes once migration is complete.

## Audit Targets

During code review and **quarterly maintenance** (or after major agent-workflow changes), verify:

- [`AGENTS.md`](../AGENTS.md), [`.cursor/rules/README.md`](../.cursor/rules/README.md), [`.cursor/skills/README.md`](../.cursor/skills/README.md), and commands in `package.json` stay aligned.
- Each repo skill under [`.cursor/skills/`](../.cursor/skills/README.md): `name` matches directory; `description` includes trigger keywords for its workflow; task routing table in `AGENTS.md` still points at the skill. Run `npm run check:agent-docs` (and optional `npx skills-ref validate .cursor/skills/<name>` per [Agent Skills spec](https://agentskills.io/specification)).
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
