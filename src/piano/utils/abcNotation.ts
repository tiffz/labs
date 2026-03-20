import type { PianoScore, ScorePart, ScoreNote, NoteDuration, Key } from '../types';
import { generateNoteId, durationToBeats } from '../types';

// ── Serialization helpers (score → ABC text) ─────────────────────────────

const SHARP_TO_ABC: Record<string, string> = {
  'C': 'C', 'C#': '^C', 'D': 'D', 'D#': '^D', 'E': 'E',
  'F': 'F', 'F#': '^F', 'G': 'G', 'G#': '^G', 'A': 'A', 'A#': '^A', 'B': 'B',
};
const FLAT_TO_ABC: Record<string, string> = {
  'C': 'C', 'Db': '_D', 'D': 'D', 'Eb': '_E', 'E': 'E',
  'F': 'F', 'Gb': '_G', 'G': 'G', 'Ab': '_A', 'A': 'A', 'Bb': '_B', 'B': 'B',
};

const FLAT_KEY_SET = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);
const KEY_NORM: Record<string, string> = { 'A#': 'Bb', 'D#': 'Eb', 'G#': 'Ab' };
const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const DURATION_TO_ABC_LEN: Record<NoteDuration, number> = {
  sixteenth: 1, eighth: 2, quarter: 4, half: 8, whole: 16,
};

