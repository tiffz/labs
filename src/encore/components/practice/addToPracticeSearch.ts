import type { EncorePerformance, EncoreSong } from '../../types';
import { songMatchesSearch } from '../libraryScreenHelpers';

/**
 * Result buckets for the "Add to practice" search dialog. We split into already-practicing vs
 * available so the UI can disable the "Add" action on rows that are already in the queue (and
 * surface a clear "Already practicing — go to it" affordance instead). Library order is
 * alphabetical-by-title for stability across reloads.
 */
export type AddToPracticeSearchPartition = {
  /** Library songs that match the query and are NOT yet `practicing`. The primary results. */
  available: EncoreSong[];
  /** Library songs that match the query but already have `practicing: true`. */
  alreadyPracticing: EncoreSong[];
};

const sortByTitleArtist = (a: EncoreSong, b: EncoreSong): number =>
  `${a.title} ${a.artist}`.localeCompare(`${b.title} ${b.artist}`, undefined, { sensitivity: 'base' });

/**
 * Pure partitioner. Reuses {@link songMatchesSearch} so search behaviour matches Library exactly
 * (title, artist, performance venue/date, performance key, tags). The `perfBySong` map is the
 * same one Library builds for its filter chips — callers can derive it once per render.
 */
export function partitionAddToPracticeResults(
  songs: ReadonlyArray<EncoreSong>,
  query: string,
  perfBySong: ReadonlyMap<string, ReadonlyArray<EncorePerformance>>,
): AddToPracticeSearchPartition {
  const matched: EncoreSong[] = [];
  for (const s of songs) {
    if (songMatchesSearch(s, query, perfBySong)) matched.push(s);
  }
  matched.sort(sortByTitleArtist);
  const available: EncoreSong[] = [];
  const alreadyPracticing: EncoreSong[] = [];
  for (const s of matched) {
    (s.practicing ? alreadyPracticing : available).push(s);
  }
  return { available, alreadyPracticing };
}

/**
 * Build the same shape of `perfBySong` map that {@link LibraryScreen} uses for chip filters and
 * {@link songMatchesSearch}, but inline (without LibraryScreen's larger caching strategy).
 * Cheap enough for Practice's typical library size.
 */
export function buildPerfBySongMap(
  performances: ReadonlyArray<EncorePerformance>,
): Map<string, EncorePerformance[]> {
  const map = new Map<string, EncorePerformance[]>();
  for (const p of performances) {
    const list = map.get(p.songId);
    if (list) {
      list.push(p);
    } else {
      map.set(p.songId, [p]);
    }
  }
  return map;
}
