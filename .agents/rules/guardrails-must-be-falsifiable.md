---
description: A test that cannot fail is worse than no test — verify every guardrail fails against the broken version before landing it
alwaysApply: true
---

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

## When you cannot make it fail

Say so, and prefer the weaker-but-honest assertion over the stronger-but-vacuous one. A source scan
that admits it is a source scan beats a "behavioural" test that silently checks nothing — and note
in a comment what a real behavioural check would need.

Root cause classes: `guardrail-cannot-fail`, `fixture-shares-the-bug`.
