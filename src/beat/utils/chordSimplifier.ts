/**
 * Chord Simplification System
 *
 * Converts raw pitch data to musician-friendly chord progressions.
 * Focuses on detecting the "main" chords that define a song's harmony,
 * similar to what you'd find on a lead sheet or guitar tab.
 */

import type { PitchDetectionResult } from './pitchDetector';
import type { ChordEvent } from './chordAnalyzer';

// Chord quality templates (pitch class intervals from root)
const CHORD_TEMPLATES: { name: string; intervals: number[]; priority: number }[] = [
  // Basic triads (highest priority - what musicians actually play)
  { name: 'major', intervals: [0, 4, 7], priority: 10 },
  { name: 'minor', intervals: [0, 3, 7], priority: 10 },
  
  // Common extensions (medium priority)
  { name: '7', intervals: [0, 4, 7, 10], priority: 8 }, // Dominant 7th
  { name: 'maj7', intervals: [0, 4, 7, 11], priority: 7 },
  { name: 'm7', intervals: [0, 3, 7, 10], priority: 7 },
  
  // Less common (lower priority)
  { name: 'dim', intervals: [0, 3, 6], priority: 5 },
  { name: 'aug', intervals: [0, 4, 8], priority: 5 },
  { name: 'sus4', intervals: [0, 5, 7], priority: 4 },
  { name: 'sus2', intervals: [0, 2, 7], priority: 4 },
  { name: 'dim7', intervals: [0, 3, 6, 9], priority: 4 },
  { name: 'm7b5', intervals: [0, 3, 6, 10], priority: 4 },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Enharmonic equivalents for display
const ENHARMONIC_MAP: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
};

export interface SimplifiedChord {
  /** Time in seconds */
  time: number;
  /** Root note (e.g., "C", "F#") */
  root: string;
  /** Chord quality (e.g., "major", "minor", "7") */
  quality: string;
  /** Full chord name for display (e.g., "Cm", "F#7") */
  displayName: string;
  /** Simplified name (triad only, e.g., "Cm" even if it was "Cm7") */
  simplifiedName: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Duration until next chord change */
  duration: number;
  /** Pitch classes present in this chord */
  pitchClasses: number[];
}

export interface ChordProgression {
  /** Simplified chord changes */
  chords: SimplifiedChord[];
  /** Detected key */
  key: string;
  /** Major or minor */
  mode: 'major' | 'minor';
  /** Key confidence */
  keyConfidence: number;
  /** Unique chords used in the song */
  uniqueChords: string[];
  /** Chord progression pattern (Roman numerals) */
  pattern: string[];
}

/**
 * Detect chord from pitch class profile
 */
function detectChordFromProfile(
  profile: number[]
): { root: string; quality: string; confidence: number } | null {
  if (profile.every(v => v < 0.1)) {
    return null; // No significant pitch content
  }

  let bestMatch: { root: number; quality: string; score: number } | null = null;

  // Try each possible root note
  for (let root = 0; root < 12; root++) {
    // Try each chord template
    for (const template of CHORD_TEMPLATES) {
      let score = 0;
      let present = 0;

      // Check how well the profile matches this chord
      for (const interval of template.intervals) {
        const pitchClass = (root + interval) % 12;
        if (profile[pitchClass] > 0.2) {
          score += profile[pitchClass] * (interval === 0 ? 1.5 : 1); // Boost root note
          present++;
        }
      }

      // Penalize notes that shouldn't be there
      for (let pc = 0; pc < 12; pc++) {
        const expectedInterval = (pc - root + 12) % 12;
        if (!template.intervals.includes(expectedInterval) && profile[pc] > 0.3) {
          score -= profile[pc] * 0.3;
        }
      }

      // Require at least 2 notes present
      if (present >= 2) {
        // Apply priority weighting
        const weightedScore = score * (template.priority / 10);

        if (!bestMatch || weightedScore > bestMatch.score) {
          bestMatch = { root, quality: template.name, score: weightedScore };
        }
      }
    }
  }

  if (!bestMatch || bestMatch.score < 0.3) {
    return null;
  }

  return {
    root: NOTE_NAMES[bestMatch.root],
    quality: bestMatch.quality,
    confidence: Math.min(bestMatch.score / 2, 1),
  };
}

