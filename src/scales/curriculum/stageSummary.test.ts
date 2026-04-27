import { describe, it, expect } from 'vitest';
import { formatOctaveLabel, formatStageSummary } from './stageSummary';
import type { Stage } from './types';

function stage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: 'stage-test',
    stageNumber: 1,
    label: 'Test stage',
    description: 'Test description',
    hand: 'right',
    useTempo: false,
    bpm: 0,
    useMetronome: false,
    subdivision: 'none',
    mutePlayback: false,
    octaves: 1,
    ...overrides,
  };
}

describe('formatOctaveLabel', () => {
  it('singular for one octave', () => {
    expect(formatOctaveLabel(1)).toBe('1 octave');
  });

  it('plural for two octaves', () => {
    expect(formatOctaveLabel(2)).toBe('2 octaves');
  });
});

describe('formatStageSummary', () => {
  it('includes the octave label on free-tempo stages', () => {
    expect(formatStageSummary(stage({ useTempo: false, hand: 'right', octaves: 1 })))
      .toBe('right hand, free tempo, 1 octave');
  });

  it('includes the octave label on tempo stages with quarter notes', () => {
    expect(
      formatStageSummary(
        stage({ useTempo: true, bpm: 72, hand: 'both', subdivision: 'none', octaves: 1 }),
      ),
    ).toBe('quarter notes at 72 BPM, both hands, 1 octave');
  });

  it('uses the plural form on 2-octave stages', () => {
    expect(
      formatStageSummary(
        stage({ useTempo: true, bpm: 72, hand: 'both', subdivision: 'none', octaves: 2 }),
      ),
    ).toBe('quarter notes at 72 BPM, both hands, 2 octaves');
  });

  it('preserves the subdivision label alongside octaves', () => {
    expect(
      formatStageSummary(
        stage({
          useTempo: true,
          bpm: 60,
          hand: 'both',
          subdivision: 'sixteenth',
          octaves: 2,
        }),
      ),
    ).toBe('sixteenth notes at 60 BPM, both hands, 2 octaves');
  });
});
