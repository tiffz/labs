# Tempo detection: how to actually improve it

The loop that took Accuracy1 from **20% to 80%** on real audio. Follow it in order; the failures
in this repo's history all came from skipping a step.

## 0. The rule that matters most

**Synthetic fixtures cannot settle a tempo question.** Measured, repeatedly:

|                                     | synthetic said       | real audio said  |
| ----------------------------------- | -------------------- | ---------------- |
| delete the post-processing?         | regresses 8.7 points | doubles accuracy |
| 150 BPM drum loop, raw multifeature | 74.64 (halved)       | 150.0 (exact)    |

`drumPattern` voices a hihat every 8th regardless of tempo, so its onsets-per-second is exactly
`2 × (bpm/60)`. Any "denser means faster" logic is correct there **by construction**. A heuristic
validated against it has been validated against a tautology. Use `tempoRealistic`, which thins
subdivisions as tempo rises the way a drummer does, and treat synthetic as a smoke test only.

## 1. Ground truth

Songs where the owner **tapped** the tempo: `metronomeSongCalibration.source === 'tap'`. Real audio,
human-labelled, already on the device, never committed.

**Only `'tap'` counts.** `source: 'analysis'` was written by the detector, so scoring against it
compares the detector to itself and reports ~100% forever — the exact defect that made the old
`bpmAccuracyTest.ts` unable to fail. `tappedGroundTruthBpm()` enforces this and a test pins it.

More tapped songs is the cheapest possible improvement to this pipeline. n=5 is thin.

## 2. Run the eval

Stanza on localhost with `?debug`, then in the console:

```js
await __stanzaTempoEval();
```

Reports MIREX Accuracy1 (within 4%), Accuracy2 (octave-forgiving), and an octave-only count.
Accuracy2 minus Accuracy1 is the diagnosis: high Acc2 with low Acc1 means **fix metrical-level
selection**; low Acc2 means the tracker is genuinely losing the beat. Different problems.

## 3. Capture per-estimator BPM **and confidence** — the step that unlocked this

Aggregate scores tell you _that_ it is wrong, never _why_. Logging every estimator's reading
alongside its confidence is what made the fix visible:

```
truth 150   multifeature=150.0 @0.667   percival=74.9 @0.6   degara-clip=150.0 @0.0
truth  71   multifeature=140.0 @0.352   percival=70.1 @0.6   loop-clip=70.0  @0.55
```

Two things fell out immediately:

- **multifeature's confidence separates its correct readings from its wrong ones** — 0.667/0.719
  when right, 0.352/0.428/0.053 when wrong. Clean gap, so the 0.5 threshold was read off the data,
  not tuned into it.
- **Several confidences are fiction.** `percival` is hardcoded 0.6, `loop` 0.5. `degara` reports
  0.0 while returning the _correct_ answer. `loop-clip` returns `bpm: 0.0` at confidence 0.55 —
  confidently returning nothing. Do not build a weighted average on these.

## 4. Prefer a mechanism over a fitted constant

The threshold works because RhythmExtractor2013 derives confidence from agreement among its
internal onset-detection functions, so low confidence genuinely means "my own detectors disagreed"
— exactly when its octave choice is least reliable. `percival` is the fallback because it is
_independent_ (autocorrelation, not an onset-DF ensemble), not because it scored well.

A constant that only works because it was fitted to five songs will not survive the sixth.

## 5. Change one thing, measure, keep or revert

Three separate changes each measured as **no better than the original** when tested alone or in
pairs. Only all three together produced 80%:

1. confidence-gated selection
2. removing the octave/fine-tune/snap chain — it was _undoing_ correct selections downstream,
   turning a correctly-selected 150 into 74
3. honest fixtures for the two 150 BPM cases

If a change measures as a no-op, that is real information about the _harness_, not permission to
ship on reasoning.

## 6. Never edit an assertion to make a detector pass

Fixtures may be fixed; assertions may not. The honest sequence, and the one that worked:

```
fixture fixed  ->  test FAILS against the old code   (exposes the real bug)
code fixed     ->  test passes
```

Bending the assertion instead would have left the 150 BPM loop reading 74 in the app forever.

## What is known to be still wrong

- **White Flag**: truth 160, detected 84. **No estimator proposes 160** — multifeature, degara and
  degara-clip all read 172.3, percival 85.1. Either a genuinely hard track or an inaccurate tap.
  Not an octave error, so the half/double control will not rescue it.
- **n = 5.** The threshold should be **re-derived** as the set grows, not assumed.
- **Essentia.js is on 0.1.3, the latest published version.** No upgrade is available; improvements
  have to come from how its outputs are used.

## Files

| Path                                          | What it is                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `tempoEvalBaseline.json`                      | Committed results. Song titles hashed — the repo is public, the library personal. |
| `../tempoEvalMetrics.ts`                      | Pure MIREX metrics. Detector-agnostic on purpose.                                 |
| `../../../stanza/debug/stanzaTempoEval.ts`    | The in-browser runner over tapped songs.                                          |
| `../tempoOctaveRateProbe.integration.test.ts` | Octave-range + sample-rate probe. Reports, does not gate.                         |
| `../bpmDetectionBenchmark.test.ts`            | `Algorithm Comparison` ranks registered detectors (`RUN_INTEGRATION_TESTS=true`). |
