import { getChordHitsForStyle } from './chordStyleHits';
import type { ChordStyleId } from './chordStyleOptions';
import { chordSymbolToTheoryChord } from './chordSymbolToTheoryChord';
import type { TimeSignature } from './chordTypes';
import { generateVoicing } from './chordVoicing';
import { midiToFrequency } from './noteMath';
import type { Instrument } from '../playback/instruments';

const TREBLE_VOICING = {
  useInversions: false,
  useOpenVoicings: true,
  randomizeOctaves: false,
} as const;

const BASS_VOICING = {
  useInversions: false,
  useOpenVoicings: false,
  randomizeOctaves: false,
} as const;

export type ScheduleStyledChordMeasureParams = {
  symbol: string;
  styleId: ChordStyleId;
  instrument: Instrument;
  measureStartTime: number;
  measureDurationSec: number;
  timeSignature: TimeSignature;
  velocity: number;
};

/** Schedule styled chord hits across one measure using Web Audio absolute times. */
export function scheduleStyledChordMeasure({
  symbol,
  styleId,
  instrument,
  measureStartTime,
  measureDurationSec,
  timeSignature,
  velocity,
}: ScheduleStyledChordMeasureParams): boolean {
  if (velocity <= 0) return false;

  const chord = chordSymbolToTheoryChord(symbol);
  if (!chord) return false;

  const treble = generateVoicing(chord, TREBLE_VOICING, 'treble');
  const bass = generateVoicing(chord, BASS_VOICING, 'bass');
  const chordPitches = [...new Set([...bass.slice(0, 1), ...treble.slice(0, 4)])];
  if (chordPitches.length === 0) return false;

  const beatsPerMeasure = timeSignature.numerator * (4 / timeSignature.denominator);
  const secPerBeat = measureDurationSec / Math.max(0.001, beatsPerMeasure);
  const patternHits = getChordHitsForStyle(styleId, timeSignature);

  patternHits.forEach((hit) => {
    const hitPitches =
      hit.source === 'bass'
        ? bass.slice(0, 1)
        : hit.source === 'treble'
          ? treble.slice(0, 4)
          : chordPitches;
    const uniqueHitPitches = [...new Set(hitPitches)];
    const hitStart = measureStartTime + hit.offsetBeats * secPerBeat;
    const hitDuration = Math.max(0.12, hit.durationBeats * secPerBeat * 0.95);
    uniqueHitPitches.forEach((midi) => {
      instrument.playNote({
        frequency: midiToFrequency(midi),
        startTime: hitStart,
        duration: hitDuration,
        velocity,
      });
    });
  });

  return true;
}