/**
 * Format chord name for display
 */
function formatChordName(root: string, quality: string): string {
  switch (quality) {
    case 'major':
      return root;
    case 'minor':
      return `${root}m`;
    case '7':
      return `${root}7`;
    case 'maj7':
      return `${root}maj7`;
    case 'm7':
      return `${root}m7`;
    case 'dim':
      return `${root}dim`;
    case 'aug':
      return `${root}aug`;
    case 'sus4':
      return `${root}sus4`;
    case 'sus2':
      return `${root}sus2`;
    case 'dim7':
      return `${root}dim7`;
    case 'm7b5':
      return `${root}m7b5`;
    default:
      return root;
  }
}

/**
 * Simplify chord to basic triad
 */
function simplifyChordName(root: string, quality: string): string {
  // Map extended chords to their basic triads
  const simplifications: Record<string, string> = {
    '7': 'major',
    'maj7': 'major',
    'm7': 'minor',
    'sus4': 'major', // sus chords typically resolve to major
    'sus2': 'major',
    'dim7': 'dim',
    'm7b5': 'dim',
  };

  const simpleQuality = simplifications[quality] || quality;
  return formatChordName(root, simpleQuality);
}

/**
 * Detect key from chord progression
 */
function detectKeyFromChords(chords: SimplifiedChord[]): { key: string; mode: 'major' | 'minor'; confidence: number } {
  // Count root note occurrences weighted by duration and position
  const rootCounts: number[] = new Array(12).fill(0);
  const majorMinorCounts: Record<number, { major: number; minor: number }> = {};

  for (let i = 0; i < 12; i++) {
    majorMinorCounts[i] = { major: 0, minor: 0 };
  }

  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i];
    const rootIndex = NOTE_NAMES.indexOf(chord.root);
    if (rootIndex === -1) continue;

    // Weight by duration and position (first and last chords are more important)
    const positionWeight = (i === 0 || i === chords.length - 1) ? 2 : 1;
    const weight = chord.duration * chord.confidence * positionWeight;

    rootCounts[rootIndex] += weight;

    if (chord.quality === 'minor' || chord.quality === 'm7') {
      majorMinorCounts[rootIndex].minor += weight;
    } else if (chord.quality === 'major' || chord.quality === '7' || chord.quality === 'maj7') {
      majorMinorCounts[rootIndex].major += weight;
    }
  }

  // Find most common root
  let maxCount = 0;
  let keyRoot = 0;
  for (let i = 0; i < 12; i++) {
    if (rootCounts[i] > maxCount) {
      maxCount = rootCounts[i];
      keyRoot = i;
    }
  }

  // Determine major or minor
  // Check if the relative minor (3 semitones up) is more prominent as a minor chord
  const relativeMinorRoot = (keyRoot + 9) % 12; // 3 semitones down = relative minor
  const majorEvidence = majorMinorCounts[keyRoot].major + rootCounts[keyRoot];
  const minorEvidence = majorMinorCounts[relativeMinorRoot].minor + rootCounts[relativeMinorRoot];

  const mode: 'major' | 'minor' = minorEvidence > majorEvidence * 0.8 ? 'minor' : 'major';
  const actualKeyRoot = mode === 'minor' ? relativeMinorRoot : keyRoot;

  return {
    key: NOTE_NAMES[actualKeyRoot],
    mode,
    confidence: Math.min(maxCount / (chords.length * 0.5), 1),
  };
}

/**
 * Get Roman numeral for chord in key
 */
