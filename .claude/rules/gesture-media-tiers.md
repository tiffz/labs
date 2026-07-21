---
paths:
  - 'src/gesture/media/**'
  - 'src/gesture/hooks/usePackPreviewUrls.ts'
  - 'src/gesture/hooks/useGestureMediaWarmup.ts'
  - 'src/gesture/hooks/useGestureSession*.ts'
  - 'src/gesture/components/PackPreview*.tsx'
---

<!-- AUTO-GENERATED from .agents/rules/gesture-media-tiers.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> Gesture preview vs session media — resolution order and blob ownership

# Gesture media tiers

Canonical policy: [`gestureMediaPolicy.ts`](../../src/gesture/media/gestureMediaPolicy.ts) + [`src/gesture/AGENTS.md`](../../src/gesture/AGENTS.md) § Media tiers.

Stability playbook (crashes, blank thumbs, blob console errors): [`docs/GESTURE_MEDIA_STABILITY.md`](../../docs/GESTURE_MEDIA_STABILITY.md).

## Preview (collection card strips)

**Display invariant:** `<img src>` prefers **https** thumbnails via `gesturePreviewImageUrl`. When only `alt=media` works (private `drive.file` photos), use **refcounted pins** in `gesturePreviewDisplayPins.ts` — not `gestureMediaCache` LRU blobs.

Network resolution order (when https not cached):

1. OAuth `driveResolveThumbnailLink` → scaled https URL → `<img>`
2. Public `drive.google.com/thumbnail?id=…` fallback
3. **Last:** OAuth `alt=media` blob cache (session/offline bytes — map to https fallback for grid display)

**Never** start preview resolution with full-file `alt=media` — grids request 4×N files and starve the connection pool.

**Never** wire preview UI to `gestureMediaCache` eviction listeners — causes refetch storms and tab OOM.

## Session (zen drawing)

1. Session prefetch LRU + IDB (`kind: session`)
2. Thumbnail https via `<img>` probe
3. OAuth `alt=media` blob

## Invariants

- **Blob URL owner:** `gestureMediaCache` only — preview https cache must not retain revoked `blob:` URLs.
- **No `fetch()` on lh3 / thumbnail URLs** — CORS blocks; use `<img>` / `probeImageUrlLoads`.
- **Display-ready:** session pipeline decodes one photo at a time (`gestureSessionPhotoPipeline`).
- **Tab-active fetch:** `usePackPreviewUrls(..., previewFetchEnabled)` — tab visibility gates all network; **`previewFetchEnabled && near`** gates each strip (see `PackPreviewStrip`).

## Regression tests (run when touching this rule’s globs)

- Fast: `gesturePreviewDisplayInvariants.test.ts`, `gesturePreviewImageUrl.test.ts`
- Audit: `gesturePreviewDisplayAudit.test.ts`
- Smoke: `e2e/smoke/gesture-preview-strip.spec.ts`

Root cause classes: **`wrong-io-tier`**, **`revoked-blob-display`**.
