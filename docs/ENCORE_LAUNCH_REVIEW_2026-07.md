# Encore launch review — 2026-07

A top-down whole-app review using the Labs reviewer bench (product, architecture,
QA, UX design, code/tech-lead), run via the `labs-launch-review` process. Encore is
a `protected`-tier app; major changes were cleared for this cycle. Findings are
synthesized and de-duplicated across lenses; **items flagged by ≥2 independent
reviewers are marked ⨯N** and carry the highest confidence.

## Verdict

Encore's **spine is excellent** — library → song → practice → log a performance is
clean, well-instrumented, and its guest/share model is genuinely safe. The
production monolithic sync's **exercise-run** protection (ADR 0019, compile-enforced
`SONG_MERGE_POLICY`) is real and strong. The work is **finishing and subtraction**,
not building. Two areas need attention: a cluster of **sync data-loss gaps** on the
song/performance path (not just exercise runs), and **scope sprawl + doc drift**.

## P0 — Sync data-loss cluster (the launch blockers)

These converged across the QA, architecture, and code lenses. Root cause: the
production monolithic path protects _exercise runs_ but not _songs/performances_ —
it has **no whole-row tombstone** and **no hard auto-push gate**, and the P0 doc
claims layers that aren't wired.

1. **Song/performance deletes resurrect cross-device ⨯2** (QA-1 BLOCKER, arch-6) —
   `repertoireSync.ts` merges songs/performances by pure union-by-id; the wire
   carries only `deletedExerciseRunIds`. Delete on A → B still holds it → pull unions
   it back → B re-pushes it → resurrects on A. A purge never sticks.
   **Fix:** add `deletedSongIds`/`deletedPerformanceIds` tombstones to the wire +
   merge filter, mirroring `deletedExerciseRunIds`.
2. **Sparse device clobbers rich cloud — no auto-push gate ⨯2** (QA-2 BLOCKER, arch-3) —
   Encore doesn't use `labsDriveAutoPushAllowed`. Before the first pull `lastRemoteEtag`
   is undefined → push with no `If-Match` → unconditional overwrite. Fresh/empty device
   editing within the ~1200ms pull window overwrites the whole rich `repertoire_data.json`.
   **Fix:** a `pulled-at-least-once-this-session` gate before any auto-push (a
   `labsDriveAutoPushAllowed`-equivalent) + a guardrail that Encore's push consults it.
3. **Performance videos merge whole-row LWW → videos lost ⨯3** (code-1, arch-5, QA-4) —
   `repertoireSync.ts:119-124` (`mergeRecordsByUpdatedAt`) picks a whole performance
   row by `updatedAt`; a video logged on a second device is dropped. Songs avoid this
   via `SONG_MERGE_POLICY`; performances have no policy map (zero typecheck signal on
   a new field). In-code `TODO drive-sync-redteam #2`.
   **Fix:** a `PERFORMANCE_MERGE_POLICY` (`satisfies Record<keyof …, MergePolicy>`)
   that unions `videos` by id.
4. **Mandatory feature-test matrix gap** (QA-3 BLOCKER) — no song/performance
   delete-resurrection or tombstone-honoring test exists; this coverage hole is what
   lets #1 ship. A missing matrix row is itself a blocking gap.
5. **Sharded pull bypasses the content-aware merge** (arch-1 BLOCKER) —
   `repertoireSharded.ts:432-467` does raw `songs.put` when remote is newer, then runs
   _after_ the monolithic content-aware pull and overwrites the just-healed rows. The
   Originals sharded path got this right (`mergeOriginalSongPreservingContent`), proving
   it's an omission. Masked because `VITE_ENCORE_SHARDED_SYNC` is off — but it is the
   "soak" path, one env flip from shipping the "Because of You" regression.
   **Fix (before ever enabling the flag):** route shard pulls through `mergeSongRecords`;
   add a `repertoireSharded.test.ts` filled-beats-empty case.
6. **No multi-tab Web Lock despite the doc claiming ✅ ⨯2** (arch-2 BLOCKER, QA-5) —
   `withLabsDriveSyncLock` has zero references in `src/encore`; only Stanza/the factory
   use it. Two Encore tabs interleave pull→merge→push with no cross-tab serialization.

**Highest-leverage single fix (arch-10):** the four gaps above all trace to
`DRIVE_SYNC_DATA_LOSS_PREVENTION.md` asserting layers Encore doesn't implement
(Web Lock ✅, auto-push gate ✅, delete tombstones ✅, persisted needs-push flag).
Add a **fitness test that asserts each claimed layer is actually wired** (import- or
behavior-presence), so the P0 doc can't out-run the code. This converts prose claims
into a guardrail and prevents the whole drift class.

