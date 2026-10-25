# Drive file intake: one pipeline for every upload

Status: proposed (2026-10-25). Owner request: takes should reach parity with the other
upload flows, starting with "add an existing Google Drive file as a take", and every upload
on the site should run on shared, stress-tested code.

## What exists today

Encore has **12 upload entry points**. They share the low layer (`src/shared/drive/driveFetch.ts`
resumable upload, `copyDriveFileToMyDrive`, `inferMediaMimeType`) and diverge everywhere above it.

| Entry point                          | Device file | Drive link | Owner check | Local-first | Failure shown |
| ------------------------------------ | ----------- | ---------- | ----------- | ----------- | ------------- |
| Originals takes (Record takes stage) | yes         | **no**     | n/a         | yes         | yes + retry   |
| Originals takes (song-files panel)   | yes         | **no**     | n/a         | yes         | **no**        |
| Originals references                 | yes         | yes        | **no**      | **no**¹     | no            |
| Originals brainstorm                 | yes         | yes        | **no**      | **no**¹     | no            |
| Song page charts                     | yes         | yes        | **no**      | no          | text          |
| Song page reference/backing tracks   | yes         | yes        | **no**      | no          | text          |
| Song page takes                      | yes         | yes        | **no**      | no          | text          |
| Song misc resources                  | yes         | yes        | **no**      | no          | text          |
| Performance editor videos            | yes         | yes        | **yes**     | no          | text          |
| Bulk performance import (folder)     | yes         | folder     | **no**      | no          | text          |
| Bulk score import (folder)           | yes         | folder     | **no**      | no          | text          |

¹ Saved as a `blob:` object URL when signed out (always, for brainstorm). **Lost on reload.**

The "owned → reference, foreign → copy" rule exists in exactly one place, inline in
`PerformanceEditorDialog.tsx` (decision at :524, copy + scope-upgrade retry loop at :765–800).
Everywhere else a pasted link to a friend's file is stored as a pointer to a file the user
does not control. If the friend deletes or unshares it, the user loses it.

Duplicated concepts (same idea, N hand-written copies):

- "dedup check → resumable upload → register in content index": **7 copies**.
- Local-first take import (`addFiles` / `replaceTakeFile`): **2 near-identical copies**, in
  `useOriginalsTakes.tsx` and `useOriginalsSongFilesPanel.tsx`. The panel copy records backup
  failures and never shows them.
- Accept strings: **9 constants**. MIME/drop classifiers: **4 approaches**. Slot drop handlers: 3.
- Drive URL parser and folder resolver: Encore keeps verbatim copies of the shared ones.

## What a pointer is, and what it may touch

The performance flow already defines the owned-file model, and it works:

- Encore stores the file's id. The bytes stay where the user put them.
- Encore adds a **shortcut** in its own folder so the file shows up in the Encore tree.
- Later renames apply to the shortcut. Encore renames or moves the original only when it
  already sits in an Encore-managed folder (`performanceShortcut.ts:84-145`). **A file elsewhere
  in the user's Drive is never renamed, moved or rewritten.**

Byte access: the production sign-in goes through the session BFF, which requests `drive.readonly`
with the login scopes (`workers/labs-session-bff/src/constants.ts:10`). So the session token reads
owned files' bytes and a pointer plays. Builds without the BFF (local dev, GIS fallback) hold only
`drive.file`; there `copyDriveFileToMyDrive` callers retry once with `ensureDriveCopyAccessToken`.
That retry moves into the shared primitive unchanged. (An earlier draft of this doc said pointers
could not play; it was reasoning from the GIS-only scopes, not from the BFF.)

## Decisions

### D1. One shared primitive decides reference vs copy

`src/shared/drive/importDriveFile.ts`:

```ts
type DriveFileImportPlan =
  | { kind: 'reference'; fileId: string; name: string; mimeType: string | null }
  | { kind: 'copy'; sourceFileId: string; name: string; mimeType: string | null };

type DriveFileImportRejection = 'not-a-drive-link' | 'not-found' | 'folder' | 'google-native' | 'not-accepted';

// Metadata only. Follows shortcuts to the target BEFORE reading ownership.
planDriveFileImport(accessToken, fileIdOrUrl, { accepts?(meta): boolean })
  : Promise<{ ok: true; plan } | { ok: false; reason }>;

// Copies foreign files into parentFolderId; references owned ones (no Drive write).
// On a permission failure calls requestReadAccess() once and retries with that token.
executeDriveFileImport(plan, { accessToken, parentFolderId, requestReadAccess?, onProgress? })
  : Promise<{ fileId: string; via: 'reference' | 'server-copy' | 'download-upload' }>;
```

