import { describe, expect, it } from 'vitest';
import type { BeatAnalysisResult } from './findTheBeatAnalyzer';
import { calibrationFromBeatAnalysis } from './wholeSongBeatAnalysis';

function mockBeat(overrides: Partial<BeatAnalysisResult> = {}): BeatAnalysisResult {
  return {
    bpm: 120,
    confidence: 0.9,
    confidenceLevel: 'high',
    beats: [],
    musicStartTime: 0,
    musicEndTime: 180,
    offset: 0.1,
    warnings: [],
    tempoRegions: [],
    hasTempoVariance: false,
    detectedGaps: [],
    ...overrides,
  };
}

describe('calibrationFromBeatAnalysis', () => {
  it('uses musicStartTime + offset from track start for whole-song scope', () => {
    const cal = calibrationFromBeatAnalysis(mockBeat({ musicStartTime: 2.5, offset: 0.1 }), 0);
    expect(cal.anchorMediaTime).toBeCloseTo(2.6);
    expect(cal.firstBeatOffsetSec).toBeCloseTo(2.6);
  });

  it('prefers beats[0] over musicStartTime + offset (avoids double-counting)', () => {
    const cal = calibrationFromBeatAnalysis(
      mockBeat({
        musicStartTime: 2.9,
        offset: 2.9,
        beats: [2.9, 3.3, 3.7],
      }),
      0,
    );
    expect(cal.firstBeatOffsetSec).toBeCloseTo(2.9);
    expect(cal.anchorMediaTime).toBeCloseTo(2.9);
  });

  it('reprojects Beat 1 relative to a section start', () => {
    const cal = calibrationFromBeatAnalysis(mockBeat({ musicStartTime: 2.5, offset: 0.1 }), 30);
    expect(cal.firstBeatOffsetSec).toBeCloseTo(-27.4);
    expect(cal.anchorMediaTime).toBeCloseTo(2.6);
  });
});
