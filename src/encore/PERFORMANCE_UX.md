# Encore performance UX

Interaction design for logging, editing, and viewing **performances** (gig history + video). Copy voice still follows [`COPY_STYLE.md`](COPY_STYLE.md) and [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md).

## Mental model

A **performance** is a logged event: date, venue, notes, accompaniment, and one or more **videos**. Each video has exactly one **source** (Drive file, YouTube URL, or device upload staged until save). List surfaces show the **primary** video for thumbnails and playback.

Keep these concepts visually separate:

| Concept                 | User question it answers            | Typical controls                             |
| ----------------------- | ----------------------------------- | -------------------------------------------- |
| **Performance details** | When / where / how did I play this? | Date, venue, accompaniment, notes            |
| **Video (identity)**    | Which clip is this in the stack?    | Thumbnail, primary badge, remove             |
| **Video source**        | Where does the bytes come from?     | Link field, resolved file row, device upload |

Never orphan source controls (link, upload, resolved filename) below a video list without a clear border tying them to **one** video.

## Gestalt grouping (required)

1. **Proximity** — Fields that change the same object sit inside **one** outlined card. The link, resolved Drive name, and upload drop zone for a video belong in that video’s card, not in a separate stack below the thumbnail row.
2. **Similarity** — Use one border treatment per video card; use a different surface (no tint / lighter) for performance metadata.
3. **Figure / ground** — Section titles (`Performance details`, `Videos`) sit **outside** field stacks via [`PerformanceEditorSection`](components/performance/PerformanceEditorSection.tsx). Both sections use the same body rhythm (`spacing={2}`) with no inner Paper/card wrappers.
4. **Common region** — Add-video flow: read-only **Adding to** summary is its own lightly bordered region with **Song** (art + title + artist) and **Performance** (date, venue, tags, notes, existing videos) separated by whitespace and group labels — no column divider. Primary video is a thumbnail badge, not a floating star. **New video** is a second region below.
5. **Hierarchy** — Details before media in edit/log dialogs (when / where before which file). Primary action on the dialog footer; destructive actions (`Remove from log`) stay tertiary.

## Surfaces (today vs roadmap)

| Surface                               | Role today                                                                    | Direction                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Performance editor dialog**         | Log performance, edit details, edit primary source, add video to existing row | Stay for **quick edits** and **create**; keep ≤2 conceptual sections       |
| **Song / Practice lists**             | Browse, play, open add-video                                                  | Unchanged                                                                  |
| **Performance detail page** (planned) | Full-screen view of one performance: all videos, playback, metadata, history  | `#/performance/<id>` — move deep editing here when the modal feels cramped |

When adding features, ask: **does this belong on the detail page instead of the modal?** Prefer the page for multi-video management, compare, and long notes; keep the modal for “log this show” and “fix the link.”

See [`docs/design-explorations/performance-detail-page.md`](../../docs/design-explorations/performance-detail-page.md) for the page shell sketch.

## Video source card (reference)

One bordered card per video being edited:

```text
┌─ Video ────────────────────────────────────────┐
│ [thumb]  Primary · Linked          ★  🗑       │
│ ── Source ───────────────────────────────────  │
│ Video link [________________________]          │
│ ✓ 2026-06-11 - Title.mov            ↗          │
│ [Upload from device]  [Video link]             │
└────────────────────────────────────────────────┘
```

Rules:

- **Source** is a subheading inside the card, not a duplicate “Videos (1)” header plus loose fields.
- **Add videos** (log, edit, add-video): one {@link PerformanceAddVideosPanel} card — queued rows separated by dividers, then a tinted footer with {@link PerformanceAddVideoSourceStrip} (“From your device” | “From a link”). No Drive folder shortcut in this flow.
- Saved videos in **edit** mode: one bordered **list card** per clip — left-aligned preview (play Drive inline; YouTube embeds in-frame), editable **Video link** and Drive resolve feedback in the card body, **Revert** when dirty, **Primary video** / **Make primary** star actions (same slot, same styling) and **Remove**. Matches staged upload row layout.
- Secondary videos in a stack: same card in edit mode.
- Use shared tokens from [`encoreUiTokens.ts`](theme/encoreUiTokens.ts): `encorePerformanceListRowSx`, `encorePerformanceVideoPanelSx`, `encorePerformanceStagedVideoSx`, `encorePerformanceSectionDropSx`, `encorePerformanceDropHintSx`. Prefer hairline borders and `encoreShadowSurface` over `border: 2` or MUI `boxShadow: 1`.
- **Border discipline** — Section headers and the read-only **Adding to** summary delineate groups. Do not wrap staged previews, source fields, or dialog video rows in extra card borders. Reserve row borders for Practice/song list rows that are drop targets (`encorePerformanceListRowSx` with `bordered: true`).
- Device upload drop targets reuse [`DragDropFileUpload`](../shared/components/DragDropFileUpload.tsx) with `tone="soft"` in the performance editor (fuchsia-forward inline strip) or `tone="brand"` for bulk import — do not invent a third drop style.
- The performance editor **Videos** section (log, edit, add-video) is wrapped in [`PerformanceEditorVideosDropZone`](components/performance/PerformanceEditorVideosDropZone.tsx): dropping anywhere on that region stages or queues clips, not only on the compact upload row.

## Components (code map)

