# Drive sync — data-loss prevention (P0)

**Mission:** Users must not unexpectedly lose work in Google Drive–synced Labs apps. Treat every sync/merge/delete change as a **data-loss risk** until the guardrail checklist below is satisfied.

**Who reads this:** Humans triaging sync bugs; **LLM agents** before editing `*DriveMerge*`, `*DriveBackup*`, envelope schemas, delete UX, or conflict UI.

**Related:** [`LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md) (architecture) · [`SYNC_AND_AUTH_MAP.md`](SYNC_AND_AUTH_MAP.md) (app map) · skill **`labs-drive-backup`** · ADR [0019](adr/0019-encore-non-destructive-sync-merge.md) · ADR [0020](adr/0020-silent-union-sync-row-conflicts-only.md)

---

## Defense in depth (layers)

| Layer                         | What it protects                              | Where                                                                                                                                                    |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Local working copy**     | Offline edits survive refresh                 | Dexie / reducer — always write locally first                                                                                                             |
| **2. Auto-push gate**         | Empty/sparse device cannot clobber rich cloud | `labsDriveSyncGuard.ts` — no push until pull or manual backup                                                                                            |
| **3. Merge safety**           | Filled beats empty; union by stable id        | `encoreRepertoireMerge.ts` (ADR 0019); portfolio `*DriveMerge.ts`                                                                                        |
| **4. Tombstones**             | Deletes/removals do not resurrect on pull     | Envelope + merge filter — see § Deletion                                                                                                                 |
| **5. Pre-merge undo**         | Roll back a bad pull/merge on this device     | `*UndoSnapshots.ts` + Restore dialog                                                                                                                     |
| **6. Drive revision history** | Recover after cloud overwrite                 | Encore: `encoreRecoveryRunner.ts`; portfolio: `labsPortfolioDriveHistoryRecovery` MVP + Drive versions                                                   |
| **7. Tab-close flush**        | Local-only window before push                 | Encore + portfolio `useLabsDrivePortfolioAutoSync` (`visibilitychange→hidden`, `pagehide`) + persisted needs-push flag (localStorage, survives tab kill) |
| **8. Forgiving UX**           | User cannot pick blindly                      | Content-aware conflict copy; Undo last sync; blocking jobs during bulk work                                                                              |
| **9. Parse-fail loud**        | Corrupt cloud file cannot look like "empty"   | `LabsDriveProgressUnreadableError` — pull throws, auto-push stays gated (factory + Stanza)                                                               |
| **10. Multi-tab Web Lock**    | Two tabs cannot interleave pull/merge/push    | `withLabsDriveSyncLock` (`labsDriveSyncLock.ts`) around every pull + flush critical section                                                              |

No single layer is sufficient. **Agents must not remove or bypass a layer** without an ADR and replacement.

---

## Synced vs local-only (by app)

| App          | Synced to Drive                                                                                                                                                                          | Local-only (not in backup)                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Encore**   | Repertoire JSON (songs, performances, extras, exercise runs, media **refs**); Originals shards; upload bytes in `Encore_App/`                                                            | Dirty-sync queue; upload caches                                               |
| **Stanza**   | `progress.json`; `main_audio/`, `stem_audio/` blobs; tombstones                                                                                                                          | `localAudioBlob`, thumbnails, analysis cache                                  |
| **Scales**   | Full progress envelope (exercises, tiers, history)                                                                                                                                       | Session snapshot, audio prefs                                                 |
| **Gesture**  | `progress.json`; pack metadata + `packFiles` index; draw history; tombstones; photo bytes in Drive folders                                                                               | Preview/session media cache; upload staging                                   |
| **Zine Box** | `progress.json`; comic PDFs in `comics/`; tombstones + stack membership removals                                                                                                         | Sample fixtures; blobs until uploaded                                         |
| **Lyrefly**  | `progress.json` (gallery summaries + project tombstones); full project package (`project.json`, layout, script, page/visual-dev JSON + blobs, archive, snapshots) under `projects/{id}/` | `dirtySync` ledger; page reference/mockup/character rows (not in package yet) |

**Rule:** If the UI shows it as “saved” or “backed up,” it must appear in the envelope **or** a documented sidecar path with upload **before** envelope write. See Stanza `main_audio/` parity in `stanza-drive-sync.mdc`.

---

## Sync stack divergence (who uses what)

New sync work must use `createLabsPortfolioDriveBackup`; custom hooks require an allowlist entry with rationale in [`labsPortfolioDriveHookGuardrails.test.ts`](../src/shared/drive/labsPortfolioDriveHookGuardrails.test.ts). Byte uploads are uniform: every app goes through the shared `driveFetch` upload path, which delegates to chunked resumable upload with 308-range recovery (`driveResumableUpload.ts`).

| App          | Stack                                                          | Conflict policy                                      | Tombstones                                           | Sidecar bytes                                |
| ------------ | -------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| **Encore**   | Bespoke (`EncoreSyncContext` + `repertoireSync`)               | Silent auto-merge; row review dialog (ADR 0019/0020) | Exercise-run tombstones; deletes via `dirtySync`     | Upload bytes in `Encore_App/`                |
| **Stanza**   | Custom hook (allowlisted) — media hydrate + overlay dual-write | Row review (ADR 0020)                                | `stanzaDriveTombstones` + YouTube tombstones         | `main_audio/`, `stem_audio/` before envelope |
| **Scales**   | Factory                                                        | Silent union (ADR 0020)                              | n/a — no delete UX yet (add before shipping deletes) | None (JSON only)                             |
| **Gesture**  | Factory (folder reconcile + photo reindex via sidecar hooks)   | Silent union + row review (ADR 0020)                 | `gestureDriveTombstones`                             | Photo bytes in Drive pack folders            |
| **Zine Box** | Factory                                                        | Silent union (ADR 0020)                              | Zine tombstones + stack membership removals          | Comic PDFs in `comics/`                      |
| **Lyrefly**  | Factory                                                        | Silent union (ADR 0020)                              | `lyreflyDriveTombstones` (projects)                  | Project packages under `projects/{id}/`      |

---

## Guard parity matrix

| Guard                                | Encore      | Stanza                 | Scales             | Gesture          | Zine Box       | Lyrefly    |
| ------------------------------------ | ----------- | ---------------------- | ------------------ | ---------------- | -------------- | ---------- |
| Auto-push gated until pull           | ✅          | ✅                     | ✅                 | ✅               | ✅             | ✅         |
| Pre-merge undo snapshot              | ✅          | ✅ (Dexie)             | ✅                 | ✅               | ✅             | ✅         |
| Delete tombstones + merge filter     | ✅†         | ✅                     | n/a‡               | ✅               | ✅             | ✅         |
| Content-aware merge (filled > empty) | ✅ ADR 0019 | markers/mix heuristics | sparse-remote test | union + tags     | union + stacks | union      |
| Conflict UI when stakes are high     | row review  | row review (ADR 0020)  | row review         | row review       | row review     | row review |
| 412 etag retry on push               | ✅          | ✅                     | ✅                 | ✅               | ✅             | ✅         |
| Visibility/tab-close push flush      | ✅          | ✅¶                    | ✅¶                | ✅¶              | ✅¶            | ✅¶        |
| In-app Drive revision recovery       | ✅          | ✅ portfolio MVP       | ✅ portfolio MVP   | ✅ portfolio MVP | ✅             | ✅         |
| Core CRUD without Google             | ✅          | ✅                     | ✅                 | ❌ (packs)§      | ✅             | ✅         |
| Merge/delete regression tests        | ✅ unit     | ✅ unit                | ✅ unit            | ✅ unit          | ✅ unit        | ✅ unit    |
| E2e merge/tombstone smoke            | ✅ shared   | ✅ shared              | ✅ shared          | ✅ shared        | ✅ shared      | ✅ shared  |

† Encore: exercise-run deletes use `encoreExerciseRunTombstones`; song/performance deletes via `dirtySync`.

‡ Scales has no delete-progress UX yet; add tombstones before shipping reset/delete.

§ Gesture pack upload/link is Drive-first; tags/source edit Dexie-first. Empty states say Google is required for new collections.

¶ Portfolio apps: shared flush in `useLabsDrivePortfolioAutoSync.ts` (same pattern as Encore). Shared e2e: `e2e/smoke/drive-sync-merge-guards.spec.ts`.

---

## Agent checklist — before merging sync code

### Any new synced field

- [ ] Added to envelope schema + export + merge (union or field heuristic)
- [ ] Merge test: local edit + remote edit → both preserved or explicit user choice
- [ ] Sidecar uploaded **before** envelope if bytes live outside JSON
- [ ] Post-merge hydrate if sidecar referenced from merged rows
- [ ] `notify*LocalChange({ immediate: true })` on bulk import (auto-sync priming skip)

### Delete or “remove from collection” UX

- [ ] Tombstone on user action (local ring + envelope field on next push)
- [ ] Merge honors tombstone **before** unioning lists/maps
- [ ] Test: delete on A → pull from B that still has row → row **stays deleted**
- [ ] Toast/report copy: user-visible adds/updates only (no overlap-only “merged N” noise)

### Merge or conflict policy change

- [ ] Read ADR 0019 + app `*DriveConflict.ts`
- [ ] Update [`LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md) policy table if prompt behavior changes
- [ ] Undo snapshot before destructive merge (`snapshotBeforeMerge` / factory)
- [ ] Never offer blind “Use Drive / Keep device” for rows with rich embedded content