Also in this cluster (SHOULD-FIX): shard pull deletes unpushed local creates (arch-4,
QA-7); Originals local-newer-sparse skips the content merge (QA-8); 412 auto-push has
no pull-then-rewrite recovery (QA-6); tab-close flush lacks keepalive/persisted flag
(arch-7, QA-13); cascade `deleteSong` has no confirm and a pull-fragile undo (QA-10).

## Architecture (beyond the cluster)

- **Two divergent sync stacks; Encore's bespoke one is the one missing guards** (arch-11)
  — five apps use `createLabsPortfolioDriveBackup` (lock, auto-push gate, flush for
  free); Encore predates it and isn't in the allowlist, with no ADR pinning the
  bespoke choice. Direction: adopt the factory envelope, or write an ADR + guard checklist.
- **God-objects with no fitness function ⨯3** (arch-9, code-2, and PM-adjacent) —
  `LibraryScreen` 2652, `useSongPageMediaHub` 2258, `PlaylistImportDialog` 2187,
  `PracticeExerciseFocusDialog` ~2008, `PerformancesScreen` 1810. All 3-4× the ~600-line
  decomposition threshold, but no guardrail caps `src/encore` file size. Logic is
  already extracted (`import/matchPlaylists.ts`), so this is view-layer bloat — decompose
  and add a soft line-budget fitness test.

## Product / scope (subtraction + finishing)

- **Bound Originals** (PM-1) — ~9.9k LOC songwriting IDE inside a singer-first app.
  ADR-blessed as a tab, but add explicit non-goals ("a drafting space, not a DAW /
  publishing tool") + a re-open trigger; don't grow it toward a general editor.
- **Finish or cut the two half-done migrations** (PM-2, PM-3) — sharded sync's perpetual
  dual-write, and the Encore↔Stanza practice-resource dual-store overlay (ADR 0007,
  "accepted, implementation deferred"). A permanent dual-write/dual-store is the worst
  of both; decide.
- **Pressure-test the delight-ware** (PM-4/5/6) — Performances "Wrapped" (1078 LOC),
  Docs/PDF export (~1.4k LOC), two-way Spotify sync — keep what the owner actually uses,
  freeze the rest (maintenance cost is borne solo). Two ADR-0012 features ("Spark It")
  are described as shipped but don't exist in code — mark deferred or cut.

## UX (restraint-led — validates the UX-restraint rules)

The reviewer found exactly the over-design classes the new `ux-restraint` rules target:

- **Empty library duplicates its CTAs and instruction ⨯restraint#3** (UX-1) — header
  shows "Add song"+"Import" + a sentence, and the card below repeats both + the sentence.
  Keep one first-run surface with one primary; drop the duplicates + the card border.
- **Performances empty state is a docs page with the wrong primary** (UX-2) — two
  paragraphs + a naming-convention code block + three buttons bury "Add performance".
  Headline + one sentence + one primary; move the naming detail to Help.
- **Stacked help under single fields / affordance narration** (UX-3, 5, 6, 8, 11) —
  PlaylistImportDialog's 3 help blocks, "paste the folder URL here" narrating the field
  beside it, helpers restating placeholders. Cut to one clause; push edge trivia to Help.
- **Nav weight** (UX-7) — 6 top-level tabs including Settings + Help competing with 4
  content areas; Help/Settings conventionally live behind the account menu (Jakob/Hick).
- Nits: Originals header catalog voice + a sentence-case bug (UX-4); one hardcoded
  `#7c3aed` chart color that should be a token (UX-10); `New Original` title-case.
- **Clean:** a11y (108 IconButtons all labeled), copy mechanics (no em dashes/Please/
  there-is openers), MUI-first theming, no card-in-card, the account menu.

## Recommended immediate actions (ranked by leverage)

1. **Layer-presence fitness test** for `DRIVE_SYNC_DATA_LOSS_PREVENTION.md` (arch-10) —
   stops the doc-vs-reality drift that hides the rest. Cheapest, highest leverage.
2. **Song/performance tombstones + auto-push gate + the matrix tests** (P0-1,2,3,4) —
   the actual data-loss fixes on the production path.
3. **`PERFORMANCE_MERGE_POLICY` unioning videos** (P0-3) — one converged, well-scoped fix.
4. **Do not enable `VITE_ENCORE_SHARDED_SYNC`** until the sharded pull routes through the
   content-aware merge (P0-5).
5. **UX subtraction pass** on the empty states + import dialogs (UX-1,2,3) — quick,
   high-visibility, and dogfoods the restraint rules.
6. **Decide the two half-migrations + bound Originals** (PM-1,2,3) — product direction.

Full per-lens findings are in the session transcript. This report is the durable
synthesis; convert each accepted item into a ranked `TECH_DEBT_ROADMAP.md` row or a
regression test as it is scheduled.
