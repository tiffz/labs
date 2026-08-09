import { describe, expect, it } from 'vitest';
import { collectStanzaTempoGroundTruth, tappedGroundTruthBpm } from './stanzaTempoEval';
import type { StanzaSong } from '../db/stanzaDb';

/**
 * The eval is only worth running if its ground truth is independent of the detector.
 *
 * `metronomeSongCalibration.source` distinguishes a tempo the user TAPPED from one the analyzer
 * WROTE. Scoring against an analysis-sourced calibration would compare the detector to itself and
 * report ~100% forever — the same circularity that made `bpmAccuracyTest.ts` unable to fail.
 */

function song(p: Partial<StanzaSong> = {}): StanzaSong {
  return {
    id: 's',
    ytId: null,
    title: 'Song',
    markers: [],
    stats: {},
    updatedAt: 1,
    ...p,
  } as StanzaSong;
}

describe('tempo eval ground truth', () => {
  it('accepts a tapped calibration', () => {
    const s = song({ metronomeSongCalibration: { bpm: 128, anchorMediaTime: 0, source: 'tap' } });
    expect(tappedGroundTruthBpm(s)).toBe(128);
  });

  it('REJECTS an analysis-sourced calibration', () => {
    // The whole point. If this ever returns a number, the eval becomes self-congratulatory.
    const s = song({
      metronomeSongCalibration: { bpm: 128, anchorMediaTime: 0, source: 'analysis' },
    });
    expect(tappedGroundTruthBpm(s)).toBeNull();
  });

  it('rejects a song with no calibration at all', () => {
    expect(tappedGroundTruthBpm(song())).toBeNull();
  });

  it('rejects a nonsense tempo', () => {
    expect(
      tappedGroundTruthBpm(
        song({ metronomeSongCalibration: { bpm: 0, anchorMediaTime: 0, source: 'tap' } }),
      ),
    ).toBeNull();
  });

  it('collects only the tapped rows from a mixed library', () => {
    const rows = [
      song({ id: 'a', metronomeSongCalibration: { bpm: 100, anchorMediaTime: 0, source: 'tap' } }),
      song({
        id: 'b',
        metronomeSongCalibration: { bpm: 140, anchorMediaTime: 0, source: 'analysis' },
      }),
      song({ id: 'c' }),
      song({ id: 'd', metronomeSongCalibration: { bpm: 90, anchorMediaTime: 0, source: 'tap' } }),
    ];
    expect(collectStanzaTempoGroundTruth(rows).map((r) => r.id)).toEqual(['a', 'd']);
  });
});