### Push / auto-sync lifecycle

- [ ] `labsDriveAutoPushAllowed` not bypassed on fresh devices
- [ ] Debounced push flushed on tab hide (`visibilitychange→hidden`, `pagehide`)
- [ ] 412 → pull → rewrite envelope (factory pattern)
- [ ] Long jobs use `withBlockingJob` + `beforeunload` while active

---

## UX forgiveness (human error)

| Pattern                          | Intent                                                                    |
| -------------------------------- | ------------------------------------------------------------------------- |
| **Undo last sync**               | Revert pre-pull snapshot without Drive archaeology                        |
| **Restore from Drive**           | Pull latest cloud envelope when local is corrupt                          |
| **Encore Recover lost data**     | Scan Drive revisions + local snapshots for richer copies                  |
| **Row-level conflict review**    | Prompt only when `needsReview` rows exist (ADR 0020); show stakes per row |
| **Encore content-aware merge**   | Filled answers never lost to empty (ADR 0019)                             |
| **Blocking job + keep tab open** | Prevent navigating away mid-upload/merge                                  |
| **Clear site data warning**      | Restore dialog copy — undo rings lost; Drive remains fallback             |

Avoid: destructive actions without confirm; coarse LWW on compound rows; silent overwrite toasts that look like success.

---