- **Ownership is read from the shortcut's target.** A user's own shortcut to a friend's file
  reports `ownedByMe: true` on the shortcut row. The performance editor reads the row today
  (`PerformanceEditorDialog.tsx:486`, `:524`), so pasting such a shortcut stores a pointer at the
  friend's file. This is a live bug the primitive fixes.
- `ownedByMe === true` → `reference`. `false` **or missing** → `copy`. An unknown owner must not
  read as "mine" (`no-failure-as-valid-value`). The performance editor treats missing as owned
  today; that flips.
- Shared-drive files report `ownedByMe: false` and are copied. Deliberate: a shared drive's
  owner can remove the user's access.
- No shortcut creation in the primitive. Shortcuts are app layout (Encore's folders), so the app
  creates them, as the performance flow already does.
- App-agnostic: no Encore folder layout, no Dexie, no UI.

### D2. The performance editor plans and executes through the primitive

Both halves move: the ownership lookup (`:486-533`) calls `planDriveFileImport`, and the copy loop
(`:765-800`) calls `executeDriveFileImport`. `foreignDriveVideoCopy.ts` keeps its staging and
consumes `copy` plans. The rule then has exactly one owner.

### D3. Takes get "Add from Google Drive", through one take-intake module

`src/encore/originals/originalTakeIntake.ts` owns both intake paths, and both surfaces call it.

- Device file: today's local-first path, moved unchanged (blob → song row → Drive upload).
- Drive link: plan → execute (copy into the Originals audio folder, or reference) → append the
  take with `driveFileId`. Nothing is written until the copy finishes; the source still exists, so
  no unique work is at risk while it runs. The append re-reads the song after the `await` and does
  nothing if the song is gone.
- Owned references get a shortcut in the Originals audio folder, best-effort, like performances.

The two copies of `addFiles` / `replaceTakeFile` collapse into this module first, in a
behaviour-neutral step, so the song-files panel gains backup-failure display and retry.

### D4. A guard keeps new entry points on the primitive

Source scan, falsified before landing: outside `importDriveFile.ts`, no module imports
`copyDriveFileToMyDrive`, and no non-test module reads `ownedByMe`. Exemptions by name with a reason.
The guard derives its file set from the tree and asserts it is non-empty.

## Rollout (each phase is its own PR, presubmit green, shippable alone)

1. **This change:** D1 + D2 + D3 + D4, ADR for D1, tests (below).
2. Fix `blob:` references and brainstorm files (local-first via Dexie, like takes). This is live
   data loss, so it goes before the cleanups.
3. Song page charts / tracks / takes / misc links and both bulk folder imports use
   `planDriveFileImport` + `executeDriveFileImport` (owner check everywhere).
4. One `uploadDeviceFileToDrive` for the 7 dedup+upload wrappers.
5. Collapse accept strings and drop classifiers to one table keyed by slot.
6. Delete Encore's copies of the shared URL parser and folder resolver.

## Failure modes

| Failure                                    | Behaviour                                                    |
| ------------------------------------------ | ------------------------------------------------------------ |
| Link is a folder / Google Doc / wrong type | Rejected before any write, with a specific message           |
| Read access missing (non-BFF build)        | One consent prompt, then retry; declining writes nothing     |
| Copy fails midway                          | Nothing written; `copyDriveFileToMyDrive` leaves no take row |
| Shortcut creation fails                    | Take still added; shortcut is cosmetic                       |
| Friend deletes the source after the copy   | No effect: the take points at the user's own copy            |
| Signed out                                 | "Add from Google Drive" asks the user to sign in             |

## Tests

- `importDriveFile.test.ts`: owned → reference; `false` → copy; **missing `ownedByMe` → copy**;
  **owned shortcut → foreign target → copy**; folder / Google-native / not-accepted rejected;
  permission failure triggers exactly one `requestReadAccess` and the retry uses its token; a
  second failure propagates; a reference makes no Drive write.
- Take intake: a Drive take is not appended when the copy fails; owned → `driveFileId` is the
  target id; foreign → `driveFileId` is the copy id.
- Performance editor: existing foreign-copy tests stay green on the new executor.
- Each test is falsified against the broken version before landing.
