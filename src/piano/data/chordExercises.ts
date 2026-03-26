import type { PianoScore, ScoreNote, ScoreMeasure, Key, NoteDuration } from '../types';
import { generateNoteId } from '../types';
import { progressionToChords } from '../../shared/music/chordTheory';
import { generateVoicing } from '../../shared/music/chordVoicing';
import type { Chord, RomanNumeral } from '../../shared/music/chordTypes';
import { COMMON_CHORD_PROGRESSIONS } from '../../shared/music/commonChordProgressions';
import { spellRootForKey } from '../../shared/music/theory/pitchClass';

export { COMMON_CHORD_PROGRESSIONS };

export type ChordVoicingStyle = 'root' | 'inv1' | 'inv2' | 'open';
export type ChordStyleId = 'simple' | 'one-per-beat' | 'oom-pahs' | 'waltz' | 'pop-rock-ballad' | 'pop-rock-uptempo' | 'tresillo' | 'jazzy';

export interface ChordStyleOption {
  id: ChordStyleId;
  label: string;
  description: string;
  timeSignature?: { numerator: number; denominator: number };
}

export const CHORD_STYLE_OPTIONS: ChordStyleOption[] = [
  { id: 'simple', label: 'Simple', description: 'Whole note chords' },
  { id: 'one-per-beat', label: 'Per Beat', description: 'One chord strike per beat' },
  { id: 'oom-pahs', label: 'Oom-Pah', description: 'Alternating bass note and chord (LH/RH/LH/RH)' },
  { id: 'pop-rock-ballad', label: 'Pop-Rock Ballad', description: 'Pop-rock ballad with syncopated bass' },
  { id: 'pop-rock-uptempo', label: 'Pop-Rock Up Tempo', description: 'Backbeat chords on 2 & 4 with syncopated bass' },
  { id: 'tresillo', label: 'Tresillo', description: '3+3+2 rhythmic pattern used in pop, Latin, and rock' },
  { id: 'jazzy', label: 'Jazzy', description: 'Walking bass line (1-3-5-3) with swing-feel chords' },
];

function spellChordRoot(chord: Chord, key: Key): string {
  return spellRootForKey(chord.root, key);
}

export interface ChordExerciseConfig {
  progression: RomanNumeral[];
  progressionName: string;
  progressionInput?: string;
  key: Key;
  voicingStyle: ChordVoicingStyle;
  measuresPerChord: 1 | 2;
  timeSignature: { numerator: number; denominator: number };
  styleId?: ChordStyleId;
}

function chordToSymbol(chord: Chord, key: Key): string {
  const qualSuffix: Record<string, string> = {
    major: '', minor: 'm', diminished: 'dim', augmented: 'aug',
    sus2: 'sus2', sus4: 'sus4', dominant7: '7', major7: 'maj7', minor7: 'm7',
  };
  const root = spellChordRoot(chord, key);
  return `${root}${qualSuffix[chord.quality] ?? ''}`;
}

interface StylePattern {
  treble: { dur: NoteDuration; dotted?: boolean; rest?: boolean; count: number }[];
  bass: { dur: NoteDuration; dotted?: boolean; rest?: boolean; count: number; degree?: number }[];
}

function getStylePattern(styleId: ChordStyleId): StylePattern {
  switch (styleId) {
    case 'one-per-beat':
      return {
        treble: [
          { dur: 'quarter', count: 4 },
        ],
        bass: [
          { dur: 'quarter', count: 4 },
        ],
      };
    case 'oom-pahs':
      return {
        treble: [
          { dur: 'quarter', rest: true, count: 1 },
          { dur: 'quarter', count: 1 },
          { dur: 'quarter', rest: true, count: 1 },
          { dur: 'quarter', count: 1 },
        ],
        bass: [
          { dur: 'quarter', count: 1 },
          { dur: 'quarter', rest: true, count: 1 },
          { dur: 'quarter', count: 1, degree: 5 },
          { dur: 'quarter', rest: true, count: 1 },
        ],
      };
    case 'waltz':
      return {
        treble: [
          { dur: 'quarter', rest: true, count: 1 },
          { dur: 'quarter', count: 1 },
          { dur: 'quarter', count: 1 },
        ],
        bass: [
          { dur: 'quarter', count: 1 },
          { dur: 'quarter', rest: true, count: 1 },
          { dur: 'quarter', rest: true, count: 1 },
        ],
      };
    case 'pop-rock-ballad':
      return {
        treble: [
          { dur: 'quarter', count: 4 },
        ],
        bass: [
          { dur: 'quarter', dotted: true, count: 1 },
          { dur: 'eighth', count: 1 },
          { dur: 'quarter', dotted: true, count: 1 },
          { dur: 'eighth', count: 1 },
        ],
      };
    case 'tresillo':
      return {
        treble: [
          { dur: 'quarter', dotted: true, count: 1 },
          { dur: 'quarter', dotted: true, count: 1 },
          { dur: 'quarter', count: 1 },
        ],
        bass: [
          { dur: 'quarter', dotted: true, count: 1 },
          { dur: 'quarter', dotted: true, count: 1 },
          { dur: 'quarter', count: 1 },
        ],
      };
    case 'pop-rock-uptempo':
      return {
        treble: [
          { dur: 'quarter', rest: true, count: 1 },
          { dur: 'quarter', count: 1 },
          { dur: 'quarter', rest: true, count: 1 },
          { dur: 'quarter', count: 1 },
        ],
        bass: [
          { dur: 'quarter', dotted: true, count: 1 },
          { dur: 'eighth', count: 1 },
          { dur: 'quarter', dotted: true, count: 1 },
          { dur: 'eighth', count: 1 },
        ],
      };
    case 'jazzy':
      return {
        treble: [
          { dur: 'eighth', count: 2 },
          { dur: 'quarter', rest: true, count: 1 },
          { dur: 'half', rest: true, count: 1 },
        ],
        bass: [
          { dur: 'quarter', count: 1 },
          { dur: 'quarter', count: 1, degree: 3 },
          { dur: 'quarter', count: 1, degree: 5 },
          { dur: 'quarter', count: 1, degree: 3 },
        ],
      };
    case 'simple':
    default:
      return {
        treble: [{ dur: 'whole', count: 1 }],
        bass: [{ dur: 'whole', count: 1 }],
      };
  }
}

