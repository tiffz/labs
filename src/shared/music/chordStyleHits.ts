import type { TimeSignature } from './chordTypes';
import { CHORD_STYLING_PATTERNS, timeSignatureToKey } from '../../chords/data/chordStylingPatterns';

export interface ChordHit {
  offsetBeats: number;
  source: 'bass' | 'treble' | 'both';
  durationBeats: number;
}

interface PatternEvent {
  start16ths: number;
  duration16ths: number;
  isRest: boolean;
}

function parsePatternEvents(notation: string): PatternEvent[] {
  const events: PatternEvent[] = [];
  let i = 0;
  let cursor = 0;
  while (i < notation.length) {
    const char = notation[i];
    if (!char || char === ' ') {
      i += 1;
      continue;
    }
    if (char === '_') {
      let len = 1;
      let j = i + 1;
      while (j < notation.length && notation[j] === '_') {
        len += 1;
        j += 1;
      }
      events.push({ start16ths: cursor, duration16ths: len, isRest: true });
      cursor += len;
      i = j;
      continue;
    }
    if (char === 'C' || char === 'c' || /[0-9]/.test(char)) {
      let len = 1;
      let j = i + 1;
      while (j < notation.length && notation[j] === '-') {
        len += 1;
        j += 1;
      }
      events.push({ start16ths: cursor, duration16ths: len, isRest: false });
      cursor += len;
      i = j;
      continue;
    }
    if (char === '-') {
      cursor += 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  return events;
}

function sixteenthsToBeats(sixteenths: number, timeSignature: TimeSignature): number {
  const beatUnitSixteenths = 16 / timeSignature.denominator;
  return sixteenths / beatUnitSixteenths;
}

/**
 * Returns chord-hit timing hints for visual/arrangement apps.
 * Derived from shared chord style patterns so newly added styles
 * work automatically without switch updates.
 */
export function getChordHitsForStyle(
  styleId: string,
  timeSignature: TimeSignature
): ChordHit[] {
  const style = CHORD_STYLING_PATTERNS[styleId];
  const key = timeSignatureToKey(timeSignature);
  const pattern = style?.patterns[key];
  const beatsPerMeasure =
    timeSignature.numerator * (4 / timeSignature.denominator);
  if (!pattern) {
    return [{ offsetBeats: 0, source: 'both', durationBeats: beatsPerMeasure }];
  }

  const trebleEvents = parsePatternEvents(pattern.treble).filter((e) => !e.isRest);
  const bassEvents = parsePatternEvents(pattern.bass).filter((e) => !e.isRest);
  const hitByStart = new Map<number, ChordHit>();

  trebleEvents.forEach((event) => {
    const existing = hitByStart.get(event.start16ths);
    const durationBeats = sixteenthsToBeats(event.duration16ths, timeSignature);
    if (!existing) {
      hitByStart.set(event.start16ths, {
        offsetBeats: sixteenthsToBeats(event.start16ths, timeSignature),
        source: 'treble',
        durationBeats,
      });
      return;
    }
    existing.source = existing.source === 'bass' ? 'both' : existing.source;
    existing.durationBeats = Math.max(existing.durationBeats, durationBeats);
  });

  bassEvents.forEach((event) => {
    const existing = hitByStart.get(event.start16ths);
    const durationBeats = sixteenthsToBeats(event.duration16ths, timeSignature);
    if (!existing) {
      hitByStart.set(event.start16ths, {
        offsetBeats: sixteenthsToBeats(event.start16ths, timeSignature),
        source: 'bass',
        durationBeats,
      });
      return;
    }
    existing.source = existing.source === 'treble' ? 'both' : existing.source;
    existing.durationBeats = Math.max(existing.durationBeats, durationBeats);
  });

  return [...hitByStart.values()].sort((a, b) => a.offsetBeats - b.offsetBeats);
}
