import type { PianoScore, ScoreNote, ScoreMeasure, Key, NoteDuration } from '../types';
import { generateNoteId } from '../types';
import { progressionToChords } from '../../shared/music/chordTheory';
import { generateVoicing } from '../../shared/music/chordVoicing';
import type { Chord, RomanNumeral } from '../../shared/music/chordTypes';
import { parseChordSymbolToken } from '../../shared/music/chordProgressionText';
import { COMMON_CHORD_PROGRESSIONS } from '../../shared/music/commonChordProgressions';
import {
  CHORD_STYLE_OPTIONS,
  type ChordStyleId,
  type ChordStyleOption,
} from '../../shared/music/chordStyleOptions';
import { spellRootForKey } from '../../shared/music/theory/pitchClass';
import { CHORD_STYLING_PATTERNS, timeSignatureToKey } from '../../shared/music/chordStylingPatterns';

export { COMMON_CHORD_PROGRESSIONS };
export { CHORD_STYLE_OPTIONS };
export type { ChordStyleId, ChordStyleOption };

export type ChordVoicingStyle = 'root' | 'inv1' | 'inv2' | 'open' | 'voice-leading';

function spellChordRoot(chord: Chord, key: Key): string {
  return spellRootForKey(chord.root, key);
}

export interface ChordExerciseConfig {
  progression: RomanNumeral[];
  chordSymbols?: string[];
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
  const bass = chord.bassRoot ? `/${spellRootForKey(chord.bassRoot, key)}` : '';
  return `${root}${qualSuffix[chord.quality] ?? ''}${bass}`;
}

interface StylePattern {
  treble: { dur: NoteDuration; dotted?: boolean; rest?: boolean; count: number }[];
  bass: { dur: NoteDuration; dotted?: boolean; rest?: boolean; count: number; degree?: number }[];
}

function sixteenthsToDuration(
  sixteenths: number
): { dur: NoteDuration; dotted?: boolean } {
  if (sixteenths >= 16) return { dur: 'whole' };
  if (sixteenths === 12) return { dur: 'half', dotted: true };
  if (sixteenths >= 8) return { dur: 'half' };
  if (sixteenths === 6) return { dur: 'quarter', dotted: true };
  if (sixteenths >= 4) return { dur: 'quarter' };
  if (sixteenths === 3) return { dur: 'eighth', dotted: true };
  if (sixteenths >= 2) return { dur: 'eighth' };
  return { dur: 'sixteenth' };
}

function parsePatternNotation(
  notation: string
): Array<{ dur: NoteDuration; dotted?: boolean; rest?: boolean; count: number; degree?: number }> {
  const entries: Array<{ dur: NoteDuration; dotted?: boolean; rest?: boolean; count: number; degree?: number }> = [];
  let i = 0;
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
      const duration = sixteenthsToDuration(len);
      entries.push({ dur: duration.dur, dotted: duration.dotted, rest: true, count: 1 });
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
      const duration = sixteenthsToDuration(len);
      const degree = /[0-9]/.test(char) ? parseInt(char, 10) : undefined;
      entries.push({ dur: duration.dur, dotted: duration.dotted, count: 1, degree });
      i = j;
      continue;
    }
    if (char === '-') {
      i += 1;
      continue;
    }
    i += 1;
  }
  return entries;
}

function getStylePattern(
  styleId: ChordStyleId,
  timeSignature: { numerator: number; denominator: number }
): StylePattern {
  const config = CHORD_STYLING_PATTERNS[styleId];
  if (!config) {
    return {
      treble: [{ dur: 'whole', count: 1 }],
      bass: [{ dur: 'whole', count: 1 }],
    };
  }
  const key = timeSignatureToKey(timeSignature);
  const tsPattern = config.patterns[key];
  if (!tsPattern) {
    return {
      treble: [{ dur: 'whole', count: 1 }],
      bass: [{ dur: 'whole', count: 1 }],
    };
  }
  return {
    treble: parsePatternNotation(tsPattern.treble),
    bass: parsePatternNotation(tsPattern.bass),
  };
}