/**
 * Look up a chord tone by scale degree from the actual voicing pitches.
 * chordTones should be sorted low-to-high: [root, 3rd, 5th].
 */
function getChordToneByDegree(chordTones: number[], degree: number): number {
  const DEGREE_INDEX: Record<number, number> = { 1: 0, 3: 1, 5: 2 };
  const idx = DEGREE_INDEX[degree] ?? 0;
  return chordTones[Math.min(idx, chordTones.length - 1)];
}

const QUALITY_INTERVALS: Record<Chord['quality'], number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
};

function getBassChordTones(chord: Chord, bassRoot: number): number[] {
  const intervals = QUALITY_INTERVALS[chord.quality] ?? QUALITY_INTERVALS.major;
  return [bassRoot, bassRoot + (intervals[1] ?? 4), bassRoot + (intervals[2] ?? 7)];
}

function generateNotesFromPattern(
  pattern: StylePattern['treble'] | StylePattern['bass'],
  pitches: number[],
  symbol: string | undefined,
  isFirst: boolean,
  chordTones?: number[],
): ScoreNote[] {
  const notes: ScoreNote[] = [];
  let symbolUsed = false;
  for (const entry of pattern) {
    for (let i = 0; i < entry.count; i++) {
      let notePitches = pitches;
      if (!entry.rest && 'degree' in entry && entry.degree && chordTones && chordTones.length > 0) {
        notePitches = [getChordToneByDegree(chordTones, entry.degree)];
      }
      const note: ScoreNote = {
        id: generateNoteId(),
        pitches: entry.rest ? [] : notePitches,
        duration: entry.dur,
        dotted: entry.dotted,
        rest: entry.rest,
        chordSymbol: (!symbolUsed && isFirst && !entry.rest) ? symbol : undefined,
      };
      if (!entry.rest && isFirst) symbolUsed = true;
      notes.push(note);
    }
  }
  return notes;
}

export function generateChordProgressionScore(config: ChordExerciseConfig): PianoScore {
  const {
    progression,
    progressionName,
    progressionInput,
    key,
    voicingStyle,
    measuresPerChord,
    timeSignature,
    styleId = 'simple',
  } = config;

  const chords = progressionToChords(progression, key);
  const voicingOpts = {
    useInversions: voicingStyle === 'inv1' || voicingStyle === 'inv2',
    useOpenVoicings: voicingStyle === 'open',
    randomizeOctaves: false,
  };

  const rhMeasures: ScoreMeasure[] = [];
  const lhMeasures: ScoreMeasure[] = [];
  const pattern = getStylePattern(styleId);

  for (let ci = 0; ci < chords.length; ci++) {
    const chord = { ...chords[ci] };
    if (voicingStyle === 'inv1') chord.inversion = 1;
    if (voicingStyle === 'inv2') chord.inversion = 2;

    const trebleNotes = generateVoicing(chord, voicingOpts, 'treble');
    const bassNotes = generateVoicing(chord, voicingOpts, 'bass');
    const symbol = chordToSymbol(chord, key);

    const bassChordTones = getBassChordTones(chord, bassNotes[0]);
    for (let m = 0; m < measuresPerChord; m++) {
      const isFirst = m === 0;
      const rhNotes = generateNotesFromPattern(pattern.treble, trebleNotes, symbol, isFirst);
      const lhNotes = generateNotesFromPattern(pattern.bass, bassNotes, undefined, false, bassChordTones);
      rhMeasures.push({ notes: rhNotes });
      lhMeasures.push({ notes: lhNotes });
    }
  }

  return {
    id: `chord-prog-${key}-${progressionName}-${styleId}`,
    title: `${progressionName} in ${key}`,
    key,
    timeSignature,
    tempo: 80,
    exerciseConfig: {
      kind: 'chord-progression',
      progressionName,
      progressionNumerals: progression,
      progressionInput: progressionInput ?? progression.join('–'),
      styleId,
      voicingStyle,
      measuresPerChord,
    },
    parts: [
      { id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right', measures: rhMeasures },
      { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: lhMeasures },
    ],
  };
}