function getRomanNumeral(chordRoot: string, keyRoot: string, keyMode: 'major' | 'minor', chordQuality: string): string {
  const chordIndex = NOTE_NAMES.indexOf(chordRoot);
  const keyIndex = NOTE_NAMES.indexOf(keyRoot);
  const interval = (chordIndex - keyIndex + 12) % 12;

  const majorNumerals = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
  const minorNumerals = ['i', 'bII', 'ii', 'III', 'iv', 'iv', '#iv', 'V', 'VI', 'vi', 'VII', 'vii'];

  const numerals = keyMode === 'minor' ? minorNumerals : majorNumerals;
  let numeral = numerals[interval] || '?';

  // Adjust case based on chord quality
  if (chordQuality === 'minor' || chordQuality === 'm7') {
    numeral = numeral.toLowerCase();
  } else if (chordQuality === 'major' || chordQuality === '7' || chordQuality === 'maj7') {
    numeral = numeral.toUpperCase();
  } else if (chordQuality === 'dim' || chordQuality === 'dim7' || chordQuality === 'm7b5') {
    numeral = numeral.toLowerCase() + '°';
  }

  return numeral;
}

/**
 * Merge consecutive same chords and filter short/weak chords
 */
function consolidateChords(
  chords: SimplifiedChord[],
  minDuration: number = 0.5
): SimplifiedChord[] {
  if (chords.length === 0) return [];

  const consolidated: SimplifiedChord[] = [];
  let current: SimplifiedChord | null = null;

  for (const chord of chords) {
    if (!current) {
      current = { ...chord };
      continue;
    }

    // If same chord, extend duration
    if (chord.simplifiedName === current.simplifiedName) {
      current.duration = (chord.time + chord.duration) - current.time;
      current.confidence = Math.max(current.confidence, chord.confidence);
    } else {
      // Different chord - save current if long enough
      if (current.duration >= minDuration || current.confidence > 0.7) {
        consolidated.push(current);
      }
      current = { ...chord };
    }
  }

  // Don't forget the last chord
  if (current && (current.duration >= minDuration || current.confidence > 0.7)) {
    consolidated.push(current);
  }

  return consolidated;
}

/**
 * Convert ML pitch detection result to simplified chord progression
 */
export function simplifyChordProgression(
  pitchResult: PitchDetectionResult,
  beatTimes?: number[]
): ChordProgression {
  const rawChords: SimplifiedChord[] = [];

  // Process each pitch class profile
  for (let i = 0; i < pitchResult.pitchClassProfiles.length; i++) {
    const { time, profile } = pitchResult.pitchClassProfiles[i];
    const nextTime = pitchResult.pitchClassProfiles[i + 1]?.time ?? time + 0.25;
    const duration = nextTime - time;

    const detected = detectChordFromProfile(profile);
    if (detected) {
      rawChords.push({
        time,
        root: detected.root,
        quality: detected.quality,
        displayName: formatChordName(detected.root, detected.quality),
        simplifiedName: simplifyChordName(detected.root, detected.quality),
        confidence: detected.confidence,
        duration,
        pitchClasses: profile.map((v, i) => v > 0.3 ? i : -1).filter(i => i >= 0),
      });
    }
  }

  // Consolidate and filter
  const chords = consolidateChords(rawChords, 0.4);

  // Snap to beats if available
  if (beatTimes && beatTimes.length > 0) {
    for (const chord of chords) {
      // Find nearest beat
      let nearestBeat = beatTimes[0];
      let minDist = Math.abs(chord.time - nearestBeat);

      for (const beat of beatTimes) {
        const dist = Math.abs(chord.time - beat);
        if (dist < minDist) {
          minDist = dist;
          nearestBeat = beat;
        }
      }

      // Snap if close enough (within 100ms)
      if (minDist < 0.1) {
        chord.time = nearestBeat;
      }
    }
  }

  // Detect key
  const keyInfo = detectKeyFromChords(chords);

  // Generate Roman numeral pattern
  const pattern = chords.map(chord =>
    getRomanNumeral(chord.root, keyInfo.key, keyInfo.mode, chord.quality)
  );

  // Get unique chords
  const uniqueChords = [...new Set(chords.map(c => c.simplifiedName))];

  return {
    chords,
    key: keyInfo.key,
    mode: keyInfo.mode,
    keyConfidence: keyInfo.confidence,
    uniqueChords,
    pattern,
  };
}

