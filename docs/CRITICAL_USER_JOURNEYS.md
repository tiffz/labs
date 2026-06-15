# Critical user journeys (CUJs)

**CUJs** are the canonical, step-by-step descriptions of the workflows that must stay correct **and** fast. They connect UX design, manual verification, e2e smokes, and performance benchmarks.

## Why CUJs exist

| Without CUJs                         | With CUJs                                       |
| ------------------------------------ | ----------------------------------------------- |
| Agents optimize FCP while radios lag | Budgets attach to **steps users actually take** |
| UX journey sketch is session-only    | Durable doc for the next agent                  |
| Smokes test “page loads”             | Smokes test **configure → act → see result**    |
| Performance fixes are one-offs       | Regressions map to a named journey step         |

## Relationship to other docs

```text
labs-ux-journey (sketch in chat, new UI)
        ↓ promotes when journey stabilizes
src/<app>/CUJs.md (durable steps + budgets)
        ↓ verifies
e2e/smoke/* + interaction smokes + manual checklist
        ↓ when slow
labs-performance (profile, isolate, benchmark)
```

- **Journey sketch** (`labs-ux-journey`) — exploratory; posted in chat before coding.
- **CUJ doc** — stable; updated when the flow ships or changes materially.
- **Performance skill** — uses CUJ steps as the profiling script.

## Where to put CUJs

| Scope                 | Location                             |
| --------------------- | ------------------------------------ |
| Index + template      | This file                            |
| App-specific journeys | `src/<app>/CUJs.md`                  |
| Link from discovery   | App `README.md` + `AGENTS.md` § CUJs |

When a second app copies the same journey shape, promote shared patterns to this file or `docs/PERFORMANCE.md` — do not duplicate prose in five READMEs.

## CUJ template (copy into `src/<app>/CUJs.md`)

```markdown
# Critical user journeys — [App display name]

Link: [`README.md`](README.md) · [`AGENTS.md`](AGENTS.md)

## CUJ-NNN: [Short name]

**Primary goal:** [one verb phrase]  
**Persona:** [who, context]

### Steps

1. [User action → expected UI state]
2. …

### Success criteria

- [Observable outcome]

### Performance budgets

Measured on dev (`npm run dev`), hard refresh, typical seed data unless noted.

| Step                       | Metric                         | Budget (p95) | Verification  |
| -------------------------- | ------------------------------ | ------------ | ------------- |
| e.g. Toggle session option | click → control reflects state | ≤ 300 ms     | `e2e/smoke/…` |

### Known traps

- [e.g. shuffle on every render, parent state + heavy grid]

### Automation

| Type         | Artifact                    |
| ------------ | --------------------------- |
| Smoke        | `e2e/smoke/…`               |
| Unit / audit | `src/…/….test.ts`           |
| Manual       | [optional 1-line checklist] |
```

## Apps with CUJ docs

| App     | Doc                                             | Notes                                               |
| ------- | ----------------------------------------------- | --------------------------------------------------- |
| Gesture | [`src/gesture/CUJs.md`](../src/gesture/CUJs.md) | Practice configure, collections, zen entry          |
| Encore  | [`src/encore/CUJs.md`](../src/encore/CUJs.md)   | Library, practice tab, originals, performance video |
| Sight   | [`src/sight/CUJs.md`](../src/sight/CUJs.md)     | Daily practice, debug dock, sandbox                 |

Add a row when you create `src/<app>/CUJs.md`.

## Maintenance

- **New major flow** — add CUJ after UX sketch lands; at least steps + success criteria.
- **Perf fix** — add budget row + smoke when user-visible latency was the bug.
- **Flow removed** — delete or mark CUJ deprecated; remove orphaned smokes in same PR.
