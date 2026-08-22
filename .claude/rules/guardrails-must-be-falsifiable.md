<!-- AUTO-GENERATED from .agents/rules/guardrails-must-be-falsifiable.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> A test that cannot fail is worse than no test — verify every guardrail fails against the broken version before landing it

# Guardrails must be falsifiable

**Before landing any test whose job is to prevent a regression, break the code and watch it fail.**
If you cannot make it fail, it is not a guardrail — it is a comment that costs CI time, and it will
be cited as evidence that the thing it "protects" is fine.

This is not theoretical. In one session, four separate guardrails certified claims that were false
while real bugs shipped underneath them:

| Guardrail                             | What it asserted                                        | Reality                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `audioPatternRegistry.test.ts`        | Stanza uses look-ahead scheduling and `LabsAudioMixBus` | Uses neither — zero `LabsAudioMixBus` imports in the app                                                                                         |
| `toolingConfigGuardrails.test.ts`     | Playwright excludes agent worktrees                     | Could not distinguish that from "excludes **every** spec", which is what it did                                                                  |
| `bpmAccuracyTest.ts`                  | Detected BPM is optimal                                 | Scored with the same onset detector that produced the estimate, over a ±5 BPM window — structurally blind to octave errors, the dominant failure |
| `stanzaPracticeRailConstants.test.ts` | The default drum pattern is valid notation              | `toMatch(/[DTKS-]/)` passes if **any one** character is a drum token — `'xxxD'` passed, as did an all-rests pattern and a broken preset lookup   |

## The three shapes that cannot fail

1. **Constant vs constant.** Reading a literal out of a config file and comparing it to the same
   literal in the test. It passes forever, including while the code diverges from the config.
   _Instead:_ assert the **behaviour** the constant is supposed to produce — match real paths, call
   the real function, check the real DOM.

2. **Circular scoring.** Judging an output with the same machinery that produced it. Any
   self-consistent implementation scores perfectly, including a wrong one.
   _Instead:_ score against **independent ground truth**, even a small hand-labelled set.

3. **Fixtures that share the code's assumption.** The most dangerous, because coverage looks high.
   Every beat-detection fixture was generated at exactly 44100 Hz — the one sample rate at which an
   8%-wrong-on-every-song bug cancels out. The suite was green while the feature never worked.
   The soak test that was supposed to catch AudioContext leaks seeded a song with no metronome,
   no drums and no stems, so it never executed the leaking code.
   _Instead:_ **parametrise over the dimension the bug lives in** (both sample rates, both flag
   states), and seed soak/perf fixtures with the features actually enabled.

## The check

```
1. Write the test.
2. Revert the fix (or introduce the bug).
3. Run it. It MUST fail, for the stated reason.
4. Restore the fix. It MUST pass.
5. Say so in the commit message.
```

Step 3 is the whole rule. A test that passes both ways proves nothing, and you will not find out
until a user does.

## A fourth shape: coverage that cannot see the code

A guardrail can be falsifiable, assert the right invariant, and still be worthless because **the set
of things it looks at is not the set of things it governs**. This is harder to spot than a vacuous
assertion, because the test genuinely fails when you break what it covers — it just never covers the
thing that breaks. Three in one week:

| Guard                          | Governed                 | Actually looked at                                   |
| ------------------------------ | ------------------------ | ---------------------------------------------------- |
| `check:ui-copy`                | all user-facing copy     | `.tsx` only — the rhythm copy lives in `.ts`         |
| `backgroundPlaybackGuardrails` | every rAF audio driver   | a hardcoded list of 2 files, neither the shared one  |
| `verify:quick`                 | "is this safe to commit" | `typecheck` (app), not `typecheck:full` (tests, e2e) |

Each was green while the bug it existed to prevent shipped, and each read as reassurance.

**Derive the set; do not enumerate it.** Walk the tree and select by a property of the code — "calls
`requestAnimationFrame`", "calls a Drive upload helper", "is a displayed string" — so a new file is
enrolled by existing rather than by someone remembering. Then:

- **Assert the set is non-empty.** A glob that matches nothing passes every assertion in the suite.
- **Fail loudly when an anchor moves.** If the guard locates code by a symbol name, a rename must
  break the test, not silently empty it.
- **Exempt by name, with a written reason.** An allowlist of exceptions keeps the default at "must
  comply"; an allowlist of _inclusions_ inverts it.

When a guard must stay a list, say in a comment what would have to be true to derive it instead.

## When you cannot make it fail

Say so, and prefer the weaker-but-honest assertion over the stronger-but-vacuous one. A source scan
that admits it is a source scan beats a "behavioural" test that silently checks nothing — and note
in a comment what a real behavioural check would need.

Root cause classes: `guardrail-cannot-fail`, `fixture-shares-the-bug`, `guardrail-coverage-gap`.