## Stress scenarios (stewardship + ≤1-day blast radius)

| Scenario                                                   | Expected defense                                                                   | Status                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Fresh/empty device auto-pushes and clobbers rich cloud     | Auto-push gated until pull / manual backup                                         | ✅ `labsDriveSyncGuard`                                       |
| Bad merge on this device                                   | Pre-merge undo snapshot + Undo last sync                                           | ✅                                                            |
| Accidental empty overwrite of `progress.json` / repertoire | Drive revision history + **daily `keepForever` pin**                               | ✅ pin via `maybePinDailyDriveFileRevision`                   |
| Gesture “delete Drive photos” on a linked personal folder  | Refuse trash unless under Gesture Reference Packs                                  | ✅ `GestureDriveTrashStewardshipError`                        |
| Encore organize-duplicates trash in a user override folder | Trash only files under `Encore_App/`                                               | ✅ ancestry filter in dedup                                   |
| Permanent delete of foreign Drive files                    | Labs only **trashes** (never `files.delete`)                                       | ✅                                                            |
| Clear site data                                            | Undo rings wiped (localStorage **and** IndexedDB); Drive + pinned revisions remain | ✅ Honest limit — recover via Drive history / pins            |
| Encore Originals whole-row LWW                             | Newer sparse shard can beat richer older                                           | ✅ `mergeOriginalSongPreservingContent` on pull               |
| Lyrefly same-row cross-device edits after hydrate          | Local wins; remote improvements not merged                                         | ✅ package field merge + re-download when summary clock newer |

**Honest limit:** We cannot make “impossible to write a bug” absolute while OAuth can open user-picked folders. We **can** refuse high-blast trash outside Labs trees and keep cloud history dense enough that a bad day is recoverable.

## API rate limiting (abuse / ban prevention)

