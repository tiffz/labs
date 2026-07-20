<!-- AUTO-GENERATED from .cursor/rules/session-retrospective-mandatory.mdc — do not edit directly. Edit the source and run `npm run generate:claude-guidance`. -->

> End-of-session retrospective — required deliverable for substantial sessions

# Session retrospective (required)

Substantial session = **any** of: ≥2 bugs fixed, multi-subsystem touch, >30 min friction, or user asks for process/UX feedback.

Before closing a substantial session, **run skill [`labs-session-retrospective`](../skills/labs-session-retrospective/SKILL.md)** and **deliver** the retrospective block (do not only "offer").

Deliverable sections (max ~12 bullets total):

1. Human intervention / extra iterations
2. Token waste (re-discovery)
3. Obvious-bad UX narrowly avoided or shipped
4. Tech debt introduced or paid down
5. Hard-to-change / easy-to-break
6. Durable fixes (test → rule → doc) — or **None**
7. Deferred items → [`docs/PROCESS_BACKLOG.md`](../../docs/PROCESS_BACKLOG.md)

If codifying: user explicitly asked **or** same root cause class twice → implement + presubmit.

Canonical: [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](../../docs/CONTINUOUS_PROCESS_IMPROVEMENT.md)
