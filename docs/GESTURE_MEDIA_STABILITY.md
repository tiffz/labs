# Gesture media stability

How we prevent **tab crashes**, **blank thumbnails**, and **`blob: ERR_FILE_NOT_FOUND`** floods in The Gesture Room.

Canonical tier policy: [`src/gesture/media/gestureMediaPolicy.ts`](../../src/gesture/media/gestureMediaPolicy.ts). Agent context: [`src/gesture/AGENTS.md`](../../src/gesture/AGENTS.md) § Media tiers.

## Symptom → root cause

| User-visible symptom                        | Root cause class             | Typical mistake                                                                            |
| ------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Chrome “Aw, Snap!” (Error 5)                | `revoked-blob-display`       | Hundreds of parallel blob loads + LRU eviction while `<img>` still references revoked URLs |
| Thumbnails flash then go blank              | `revoked-blob-display`       | Preview grid shows `gestureMediaCache` blob URLs that LRU revokes                          |
| Console wall of `blob:… ERR_FILE_NOT_FOUND` | `revoked-blob-display`       | Eviction listener retriggers fetch/hydrate loop                                            |
| Thumbnails never load                       | `test gap` + `wrong-io-tier` | Fetch gated on viewport observer; IDB hydrate returns blobs that fail before network runs  |
| Slow collection grid                        | `wrong-io-tier`              | Preview tier starts with full-file `alt=media` instead of thumbnail https                  |

## Invariants (non-negotiable)

1. **Preview grid prefers https** — collection card strips use Drive thumbnail URLs when they load.
2. **Pinned blob fallback** — when only `alt=media` works (private `drive.file` photos), display uses refcounted pins in `gesturePreviewDisplayPins.ts` — not `gestureMediaCache` LRU blobs.
3. **Blob owner** — `gestureMediaCache` for session/offline bytes; preview pins for grid fallback only.
4. **No eviction refetch loop** — LRU eviction in `gestureMediaCache` must not subscribe preview UI hooks to re-hydrate/re-fetch en masse.
5. **Preview I/O tier** — thumbnail https before `alt=media`; cap concurrent preview resolves (see `gesturePreviewImageUrl.ts`).
6. **Tab-active fetch** — when Collections/Practice tab is active, preview strips fetch without waiting for intersection observer alone (`previewFetchEnabled`).

Indexed in [`docs/AGENT_INVARIANTS.md`](AGENT_INVARIANTS.md).

## Enforcement map

| Layer            | Artifact                                  | What it catches                                       |
| ---------------- | ----------------------------------------- | ----------------------------------------------------- |
| Fast Vitest      | `gesturePreviewDisplayInvariants.test.ts` | peek/resolve never expose blobs to grid display       |
| Fast Vitest      | `gesturePreviewImageUrl.test.ts`          | Tier order, https fallback when tier returns blob     |
| Fast Vitest      | `gestureMediaPolicy.test.ts`              | Thumbnail before alt=media                            |
| Source audit     | `gesturePreviewDisplayAudit.test.ts`      | Forbidden imports/patterns in preview pipeline files  |
| Playwright smoke | `e2e/smoke/gesture-preview-strip.spec.ts` | 4 visible thumbs, https `src`, no blob console errors |
| Cursor rule      | `.cursor/rules/gesture-media-tiers.mdc`   | Agent editing guardrails                              |

Run audits locally:

```bash
vitest run src/gesture/audits/gesturePreviewDisplayAudit.test.ts
npm run test:e2e:smoke -- e2e/smoke/gesture-preview-strip.spec.ts
```

## When you change preview loading

1. Read rule `gesture-media-tiers.mdc` and this doc.
2. Keep **display** (what `<img src>` uses) separate from **cache** (IDB/memory blobs for session/offline).
3. Add or extend **fast invariant tests** if you introduce a new code path that could return `blob:` to the grid.
4. Extend **source audit** forbidden patterns if the fix is “do not wire X to Y”.
5. Run **`npm run test:e2e:smoke`** (or scoped e2e) and hard-refresh `/gesture/` in dev — HMR hides provider/cache wiring bugs.
6. If the bug class could apply outside Gesture (grid of media thumbs), note it in retrospective and consider a shared pattern doc.

## Related

- [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md) — dev seed + smoke template
- [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md) — root cause classes
- [`docs/REGRESSION_WORKFLOW.md`](REGRESSION_WORKFLOW.md) — visual regression (layout, not blob lifecycle)
