# Architecture Decision Records (ADRs)

Lightweight records of **significant** engineering choices across Labs: context, decision, and consequences. They complement [`DEVELOPMENT.md`](../../DEVELOPMENT.md) (operational policy and guardrails) and app-level docs under `src/<app>/`.

## When to add an ADR

Add a new ADR when a change is **hard to reverse**, **crosses apps or hosting**, or **will confuse future readers** without rationale—for example:

- Client routing model (hash vs path) and static hosting constraints
- OAuth, storage, or sync contracts
- New micro-app boundaries or import-layer rules (often already guarded by tests—ADR explains _why_)
- Security-relevant defaults

Skip an ADR for routine features, one-off UI tweaks, or purely internal refactors unless they encode a new pattern others must follow.

## Format and numbering

- One file per decision: `docs/adr/NNNN-short-kebab-title.md` with **four-digit** sequence (0001, 0002, …). Next free number wins; do not renumber accepted ADRs.
- Use the sections **Status**, **Context**, **Decision**, **Consequences** (and optional **Alternatives**, **Links**).
- Status is usually **Accepted** once merged; use **Proposed** only while under review.

## Agents and humans

- Prefer adding or updating an ADR **in the same PR** as the behavioral change.
- If you only touch policy text in `DEVELOPMENT.md`, consider whether a short ADR improves traceability; large `DEVELOPMENT.md` sections can point here.
- [`AGENTS.md`](../../AGENTS.md) references this folder so coding agents keep ADRs in sync with code.

## Index

| ADR                                                                       | Title                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [0001](./0001-static-hosting-hash-routing.md)                             | Static hosting (GitHub Pages) and hash-based client routing                           |
| [0002](./0002-historical-decisions-in-development.md)                     | Backfill: prior decisions in `DEVELOPMENT.md`                                         |
| [0003](./0003-stanza-multi-stem-playback.md)                              | Stanza optional multi-stem playback (local, Drive metadata)                           |
| [0004](./0004-stanza-stem-web-audio-mixer.md)                             | Stanza stem mix bus (Web Audio `MediaElementSource` + gains)                          |
| [0005](./0005-shared-find-the-beat-analyzer.md)                           | Shared Find-the-Beat analyzer (Essentia) for Stanza + Beat                            |
| [0006](./0006-stanza-drive-backup-merge-and-restore.md)                   | Stanza Drive backup: conflict prompt, merge, local undo snapshots                     |
| [0007](./0007-encore-owned-practice-resources-stanza-secondary-client.md) | Encore-owned practice resources on Drive; Stanza secondary client                     |
| [0008](./0008-stanza-section-marker-model-and-metronome-calibration.md)   | Stanza section/marker data model and per-section metronome calibration                |
| [0009](./0009-stanza-drums-and-metronome-volume.md)                       | Stanza drums groove (BPM-locked, per-section override) and metronome volume           |
| [0010](./0010-encore-no-background-google-refresh.md)                     | Encore never silently refreshes Google sign-in in the background                      |
| [0011](./0011-labs-stanza-scales-no-background-google-refresh.md)         | Stanza / Scales / shared Labs Google sign-in mirrors the no-background-refresh policy |
