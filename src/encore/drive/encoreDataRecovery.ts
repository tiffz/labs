import type {
  EncorePerformance,
  EncoreSong,
  EncoreSongAttachment,
} from '../types';
import {
  SONG_MERGE_POLICY,
  mergeExerciseRunLists,
  songExerciseAnswerCount,
  songMergePolicyKeys,
} from './encoreRepertoireMerge';

/**
 * Generalized data-loss recovery from history (Drive revisions + local pre-sync snapshots).
 *
 * The "Because of You" incident (ADR 0019) was an exercise-answer loss, but the same root cause —
 * a sparser copy overwriting a richer one during sync — can wipe *any* repertoire content: whole
 * songs, media/file references, misc resources, lyrics, journals, and logged performances. Every
 * historical snapshot deserializes the full repertoire, so one generic scan can reconstruct the
 * richest copy of each entity and offer back exactly what is missing now.
 *
 * Guiding invariant (identical to the answer-recovery engine): **restore can only ever ADD content
 * the user no longer has; it never downgrades or overwrites something present locally.** Selection
 * is per song, per category, so an intentional delete is opt-in, never silently re-applied.
 */

/** One historical copy of the repertoire (a Drive revision or a local undo snapshot). */
export type RepertoireHistorySnapshot = {
  /** `rev:<driveRevisionId>` or `local:<createdAtMs>` — for provenance only. */
  sourceId: string;
  modifiedTime?: string;
  songs: EncoreSong[];
  performances: EncorePerformance[];
};

/** Per-song recoverable content categories, each a single per-(song,category) toggle in the UI. */
export type RecoveryCategory =
  | 'exerciseAnswers'
  | 'mediaRefs'
  | 'miscResources'
  | 'lyrics'
  | 'journal'
  | 'deletedPerformances';

export type RecoveryDelta = {
  category: RecoveryCategory;
  /** Discrete items restore would add (answers, links/attachments, resources, performances). */
  count: number;
  /** Short human chip label, e.g. "3 media links", "9 answers", "lyrics", "2 performances". */
  label: string;
};

export type SongRecoveryEntry = {
  songId: string;
  title: string;
  artist?: string;
  /** The whole song row is gone locally and would be recreated from history. */
  songMissingLocally: boolean;
  /** modifiedTime of the richest historical copy (for "found a copy from …" provenance). */
  sourceModifiedTime?: string;
  /** Recoverable categories for this song (only those where history adds content). */
  deltas: RecoveryDelta[];
  /** Non-destructive superset of current + history — the source of truth a restore copies from. */
  recoveredSong: EncoreSong;
  /** Logged performances for this song that are missing locally and would be recreated. */
  recoveredPerformances: EncorePerformance[];
  /** Total discrete recoverable items across all categories (for sorting + summary copy). */
  totalRecoverable: number;
};

/** Song fields each category owns — used by {@link buildSongRestore} to apply only chosen categories. */
const CATEGORY_SONG_FIELDS: Record<
  Exclude<RecoveryCategory, 'deletedPerformances'>,
  (keyof EncoreSong)[]
> = {
  exerciseAnswers: ['practiceExerciseRuns'],
  mediaRefs: [
    'referenceLinks',
    'backingLinks',
    'attachments',
    'recordingDriveFileIds',
    'youtubeVideoId',
    'spotifyTrackId',
  ],
  miscResources: ['miscResources'],
  lyrics: ['lyricsSourceGenius'],
  journal: ['journalMarkdown'],
};

