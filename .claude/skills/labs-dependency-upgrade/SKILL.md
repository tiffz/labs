---
name: labs-dependency-upgrade
description: Executes phased dependency upgrades for Labs per DEPENDENCY_UPGRADE_PLAN with required test matrix. Use when upgrading Vite, Vitest, TypeScript, Tailwind, Knip, or other toolchain majors.
---

<!-- AUTO-GENERATED from .agents/skills/labs-dependency-upgrade/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs dependency upgrade

Read [references/dependency-upgrade-plan.md](references/dependency-upgrade-plan.md).

## Workflow

1. Identify phase (patch/minor vs toolchain major vs large migration)
2. Upgrade **one phase per branch** when majors interact (Vite + Vitest + plugin-react together)
3. Run full validation:
   - `npm run presubmit`
   - `npm test` (not just test:fast when touching test runner or beat)
   - `npm run test:e2e:smoke` when touching Playwright/vite
4. Update `docs/DEPENDENCY_UPGRADE_PLAN.md` checkboxes when a phase completes

## Never

- `--no-verify` or disable CI to land upgrades
- Mix unrelated refactors in upgrade PRs
