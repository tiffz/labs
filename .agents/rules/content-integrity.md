---
description: Generative / curriculum content needs an exhaustive validity test and expert review — the accuracy attribute has no compiler
globs:
  - 'src/scales/curriculum/**'
  - 'src/scales/progress/**'
  - 'src/sight/curriculum/**'
  - 'src/sight/generators/**'
  - 'src/sight/modules/**'
  - 'src/muscle/curriculum/**'
  - 'src/shared/music/scales.ts'
  - 'src/shared/music/**rhythm**'
  - 'src/**/curriculum/**'
  - 'src/**/generators/**'
---

# Content integrity

Canonical: [`docs/CONTENT_ACCURACY.md`](../../docs/CONTENT_ACCURACY.md) ·
[`docs/QUALITY_SYSTEM.md`](../../docs/QUALITY_SYSTEM.md) § Accuracy.

Content correctness has **no compiler** — types/lint/screenshots pass while a
scale is misspelled, a color exercise grades the wrong answer, or a muscle is
mislabeled. Two defenses, both required for content-heavy code:

## Must

1. **Exhaustive integrity test.** Code that _generates_ user-facing content
   (curriculum, exercise, quiz, procedural palette/rhythm) must have a test that
   iterates the **whole** reachable set and asserts each artifact is valid — not
   a sampled case. Eight blank Scales exercises shipped because no test iterated
   the curriculum. Assert the concrete invariant: non-null render, correct note
   count, key-correct enharmonic spelling, every accepted answer actually
   correct. Models: `presetIntegrity.test.ts`, `anatomyLinkIntegrity.test.ts`.
2. **Grade toward the taught invariant.** An exercise that teaches _perceived_
   match must grade toward perceived, not physical, equality; a quiz with
   ambiguous aliases must grade by ID. A generator whose output contradicts its
   own lesson is a `content-inaccuracy` blocker.
3. **Expert review on material change.** When curriculum or grading changes
   materially, re-run the domain-expert review lens (music / color / anatomy
   educator) — it is the only thing that catches "runs fine but wrong on the
   merits." Required in the launch-review process.

## Verify, don't trust

Confirm a claimed content bug against the code (or by running the generator)
before fixing — expert reviewers are confidently wrong sometimes too.

Root cause class: **`content-inaccuracy`** — codify on second occurrence
([`CONTINUOUS_PROCESS_IMPROVEMENT.md`](../../docs/CONTINUOUS_PROCESS_IMPROVEMENT.md)); the durable fix is the integrity test.
