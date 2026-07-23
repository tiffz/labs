# Architecture fragility signals — reference

The smells a `labs-review-architecture` pass hunts for during an architecture audit.
Each is a place where correctness depends on humans keeping things aligned by hand —
which is where bug clusters breed. The Encore chart-playback engine had all five and
produced six bugs; use it as the worked example.

## The five fragility signals

1. **Multiple sources of truth for one value.** Count the independent places that
   compute or hold "the same" thing — a position, a selection, a merged record, a
   cached derivation. More than one owner means they can disagree at a boundary.
   _Playback:_ position lived in `stepIndexRef` + `playbackEpochPerfRef` +
   `measureStartPerfRef` + two audio-context clocks + `performance.now()` — six
   reconstructions of "where are we," none owning it.

2. **Manual "must stay in sync" invariants.** Two clocks, two stores, two caches, two
   indices kept aligned by convention, not by one owner. Each pairing is a bug
   generator; the comment "these must match" is the tell.
   _Playback:_ a separate chord AudioContext and drum AudioContext, re-bridged to a
   perf epoch every measure.

3. **Duplicated logic across parallel paths.** The same decision made independently in
   two code paths that can diverge.
   _Playback:_ the late-note decision — chords _clamp_ and sound, drums _skip_ and go
   silent — made separately, so a measure could be scheduled chord-without-drum. Also
   the classic: `songs` merge by policy, `performances` merge by whole-row LWW.

4. **No single owner / reconstructed state.** State rebuilt per call from mutable refs
   instead of owned by one transport/store, so every caller can reconstruct it
   slightly differently (and a resume path has to special-case it).

5. **A load-bearing invariant with no fitness function.** An always-true rule with no
   guardrail test — so it silently breaks. If a review can state an invariant the code
   relies on and there is no test asserting it, that gap is itself the finding.

## How to score

**Blast radius × likelihood.** Blast radius = how many surfaces/apps a failure
touches (a shared-layer defect outranks an app-local one; weight by `docs/app-quality-tiers.json`).
Likelihood = how easily the manual invariant drifts (two clocks re-bridged every
measure is high; a value computed once is low). A one-way-door structural defect in a
`protected` shared subsystem is the top of the list.

## Where these hide in Labs (start here)

- **`src/shared/audio/**` / playback** — clocks, schedulers, voice lifecycle (the playback cluster).
- **`src/shared/drive/**` + per-app sync** — merge policies, tombstones, auto-push gates, multi-tab locks (the Encore sync data-loss cluster: songs vs performances merge divergence, doc-vs-reality layer claims).
- **`src/shared/notation/**`** — the VexFlow font gate (single-surface guard, now enumerated).
- **God-files** — the size-ratchet's biggest entries crossed with `git log` churn hotspots.

## The fix pattern

Name one owner. Collapse N sources of truth to one; replace a manual sync invariant
with a single component that holds the state and hands it to consumers; make one
decision once for all parallel paths. Then add the fitness function that asserts it.
Record the direction as an ADR (incremental steps, not a rewrite) so it is a decision,
not a vibe.
