# Content accuracy

Correctness of the _material_ an app teaches or presents — a scale's note
spelling, a color match's grading, a muscle's name and action, a rhythm
preset's notation. It is the quality attribute with **no compiler**: types,
lint, and screenshots all pass while the content is wrong, and a wrong answer
does not crash — it teaches a user something false. This doc is the accuracy
cell of [`QUALITY_SYSTEM.md`](QUALITY_SYSTEM.md).

Two defenses, and content-heavy apps need both.

## 1. Content-integrity tests (automated, every cycle)

**Rule: any code that generates user-facing content must have a test that
asserts every generated artifact is valid — the whole set, not a sample.**

"Valid" is domain-specific but always concrete:

- A **curriculum / exercise generator** — every exercise the curriculum can
  reach produces a non-null artifact with the right shape (correct note count,
  correct enharmonic spelling for the key, no blank render). Iterate the real
  curriculum, not a hand-picked case.
- A **quiz / matcher** — every answer the app accepts as correct actually is,
  and no correct answer is graded wrong. Grade against IDs, not free-text
  aliases, where ambiguity exists.
- A **procedural generator** (palette, color challenge, rhythm) — the output
  satisfies the invariant the exercise is teaching (e.g. a "perceived match"
  item is graded toward perceived, not physical, equality).

Why "the whole set": the Scales app shipped eight exercises (Eb-minor and
Ab-minor, all types) that rendered **nothing** — the note table was spelled in
sharps, the curriculum requested flats, and the exact-match lookup returned
null. Every unit test passed; no test iterated the curriculum and asserted each
exercise produced a score. One integrity test would have caught all eight. That
is the pattern: sampled tests miss the gap; exhaustive iteration finds it.

Reference implementations: `presetIntegrity.test.ts` (rhythm presets),
`anatomyLinkIntegrity.test.ts` (muscle term↔node links). New generative content
gets one before it ships.

## 2. Domain-expert review (periodic, and before launch review)

Some errors are not "invalid," they are **wrong on the merits** — a fingering
that no teacher uses, a color exercise that grades the perceptually-wrong answer
as correct, a muscle described with a neighbouring muscle's landmark. Only
someone who knows the domain catches these.

Route each content-heavy app through a subagent playing the relevant expert:

| App                             | Expert lens                               |
| ------------------------------- | ----------------------------------------- |
| Learn Your Scales               | piano-pedagogy / music-theory teacher     |
| Color Sight Trainer             | color scientist / color-theory instructor |
| Muscle Memory                   | anatomy-for-artists educator              |
| Rhythm / Darbuka, Words, Chords | rhythm / music educator                   |

The reviewer reads the actual curriculum data and grading math (not just the
UI) and rates findings **BLOCKER** (teaches something wrong — a user learns it
incorrectly), **SHOULD-FIX** (pedagogy weakness / unhelpful), **CONSIDER**
(enhancement). This is a required lens in the launch-review process for any app
that teaches, and worth re-running whenever the curriculum or grading changes
materially.

**Verify, don't trust.** An expert subagent is confidently wrong sometimes too
— confirm a claimed content bug against the code (or by running the generator)
before fixing, exactly as the merge gate verifies findings.

## Root-cause class

`content-inaccuracy` — user-facing material that is factually or pedagogically
wrong, or a generator that produces invalid/blank artifacts. Codify on the
second occurrence per [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md):
the durable fix is almost always a content-integrity test.
