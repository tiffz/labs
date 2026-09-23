// @vitest-environment node
/**
 * A row missing `history` took down the entire originals song page — the error boundary showed
 * "Something went wrong" and the technical detail was `history is not iterable`, thrown from
 * `[...song.history].reverse()` inside OriginalsSongHeader's render.
 *
 * The type says `history: OriginalSongSnapshot[]`, required. That does not protect anything,
 * because rows do not only come from code that satisfies the type: `JSON.stringify` omits
 * `undefined`, so a row that ever held `history: undefined` loses the key entirely on a Drive
 * round-trip and comes back without it. Every other array field on this row was already defaulted
 * in `normalizeEncoreOriginalSong` for exactly this reason; `history` and `takes` were missed.
 */
import { describe, expect, it } from 'vitest';
import { normalizeEncoreOriginalSong, type EncoreOriginalSong } from './types';

const bare = (over: Record<string, unknown> = {}) =>
  ({
    id: 's1',
    title: 'Song',
    key: 'C',
    tempo: 100,
    lyricsAndChords: '[C]words',
    mainTakeId: null,
    updatedAt: 1,
    ...over,
  }) as unknown as EncoreOriginalSong;

describe('normalizeEncoreOriginalSong fills array fields that render reads unguarded', () => {
  it('defaults a missing history to an empty array', () => {
    const song = normalizeEncoreOriginalSong(bare());
    expect(Array.isArray(song.history)).toBe(true);
    // The exact operation that crashed the page.
    expect(() => [...song.history].reverse()).not.toThrow();
  });

  it('defaults a missing takes to an empty array', () => {
    const song = normalizeEncoreOriginalSong(bare());
    expect(song.takes).toEqual([]);
    expect(() => song.takes.length).not.toThrow();
  });

  it('survives an explicit undefined, which is what a Drive round-trip produces', () => {
    const song = normalizeEncoreOriginalSong(bare({ history: undefined, takes: undefined }));
    expect(song.history).toEqual([]);
    expect(song.takes).toEqual([]);
  });

  it('does not discard real history or takes', () => {
    const history = [{ timestamp: 1, lyricsAndChords: '[C]a' }];
    const takes = [{ id: 't1' }];
    const song = normalizeEncoreOriginalSong(bare({ history, takes }));
    expect(song.history).toEqual(history);
    expect(song.takes).toEqual(takes);
  });

  it('replaces a non-array rather than trusting it', () => {
    const song = normalizeEncoreOriginalSong(bare({ history: 'corrupt', takes: 42 }));
    expect(song.history).toEqual([]);
    expect(song.takes).toEqual([]);
  });
});
