# QA charter template + starter set

A **charter** is a one-line testing mission. Time-box each to one focused pass, run
it against the running app, and record what you found and what you could not reach.

## Charter format

```
Charter: Explore <area/feature> with <tools/data/conditions> to discover <what kind of bug/quality info>.
Setup:   dev URL + ?e2eSeed + fixtures/conditions used
Ran:     the tours/heuristics applied (Saboteur, Boundary, CRUD, a11y, …)
Found:   findings as [SEVERITY] with repro steps (feeds the gate)
Missed:  what this charter could not cover (hand off or note as risk)
```

## Starter charters for a Labs feature

Adapt to the feature; not all apply. Prefer running the high-severity ones first.

1. **Sync Saboteur** — _Explore the feature's Drive sync with network drops, mid-save reloads, and a second tab editing the same row, to discover data loss or silent resurrection._ Canonical check: delete on A → pull on B (still has row) → stays deleted. Empty device must not clobber rich cloud; both-edited → `needsReview`.
2. **Interruption / resume** — _Explore the primary flow with reload, tab close/restore, offline, and kill-and-relaunch mid-action, to discover lost work or a broken resume._
3. **Boundary + CRUD** — _Explore each data entity with 0/empty/1/N/N+1, huge input, Unicode/emoji, whitespace, and full create-read-update-delete-list, to discover off-by-one, validation gaps, and orphaned state._
4. **Antisocial / Couch Potato** — _Explore inputs with the most unexpected values, then with every default accepted and rapid double-submits, to discover crashes, dupes, and unhandled states._
5. **Empty / loading / error states** — _Explore the feature with no data, slow network, and forced failures, to discover false-empty flashes, undesigned errors, and missing progress._
6. **Keyboard + a11y** — _Explore every new surface with keyboard only and a contrast/target-size check, to discover focus traps, invisible focus, unreachable controls, and WCAG AA failures._
7. **Usability (Nielsen)** — _Explore the primary journey against Nielsen's 10 heuristics, to discover status-visibility gaps, recall-over-recognition, missing undo/cancel, and unclear errors._
8. **Mandatory-matrix gap** — _Compare the feature class against `docs/TEST_STRATEGY.md` § Mandatory feature-test matrix, to discover a required test that does not exist (a Blocker gap on its own)._

## Charter library — the efficiency loop

Charters are reusable. When a charter finds a real bug, the durable fix is a test
(per the skill's step 4), and the charter itself is worth keeping: add or update the
app's `src/<app>/CUJs.md` "Known traps" and any recurring high-value charter into
that app's QA notes, so the next feature's QA pass starts from a sharper checklist
instead of a blank page. The charter set grows with the product; the bugs it catches
shrink.
