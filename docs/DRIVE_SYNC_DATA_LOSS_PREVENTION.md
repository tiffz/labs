# Drive sync — data-loss prevention (P0)

**Mission:** Users must not unexpectedly lose work in Google Drive–synced Labs apps. Treat every sync/merge/delete change as a **data-loss risk** until the guardrail checklist below is satisfied.

**Who reads this:** Humans triaging sync bugs; **LLM agents** before editing `*DriveMerge*`, `*DriveBackup*`, envelope schemas, delete UX, or conflict UI.

**Related:** [`LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md) (architecture) · [`SYNC_AND_AUTH_MAP.md`](SYNC_AND_AUTH_MAP.md) (app map) · skill **`labs-drive-backup`** · ADR [0019](adr/0019-encore-non-destructive-sync-merge.md)

---

## Defense in depth (layers)

| Layer                         | What it protects                              | Where                                                                                      |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **1. Local working copy**     | Offline edits survive refresh                 | Dexie / reducer — always write locally first                                               |
| **2. Auto-push gate**         | Empty/sparse device cannot clobber rich cloud | `labsDriveSyncGuard.ts` — no push until pull or manual backup                              |
| **3. Merge safety**           | Filled beats empty; union by stable id        | `encoreRepertoireMerge.ts` (ADR 0019); portfolio `*DriveMerge.ts`                          |
| **4. Tombstones**             | Deletes/removals do not resurrect on pull     | Envelope + merge filter — see § Deletion                                                   |
| **5. Pre-merge undo**         | Roll back a bad pull/merge on this device     | `*UndoSnapshots.ts` + Restore dialog                                                       |
| **6. Drive revision history** | Recover after cloud overwrite                 | Encore: `encoreRecoveryRunner.ts`; portfolio: **backlog** (Drive keeps revisions)          |
| **7. Tab-close flush**        | Local-only window before push                 | Encore + portfolio `useLabsDrivePortfolioAutoSync` (`visibilitychange→hidden`, `pagehide`) |
| **8. Forgiving UX**           | User cannot pick blindly                      | Content-aware conflict copy; Undo last sync; blocking jobs during bulk work                |

No single layer is sufficient. **Agents must not remove or bypass a layer** without an ADR and replacement.

---

## Synced vs local-only (by app)

| App          | Synced to Drive                                                                                                               | Local-only (not in backup)                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Encore**   | Repertoire JSON (songs, performances, extras, exercise runs, media **refs**); Originals shards; upload bytes in `Encore_App/` | Dirty-sync queue; upload caches              |
| **Stanza**   | `progress.json`; `main_audio/`, `stem_audio/` blobs; tombstones                                                               | `localAudioBlob`, thumbnails, analysis cache |
| **Scales**   | Full progress envelope (exercises, tiers, history)                                                                            | Session snapshot, audio prefs                |
| **Gesture**  | `progress.json`; pack metadata + `packFiles` index; draw history; tombstones; photo bytes in Drive folders                    | Preview/session media cache; upload staging  |
| **Zine Box** | `progress.json`; comic PDFs in `comics/`; tombstones + stack membership removals                                              | Sample fixtures; blobs until uploaded        |

**Rule:** If the UI shows it as “saved” or “backed up,” it must appear in the envelope **or** a documented sidecar path with upload **before** envelope write. See Stanza `main_audio/` parity in `stanza-drive-sync.mdc`.

---

## Guard parity matrix

| Guard                                | Encore      | Stanza                  | Scales             | Gesture      | Zine Box       |
| ------------------------------------ | ----------- | ----------------------- | ------------------ | ------------ | -------------- |
| Auto-push gated until pull           | ✅          | ✅                      | ✅                 | ✅           | ✅             |
| Pre-merge undo snapshot              | ✅          | ✅ (Dexie)              | ✅                 | ✅           | ✅             |
| Delete tombstones + merge filter     | partial†    | ✅                      | n/a‡               | ✅           | ✅             |
| Content-aware merge (filled > empty) | ✅ ADR 0019 | markers/mix heuristics  | sparse-remote test | union + tags | union + stacks |
| Conflict UI when stakes are high     | row review  | prompt when both edited | silent_union       | silent_union | silent_union   |
| 412 etag retry on push               | ✅          | ✅                      | ✅                 | ❌§          | ✅             |
| Visibility/tab-close push flush      | ✅          | ✅¶                     | ✅¶                | ✅¶          | ✅¶            |
| In-app Drive revision recovery       | ✅          | ❌ backlog              | ❌ backlog         | ❌ backlog   | ❌ backlog     |
| Merge/delete regression tests        | ✅ unit     | ✅ unit                 | ✅ unit            | ✅ unit      | ✅ unit        |
| E2e merge/tombstone smoke            | ❌ backlog  | ❌ backlog              | ❌ backlog         | ❌ backlog   | ❌ backlog     |

† Encore exercise-run **deletes** can resurrect on merge (union by id — no run tombstones). Song/performance deletes propagate via `dirtySync`.

‡ Scales has no delete-progress UX yet; add tombstones before shipping reset/delete.

§ Gesture `useGestureDriveBackup.ts` — migrate to factory or add 412 retry ([`PROCESS_BACKLOG.md`](PROCESS_BACKLOG.md)).

¶ Portfolio apps: shared flush in `useLabsDrivePortfolioAutoSync.ts` (same pattern as Encore).

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

| Pattern                          | Intent                                                          |
| -------------------------------- | --------------------------------------------------------------- |
| **Undo last sync**               | Revert pre-pull snapshot without Drive archaeology              |
| **Restore from Drive**           | Pull latest cloud envelope when local is corrupt                |
| **Encore Recover lost data**     | Scan Drive revisions + local snapshots for richer copies        |
| **Stanza conflict dialog**       | Block silent merge when **both** sides edited since last backup |
| **Encore row review**            | Show answer counts per side before keep-device vs use-Drive     |
| **Blocking job + keep tab open** | Prevent navigating away mid-upload/merge                        |
| **Clear site data warning**      | Restore dialog copy — undo rings lost; Drive remains fallback   |

Avoid: destructive actions without confirm; coarse LWW on compound rows; silent overwrite toasts that look like success.

---

## Known gaps (tracked)

| Priority | Gap                                     | Mitigation today                                       |
| -------- | --------------------------------------- | ------------------------------------------------------ |
| P0       | Portfolio revision-history UI           | Undo snapshots + Drive “restore latest”                |
| P0       | Gesture 412 retry                       | Avoid multi-tab concurrent Gesture edits               |
| P1       | Encore exercise-run delete resurrection | Do not delete runs expecting sync propagation          |
| P1       | Stanza ↔ Encore dual stores             | Federated overlay ADR accepted; not wired              |
| P1       | No e2e tombstone/merge smokes           | Strong unit tests per app                              |
| P2       | Scales delete UX                        | No delete shipped                                      |
| P2       | Multi-tab same app                      | Document one tab per app                               |
| P2       | Undo in localStorage (most portfolio)   | Stanza uses Dexie ring; others lost on clear-site-data |

Add rows to [`PROCESS_BACKLOG.md`](PROCESS_BACKLOG.md) when discovered; remove when fixed.

---

## Testing expectations

**Unit (required on touch):**

- `*DriveMerge.test.ts` — tombstone, union, sparse-remote, marker/mix heuristics
- Encore: `encoreRepertoireMerge.test.ts`, `encoreDataRecovery.test.ts` (Because of You regression)
- Shared: `labsDriveSyncGuard.test.ts`, `useLabsDrivePortfolioAutoSync.test.ts`

**E2e (backlog — do not claim coverage exists):**

- Template: device A deletes entity → B pulls → entity absent
- Template: empty local must not overwrite filled remote on first sync

---

## Incident response (for humans)

1. **Stop the bleeding** — disable auto-merge if a bad release shipped; tell user not to close tab.
2. **Undo last sync** on affected device (account menu).
3. **Encore:** Run **Recover lost data from history** before manual Drive edits.
4. **Drive web UI:** File → Manage versions on `progress.json` / `repertoire_data.json`.
5. **Root cause** → ADR or this doc + regression test + `AGENT_INVARIANTS.md` row.

Root cause class: **`missing invariant`** or **`test gap`** — see [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md).