| Component                                                                                       | Purpose                                                                               |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`PerformanceEditorSection`](components/performance/PerformanceEditorSection.tsx)               | Shared section header + field stack for log/edit/add-video                            |
| [`PerformanceMetadataSection`](components/performance/PerformanceMetadataSection.tsx)           | Date, venue, accompaniment, notes                                                     |
| [`PerformanceVideoSourceEditor`](components/performance/PerformanceAddVideoSourceStrip.tsx)     | Combined file + link staging strip                                                    |
| [`PerformanceVideoLinkFeedback`](components/performance/PerformanceVideoLinkFeedback.tsx)       | Drive resolve feedback for link fields                                                |
| [`PerformanceContextSummary`](components/performance/PerformanceContextSummary.tsx)             | Read-only **Adding to** block: song column + performance column (date, venue, videos) |
| [`PerformanceVideoPrimaryStar`](components/performance/PerformanceVideoPrimaryStar.tsx)         | Promote-to-primary control in editable stacks                                         |
| [`PerformanceVideoPrimaryBadge`](components/performance/PerformanceVideoPrimaryBadge.tsx)       | Primary marker overlaid on a video thumbnail                                          |
| [`PerformanceAddVideosPanel`](components/performance/PerformanceAddVideosPanel.tsx)             | Unified upload queue + file/link strip (log, edit, add-video)                         |
| [`PerformanceAddVideoSourceStrip`](components/performance/PerformanceAddVideoSourceStrip.tsx)   | Combined compact file picker and link field                                           |
| [`PerformanceStagedVideoRow`](components/performance/PerformanceStagedVideoRow.tsx)             | One queued clip row (preview + filename + remove)                                     |
| [`PerformanceEditorVideosDropZone`](components/performance/PerformanceEditorVideosDropZone.tsx) | Section-level video drop in the performance editor                                    |
| [`PerformanceEditorVideoCard`](components/performance/PerformanceEditorVideoCard.tsx)           | Saved video card in edit mode (preview + link field + actions)                        |
| [`PerformanceSavedVideoPreview`](components/performance/PerformanceSavedVideoPreview.tsx)       | Inline playback preview for saved Drive / YouTube / URL clips                         |
| [`PerformanceVideoCompactRow`](components/performance/PerformanceVideoCompactRow.tsx)           | Compact saved video row (log flow / context summary)                                  |
| [`PerformanceExtraVideosChip`](components/performance/PerformanceExtraVideosChip.tsx)           | Clickable **+N videos** chip; opens browse popover (play / open any clip)             |
| [`PerformanceVideoPlayableThumb`](components/performance/PerformanceVideoPlayableThumb.tsx)     | Thumbnail + play/pause overlay for list and browse popover rows                       |
| [`PerformanceVideoInlineLinkField`](components/performance/PerformanceVideoInlineLinkField.tsx) | Per-row link input + Revert + Drive feedback                                          |

Implement new performance UI by extending these — do not add a third parallel link/upload block on the dialog.

## Interaction checklist

Before shipping performance UI changes:

1. Can a user point to **one box** and say “everything here is this video’s source”?
2. Are performance details editable in only one place (no disabled fields mimicking inputs)?
3. Is the primary button the obvious next step (`Save`, `Log performance`, `Add video`)?
4. If the dialog needs a third section, consider the **performance detail page** instead.
5. **Primary vs promote** — same control type, size, and slot (`PerformanceVideoPrimaryRowAction`); primary badge on thumb uses `PerformanceVideoPrimaryBadge`, not a second star style.
6. **List playback** — click thumbnail to play (`PerformanceVideoPlayableThumb`); no redundant play icon beside it.
7. **Color** — fuchsia-forward soft surfaces in modals (`tone="soft"`, `encoreSoftPinkWash`); avoid heavy dark-violet body text on upload controls.
8. **Tests** — extend the nearest `*.test.ts` for new behavior; run `npm run presubmit` before handoff.

## Add-track menu checklist (song media hub)

Regression guard for `EncoreMediaTrackAddMenu` and chart add menu on the song page. E2e: `e2e/smoke/encore-add-track-menu.spec.ts`.

| Rule                                                                       | Why                                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **No `Fragment` as direct `Menu` child**                                   | MUI logs console errors; breaks Add chart and other menu actions |
| **Spotify results in portaled Popper**                                     | Avoid fixed empty slot / layout shift in the dropdown            |
| **Seed Spotify search on field focus**, not on menu open                   | Prevents surprise network calls when opening the menu            |
| **Open chart menu immediately**; run Drive folder prep on menu action only | Awaiting Drive before open made Add chart feel broken            |
| **Paste and Search are separate fields**                                   | One combined field confused Spotify vs link paste                |
| **Import `ensureSpotifyAccessToken` from `spotify/pkce.ts`**               | Wrong import path crashes the app on menu mount                  |

## Agent preflight (performance UI)

When implementing performance UX in a session:

1. Read this file + [`AGENTS.md`](../../AGENTS.md) task row for performance UX.
2. Prefer extending the component map above — do not add parallel upload/link/play patterns.
3. Run **`npm run presubmit`** before declaring done (catches type/lint/knip/test gaps).
4. After route-level or provider-adjacent edits, **hard-refresh** and open `#/library` or the affected song/practice view — Vite HMR can leave React context broken even when tests pass.
