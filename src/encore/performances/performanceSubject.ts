import type { EncoreAppRoute } from '../routes/encoreAppHash';
import type { EncorePerformance, EncoreSong } from '../types';
import type { EncoreOriginalSong } from '../originals/types';

/**
 * What a performance was a performance *of*.
 *
 * A performance points at either a repertoire song (a cover she sings) or one of her own originals.
 * `EncorePerformance.subjectKind` is the discriminant and `songId` carries the id for both, so this
 * is the **only** place allowed to branch on it. Every read site that used to do
 * `songById.get(p.songId)` calls `resolvePerformanceSubject` instead — that keeps the two domains
 * coupled at one call site rather than through a module-level repertoire → originals import, and
 * means a missed site is a labelling bug rather than a silent map miss.
 */
export type PerformanceSubject =
  | { kind: 'song'; id: string; title: string; artist: string; href: string }
  | { kind: 'original'; id: string; title: string; artist: ''; href: string }
  | { kind: 'unknown'; id: string; title: string; artist: ''; href: null };

/** Label shown when the subject is not on this device (deleted, or not synced here yet). */
export const UNKNOWN_PERFORMANCE_SUBJECT_TITLE = 'Unknown song';

/** True when the row was logged against one of the owner's own songs. */
export function isOriginalPerformance(perf: Pick<EncorePerformance, 'subjectKind'>): boolean {
  return perf.subjectKind === 'original';
}

/**
 * Stable grouping key for stats and "performances by subject" maps.
 *
 * Grouping on the raw `songId` would collide a song and an original that somehow shared an id, and
 * — more importantly — reads as intent at the call site.
 */
export function performanceSubjectKey(
  perf: Pick<EncorePerformance, 'songId' | 'subjectKind'>,
): string {
  return `${perf.subjectKind ?? 'song'}:${perf.songId}`;
}

export function resolvePerformanceSubject(
  perf: Pick<EncorePerformance, 'songId' | 'subjectKind'>,
  songById: ReadonlyMap<string, EncoreSong>,
  originalById?: ReadonlyMap<string, EncoreOriginalSong>,
): PerformanceSubject {
  if (perf.subjectKind === 'original') {
    const original = originalById?.get(perf.songId);
    if (!original) {
      return {
        kind: 'unknown',
        id: perf.songId,
        title: UNKNOWN_PERFORMANCE_SUBJECT_TITLE,
        artist: '',
        href: null,
      };
    }
    return {
      kind: 'original',
      id: original.id,
      title: original.title,
      // Originals have no artist field. Leave it blank rather than substituting the owner's name —
      // that would be authorship metadata the user never wrote.
      artist: '',
      href: `#/originals/${original.id}`,
    };
  }

  const song = songById.get(perf.songId);
  if (!song) {
    return {
      kind: 'unknown',
      id: perf.songId,
      title: UNKNOWN_PERFORMANCE_SUBJECT_TITLE,
      artist: '',
      href: null,
    };
  }
  return {
    kind: 'song',
    id: song.id,
    title: song.title,
    artist: song.artist,
    href: `#/song/${song.id}`,
  };
}

/**
 * Route for a subject — an original opens its songwriting page, never `#/song/<id>`.
 *
 * Returns `null` for an unresolved subject so callers render plain text instead of a dead link.
 */
export function encoreSubjectRoute(subject: PerformanceSubject): EncoreAppRoute | null {
  if (subject.kind === 'original') return { kind: 'original', id: subject.id };
  if (subject.kind === 'song') return { kind: 'song', id: subject.id };
  return null;
}
