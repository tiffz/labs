# ADR 0029: Drive file import — reference what you own, copy what you don't

## Status

**Accepted** (October 2026). Implemented in `src/shared/drive/importDriveFile.ts`, guarded by
`src/shared/drive/driveFileImportGuardrails.test.ts`. Design and rollout:
[`docs/design-explorations/drive-file-intake.md`](../design-explorations/drive-file-intake.md).

## Context

Encore has a dozen ways to attach a file, and several accept an existing Google Drive file by link.
Only the performance editor checked who owned that file, and it read ownership from the pasted row
itself. A user's own shortcut to a friend's file reports `ownedByMe: true`, so pasting one stored a
pointer at the friend's file. Every other paste path (charts, tracks, takes, references, both bulk
folder imports) stored a pointer at whatever it was given.

A pointer at someone else's file fails silently later: when they delete it, unshare it, or lose
their account. A pointer at your own file is safe and costs nothing.

## Decision

1. **One primitive decides.** `planDriveFileImport` reads metadata (no writes) and returns a
   `reference` plan for a file the user owns, or a `copy` plan otherwise. `executeDriveFileImport`
   carries out the plan. No other module reads `ownedByMe` or calls the copy helpers.
2. **Ownership comes from the shortcut's target**, never the shortcut row.
3. **Unknown ownership copies.** `ownedByMe` missing is treated as foreign
   (`no-failure-as-valid-value`): a spare copy is easy to delete, a dead pointer is not.
4. **A reference never edits the original.** It makes no Drive write. Apps may add an organising
   shortcut in their own folder (Encore's performance flow does), and may rename or move only files
   already inside their own managed folders.
5. **Shared-drive files are copied.** They report `ownedByMe: false`, and a shared drive's owner can
   remove the user's access.
6. **Read access.** The session BFF signs in with `drive.readonly`, so the session token reads the
   bytes a copy needs. Builds without the BFF hold only `drive.file`; for them the caller passes
   `requestReadAccess`, which the executor calls once on a 403/404 before retrying. `drive.readonly`
   grants no write or trash, so the `drive.file` safety floor in
   `docs/DRIVE_SYNC_REDTEAM_2026-07.md` is unaffected.

## Alternatives considered

- **Always copy.** Always playable and simple, but duplicates every file the user already owns in
  Drive. Rejected: the owner wants pointers for owned files, and they work.
- **Pointer only, everywhere.** The status quo outside the performance editor. Rejected: it is how
  friends' files end up as dead links.
- **Keep the rule per call site.** Rejected: that is how the shortcut bug shipped in the one place
  that had the rule, and why nine other places lacked it.

## Consequences

- Each paste-a-Drive-link entry point migrates to the primitive (rollout in the design doc). Until
  it does, it still stores raw pointers; the guard only stops new direct ownership reads or copies.
- Pasting your own shortcut to a friend's file now copies the friend's file, where it used to link.