function midiToAbcPitch(midi: number, key: string): string {
  const normalizedKey = KEY_NORM[key] || key;
  const useFlats = FLAT_KEY_SET.has(normalizedKey);
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const noteNames = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  const name = noteNames[semitone];
  const abcMap = useFlats ? FLAT_TO_ABC : SHARP_TO_ABC;
  const abcName = abcMap[name] || name;

  const accidental = abcName.startsWith('^') || abcName.startsWith('_') ? abcName[0] : '';
  const letter = accidental ? abcName.slice(1) : abcName;

  if (octave >= 5) {
    return accidental + letter.toLowerCase() + "'".repeat(octave - 5);
  } else if (octave === 4) {
    return accidental + letter.toUpperCase();
  } else {
    return accidental + letter.toUpperCase() + ','.repeat(4 - octave);
  }
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function noteToAbcDuration(dur: NoteDuration, dotted?: boolean): string {
  const baseLen = DURATION_TO_ABC_LEN[dur];
  const totalLen = dotted ? baseLen * 1.5 : baseLen;
  let num = Math.round(totalLen);
  let den = 4;
  if (!Number.isInteger(totalLen)) {
    num = Math.round(totalLen * 2);
    den = 8;
  }
  const g = gcd(num, den);
  num = num / g;
  den = den / g;
  if (den === 1) return num === 1 ? '' : String(num);
  return `${num === 1 ? '' : num}/${den}`;
}

function partToAbc(part: ScorePart, key: string): string {
  const pieces: string[] = [];
  for (const measure of part.measures) {
    const noteParts: string[] = [];
    for (const note of measure.notes) {
      if (note.rest) {
        noteParts.push('z' + noteToAbcDuration(note.duration, note.dotted));
      } else if (note.pitches.length === 1) {
        noteParts.push(midiToAbcPitch(note.pitches[0], key) + noteToAbcDuration(note.duration, note.dotted));
      } else if (note.pitches.length > 1) {
        const sorted = [...note.pitches].sort((a, b) => a - b);
        const chord = sorted.map(p => midiToAbcPitch(p, key)).join('');
        noteParts.push('[' + chord + ']' + noteToAbcDuration(note.duration, note.dotted));
      }
    }
    pieces.push(noteParts.join(' '));
  }
  return pieces.join(' | ');
}

export function scoreToAbc(score: PianoScore): string {
  const lines: string[] = [];
  const rh = score.parts.find(p => p.id === 'rh');
  const lh = score.parts.find(p => p.id === 'lh');

  if (rh) {
    const abc = partToAbc(rh, score.key);
    if (abc.replace(/[z\s|/\d]/g, '').length > 0 || abc.includes('z')) {
      lines.push('V:rh clef=treble');
      lines.push(abc);
    }
  }
  if (lh) {
    const abc = partToAbc(lh, score.key);
    if (abc.replace(/[z\s|/\d]/g, '').length > 0 || abc.includes('z')) {
      lines.push('V:lh clef=bass');
      lines.push(abc);
    }
  }
  return lines.join('\n');
}

// ── Key Signature ────────────────────────────────────────────────────────

const KEY_SIG_SHARPS_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const KEY_SIG_FLATS_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

const SHARP_KEY_COUNT: Record<string, number> = {
  'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
};
const FLAT_KEY_COUNT: Record<string, number> = {
  'F': 1, 'Bb': 2, 'Eb': 3, 'Ab': 4, 'Db': 5, 'Gb': 6, 'Cb': 7,
};

const MINOR_TO_RELATIVE_MAJOR: Record<string, string> = {
  'A': 'C', 'E': 'G', 'B': 'D', 'F#': 'A', 'C#': 'E', 'G#': 'B',
  'D': 'F', 'G': 'Bb', 'C': 'Eb', 'F': 'Ab', 'Bb': 'Db', 'Eb': 'Gb',
};

export function getKeySigAccidentals(keyStr: string): Record<string, number> {
  let key = keyStr.trim();
  let isMinor = false;
  if (/m(in(or)?)?$/i.test(key)) {
    isMinor = true;
    key = key.replace(/m(in(or)?)?$/i, '').trim();
  } else {
    key = key.replace(/maj(or)?$/i, '').trim();
  }

  if (isMinor) {
    key = MINOR_TO_RELATIVE_MAJOR[key] || 'C';
  }

  const accidentals: Record<string, number> = {};
  if (key in SHARP_KEY_COUNT) {
    const count = SHARP_KEY_COUNT[key];
    for (let i = 0; i < count; i++) accidentals[KEY_SIG_SHARPS_ORDER[i]] = 1;
  } else if (key in FLAT_KEY_COUNT) {
    const count = FLAT_KEY_COUNT[key];
    for (let i = 0; i < count; i++) accidentals[KEY_SIG_FLATS_ORDER[i]] = -1;
  }
  return accidentals;
}

function abcKeyToScoreKey(keyStr: string): Key {
  let key = keyStr.trim();
  if (/m(in(or)?)?$/i.test(key)) {
    key = key.replace(/m(in(or)?)?$/i, '').trim();
    key = MINOR_TO_RELATIVE_MAJOR[key] || 'C';
  } else {
    key = key.replace(/maj(or)?$/i, '').trim();
  }
  const VALID_KEYS = new Set<string>([
    'C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B',
  ]);
  return (VALID_KEYS.has(key) ? key : 'C') as Key;
}

// ── ABC Header Parsing ───────────────────────────────────────────────────

interface AbcHeaders {
  title?: string;
  meter?: { numerator: number; denominator: number };
  defaultNoteLength: number; // in quarter-note units (L:1/4 → 1, L:1/8 → 0.5)
  key: string;
  keySigAccidentals: Record<string, number>;
}

function parseAbcHeaders(abc: string): { headers: AbcHeaders; body: string } {
  const headers: AbcHeaders = {
    defaultNoteLength: 1,
    key: 'C',
    keySigAccidentals: {},
  };

  const lines = abc.split('\n');
  const bodyLines: string[] = [];
  let inBody = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inBody && /^[A-Za-z]:/.test(trimmed)) {
      const field = trimmed[0].toUpperCase();
      const value = trimmed.substring(2).trim();

      switch (field) {
        case 'T':
          headers.title = value;
          break;
        case 'M': {
          const mMatch = value.match(/^(\d+)\/(\d+)$/);
          if (mMatch) {
            headers.meter = {
              numerator: parseInt(mMatch[1], 10),
              denominator: parseInt(mMatch[2], 10),
            };
          }
          break;
        }
        case 'L': {
          const lMatch = value.match(/^(\d+)\/(\d+)$/);
          if (lMatch) {
            const num = parseInt(lMatch[1], 10);
            const den = parseInt(lMatch[2], 10);
            headers.defaultNoteLength = (num / den) * 4;
          }
          break;
        }
        case 'K':
          headers.key = value;
          headers.keySigAccidentals = getKeySigAccidentals(value);
          inBody = true; // K: is the last header field before music body
          break;
        // X:, R:, and other informational fields are skipped
      }
    } else {
      // V: lines and music go into body
      bodyLines.push(line);
      inBody = true;
    }
  }

  return { headers, body: bodyLines.join('\n') };
}

// ── ABC Parsing (text → score) ───────────────────────────────────────────

