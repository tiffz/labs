import type {
  EncorePracticeExerciseRun,
  EncoreSong,
} from '../types';

/**
 * Content-aware, non-destructive merge for repertoire songs.
 *
 * Why this exists: exercise answers (`practiceExerciseRuns`) live *inside* the song row, and the
 * historical sync merged songs whole-row by `updatedAt` (last-writer-wins). That let a song row
 * with **zero** answers but a newer timestamp silently wipe a row with hours of answers but an
 * older timestamp — the "Because of You" data-loss incident (see ADR 0019 / LOCAL_FIRST_SYNC.md).
 *
 * The guiding principle is **never lose filled user content to an empty/sparser copy**:
 *   1. Exercise runs merge by stable run `id` (union — a run present on only one side is kept).
 *   2. For the same run id, a copy **with content always beats a copy with no content**, regardless
 *      of which timestamp is newer.
 *   3. Only when *both* copies have content do we fall back to newer-wins (genuine simultaneous
 *      edits — those should also be surfaced by the content-aware conflict dialog).
 */

const HTML_TAG = /<[^>]*>/g;

/** A practice-exercise answer field is "blank" when it has no text once HTML/whitespace is stripped. */
export function isBlankExerciseAnswer(value: string | undefined | null): boolean {
  if (!value) return true;
  return value.replace(HTML_TAG, '').replace(/&nbsp;/gi, ' ').trim().length === 0;
}

/**
 * Count the non-blank answer fields in a run — a content "richness" score used to protect filled
 * runs from being clobbered by empty ones. Higher means more of the user's work is present.
 */
export function exerciseRunAnswerCount(run: EncorePracticeExerciseRun): number {
  switch (run.kind) {
    case 'lyricsInOwnWords': {
      let count = 0;
      for (const section of run.sections ?? []) {
        for (const line of section.lines ?? []) {
          if (!isBlankExerciseAnswer(line.rewrite)) count += 1;
        }
      }
      for (const line of run.lines ?? []) {
        if (!isBlankExerciseAnswer(line.rewrite)) count += 1;
      }
      return count;
    }
    case 'lyricsSectionNarrative':
      return (run.sections ?? []).reduce(
        (acc, s) => acc + (isBlankExerciseAnswer(s.narrative) ? 0 : 1),
        0,
      );
    case 'characterNineQuestions':
      return (run.answers ?? []).reduce(
        (acc, a) => acc + (isBlankExerciseAnswer(a) ? 0 : 1),
        0,
      );
    default:
      return 0;
  }
}

/** True when a run carries any of the user's answers (not just an opened/blank draft). */
export function exerciseRunHasContent(run: EncorePracticeExerciseRun): boolean {
  return exerciseRunAnswerCount(run) > 0;
}

/** Total non-blank exercise answers across all of a song's runs (for conflict/recovery copy). */
export function songExerciseAnswerCount(song: {
  practiceExerciseRuns?: EncorePracticeExerciseRun[];
}): number {
  return (song.practiceExerciseRuns ?? []).reduce((acc, r) => acc + exerciseRunAnswerCount(r), 0);
}

/**
 * Merge two versions of the **same** exercise run (same id). Content beats empty; when both carry
 * content the richer copy wins, and an exact tie falls back to the newer `updatedAt`. This biases
 * toward preserving the user's answers rather than honoring a sparser-but-newer wall-clock.
 */
export function mergeExerciseRunPair(
  a: EncorePracticeExerciseRun,
  b: EncorePracticeExerciseRun,
): EncorePracticeExerciseRun {
  const aCount = exerciseRunAnswerCount(a);
  const bCount = exerciseRunAnswerCount(b);
  if (aCount > 0 && bCount === 0) return a;
  if (bCount > 0 && aCount === 0) return b;
  if (aCount !== bCount) return aCount > bCount ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

/**
 * Union-merge two run lists by id. Runs unique to either side are kept (never dropped — a delete
 * that is not yet expressed as a tombstone is the lesser evil vs. losing answers). Shared ids use
 * {@link mergeExerciseRunPair}. Returns `undefined` when neither side has runs.
 */
export type MergeExerciseRunListsOptions = {
  /** Run ids the user deleted — excluded from the union so remote copies cannot resurrect. */
  deletedRunIds?: ReadonlySet<string>;
};

export function mergeExerciseRunLists(
  local: EncorePracticeExerciseRun[] | undefined,
  remote: EncorePracticeExerciseRun[] | undefined,
  options?: MergeExerciseRunListsOptions,
): EncorePracticeExerciseRun[] | undefined {
  const deletedRunIds = options?.deletedRunIds;
  const filterDeleted = (runs: EncorePracticeExerciseRun[] | undefined) =>
    deletedRunIds?.size
      ? (runs ?? []).filter((run) => !deletedRunIds.has(run.id))
      : (runs ?? []);
  const filteredLocal = filterDeleted(local);
  const filteredRemote = filterDeleted(remote);
  if (!filteredLocal.length && !filteredRemote.length) return undefined;
  const byId = new Map<string, EncorePracticeExerciseRun>();
  const order: string[] = [];
  const consider = (run: EncorePracticeExerciseRun) => {
    const existing = byId.get(run.id);
    if (!existing) {
      byId.set(run.id, run);
      order.push(run.id);
    } else {
      byId.set(run.id, mergeExerciseRunPair(existing, run));
    }
  };
  for (const run of filteredLocal) consider(run);
  for (const run of filteredRemote) consider(run);
  return order.map((id) => byId.get(id)!);
}

/**
 * Merge two versions of the same song. Scalar fields follow newer-`updatedAt`-wins (we have no
 * per-field clocks), but `practiceExerciseRuns` are merged non-destructively so a newer-but-empty
 * song row can never erase the user's answers.
 */
export function mergeSongPreservingExercises(
  local: EncoreSong,
  remote: EncoreSong,
  options?: MergeExerciseRunListsOptions,
): EncoreSong {
  const base = local.updatedAt >= remote.updatedAt ? local : remote;
  const mergedRuns = mergeExerciseRunLists(local.practiceExerciseRuns, remote.practiceExerciseRuns, options);
  const merged: EncoreSong = { ...base };
  if (mergedRuns) merged.practiceExerciseRuns = mergedRuns;
  else delete merged.practiceExerciseRuns;
  return merged;
}

/**
 * Union-merge local and remote song lists by id using {@link mergeSongPreservingExercises} for the
 * overlap. Drop-in replacement for the historical `mergeRecordsByUpdatedAt` on songs.
 */
export function mergeSongRecords(
  local: EncoreSong[],
  remote: EncoreSong[],
  options?: MergeExerciseRunListsOptions,
): EncoreSong[] {
  const byId = new Map<string, EncoreSong>();
  for (const s of local) byId.set(s.id, s);
  for (const s of remote) {
    const cur = byId.get(s.id);
    byId.set(s.id, cur ? mergeSongPreservingExercises(cur, s, options) : s);
  }
  return [...byId.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}