The 10 data-loss layers above protect the user's **content**. They do **not** protect the user's Google
**account** from API abuse: a stray timer-constant edit or a fan-out (parallel shard upload, thumbnail
grid storm) could burst Drive requests past Google's per-user quota and into abuse-detection / ban
territory. That gap is closed at the shared choke point every app's reads and writes flow through —
[`driveFetch`](../src/shared/drive/driveFetch.ts), backed by
[`driveRequestGovernor.ts`](../src/shared/drive/driveRequestGovernor.ts) (Drive red-team rec #3):

| Governor                  | What it prevents                                         | How                                                                                    |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Bounded concurrency**   | Fan-out burst (shard upload, thumbnail storm)            | Module-level semaphore caps in-flight requests at `DRIVE_MAX_CONCURRENT_REQUESTS` (6)  |
| **Full-jitter backoff**   | Synchronized retry waves (the abuse-detection signature) | 429/5xx/network retries use exponential backoff with full jitter — never a fixed delay |
| **`Retry-After` honored** | Retrying before Google says the door is open             | 429/503 wait **at least** the header value (delta-seconds or HTTP-date) before retry   |

Transparent to callers: 2xx and non-retryable errors (400/403/404/**412 etag**/…) are returned
unchanged; only retry/concurrency **timing** changes. Ad-hoc per-caller `[0, 500, 1500]` retry loops
were removed in favor of this single governed path (no nested retries).

**Scope / not covered:** resumable **byte** uploads (`driveResumableUpload.ts`) use a separate XHR path
(308 handling) with their own retry, and are already fan-out-limited at the call site (Gesture
`gestureUploadDuplicateFilter` concurrency). Once-per-day revision pinning
(`driveUpdateRevisionKeepForever`) is low-volume and left on raw `fetch`. Adjust `DRIVE_*` constants in
`driveRequestGovernor.ts` — do not reintroduce fixed-delay retry loops at call sites. The auto-pull
cadence floor (`LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS >= 60s`) is regression-guarded in
`driveRequestGovernor.test.ts`.

---

## Testing expectations

---

## Known gaps (tracked)

| Priority | Gap                                                | Mitigation today                                                                                                                                               |
| -------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Stanza ↔ Encore dual stores                        | Federated overlay ADR accepted; not wired ([`design-explorations/stanza-encore-overlay-migration.md`](design-explorations/stanza-encore-overlay-migration.md)) |
| P1       | Gesture local-blob packs                           | Drive-first empty copy + Dexie-first tags/source                                                                                                               |
| P2       | Scales delete UX                                   | No delete shipped                                                                                                                                              |
| P2       | Multi-tab same app                                 | Closed — `withLabsDriveSyncLock` Web Lock serializes pull/merge/push across tabs                                                                               |
| P2       | Clear site data wipes undo rings                   | Expected — rings are IndexedDB; recovery = Drive revisions / pins / Recover UI                                                                                 |
| P2       | Lyrefly project delete has no UI yet               | `deleteLyreflyProject()` exists; no gallery delete action yet                                                                                                  |
| P2       | Lyrefly package bytes outside envelope revision UI | Drive file versions on `projects/{id}/`; envelope recovery covers gallery only                                                                                 |

Add rows to [`PROCESS_BACKLOG.md`](PROCESS_BACKLOG.md) when discovered; remove when fixed.

**Red-team (2026-07-21):** a multi-agent adversarial audit produced [`DRIVE_SYNC_REDTEAM_2026-07.md`](DRIVE_SYNC_REDTEAM_2026-07.md) — 32 confirmed findings. Fixed: history-recovery revision ordering (#25), placeholder/`schemaVersion` decoupling (#23). Tracked remainder in `PROCESS_BACKLOG.md` § Drive-sync red-team. **Note:** the 10 layers above defend _data loss_, not _API abuse_ — there is no absolute Drive request-rate governor yet (retries ignore `Retry-After`, no jitter); a shared throttled `driveFetch` wrapper is the tracked fix.

---

## Testing expectations

**Unit (required on touch):**

- `*DriveMerge.test.ts` — tombstone, union, sparse-remote, marker/mix heuristics
- Encore: `encoreRepertoireMerge.test.ts`, `encoreDataRecovery.test.ts` (Because of You regression)
- Shared: `labsDriveSyncGuard.test.ts`, `useLabsDrivePortfolioAutoSync.test.ts`

**E2e (Node merge guards — no OAuth):** [`e2e/smoke/drive-sync-merge-guards.spec.ts`](../e2e/smoke/drive-sync-merge-guards.spec.ts)

- Tombstones: Zinebox comics, Lyrefly projects, Encore exercise runs
- Empty-device auto-push gate (`labsDriveAutoPushAllowed`)
- Content-aware: Originals lyrics + repertoire exercise answers vs newer sparse
- Scoped on encore / zinebox / gesture / stanza / lyrefly via `APP_SMOKE_SPECS`

---

## Incident response (for humans)

1. **Stop the bleeding** — disable auto-merge if a bad release shipped; tell user not to close tab.
2. **Undo last sync** on affected device (account menu).
3. **Encore:** Run **Recover lost data from history** before manual Drive edits.
4. **Drive web UI:** File → Manage versions on `progress.json` / `repertoire_data.json`.
5. **Root cause** → ADR or this doc + regression test + `AGENT_INVARIANTS.md` row.

Root cause class: **`missing invariant`** or **`test gap`** — see [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md).
