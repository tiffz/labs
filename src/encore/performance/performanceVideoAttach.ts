import type { EncorePerformanceVideo } from '../types';

/**
 * Attaching a video source to a performance, idempotently.
 *
 * `foreignDriveVideoCopy.ts` made the *copy* step structurally unable to duplicate a video. The
 * *attach* step could still do it, from the other end: the append branch of `applyLinkedVideo`
 * appended unconditionally, so applying the same link twice produced two rows for one file.
 *
 * That is not hypothetical. The debounced link handler re-fires whenever `syncVideoLinkInput`
 * changes identity, and that callback depends on the `performance` prop — which a Dexie liveQuery
 * hands back as a fresh object after every save. The input is only cleared on one success path, so
 * a link that takes any early return (staged behind `metadataLocked`, not signed in, a Drive error)
 * stays in the field and is re-applied on the next pass. Each pass appended another row.
 *
 * Identity is the Drive file id, or the external URL when there is no Drive file. Two rows pointing
 * at one file is never something a user asked for, so attach resolves to the existing row instead.
 */

export interface PerformanceVideoSourceFields {
  externalVideoUrl?: string;
  videoTargetDriveFileId?: string;
  videoShortcutDriveFileId?: string;
}

/** The video already pointing at this source, if one is attached. */
export function findPerformanceVideoBySource(
  videos: readonly EncorePerformanceVideo[],
  source: PerformanceVideoSourceFields,
): EncorePerformanceVideo | undefined {
  const driveId = source.videoTargetDriveFileId?.trim();
  if (driveId) return videos.find((v) => v.videoTargetDriveFileId?.trim() === driveId);
  const url = source.externalVideoUrl?.trim();
  if (url) return videos.find((v) => v.externalVideoUrl?.trim() === url);
  return undefined;
}

/**
 * Attach a source, appending only when it is genuinely new.
 *
 * Returns the resulting list and the id of the video that now holds the source, so the caller can
 * anchor a foreign-copy registration to it. `makeVideo` mints the row when one is needed — passed
 * in rather than called here so this stays deterministic under test.
 */
export function upsertPerformanceVideoBySource(
  videos: readonly EncorePerformanceVideo[],
  fields: PerformanceVideoSourceFields,
  makeVideo: () => EncorePerformanceVideo,
): { videos: EncorePerformanceVideo[]; videoId: string } {
  const existing = findPerformanceVideoBySource(videos, fields);
  if (existing) {
    return {
      videos: videos.map((v) =>
        v.id === existing.id
          ? {
              ...v,
              externalVideoUrl: fields.externalVideoUrl,
              videoTargetDriveFileId: fields.videoTargetDriveFileId,
              videoShortcutDriveFileId: fields.videoShortcutDriveFileId,
            }
          : v,
      ),
      videoId: existing.id,
    };
  }
  // Stamp the source onto the new row here rather than trusting `makeVideo` to carry it. The
  // post-condition this function owes its caller is that `videoId` names a video holding this
  // source — if the appended row lacked it, the next pass would find no match and append again,
  // which is the exact duplicate this function exists to prevent.
  const appended: EncorePerformanceVideo = {
    ...makeVideo(),
    externalVideoUrl: fields.externalVideoUrl,
    videoTargetDriveFileId: fields.videoTargetDriveFileId,
    videoShortcutDriveFileId: fields.videoShortcutDriveFileId,
  };
  return { videos: [...videos, appended], videoId: appended.id };
}
