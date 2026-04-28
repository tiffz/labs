import type { PianoScore, ScoreNote, ScorePart } from '../scoreTypes';
import { durationToBeats, midiToNoteName } from '../scoreTypes';

/** Duration token for profile, e.g. `quarter`, `eighth+dotted` */
export function durationToken(n: ScoreNote): string {
  const base = n.duration;
  return n.dotted ? `${base}+dotted` : base;
}

function pitchGroup(note: ScoreNote): string {
  if (note.rest || note.pitches.length === 0) return 'R';
  return note.pitches.map((p) => midiToNoteName(p).replace(/#/g, '#')).join('+');
}

/**
 * Human-readable music format: `{num}/{den}|m1|m2|...` where each measure is
 * space-separated `{pitches}({beats})` events; beats are in quarter-note units.
 */
export function pianoScoreToHrmf(score: PianoScore, part: ScorePart): string {
  const { numerator: num, denominator: den } = score.timeSignature;
  const header = `${num}/${den}`;
  const measureStrings: string[] = [];
  for (const measure of part.measures) {
    const parts: string[] = [];
    for (const note of measure.notes) {
      const beats = durationToBeats(note.duration, note.dotted);
      parts.push(`${pitchGroup(note)}(${beats})`);
    }
    measureStrings.push(parts.join(' '));
  }
  return `${header}|${measureStrings.join('|')}|`;
}

export function collectRhythmicProfile(part: ScorePart): string[] {
  const set = new Set<string>();
  for (const measure of part.measures) {
    for (const note of measure.notes) {
      set.add(durationToken(note));
    }
  }
  return Array.from(set).sort();
}

export function collectPitchSequence(part: ScorePart): number[] {
  const seq: number[] = [];
  for (const measure of part.measures) {
    for (const note of measure.notes) {
      if (note.rest) continue;
      const top = note.pitches[0];
      if (top !== undefined) seq.push(top);
    }
  }
  return seq;
}
