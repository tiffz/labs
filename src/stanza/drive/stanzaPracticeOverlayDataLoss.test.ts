import { describe, expect, it } from 'vitest';
import {
  buildStanzaPracticeOverlayFromRows,
  mergeStanzaPracticeOverlayIntoRows,
} from './stanzaPracticeOverlaySync';
import type { StanzaSong } from '../db/stanzaDb';

/**
 * Data-loss characterization for the Encore practice-overlay round trip.
 *
 * The overlay is written to Drive as JSON and merged back on pull. Two defects made that a
 * lossy round trip for the user's own work:
 *
 * 1. `stems` was in `OVERLAY_FIELDS`, and a stem carries a live `Blob`. `JSON.stringify` turns a
 *    `Blob` into `{}`, and the merge blind-copied that back onto the row. The result is
 *    unrecoverable by the app: the hydrate check tests `!localBlob || localBlob.size === 0`, and
 *    `{}` is truthy with `size === undefined`, so the bytes are never re-downloaded — while
 *    `URL.createObjectURL({})` throws during render.
 * 2. The generic field copy had no clock check, so an overlay entry OLDER than the local row still
 *    overwrote BPM calibration, drum pattern, transpose, original key and mix gains.
 */

function song(overrides: Partial<StanzaSong> = {}): StanzaSong {
  return {
    id: 's1',
    title: 'Song',
    createdAt: 1,
    updatedAt: 1000,
    markers: [],
    ...overrides,
  } as StanzaSong;
}

describe('practice overlay round trip', () => {
  it('never serialises stem blobs into the overlay', () => {
    const rows = [
      song({
        stems: [
          {
            id: 'stem-1',
            name: 'vocals',
            localBlob: new Blob(['audio-bytes']),
          },
        ],
      } as Partial<StanzaSong>),
    ];

    const overlay = buildStanzaPracticeOverlayFromRows(rows);
    const serialised = JSON.stringify(overlay);

    // A Blob survives `JSON.stringify` as `{}` — the corruption is invisible in the JSON itself,
    // so assert the key is absent rather than inspecting its value.
    expect(serialised).not.toContain('localBlob');
    expect(serialised).not.toContain('"stems"');
  });

  it('does not replace a real stem Blob with {} on merge', () => {
    const realBlob = new Blob(['audio-bytes']);
    const rows = [
      song({
        stems: [{ id: 'stem-1', name: 'vocals', localBlob: realBlob }],
      } as Partial<StanzaSong>),
    ];

    // Round trip exactly as Drive does.
    const overlay = JSON.parse(JSON.stringify(buildStanzaPracticeOverlayFromRows(rows)));
    const merged = mergeStanzaPracticeOverlayIntoRows(rows, overlay);

    const stem = (merged[0] as StanzaSong & { stems?: { localBlob?: unknown }[] }).stems?.[0];
    expect(stem?.localBlob).toBeInstanceOf(Blob);
  });

  it('an OLDER overlay entry cannot overwrite newer local practice settings', () => {
    const local = song({
      updatedAt: 9999,
      drumPattern: 'LOCAL-PATTERN',
      localTransposeSemitones: 3,
      drumsGain: 0.9,
    } as Partial<StanzaSong>);

    const overlay = {
      version: 1 as const,
      entries: {
        s1: {
          updatedAt: 1,
          markers: [],
          drumPattern: 'STALE-PATTERN',
          localTransposeSemitones: -5,
          drumsGain: 0.1,
        },
      },
    };

    const merged = mergeStanzaPracticeOverlayIntoRows([local], overlay as never)[0] as StanzaSong & {
      drumPattern?: string;
      localTransposeSemitones?: number;
      drumsGain?: number;
    };

    expect(merged.drumPattern).toBe('LOCAL-PATTERN');
    expect(merged.localTransposeSemitones).toBe(3);
    expect(merged.drumsGain).toBe(0.9);
    expect(merged.updatedAt).toBe(9999);
  });

  it('a NEWER overlay entry still applies', () => {
    const local = song({ updatedAt: 1, drumPattern: 'OLD' } as Partial<StanzaSong>);
    const overlay = {
      version: 1 as const,
      entries: { s1: { updatedAt: 9999, markers: [], drumPattern: 'NEW' } },
    };

    const merged = mergeStanzaPracticeOverlayIntoRows([local], overlay as never)[0] as StanzaSong & {
      drumPattern?: string;
    };

    expect(merged.drumPattern).toBe('NEW');
  });
});
