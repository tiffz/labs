# ADR 0007: Encore-owned practice resources on Drive — Stanza as secondary client

## Status

Accepted — **implementation deferred**; see [0007 revision (proposed)](./0007-revision-stanza-encore-federated-sync.md) for federated overlay design under review.

## Context

Labs uses Google **`drive.file`** with a **shared OAuth client** across Encore, Stanza, and related flows (`EncoreAuthContext` `GOOGLE_SCOPES` and `LABS_GOOGLE_DRIVE_SESSION_SCOPES` are aligned). Files created under that client (including Encore’s `Encore_App/` tree) are addressable with the same restricted-scope tokens, so we are not forced to keep practice metadata in a separate `Tiff Zhang Labs/Stanza/` document forever.

Today:

- **Encore** is the product of record for repertoire and practice-adjacent assets: `Encore_App/repertoire_data.json` (and the optional sharded layout under `Encore_App/repertoire/` per [`repertoireSharded.ts`](../../src/encore/drive/repertoireSharded.ts)), plus bytes and shortcuts organized via [`songAttachmentOrganize.ts`](../../src/encore/drive/songAttachmentOrganize.ts) and folder kinds such as `referenceTracks` and `backingTracks` ([`EncoreDriveUploadFolderKind`](../../src/encore/types.ts)).
- **Stanza** backs up library metadata to `Tiff Zhang Labs/Stanza/progress.json` ([`labsDrivePortfolioLayout.ts`](../../src/shared/drive/labsDrivePortfolioLayout.ts)), including markers and stem **labels** without audio bytes ([ADR 0003](./0003-stanza-multi-stem-playback.md), [ADR 0006](./0006-stanza-drive-backup-merge-and-restore.md)).

That split duplicates “what is this practice track called, where does the audio live” in two places and invites drift.

## Decision

1. **Canonical folder**: **`Encore_App/`** (existing Encore bootstrap layout under the user’s Drive) is the **shared folder** for practice-resource truth: repertoire JSON, optional `repertoire/` shard tree, and the same upload-folder conventions Encore already uses for reference and backing files. Stanza should **not** introduce a parallel canonical store under `Tiff Zhang Labs/Stanza/` for data that belongs in the repertoire model.

2. **Canonical schema**: **`RepertoireWirePayload`** / **`EncoreSong`** (and per-song shards when sharded sync is on) are the **source of truth** for:
   - Stable song identity (`EncoreSong.id`) for anything tied to Encore repertoire.
   - Reference and backing **links** (`referenceLinks`, `backingLinks`, primary flags, `youtubeVideoId`, `spotifyTrackId` as today).
   - **User-visible names** for those resources (`EncoreMediaLink.label`, attachment labels, and song title/artist for spine naming in Drive).

3. **Stanza’s role**: Stanza is a **secondary frontend**: it reads this Encore-owned data to drive playback and display for Encore-linked work, and reflects updates whenever Encore syncs repertoire to Drive. Stanza **does not** own competing canonical fields for “which Drive file is this stem / reference / backing” or the authoritative labels Encore shows for those resources.

4. **Stanza-only session data**: Data that has **no** Encore equivalent today (e.g. per-section **markers**, **metronome calibration**, local-only blobs, Stanza **takes**) should **not** silently grow unversioned fields inside `EncoreSong` unless Encore’s read/write path is explicitly audited for **passthrough** of those keys. Until then, prefer a **sidecar JSON** under `Encore_App/` (e.g. `stanza_practice_overlay.json`) keyed by `EncoreSong.id`, with its own small schema version and merge/conflict rules (reuse the spirit of [ADR 0006](./0006-stanza-drive-backup-merge-and-restore.md) for overlay-only writes). Long term, optional **typed** optional fields on `EncoreSong` may subsume the sidecar if both apps agree on shape and Encore guarantees round-trip.

5. **Write authority**: **Encore** remains the supported place to **create, rename, reorder, and delete** reference/backing resources and to manage Drive placement for those uploads. Stanza may later support **explicit** “request change” flows that ultimately persist through Encore semantics (or shared libraries), but must not define a second naming or linking system for the same logical resource.

6. **Sync layout evolution**: When Encore moves primary coordination to the **sharded** manifest + per-row files, Stanza integration **must** follow that layout (read manifest, pull changed song shards) rather than assuming a monolithic `repertoire_data.json` only.

## Consequences

- **Implementation** (not done in this ADR): Stanza gains code paths to locate `Encore_App`, read repertoire (monolith and/or shard), map rows into Stanza’s UI model, and optionally read/write the **overlay** file. The existing `Tiff Zhang Labs/Stanza/progress.json` path becomes **legacy / migration / local cache** until removed behind a migration plan.
- **Migrations**: Users with markers only in Stanza’s old file need a one-time or dual-read merge strategy before turning off the legacy file.
- **OAuth / consent**: Still **`drive.file`** + metadata; no broad Drive scope required if we stay within Encore-created files and sidecars created by the same client.
- **Conflicts**: Canonical song/link conflicts follow **Encore’s** repertoire conflict and merge story; overlay conflicts are **Stanza’s** (or shared generic merge helpers) and must not corrupt `repertoire_data.json`.

## Alternatives considered

- **Keep `Tiff Zhang Labs/Stanza/progress.json` as peer SoT** — rejected: duplicates labels and link intent and breaks “Encore manages practice resources.”
- **Stanza writes directly into `EncoreSong` blobs in repertoire JSON without Encore awareness** — rejected unless fields are typed and Encore’s editor preserves them; risks data loss on Encore save.

## Links

- [`src/encore/drive/constants.ts`](../../src/encore/drive/constants.ts) — `ENCORE_ROOT_FOLDER`, `REPERTOIRE_FILE_NAME`, sharded folder names
- [`src/encore/types.ts`](../../src/encore/types.ts) — `EncoreSong`, `EncoreMediaLink`, `RepertoireWirePayload`
- [`src/encore/drive/repertoireWire.ts`](../../src/encore/drive/repertoireWire.ts)
- [`src/encore/drive/repertoireSharded.ts`](../../src/encore/drive/repertoireSharded.ts)
- [`src/shared/google/labsGoogleDriveAccess.ts`](../../src/shared/google/labsGoogleDriveAccess.ts) — aligned scopes with Encore
