import { describe, expect, it } from 'vitest';
import { generateChordProgressionScore } from './chordExercises';

function movementCost(series: number[][]): number {
  let total = 0;
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1] ?? [];
    const next = series[i] ?? [];
    const len = Math.min(prev.length, next.length);
    for (let j = 0; j < len; j += 1) total += Math.abs((next[j] ?? 0) - (prev[j] ?? 0));
  }
  return total;
}

describe('generateChordProgressionScore', () => {
  it('supports half-note chord style', () => {
    const score = generateChordProgressionScore({
      progression: ['I', 'V'],
      progressionName: 'I-V',
      key: 'C',
      voicingStyle: 'root',
      measuresPerChord: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      styleId: 'half-notes',
    });
    const rh = score.parts.find((part) => part.id === 'rh');
    const lh = score.parts.find((part) => part.id === 'lh');
    expect(rh?.measures[0]?.notes).toHaveLength(2);
    expect(rh?.measures[0]?.notes.every((note) => note.duration === 'half')).toBe(true);
    expect(lh?.measures[0]?.notes).toHaveLength(1);
    expect(lh?.measures[0]?.notes[0]?.duration).toBe('whole');
  });

  it('one-per-beat uses sustained bass root', () => {
    const score = generateChordProgressionScore({
      progression: ['I'],
      progressionName: 'I',
      key: 'C',
      voicingStyle: 'root',
      measuresPerChord: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      styleId: 'one-per-beat',
    });
    const rh = score.parts.find((part) => part.id === 'rh');
    const lh = score.parts.find((part) => part.id === 'lh');
    expect(rh?.measures[0]?.notes).toHaveLength(4);
    expect(lh?.measures[0]?.notes).toHaveLength(1);
    expect(lh?.measures[0]?.notes[0]?.duration).toBe('whole');
  });

  it('supports eighth-note chord style', () => {
    const score = generateChordProgressionScore({
      progression: ['I'],
      progressionName: 'I',
      key: 'C',
      voicingStyle: 'root',
      measuresPerChord: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      styleId: 'eighth-notes',
    });
    const rh = score.parts.find((part) => part.id === 'rh');
    expect(rh?.measures[0]?.notes).toHaveLength(8);
    expect(rh?.measures[0]?.notes.every((note) => note.duration === 'eighth')).toBe(true);
  });

  it('voice-leading voicing minimizes movement versus root position baseline', () => {
    const progression: ('I' | 'V' | 'vi' | 'IV')[] = ['I', 'V', 'vi', 'IV'];
    const root = generateChordProgressionScore({
      progression,
      progressionName: 'I-V-vi-IV',
      key: 'C',
      voicingStyle: 'root',
      measuresPerChord: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      styleId: 'simple',
    });
    const voiceLed = generateChordProgressionScore({
      progression,
      progressionName: 'I-V-vi-IV',
      key: 'C',
      voicingStyle: 'voice-leading',
      measuresPerChord: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      styleId: 'simple',
    });

    const rootRh = root.parts.find((part) => part.id === 'rh');
    const voiceLedRh = voiceLed.parts.find((part) => part.id === 'rh');
    const rootShapes = (rootRh?.measures ?? []).map((measure) => measure.notes[0]?.pitches ?? []);
    const voiceLedShapes = (voiceLedRh?.measures ?? []).map((measure) => measure.notes[0]?.pitches ?? []);
    expect(movementCost(voiceLedShapes)).toBeLessThanOrEqual(movementCost(rootShapes));
  });

  it('respects sus qualities from parsed chord symbols', () => {
    const score = generateChordProgressionScore({
      progression: ['I', 'V', 'IV', 'I'],
      chordSymbols: ['C', 'G', 'F', 'Csus4'],
      progressionName: 'I-V-IV-Isus4',
      key: 'C',
      voicingStyle: 'root',
      measuresPerChord: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      styleId: 'simple',
    });
    const rh = score.parts.find((part) => part.id === 'rh');
    const lastChordPitches = rh?.measures[3]?.notes[0]?.pitches ?? [];
    // Csus4 should contain F (65) and should not contain E (64).
    expect(lastChordPitches).toContain(65);
    expect(lastChordPitches).not.toContain(64);
  });
});
