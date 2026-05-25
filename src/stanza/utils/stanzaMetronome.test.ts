import { describe, expect, it } from 'vitest';
import { deriveSegments } from './segments';
import {
  beatOffsetFromTapsExtrapolated,
  bpmAnchorFromTaps,
  buildStanzaSegmentCalibration,
  calibrationEffectiveAnchorMediaTime,
  inheritedFirstBeatOffsetSecFromSongCalibration,
  resolveTapPlaybackStartSec,
  STANZA_METRONOME_TAP_COUNT,
} from './stanzaMetronome';

describe('calibrationEffectiveAnchorMediaTime', () => {
  it('uses firstBeatOffsetSec when present', () => {
    const cal = {
      bpm: 120,
      anchorMediaTime: 99,
      firstBeatOffsetSec: 1.25,
      source: 'tap' as const,
    };
    expect(calibrationEffectiveAnchorMediaTime(10, cal)).toBeCloseTo(11.25, 5);
  });

  it('falls back to anchorMediaTime when offset omitted', () => {
    const cal = { bpm: 120, anchorMediaTime: 3.5, source: 'tap' as const };
    expect(calibrationEffectiveAnchorMediaTime(10, cal)).toBeCloseTo(3.5, 5);
  });
});

describe('buildStanzaSegmentCalibration', () => {
  it('keeps anchor and offset in sync', () => {
    const cal = buildStanzaSegmentCalibration({
      segmentStart: 12,
      bpm: 146.2,
      firstBeatOffsetSec: 0.4,
      source: 'analysis',
      confidence: 0.45,
    });
    expect(cal.bpm).toBe(146.2);
    expect(cal.firstBeatOffsetSec).toBeCloseTo(0.4, 5);
    expect(cal.anchorMediaTime).toBeCloseTo(12.4, 5);
    expect(cal.source).toBe('analysis');
    expect(cal.confidence).toBe(0.45);
  });
});

describe('bpmAnchorFromTaps', () => {
  it('derives BPM and anchor from tap times', () => {
    const taps = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];
    const r = bpmAnchorFromTaps(taps, 0);
    expect(r).not.toBeNull();
    expect(r!.bpm).toBe(120);
    expect(r!.anchorMediaTime).toBeCloseTo(1.0, 5);
  });

  it('applies nudge in seconds', () => {
    const taps = [2, 2.5, 3, 3.5];
    const r = bpmAnchorFromTaps(taps, 1000);
    expect(r).not.toBeNull();
    expect(r!.anchorMediaTime).toBeCloseTo(3, 5);
  });

  it('returns null for too few taps', () => {
    expect(bpmAnchorFromTaps([1], 0)).toBeNull();
  });

  it('ignores outlier intervals when enough taps are present', () => {
    const taps = [1.0, 1.5, 2.0, 2.5, 3.5, 4.0, 4.5, 5.0];
    const r = bpmAnchorFromTaps(taps, 0);
    expect(r).not.toBeNull();
    expect(r!.bpm).toBe(120);
  });
});

describe('beatOffsetFromTapsExtrapolated', () => {
  it('extrapolates Beat 1 at section start when taps begin mid-section', () => {
    const taps = [30.0, 30.5, 31.0, 31.5, 32.0, 32.5, 33.0, 33.5];
    const r = beatOffsetFromTapsExtrapolated(taps, 0, 0);
    expect(r).not.toBeNull();
    expect(r!.bpm).toBe(120);
    expect(r!.firstBeatOffsetSec).toBeCloseTo(0, 3);
    expect(r!.anchorMediaTime).toBeCloseTo(0, 3);
  });

  it('keeps Beat 1 near the first tap when tapping from section start', () => {
    const taps = [0.05, 0.55, 1.05, 1.55, 2.05, 2.55, 3.05, 3.55];
    const r = beatOffsetFromTapsExtrapolated(taps, 0, 0);
    expect(r).not.toBeNull();
    expect(r!.bpm).toBe(120);
    expect(r!.firstBeatOffsetSec).toBeCloseTo(0.05, 3);
  });

  it('projects Beat 1 relative to a non-zero section start', () => {
    const taps = [40.0, 40.5, 41.0, 41.5, 42.0, 42.5, 43.0, 43.5];
    const r = beatOffsetFromTapsExtrapolated(taps, 30, 0);
    expect(r).not.toBeNull();
    expect(r!.bpm).toBe(120);
    expect(r!.firstBeatOffsetSec).toBeCloseTo(0, 3);
    expect(r!.anchorMediaTime).toBeCloseTo(30, 3);
  });
});

describe('resolveTapPlaybackStartSec', () => {
  it('uses playhead when it is inside the section', () => {
    const r = resolveTapPlaybackStartSec({
      playheadSec: 42,
      timingScope: 'section',
      segmentStart: 30,
      segmentEnd: 60,
      songDurationSec: 120,
    });
    expect(r.fromPlayhead).toBe(true);
    expect(r.startSec).toBe(42);
  });

  it('falls back to section start when playhead is outside the section', () => {
    const r = resolveTapPlaybackStartSec({
      playheadSec: 12,
      timingScope: 'section',
      segmentStart: 30,
      segmentEnd: 60,
      songDurationSec: 120,
    });
    expect(r.fromPlayhead).toBe(false);
    expect(r.startSec).toBe(30);
  });

  it('uses playhead for whole-song scope', () => {
    const r = resolveTapPlaybackStartSec({
      playheadSec: 45,
      timingScope: 'song',
      segmentStart: 0,
      segmentEnd: 120,
      songDurationSec: 120,
    });
    expect(r.fromPlayhead).toBe(true);
    expect(r.startSec).toBe(45);
  });
});

describe('inheritedFirstBeatOffsetSecFromSongCalibration', () => {
  it('aligns first downbeat at or after the section start', () => {
    const song = buildStanzaSegmentCalibration({
      segmentStart: 0,
      bpm: 60,
      firstBeatOffsetSec: 0,
      source: 'tap',
    });
    expect(inheritedFirstBeatOffsetSecFromSongCalibration(2.3, song)).toBeCloseTo(0.7, 5);
  });
});

describe('segment metronome keys align with deriveSegments', () => {
  it('uses stable ids for lookup', () => {
    const markers = [
      { id: 'a', time: 0, label: 'A' },
      { id: 'b', time: 10, label: 'B' },
    ];
    const segs = deriveSegments(markers, 100);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.id).toMatch(/^stanzaSeg:/);
    expect(STANZA_METRONOME_TAP_COUNT).toBe(8);
  });
});
