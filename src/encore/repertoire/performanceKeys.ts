/**
 * Canonical performance-key options for the Repertoire/Performance inline editor.
 *
 * Singers care about the key they actually perform in (key + quality), so we offer
 * the 12 enharmonic-aware roots in major and minor. The underlying `performanceKey`
 * field stays free-form so users can type anything Spotify/their MD wrote in.
 */
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export const ENCORE_PERFORMANCE_KEY_OPTIONS: ReadonlyArray<string> = [
  ...ROOTS.map((r) => `${r} major`),
  ...ROOTS.map((r) => `${r} minor`),
];