/**
 * Convert existing ChordEvent array to simplified progression
 * (for use with the existing HPCP-based chord analyzer)
 */
export function simplifyExistingChords(
  chordEvents: ChordEvent[],
  duration: number,
  beatTimes?: number[]
): ChordProgression {
  // Parse existing chord names and create SimplifiedChord objects
  const rawChords: SimplifiedChord[] = [];

  for (let i = 0; i < chordEvents.length; i++) {
    const event = chordEvents[i];
    if (event.chord === 'N') continue;

    const nextTime = chordEvents[i + 1]?.time ?? duration;
    const chordDuration = nextTime - event.time;

    // Parse chord name to extract root and quality
    const { root, quality } = parseChordName(event.chord);

    rawChords.push({
      time: event.time,
      root,
      quality,
      displayName: event.chord,
      simplifiedName: simplifyChordName(root, quality),
      confidence: event.strength,
      duration: chordDuration,
      pitchClasses: [],
    });
  }

  // Consolidate
  const chords = consolidateChords(rawChords, 0.5);

  // Snap to beats if available
  if (beatTimes && beatTimes.length > 0) {
    for (const chord of chords) {
      let nearestBeat = beatTimes[0];
      let minDist = Math.abs(chord.time - nearestBeat);

      for (const beat of beatTimes) {
        const dist = Math.abs(chord.time - beat);
        if (dist < minDist) {
          minDist = dist;
          nearestBeat = beat;
        }
      }

      if (minDist < 0.15) {
        chord.time = nearestBeat;
      }
    }
  }

  // Detect key
  const keyInfo = detectKeyFromChords(chords);

  // Generate pattern
  const pattern = chords.map(chord =>
    getRomanNumeral(chord.root, keyInfo.key, keyInfo.mode, chord.quality)
  );

  const uniqueChords = [...new Set(chords.map(c => c.simplifiedName))];

  return {
    chords,
    key: keyInfo.key,
    mode: keyInfo.mode,
    keyConfidence: keyInfo.confidence,
    uniqueChords,
    pattern,
  };
}

/**
 * Parse a chord name string into root and quality
 */
function parseChordName(chordName: string): { root: string; quality: string } {
  // Handle common chord name formats
  const match = chordName.match(/^([A-G][#b]?)(.*)/);
  if (!match) {
    return { root: 'C', quality: 'major' };
  }

  let root = match[1];
  const suffix = match[2].toLowerCase();

  // Normalize enharmonics
  if (root.includes('b') && ENHARMONIC_MAP[root]) {
    root = ENHARMONIC_MAP[root];
  }

  // Parse quality from suffix
  let quality = 'major';
  if (suffix.includes('m') && !suffix.includes('maj')) {
    quality = 'minor';
  }
  if (suffix.includes('7') && !suffix.includes('maj7')) {
    if (suffix.includes('m7')) {
      quality = 'm7';
    } else {
      quality = '7';
    }
  }
  if (suffix.includes('maj7')) {
    quality = 'maj7';
  }
  if (suffix.includes('dim')) {
    quality = suffix.includes('7') ? 'dim7' : 'dim';
  }
  if (suffix.includes('aug')) {
    quality = 'aug';
  }
  if (suffix.includes('sus4')) {
    quality = 'sus4';
  }
  if (suffix.includes('sus2')) {
    quality = 'sus2';
  }

  return { root, quality };
}