const ABC_PITCH_RE = /^(\^{1,2}|_{1,2}|=)?([A-Ga-g])([,']*)$/;

const ABC_NAME_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,
};

function abcPitchToMidi(
  pitchStr: string,
  keySigAccidentals: Record<string, number> = {},
): number | null {
  const m = pitchStr.match(ABC_PITCH_RE);
  if (!m) return null;
  const [, accidental, letter, octaveMod] = m;
  const isLower = letter === letter.toLowerCase();
  const baseOctave = isLower ? 5 : 4;
  let octaveShift = 0;
  for (const ch of octaveMod) {
    if (ch === "'") octaveShift++;
    if (ch === ',') octaveShift--;
  }
  const octave = baseOctave + octaveShift;
  let semitone = ABC_NAME_TO_SEMITONE[letter.toUpperCase()];
  if (semitone === undefined) return null;

  if (accidental === '^') semitone++;
  else if (accidental === '^^') semitone += 2;
  else if (accidental === '_') semitone--;
  else if (accidental === '__') semitone -= 2;
  else if (accidental === '=') { /* natural — no modification */ }
  else {
    // No explicit accidental → apply key signature
    const keySigShift = keySigAccidentals[letter.toUpperCase()];
    if (keySigShift) semitone += keySigShift;
  }

  return (octave + 1) * 12 + semitone;
}

function abcLenToDuration(
  lenStr: string,
  defaultNoteLength: number = 1,
): { duration: NoteDuration; dotted: boolean } {
  let abcMultiplier = 1;
  if (!lenStr) {
    abcMultiplier = 1;
  } else if (lenStr.includes('/')) {
    const parts = lenStr.split('/');
    const num = parts[0] === '' ? 1 : parseInt(parts[0], 10);
    const den = parseInt(parts[1], 10);
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      abcMultiplier = num / den;
    }
  } else {
    const parsed = parseInt(lenStr, 10);
    if (!isNaN(parsed)) abcMultiplier = parsed;
  }

  // Convert to quarter-note-relative beats
  const beats = abcMultiplier * defaultNoteLength;

  const DURATION_MAP: [number, NoteDuration, boolean][] = [
    [6, 'whole', true],
    [4, 'whole', false],
    [3, 'half', true],
    [2, 'half', false],
    [1.5, 'quarter', true],
    [1, 'quarter', false],
    [0.75, 'eighth', true],
    [0.5, 'eighth', false],
    [0.375, 'sixteenth', true],
    [0.25, 'sixteenth', false],
  ];

  let closest: [NoteDuration, boolean] = ['quarter', false];
  let closestDiff = Infinity;
  for (const [val, dur, dot] of DURATION_MAP) {
    const diff = Math.abs(beats - val);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = [dur, dot];
    }
  }
  return { duration: closest[0], dotted: closest[1] };
}

interface ParsedAbcToken {
  type: 'note' | 'rest' | 'chord' | 'barline' | 'voice';
  pitches?: number[];
  duration?: NoteDuration;
  dotted?: boolean;
  voiceId?: string;
}

function tokenizeAbc(
  abc: string,
  keySig: Record<string, number> = {},
  defaultNoteLength: number = 1,
): ParsedAbcToken[] {
  const tokens: ParsedAbcToken[] = [];
  let i = 0;
  const s = abc;

  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }

    // Voice declaration: V:rh clef=treble
    if (s.substring(i, i + 2) === 'V:') {
      let end = s.indexOf('\n', i);
      if (end === -1) end = s.length;
      const voiceLine = s.substring(i + 2, end).trim();
      const voiceId = voiceLine.split(/\s+/)[0];
      tokens.push({ type: 'voice', voiceId });
      i = end + 1;
      continue;
    }

    // Barlines: |, |:, :|, ||, |], |1, |2, :|2 etc.
    if (s[i] === '|' || (s[i] === ':' && i + 1 < s.length && s[i + 1] === '|')) {
      tokens.push({ type: 'barline' });
      // Consume the barline characters
      if (s[i] === ':') i++; // leading :
      i++; // |
      // Trailing : ] | or ending number
      while (i < s.length && (s[i] === ':' || s[i] === ']' || s[i] === '|')) i++;
      // Skip ending number like |1, |2
      while (i < s.length && /\d/.test(s[i])) i++;
      continue;
    }

    // Rest: z/Z followed by optional length
    if (s[i] === 'z' || s[i] === 'Z') {
      i++;
      const lenStart = i;
      while (i < s.length && /[\d/]/.test(s[i])) i++;
      const lenStr = s.substring(lenStart, i);
      const { duration, dotted } = abcLenToDuration(lenStr, defaultNoteLength);
      tokens.push({ type: 'rest', duration, dotted });
      continue;
    }

    // Chord: [CEG]dur
    if (s[i] === '[') {
      i++;
      const pitches: number[] = [];
      while (i < s.length && s[i] !== ']') {
        if (/\s/.test(s[i])) { i++; continue; }
        const pitchStart = i;
        while (i < s.length && (s[i] === '^' || s[i] === '_' || s[i] === '=')) i++;
        if (i < s.length && /[A-Ga-g]/.test(s[i])) i++;
        while (i < s.length && (s[i] === "'" || s[i] === ',')) i++;
        const pitchStr = s.substring(pitchStart, i);
        const midi = abcPitchToMidi(pitchStr, keySig);
        if (midi !== null) pitches.push(midi);
      }
      if (i < s.length && s[i] === ']') i++;
      const lenStart = i;
      while (i < s.length && /[\d/]/.test(s[i])) i++;
      const lenStr = s.substring(lenStart, i);
      const { duration, dotted } = abcLenToDuration(lenStr, defaultNoteLength);
      if (pitches.length > 0) {
        tokens.push({ type: 'chord', pitches, duration, dotted });
      }
      continue;
    }

    // Note: optional accidental, letter, optional octave modifiers, optional length
    if (/[\^_=A-Ga-g]/.test(s[i])) {
      const pitchStart = i;
      while (i < s.length && (s[i] === '^' || s[i] === '_' || s[i] === '=')) i++;
      if (i < s.length && /[A-Ga-g]/.test(s[i])) i++;
      while (i < s.length && (s[i] === "'" || s[i] === ',')) i++;
      const pitchStr = s.substring(pitchStart, i);
      const lenStart = i;
      while (i < s.length && /[\d/]/.test(s[i])) i++;
      const lenStr = s.substring(lenStart, i);
      const midi = abcPitchToMidi(pitchStr, keySig);
      const { duration, dotted } = abcLenToDuration(lenStr, defaultNoteLength);
      if (midi !== null) {
        tokens.push({ type: 'note', pitches: [midi], duration, dotted });
      }
      continue;
    }

    i++;
  }

  return tokens;
}

