/**
 * Chip `value`s for “unset / blank” filters. Keep stable — persisted prefs may reference them.
 */
export const ENCORE_FILTER_SENTINEL = {
  blankArtist: '__encore_blank_artist__',
  blankTags: '__encore_blank_tags__',
  /** Repertoire: song has no performances (Venues column empty). */
  repertoireNoPerformances: '__encore_repertoire_no_performances__',
  blankKey: '__encore_empty_key__',
  /** Performance row: raw venue tag is empty (before “Venue” fallback label). */
  blankPerfVenue: '__encore_blank_perf_venue__',
  blankAccompaniment: '__encore_blank_accompaniment__',
  /** Performance row: date doesn’t start with a four-digit year. */
  blankYear: '__encore_blank_year__',
  unknownSong: '__encore_unknown_song__',
} as const;