function scoreVoiceLeadingDistance(prev: number[], next: number[]): number {
  if (prev.length === 0 || next.length === 0) return 0;
  const len = Math.min(prev.length, next.length);
  let total = 0;
  for (let i = 0; i < len; i += 1) total += Math.abs(prev[i] - next[i]);
  return total;
}

function normalizeTrebleRange(notes: number[]): number[] {
  const minTreble = 60;
  const maxTreble = 84;
  return notes.map((note) => {
    let adjusted = note;
    while (adjusted < minTreble) adjusted += 12;
    while (adjusted > maxTreble) adjusted -= 12;
    return adjusted;
  }).sort((a, b) => a - b);
}

function buildVoiceLeadingCandidates(chord: Chord): number[][] {
  const candidates: number[][] = [];
  for (const inversion of [0, 1, 2] as const) {
    const candidate = generateVoicing(
      { ...chord, inversion },
      { useInversions: true, useOpenVoicings: false, randomizeOctaves: false },
      'treble',
    );
    candidates.push(candidate);
    candidates.push(candidate.map((note) => note + 12));
    candidates.push(candidate.map((note) => note - 12));
  }
  const deduped = new Map<string, number[]>();
  candidates.forEach((notes) => {
    const normalized = normalizeTrebleRange(notes);
    deduped.set(normalized.join(','), normalized);
  });
  return [...deduped.values()];
}

function pickVoiceLedVoicing(chord: Chord, previous: number[] | null): number[] {
  const candidates = buildVoiceLeadingCandidates(chord);
  if (candidates.length === 0) {
    return generateVoicing(
      chord,
      { useInversions: false, useOpenVoicings: false, randomizeOctaves: false },
      'treble',
    );
  }
  if (!previous) return candidates[0];

  let best = candidates[0];
  let bestScore = scoreVoiceLeadingDistance(previous, best);
  for (const candidate of candidates.slice(1)) {
    const score = scoreVoiceLeadingDistance(previous, candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
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
    chordSymbols,
    progressionName,
    progressionInput,
    key,
    voicingStyle,
    measuresPerChord,
    timeSignature,
    styleId = 'simple',
  } = config;

  const parsedSymbolChords = (chordSymbols ?? []).map((symbol) => {
    const parsed = parseChordSymbolToken(symbol);
    if (!parsed) return null;
    return {
      root: parsed.root,
      quality: parsed.quality,
      bassRoot: parsed.bassRoot,
      inversion: 0,
      octave: 4,
    } as Chord;
  });
  const canUseSymbolChords =
    parsedSymbolChords.length === progression.length &&
    parsedSymbolChords.every((chord) => chord !== null);
  const chords = canUseSymbolChords
    ? (parsedSymbolChords as Chord[])
    : progressionToChords(progression, key);
  const voicingOpts = {
    useInversions: voicingStyle === 'inv1' || voicingStyle === 'inv2',
    useOpenVoicings: voicingStyle === 'open',
    randomizeOctaves: false,
  };

  const rhMeasures: ScoreMeasure[] = [];
  const lhMeasures: ScoreMeasure[] = [];
  const pattern = getStylePattern(styleId, timeSignature);
  let previousTrebleVoicing: number[] | null = null;

  for (let ci = 0; ci < chords.length; ci++) {
    const chord = { ...chords[ci] };
    if (voicingStyle === 'inv1') chord.inversion = 1;
    if (voicingStyle === 'inv2') chord.inversion = 2;

    const trebleNotes: number[] = voicingStyle === 'voice-leading'
      ? pickVoiceLedVoicing(chord, previousTrebleVoicing)
      : generateVoicing(chord, voicingOpts, 'treble');
    const bassNotes = generateVoicing(chord, voicingOpts, 'bass');
    previousTrebleVoicing = trebleNotes;
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
    id: `chord-prog-${key}-${progressionName}-${styleId}-${voicingStyle}`,
    title: `${progressionName} in ${key}`,
    key,
    timeSignature,
    tempo: 80,
    exerciseConfig: {
      kind: 'chord-progression',
      progressionName,
      progressionNumerals: progression,
      chordSymbols: chordSymbols ?? [],
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
