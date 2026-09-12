import type { EncorePerformanceVideo } from '../types';

/**
 * Attaching a video that lives in someone else's Drive.
 *
 * A Drive link is attached by *reference* (`videoTargetDriveFileId`) — nothing is uploaded. When
 * the file belongs to someone else that reference is a slow leak: it breaks when they unshare it,
 * move it, or close the account, and it never enters the owner's Drive backup. The performance log
 * is the one thing in this app that cannot be recreated, so a video that silently is not hers is
 * the worst shape this flow can take.
 *
 * The first cut made taking a copy an explicit button next to a notice at the bottom of the add
 * strip. Three things went wrong with that, all reported from real use:
 *
 *  1. **Two entries for one video.** The link was attached optimistically before the ownership
 *     check, then the copy button appended a *second* video for the copy.
 *  2. **The notice was nowhere near the video it described**, which `PERFORMANCE_UX.md` already
 *     forbids: "Never orphan source controls ... below a video list without a clear border tying
 *     them to one video."
 *  3. **The default did the wrong thing.** Skip the button — easy, since it was buried — and the
 *     performance saved a pointer at a stranger's file. It read as "the video never uploaded",
 *     because in her Drive it never did.
 *
 * So copying is now a checked-by-default checkbox on the video's own card, and the copy runs inside
 * the ordinary save, like a device upload. This module holds the two decisions that need to be
 * right, as pure functions: which videos need copying, and how the result is folded back in.
 *
 * The load-bearing property is that a copy **rewrites the video in place**. It never appends. That
 * is what makes the duplicate structurally impossible rather than merely fixed.
 */

/** A video in the draft whose Drive file the signed-in user does not own. */
export interface ForeignVideoSource {
  /** The `EncorePerformanceVideo.id` this applies to — the anchor for in-place rewriting. */
  videoId: string;
  /** The file id as pasted: the *stranger's* file. */
  fileId: string;
  /** Drive's display name, for the checkbox caption. */
  name: string;
  /** Checkbox state. Defaults to true; the user may opt out and keep the plain reference. */
  copyRequested: boolean;
}

/** One copy to perform during save. */
export interface ForeignVideoCopyTask {
  videoId: string;
  sourceFileId: string;
  name: string;
}

/**
 * Is this source still describing the video's current target?
 *
 * A source is a statement about a file the video points at *right now*. Once the copy runs,
 * `applyForeignVideoCopies` repoints the video at the user's own copy, and the statement stops
 * being true — there is nothing foreign left to offer to copy.
 *
 * This is the single definition of "still live", because the display and the plan disagreeing is
 * what produced the report: `planForeignVideoCopies` skipped stale sources, but the card looked the
 * source up by video id alone, so "Save a copy to my Drive" kept offering to copy a file the user
 * already owned. Remembering the original upload source after the copy has no meaning; both
 * callers now ask the same question.
 */
export function isForeignVideoSourceLive(
  video: EncorePerformanceVideo | undefined,
  source: ForeignVideoSource,
): boolean {
  if (!video) return false; // removed from the draft
  return video.videoTargetDriveFileId?.trim() === source.fileId.trim();
}

/**
 * Which foreign videos still need copying at save time.
 *
 * Skips any source whose video has since been removed from the draft, and any whose file id no
 * longer matches the video's current target — both mean the row moved on and copying the old file
 * would attach something the user did not ask for.
 */
export function planForeignVideoCopies(
  videos: readonly EncorePerformanceVideo[],
  sources: readonly ForeignVideoSource[],
): ForeignVideoCopyTask[] {
  const byId = new Map(videos.map((v) => [v.id, v]));
  const tasks: ForeignVideoCopyTask[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    if (!source.copyRequested) continue;
    if (seen.has(source.videoId)) continue; // one copy per video, whatever the registry says
    if (!isForeignVideoSourceLive(byId.get(source.videoId), source)) continue;
    seen.add(source.videoId);
    tasks.push({ videoId: source.videoId, sourceFileId: source.fileId, name: source.name });
  }
  return tasks;
}

/**
 * Drop sources that no longer describe their video — after a copy, or after the link was replaced.
 *
 * The registry is per-editor-session staging state, so a dead entry has no reason to survive the
 * save that killed it.
 */
export function pruneStaleForeignVideoSources(
  sources: readonly ForeignVideoSource[],
  videos: readonly EncorePerformanceVideo[],
): ForeignVideoSource[] {
  const byId = new Map(videos.map((v) => [v.id, v]));
  return sources.filter((s) => isForeignVideoSourceLive(byId.get(s.videoId), s));
}

/**
 * Point each copied video at the copy, in place.
 *
 * Order, length, ids and the primary video are all preserved: only `videoTargetDriveFileId` moves.
 * Appending here instead is precisely the bug this module exists to prevent, so the tests assert
 * the length is unchanged.
 */
export function applyForeignVideoCopies(
  videos: readonly EncorePerformanceVideo[],
  copies: readonly { videoId: string; copiedFileId: string }[],
): EncorePerformanceVideo[] {
  if (copies.length === 0) return [...videos];
  const copiedById = new Map(copies.map((c) => [c.videoId, c.copiedFileId]));
  return videos.map((video) => {
    const copiedFileId = copiedById.get(video.id);
    if (!copiedFileId) return video;
    return {
      ...video,
      videoTargetDriveFileId: copiedFileId,
      // A copy the user owns is a plain Drive target; any shortcut/external fields from the
      // foreign reference would now describe a file this video no longer points at.
      videoShortcutDriveFileId: undefined,
      externalVideoUrl: undefined,
    };
  });
}

/**
 * Register (or replace) the foreign source for one video.
 *
 * Keyed by `videoId`, so re-pasting into the same row updates that row rather than accumulating
 * stale entries — the registry cannot grow a second record for a video it already tracks.
 */
export function upsertForeignVideoSource(
  sources: readonly ForeignVideoSource[],
  next: ForeignVideoSource,
): ForeignVideoSource[] {
  const others = sources.filter((s) => s.videoId !== next.videoId);
  return [...others, next];
}

/** Drop sources for videos that are no longer in the draft. */
export function pruneForeignVideoSources(
  sources: readonly ForeignVideoSource[],
  videos: readonly EncorePerformanceVideo[],
): ForeignVideoSource[] {
  const ids = new Set(videos.map((v) => v.id));
  return sources.filter((s) => ids.has(s.videoId));
}

/**
 * The foreign source for one video, if it still has a live one.
 *
 * Takes the video rather than just its id so the answer cannot outlive the fact: a source whose
 * file the video no longer points at is not offered.
 */
export function liveForeignSourceForVideo(
  sources: readonly ForeignVideoSource[],
  video: EncorePerformanceVideo,
): ForeignVideoSource | undefined {
  const source = sources.find((s) => s.videoId === video.id);
  if (!source) return undefined;
  return isForeignVideoSourceLive(video, source) ? source : undefined;
}

/** Flip the copy checkbox for one video. */
export function setForeignVideoCopyRequested(
  sources: readonly ForeignVideoSource[],
  videoId: string,
  copyRequested: boolean,
): ForeignVideoSource[] {
  return sources.map((s) => (s.videoId === videoId ? { ...s, copyRequested } : s));
}
