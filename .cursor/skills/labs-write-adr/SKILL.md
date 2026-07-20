---
name: labs-write-adr
description: Adds or updates Labs Architecture Decision Records for material cross-cutting decisions. Use when changing client routing, static hosting, OAuth, storage, sync contracts, micro-app boundaries, import layers, or when the user asks for an ADR.
---

<!-- AUTO-GENERATED from .agents/skills/labs-write-adr/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs write ADR

## When to add an ADR

Add when a change is **hard to reverse**, **crosses apps or hosting**, or **will confuse future readers** without rationale.

**Examples:** hash vs path routing, OAuth/storage/sync contracts, new micro-app boundaries, security-relevant defaults.

**Skip** for routine features, one-off UI, or internal refactors unless they establish a pattern others must follow.

Matching paths auto-load [`.agents/rules/architecture-decisions.mdc`](../../rules/architecture-decisions.mdc).

## Format

- File: `docs/adr/NNNN-short-kebab-title.md` (four-digit sequence; next free number)
- Sections: **Status**, **Context**, **Decision**, **Consequences** (+ optional **Alternatives**, **Links**)
- Status **Accepted** once merged

Read [references/adr-readme.md](references/adr-readme.md) for full guidance and index.

## Same PR

- Behavioral change + ADR in **one PR** when practical
- Update [`DEVELOPMENT.md`](../../../DEVELOPMENT.md) if repo-wide policy should point at the ADR
- Reconcile if ADR and `DEVELOPMENT.md` diverge — newer accepted ADR wins for architectural intent until `DEVELOPMENT.md` is updated

## Ask first

- New ADR or material architecture change when user has not requested it

## Verify

```bash
npm run presubmit
```