function isBlankText(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

function unionById<T extends { id: string }>(
  current: T[] | undefined,
  history: T[] | undefined,
): T[] | undefined {
  if (!current?.length && !history?.length) return undefined;
  const byId = new Map<string, T>();
  for (const item of current ?? []) byId.set(item.id, item);
  for (const item of history ?? []) if (!byId.has(item.id)) byId.set(item.id, item);
  return [...byId.values()];
}

function unionAttachments(
  current: EncoreSongAttachment[] | undefined,
  history: EncoreSongAttachment[] | undefined,
): EncoreSongAttachment[] | undefined {
  if (!current?.length && !history?.length) return undefined;
  const byKey = new Map<string, EncoreSongAttachment>();
  for (const att of current ?? []) byKey.set(att.driveFileId, att);
  for (const att of history ?? []) if (!byKey.has(att.driveFileId)) byKey.set(att.driveFileId, att);
  return [...byKey.values()];
}

function unionStrings(
  current: string[] | undefined,
  history: string[] | undefined,
): string[] | undefined {
  if (!current?.length && !history?.length) return undefined;
  const set = new Set<string>([...(current ?? []), ...(history ?? [])]);
  return [...set];
}

/**
 * Union one historical copy into the accumulator. Accumulator content always wins for scalars.
 *
 * Driven field-by-field from {@link SONG_MERGE_POLICY} (see `encoreRepertoireMerge.ts`): every
 * `EncoreSong` key is routed by its disposition, so a newly added synced field cannot be silently
 * dropped from the richest-copy reconstruction — it must be classified in the policy (compile-
 * enforced) and is processed here at runtime. `acc` (the richer/current copy) wins scalars; `hist`
 * only contributes content `acc` is missing.
 */
function unionSongPair(acc: EncoreSong, hist: EncoreSong): EncoreSong {
  const next: EncoreSong = { ...acc };
  const write = (key: keyof EncoreSong, value: unknown) => {
    (next as unknown as Record<string, unknown>)[key] = value;
  };

  for (const key of songMergePolicyKeys()) {
    const policy = SONG_MERGE_POLICY[key];
    switch (policy) {
      case 'lww':
        // `acc` wins: next[key] already carries the accumulator's value.
        break;
      case 'exercise-runs': {
        const runs = mergeExerciseRunLists(acc.practiceExerciseRuns, hist.practiceExerciseRuns);
        if (runs) next.practiceExerciseRuns = runs;
        break;
      }
      case 'union-by-id': {
        const merged = unionById<{ id: string }>(
          acc[key] as { id: string }[] | undefined,
          hist[key] as { id: string }[] | undefined,
        );
        if (merged) write(key, merged);
        break;
      }
      case 'union-by-drive-file-id': {
        const merged = unionAttachments(acc.attachments, hist.attachments);
        if (merged) next.attachments = merged;
        break;
      }
      case 'union-scalar-set': {
        const merged = unionStrings(acc.recordingDriveFileIds, hist.recordingDriveFileIds);
        if (merged) next.recordingDriveFileIds = merged;
        break;
      }
      case 'preserve-filled-text': {
        const accText = acc[key] as string | undefined;
        const histText = hist[key] as string | undefined;
        if (isBlankText(accText) && !isBlankText(histText)) write(key, histText);
        break;
      }
      case 'preserve-filled-scalar': {
        const accVal = acc[key] as string | undefined;
        const histVal = hist[key] as string | undefined;
        write(key, accVal ?? histVal);
        break;
      }
      default: {
        const exhaustive: never = policy;
        throw new Error(`Unhandled song merge policy: ${String(exhaustive)}`);
      }
    }
  }

  return next;
}

function mediaRefCount(song: EncoreSong): number {
  return (
    (song.referenceLinks?.length ?? 0) +
    (song.backingLinks?.length ?? 0) +
    (song.attachments?.length ?? 0) +
    (song.recordingDriveFileIds?.length ?? 0) +
    (song.youtubeVideoId ? 1 : 0) +
    (song.spotifyTrackId ? 1 : 0)
  );
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildDeltas(current: EncoreSong | undefined, recovered: EncoreSong): RecoveryDelta[] {
  const deltas: RecoveryDelta[] = [];

  const answerGain = songExerciseAnswerCount(recovered) - (current ? songExerciseAnswerCount(current) : 0);
  if (answerGain > 0) {
    deltas.push({ category: 'exerciseAnswers', count: answerGain, label: pluralize(answerGain, 'answer') });
  }

  const mediaGain = mediaRefCount(recovered) - (current ? mediaRefCount(current) : 0);
  if (mediaGain > 0) {
    deltas.push({ category: 'mediaRefs', count: mediaGain, label: pluralize(mediaGain, 'media link') });
  }

  const miscGain = (recovered.miscResources?.length ?? 0) - (current?.miscResources?.length ?? 0);
  if (miscGain > 0) {
    deltas.push({ category: 'miscResources', count: miscGain, label: pluralize(miscGain, 'resource') });
  }

  if (isBlankText(current?.lyricsSourceGenius) && !isBlankText(recovered.lyricsSourceGenius)) {
    deltas.push({ category: 'lyrics', count: 1, label: 'lyrics' });
  }
  if (isBlankText(current?.journalMarkdown) && !isBlankText(recovered.journalMarkdown)) {
    deltas.push({ category: 'journal', count: 1, label: 'journal' });
  }

  return deltas;
}

/**
 * Reconstruct, per song, the richest copy across current + all history, and report which categories
 * have recoverable content. A song is included when it is missing locally, has a recoverable field
 * category, or has logged performances missing locally. Sorted by most recoverable first.
 */
export function buildDataRecoveryPlan(
  current: { songs: EncoreSong[]; performances: EncorePerformance[] },
  snapshots: RepertoireHistorySnapshot[],
): SongRecoveryEntry[] {
  const currentSongById = new Map(current.songs.map((s) => [s.id, s] as const));
  const currentPerfIds = new Set(current.performances.map((p) => p.id));

  const songIds = new Set<string>(currentSongById.keys());
  for (const snap of snapshots) for (const s of snap.songs) songIds.add(s.id);

  // Deleted performances grouped by their songId (union by performance id across snapshots).
  const recoveredPerfBySong = new Map<string, Map<string, EncorePerformance>>();
  for (const snap of snapshots) {
    for (const perf of snap.performances) {
      if (currentPerfIds.has(perf.id)) continue;
      let bucket = recoveredPerfBySong.get(perf.songId);
      if (!bucket) {
        bucket = new Map();
        recoveredPerfBySong.set(perf.songId, bucket);
      }
      if (!bucket.has(perf.id)) bucket.set(perf.id, perf);
      songIds.add(perf.songId);
    }
  }

  const entries: SongRecoveryEntry[] = [];

  for (const songId of songIds) {
    const currentSong = currentSongById.get(songId);

    // Collect historical copies with provenance, richest first so the base carries the most content.
    const historical = snapshots
      .map((snap) => ({ snap, song: snap.songs.find((s) => s.id === songId) }))
      .filter((h): h is { snap: RepertoireHistorySnapshot; song: EncoreSong } => Boolean(h.song))
      .sort((a, b) => contentScore(b.song) - contentScore(a.song));

    let recoveredSong: EncoreSong;
    let sourceModifiedTime: string | undefined;
    if (currentSong) {
      recoveredSong = { ...currentSong };
      for (const h of historical) recoveredSong = unionSongPair(recoveredSong, h.song);
    } else if (historical.length > 0) {
      recoveredSong = { ...historical[0].song };
      sourceModifiedTime = historical[0].snap.modifiedTime;
      for (const h of historical.slice(1)) recoveredSong = unionSongPair(recoveredSong, h.song);
    } else {
      // Song id only came from a deleted performance; nothing to reconstruct for the row itself.
      recoveredSong = minimalSongRow(songId);
    }

    const deltas = buildDeltas(currentSong, recoveredSong);
    if (currentSong && deltas.length > 0 && !sourceModifiedTime) {
      sourceModifiedTime = historical[0]?.snap.modifiedTime;
    }

    const recoveredPerformances = [...(recoveredPerfBySong.get(songId)?.values() ?? [])];
    if (recoveredPerformances.length > 0) {
      deltas.push({
        category: 'deletedPerformances',
        count: recoveredPerformances.length,
        label: pluralize(recoveredPerformances.length, 'performance'),
      });
    }

    const songMissingLocally = !currentSong;
    if (deltas.length === 0 && !songMissingLocally) continue;
    // A song that is missing locally but had no real content and no performances is not worth offering.
    if (songMissingLocally && deltas.length === 0) continue;

    entries.push({
      songId,
      title: recoveredSong.title?.trim() || 'Untitled song',
      artist: recoveredSong.artist?.trim() || undefined,
      songMissingLocally,
      sourceModifiedTime,
      deltas,
      recoveredSong,
      recoveredPerformances,
      totalRecoverable: deltas.reduce((acc, d) => acc + d.count, 0),
    });
  }

  return entries.sort((a, b) => b.totalRecoverable - a.totalRecoverable);
}

/** A rough "how much content" score used to pick the richest historical base for a deleted song. */
function contentScore(song: EncoreSong): number {
  return (
    songExerciseAnswerCount(song) +
    mediaRefCount(song) +
    (song.miscResources?.length ?? 0) +
    (isBlankText(song.lyricsSourceGenius) ? 0 : 1) +
    (isBlankText(song.journalMarkdown) ? 0 : 1)
  );
}

function minimalSongRow(songId: string): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: songId,
    title: 'Untitled song',
    artist: '',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
  } as EncoreSong;
}