// ── Public: ABC → Score ──────────────────────────────────────────────────

export function abcToScore(abc: string, baseScore: PianoScore): PianoScore {
  const { headers, body } = parseAbcHeaders(abc);
  const tokens = tokenizeAbc(body, headers.keySigAccidentals, headers.defaultNoteLength);

  // Derive score metadata from headers
  const scoreKey = abcKeyToScoreKey(headers.key);
  const timeSig = headers.meter ?? baseScore.timeSignature;
  const beatsPerMeasure = (timeSig.numerator / timeSig.denominator) * 4;

  const rhNotes: ScoreNote[][] = [[]];
  const lhNotes: ScoreNote[][] = [[]];
  let currentVoice: 'rh' | 'lh' = 'rh';

  function currentNotes(): ScoreNote[][] {
    return currentVoice === 'rh' ? rhNotes : lhNotes;
  }

  function addNote(note: ScoreNote) {
    const notes = currentNotes();
    const lastMeasure = notes[notes.length - 1];
    const usedBeats = lastMeasure.reduce((sum, n) => sum + durationToBeats(n.duration, n.dotted), 0);
    const noteBeats = durationToBeats(note.duration, note.dotted);
    if (usedBeats + noteBeats > beatsPerMeasure + 0.001) {
      notes.push([note]);
    } else {
      lastMeasure.push(note);
    }
  }

  for (const token of tokens) {
    if (token.type === 'voice') {
      currentVoice = token.voiceId === 'lh' ? 'lh' : 'rh';
      continue;
    }
    if (token.type === 'barline') {
      const notes = currentNotes();
      const lastMeasure = notes[notes.length - 1];
      if (lastMeasure.length > 0) notes.push([]);
      continue;
    }
    if (token.type === 'rest') {
      addNote({
        id: generateNoteId(),
        pitches: [],
        duration: token.duration!,
        dotted: token.dotted || undefined,
        rest: true,
      });
      continue;
    }
    if (token.type === 'note' || token.type === 'chord') {
      addNote({
        id: generateNoteId(),
        pitches: token.pitches!,
        duration: token.duration!,
        dotted: token.dotted || undefined,
      });
    }
  }

  while (rhNotes.length > 1 && rhNotes[rhNotes.length - 1].length === 0) rhNotes.pop();
  while (lhNotes.length > 1 && lhNotes[lhNotes.length - 1].length === 0) lhNotes.pop();
  if (rhNotes.length === 0) rhNotes.push([]);
  if (lhNotes.length === 0) lhNotes.push([]);

  const hasHeaders = headers.meter || headers.key !== 'C';

  return {
    ...baseScore,
    ...(hasHeaders && { key: scoreKey }),
    ...(headers.meter && { timeSignature: headers.meter }),
    ...(headers.title && { title: headers.title }),
    parts: baseScore.parts.map(p => {
      if (p.id === 'rh') return { ...p, measures: rhNotes.map(notes => ({ notes })) };
      if (p.id === 'lh') return { ...p, measures: lhNotes.map(notes => ({ notes })) };
      return p;
    }),
  };
}
