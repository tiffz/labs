/**
 * Shared MIME / extension accept list for **local performance video uploads** (the per-song
 * editor dialog and the song page's performances drop zone). Kept narrower than the bulk
 * importer's list because the per-song flow uploads each file straight to Drive on Save —
 * formats outside this list are still accepted by Drive but tend to lack reliable previews on
 * the Performances grid (e.g. raw `.avi` clips render as a Drive icon).
 *
 * Use with `fileMatchesAccept` (`src/shared/utils/fileMatchesAccept.ts`).
 */
export const PERF_LOCAL_VIDEO_ACCEPT = 'video/*,.mp4,.mov,.m4v,.webm,.mkv';