/**
 * Build the song row to persist for a restore: starts from the live song (or the recovered superset
 * when the song is gone) and copies in **only** the selected categories' fields from the recovered
 * superset. `deletedPerformances` is handled separately by the caller. Returns `undefined` when no
 * field-bearing category is selected (e.g. the user only ticked performances).
 */
export function buildSongRestore(
  entry: SongRecoveryEntry,
  liveSong: EncoreSong | undefined,
  selectedCategories: RecoveryCategory[],
): EncoreSong | undefined {
  const fieldCategories = selectedCategories.filter(
    (c): c is Exclude<RecoveryCategory, 'deletedPerformances'> => c !== 'deletedPerformances',
  );

  if (!liveSong) {
    // Song is gone locally — recreate it. If only performances were selected there is no row to add.
    if (fieldCategories.length === 0) return undefined;
    return { ...entry.recoveredSong };
  }

  if (fieldCategories.length === 0) return undefined;
  const next: EncoreSong = { ...liveSong };
  for (const category of fieldCategories) {
    for (const field of CATEGORY_SONG_FIELDS[category]) {
      const value = entry.recoveredSong[field];
      if (value !== undefined) {
        (next as Record<keyof EncoreSong, unknown>)[field] = value;
      }
    }
  }
  return next;
}
