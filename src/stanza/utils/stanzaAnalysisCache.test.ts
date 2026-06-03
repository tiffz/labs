import { describe, expect, it } from 'vitest';
import { BEAT_ANALYSIS_VERSION, type PersistedAnalysisBundle } from '../../shared/beat/analysisVersion';
import { isStanzaAnalysisCacheStale } from './stanzaAnalysisCache';

function bundle(overrides: Partial<PersistedAnalysisBundle['metadata']> = {}): PersistedAnalysisBundle {
  return {
    beat: {
      bpm: 120,
      confidence: 1,
      confidenceLevel: 'high',
      beats: [],
      musicStartTime: 0,
      musicEndTime: 60,
      offset: 0,
      warnings: [],
    },
    metadata: {
      analysisVersion: BEAT_ANALYSIS_VERSION,
      analyzedAt: 1,
      stale: false,
      ...overrides,
    },
  };
}

describe('isStanzaAnalysisCacheStale', () => {
  it('returns false when cache is undefined', () => {
    expect(isStanzaAnalysisCacheStale(undefined)).toBe(false);
  });

  it('returns true when metadata.stale is set', () => {
    expect(isStanzaAnalysisCacheStale(bundle({ stale: true }))).toBe(true);
  });

  it('returns true when analysis version does not match current engine', () => {
    expect(isStanzaAnalysisCacheStale(bundle({ analysisVersion: 'old-version' }))).toBe(true);
  });

  it('returns false for a fresh cache at the current version', () => {
    expect(isStanzaAnalysisCacheStale(bundle())).toBe(false);
  });
});
