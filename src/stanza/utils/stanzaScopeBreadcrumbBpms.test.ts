import { describe, expect, it } from 'vitest';
import {
  resolveStanzaDrumInheritanceMode,
  resolveStanzaScopeBreadcrumbBpms,
  resolveStanzaTempoInheritanceMode,
  stanzaEffectiveDrumPatternForSection,
  stanzaSectionHasCustomDrumPattern,
} from './stanzaScopePractice';

describe('resolveStanzaScopeBreadcrumbBpms', () => {
  it('always exposes song BPM on the parent and hides section BPM when it matches', () => {
    expect(
      resolveStanzaScopeBreadcrumbBpms({
        timingScope: 'section',
        songCalibration: { bpm: 120, anchorMediaTime: 0, firstBeatOffsetSec: 0, source: 'tap' },
      }),
    ).toEqual({ songBpm: 120, sectionBpm: null });
  });

  it('shows section BPM when it differs from the song', () => {
    expect(
      resolveStanzaScopeBreadcrumbBpms({
        timingScope: 'section',
        songCalibration: { bpm: 120, anchorMediaTime: 0, firstBeatOffsetSec: 0, source: 'tap' },
        segmentCalibration: { bpm: 96, anchorMediaTime: 0, firstBeatOffsetSec: 0, source: 'tap' },
      }),
    ).toEqual({ songBpm: 120, sectionBpm: 96 });
  });

  it('uses live rail BPM for the active scope while editing', () => {
    expect(
      resolveStanzaScopeBreadcrumbBpms({
        timingScope: 'section',
        songCalibration: { bpm: 120, anchorMediaTime: 0, firstBeatOffsetSec: 0, source: 'tap' },
        liveRailBpm: 88,
      }),
    ).toEqual({ songBpm: 120, sectionBpm: 88 });
  });
});

describe('stanzaEffectiveDrumPatternForSection', () => {
  it('inherits the whole-song pattern until a section override exists', () => {
    expect(
      stanzaEffectiveDrumPatternForSection({ drumPattern: 'D-T-K-T-' }, 'seg-a'),
    ).toEqual({ pattern: 'D-T-K-T-', source: 'song' });
    expect(
      stanzaSectionHasCustomDrumPattern('seg-a', { 'seg-a': 'D---D---' }),
    ).toBe(true);
    expect(
      stanzaEffectiveDrumPatternForSection(
        { drumPattern: 'D-T-K-T-', drumPatternBySegmentId: { 'seg-a': 'D---D---' } },
        'seg-a',
      ),
    ).toEqual({ pattern: 'D---D---', source: 'section' });
  });
});

describe('resolveStanzaTempoInheritanceMode', () => {
  it('returns direct for whole-song scope', () => {
    expect(
      resolveStanzaTempoInheritanceMode({
        timingScope: 'song',
        songCalibration: { bpm: 120, anchorMediaTime: 0, firstBeatOffsetSec: 0, source: 'tap' },
      }),
    ).toBe('direct');
  });

  it('returns custom when a section override exists', () => {
    expect(
      resolveStanzaTempoInheritanceMode({
        timingScope: 'section',
        segmentCalibration: { bpm: 96, anchorMediaTime: 0, firstBeatOffsetSec: 0, source: 'tap' },
      }),
    ).toBe('custom');
  });

  it('returns inherit when section uses song tempo', () => {
    expect(
      resolveStanzaTempoInheritanceMode({
        timingScope: 'section',
        songCalibration: { bpm: 120, anchorMediaTime: 0, firstBeatOffsetSec: 0, source: 'tap' },
      }),
    ).toBe('inherit');
  });
});

describe('resolveStanzaDrumInheritanceMode', () => {
  it('returns inherit for section scope without override', () => {
    expect(
      resolveStanzaDrumInheritanceMode({
        timingScope: 'section',
        segmentId: 'seg-a',
        song: { drumPattern: 'D-T-K-T-' },
      }),
    ).toBe('inherit');
  });

  it('returns custom when section has its own pattern', () => {
    expect(
      resolveStanzaDrumInheritanceMode({
        timingScope: 'section',
        segmentId: 'seg-a',
        song: {
          drumPattern: 'D-T-K-T-',
          drumPatternBySegmentId: { 'seg-a': 'D---D---' },
        },
      }),
    ).toBe('custom');
  });
});
