/**
 * Chord Transition Probability Model
 *
 * Implements a simplified Hidden Markov Model for chord detection
 * that considers transition probabilities between chords.
 */

/**
 * Common chord progressions and their transition probabilities
 * These are based on music theory and empirical analysis of pop music.
 */

// Transition probability matrix for chords in a major key
// Format: fromChord -> toChord -> probability
// Indexed by scale degree (0 = I, 1 = ii, 2 = iii, etc.)
const MAJOR_KEY_TRANSITIONS: number[][] = [
  // From I (tonic)
  [0.1, 0.15, 0.1, 0.2, 0.25, 0.15, 0.05], // I -> [I, ii, iii, IV, V, vi, vii°]
  // From ii
  [0.1, 0.05, 0.1, 0.1, 0.4, 0.2, 0.05], // ii -> tends to V or vi
  // From iii
  [0.15, 0.1, 0.05, 0.2, 0.1, 0.35, 0.05], // iii -> tends to vi or IV
  // From IV
  [0.2, 0.1, 0.05, 0.1, 0.35, 0.1, 0.1], // IV -> tends to V or I
  // From V
  [0.45, 0.05, 0.05, 0.1, 0.1, 0.2, 0.05], // V -> strongly resolves to I
  // From vi
  [0.15, 0.2, 0.1, 0.25, 0.2, 0.05, 0.05], // vi -> tends to IV, ii, or V
  // From vii°
  [0.5, 0.1, 0.15, 0.1, 0.05, 0.05, 0.05], // vii° -> strongly resolves to I
];

// Transition probabilities for minor key (natural minor)
const MINOR_KEY_TRANSITIONS: number[][] = [
  // From i (tonic)
  [0.1, 0.1, 0.15, 0.2, 0.2, 0.15, 0.1], // i -> various
  // From ii°
  [0.1, 0.05, 0.1, 0.1, 0.4, 0.2, 0.05],
  // From III
  [0.15, 0.1, 0.05, 0.2, 0.15, 0.3, 0.05],
  // From iv
  [0.2, 0.1, 0.1, 0.1, 0.3, 0.1, 0.1],
  // From v (or V)
  [0.45, 0.05, 0.1, 0.1, 0.1, 0.15, 0.05],
  // From VI
  [0.15, 0.15, 0.2, 0.2, 0.15, 0.1, 0.05],
  // From VII
  [0.4, 0.05, 0.2, 0.1, 0.1, 0.1, 0.05],
];

// Note to semitone mapping
const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

// Scale degrees for major key (semitones from tonic)
const MAJOR_SCALE_DEGREES = [0, 2, 4, 5, 7, 9, 11];

// Scale degrees for natural minor key
const MINOR_SCALE_DEGREES = [0, 2, 3, 5, 7, 8, 10];

/**
 * Parse chord name to extract root and quality
 */
function parseChord(chordName: string): { root: number; isMinor: boolean } | null {
  if (!chordName || chordName === 'N') return null;

  const match = chordName.match(/^([A-G][#b]?)(m)?/);
  if (!match) return null;

  const rootNote = match[1];
  const isMinor = Boolean(match[2]) || chordName.toLowerCase().includes('min');

  const root = NOTE_TO_SEMITONE[rootNote];
  if (root === undefined) return null;

  return { root, isMinor };
}

/**
 * Get scale degree of a chord within a key
 */
function getScaleDegree(
  chordRoot: number,
  keyRoot: number,
  isMinorKey: boolean
): number {
  const interval = (chordRoot - keyRoot + 12) % 12;
  const scaleDegrees = isMinorKey ? MINOR_SCALE_DEGREES : MAJOR_SCALE_DEGREES;

  // Find closest scale degree
  let closestDegree = 0;
  let minDistance = 12;
  for (let i = 0; i < scaleDegrees.length; i++) {
    const distance = Math.min(
      Math.abs(interval - scaleDegrees[i]),
      12 - Math.abs(interval - scaleDegrees[i])
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestDegree = i;
    }
  }

  return closestDegree;
}

/**
 * Get transition probability between two chords
 */
export function getTransitionProbability(
  fromChord: string,
  toChord: string,
  keyRoot: number,
  isMinorKey: boolean
): number {
  const from = parseChord(fromChord);
  const to = parseChord(toChord);

  if (!from || !to) return 0.1; // Default low probability for invalid chords

  const fromDegree = getScaleDegree(from.root, keyRoot, isMinorKey);
  const toDegree = getScaleDegree(to.root, keyRoot, isMinorKey);

  const transitions = isMinorKey ? MINOR_KEY_TRANSITIONS : MAJOR_KEY_TRANSITIONS;

  // Clamp to valid range
  const safeFromDegree = Math.min(fromDegree, 6);
  const safeToDegree = Math.min(toDegree, 6);

  return transitions[safeFromDegree][safeToDegree];
}

/**
 * Check if a chord is diatonic to the key
 */
export function isDiatonicChord(
  chordRoot: number,
  isMinorChord: boolean,
  keyRoot: number,
  isMinorKey: boolean
): boolean {
  const interval = (chordRoot - keyRoot + 12) % 12;
  const scaleDegrees = isMinorKey ? MINOR_SCALE_DEGREES : MAJOR_SCALE_DEGREES;

  // Expected chord qualities for each scale degree
  // In major: I, ii, iii, IV, V, vi, vii° (major, minor, minor, major, major, minor, dim)
  // In minor: i, ii°, III, iv, v, VI, VII (minor, dim, major, minor, minor, major, major)
  const majorKeyQualities = [false, true, true, false, false, true, true]; // false = major
  const minorKeyQualities = [true, true, false, true, true, false, false];

  const degreeIndex = scaleDegrees.indexOf(interval);
  if (degreeIndex === -1) return false;

  const expectedMinor = isMinorKey
    ? minorKeyQualities[degreeIndex]
    : majorKeyQualities[degreeIndex];

  return isMinorChord === expectedMinor;
}

/**
 * Get diatonic chord alternatives for a given chord
 * E.g., in F minor: F -> could be Fm (i), Db -> VI, etc.
 */
function getDiatonicAlternatives(
  chord: string,
  keyRoot: number,
  isMinorKey: boolean
): string[] {
  const parsed = parseChord(chord);
  if (!parsed) return [];

  const alternatives: string[] = [];
  const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const rootName = noteNames[parsed.root];

  // If we detected X major, consider Xm as alternative (and vice versa)
  // This handles cases where Db might be detected as F (same notes)
  const minorAlt = rootName + 'm';
  const majorAlt = rootName;

  if (!parsed.isMinor && isDiatonicChord(parsed.root, true, keyRoot, isMinorKey)) {
    alternatives.push(minorAlt);
  }
  if (parsed.isMinor && isDiatonicChord(parsed.root, false, keyRoot, isMinorKey)) {
    alternatives.push(majorAlt);
  }

  // For chords that share notes, consider the other possibilities
  // E.g., F major (F-A-C) vs Db major (Db-F-Ab) - both contain F
  // In F minor key: check diatonic chords that share notes
  const scaleDegrees = isMinorKey ? MINOR_SCALE_DEGREES : MAJOR_SCALE_DEGREES;
  const minorKeyQualities = [true, true, false, true, true, false, false]; // i, ii°, III, iv, v, VI, VII
  const majorKeyQualities = [false, true, true, false, false, true, true]; // I, ii, iii, IV, V, vi, vii°

  for (let i = 0; i < scaleDegrees.length; i++) {
    const degreeRoot = (keyRoot + scaleDegrees[i]) % 12;
    const expectedMinor = isMinorKey ? minorKeyQualities[i] : majorKeyQualities[i];
    const altName = noteNames[degreeRoot] + (expectedMinor ? 'm' : '');

    // Check if this diatonic chord shares notes with the detected chord
    // Db (Db-F-Ab) and F (F-A-C) share F
    // In F minor: VI (Db) and i (Fm) are both diatonic and common
    if (altName !== chord && !alternatives.includes(altName)) {
      // Check if they share the same root or if the detected chord's root is in the alt chord
      const altParsed = parseChord(altName);
      if (altParsed) {
        // Check for third relationships (e.g., F is the third of Db)
        const interval = (parsed.root - degreeRoot + 12) % 12;
        if (interval === 4 || interval === 3) {
          // Third relationship - they share notes
          alternatives.push(altName);
        }
      }
    }
  }

  return alternatives;
}

/**
 * Check if a chord is the "wrong quality" tonic
 * E.g., F major when key is F minor, or Cm when key is C major
 * This is rare in practice (Picardy third, modal mixture)
 */
function isWrongQualityTonic(
  chordRoot: number,
  isMinorChord: boolean,
  keyRoot: number,
  isMinorKey: boolean
): boolean {
  if (chordRoot !== keyRoot) return false;
  
  // In minor key, tonic should be minor; major tonic is "wrong"
  // In major key, tonic should be major; minor tonic is "wrong"
  return isMinorKey ? !isMinorChord : isMinorChord;
}

/**
 * Apply Viterbi algorithm to find most likely chord sequence
 * given observation confidences and transition probabilities
 */
export function applyTransitionModel(
  chords: { chord: string; time: number; strength: number }[],
  keyRoot: number,
  isMinorKey: boolean,
  transitionWeight: number = 0.3 // Weight for transition probabilities vs observation
): { chord: string; time: number; strength: number }[] {
  if (chords.length < 2) return chords;

  // Get unique chord candidates (simplified approach)
  const uniqueChords = [...new Set(chords.map((c) => c.chord))].filter(
    (c) => c !== 'N'
  );

  if (uniqueChords.length === 0) return chords;

  // Add diatonic alternatives that might not have been detected
  const allCandidates = new Set(uniqueChords);
  for (const chord of uniqueChords) {
    const alts = getDiatonicAlternatives(chord, keyRoot, isMinorKey);
    alts.forEach(alt => allCandidates.add(alt));
  }

  // For each position, compute best chord considering transitions
  // Process sequentially to reference previous results
  const result: { chord: string; time: number; strength: number }[] = [];
  
  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i];
    if (i === 0 || chord.chord === 'N') {
      result.push(chord);
      continue;
    }

    const prevChord = result[i - 1].chord;
    const currentStrength = chord.strength;

    // Check if current chord is diatonic
    const currentParsed = parseChord(chord.chord);
    const isDiatonic = currentParsed && isDiatonicChord(
      currentParsed.root,
      currentParsed.isMinor,
      keyRoot,
      isMinorKey
    );
    
    // Check if this is a "wrong quality" tonic (e.g., F major in F minor key)
    const isWrongTonic = currentParsed && isWrongQualityTonic(
      currentParsed.root,
      currentParsed.isMinor,
      keyRoot,
      isMinorKey
    );
    
    // Check if this is a dim/aug chord that should probably be a simpler triad
    // e.g., Dbdim detected when Db major is the expected VI chord in F minor
    const isDimOrAug = currentParsed && (chord.chord.includes('dim') || chord.chord.includes('aug'));

    // Compute score for current chord
    const transitionProb = getTransitionProbability(
      prevChord,
      chord.chord,
      keyRoot,
      isMinorKey
    );

    // Combined score (observation * transition)
    // Apply penalties:
    // - Non-diatonic chords get 0.7x
    // - Wrong-quality tonic gets 0.4x (very strong penalty - F major in F minor is rare)
    // - Dim/aug chords get 0.6x (they're often HPCP artifacts)
    let qualityMultiplier = 1.0;
    if (isWrongTonic) {
      qualityMultiplier = 0.4; // Strong penalty for wrong tonic quality
    } else if (isDimOrAug) {
      qualityMultiplier = 0.6; // dim/aug are rare in pop music, often detection artifacts
    } else if (!isDiatonic) {
      qualityMultiplier = 0.7;
    }
    
    const score =
      (currentStrength * (1 - transitionWeight) + transitionProb * transitionWeight) * qualityMultiplier;

    // Check if a different chord would score better
    let bestChord = chord.chord;
    let bestScore = score;

    // Consider all candidates including diatonic alternatives
    for (const altChord of allCandidates) {
      if (altChord === chord.chord) continue;

      const altParsed = parseChord(altChord);
      if (!altParsed) continue;

      // Check if chord is diatonic
      const altIsDiatonic = isDiatonicChord(altParsed.root, altParsed.isMinor, keyRoot, isMinorKey);
      if (!altIsDiatonic) continue;

      const altTransitionProb = getTransitionProbability(
        prevChord,
        altChord,
        keyRoot,
        isMinorKey
      );

      // Check if alternative is the correct-quality tonic
      // In F minor, Fm should be strongly preferred over F major
      const isCorrectTonic = altParsed.root === keyRoot && 
        (isMinorKey ? altParsed.isMinor : !altParsed.isMinor);
      
      // Only apply special tonic correction when:
      // 1. Current chord is wrong-quality tonic (F major in F minor)
      // 2. Alternative is correct-quality tonic (Fm in F minor)
      // Don't aggressively change non-tonic chords to tonic
      const isTonalCorrection = isWrongTonic && isCorrectTonic;
      
      // Check if this is a dim/aug to simple triad correction with same root
      // e.g., Dbdim → Db, Caug → C
      const isDimAugCorrection = isDimOrAug && 
        currentParsed && altParsed.root === currentParsed.root &&
        !altChord.includes('dim') && !altChord.includes('aug');

      // Alternative needs significantly better transition to override observation
      let altScore =
        currentStrength * 0.8 * (1 - transitionWeight) +
        altTransitionProb * transitionWeight;
      
      // Boost score for specific correction types
      if (isTonalCorrection) {
        altScore *= 1.5; // 50% bonus for tonal correction
      } else if (isDimAugCorrection) {
        altScore *= 1.3; // 30% bonus for dim/aug to simple triad
      }

      // Use lower threshold for special corrections
      // For non-tonic chords, be very conservative - don't override unless
      // the alternative is MUCH better (prevents Bb→Fm over-corrections)
      let threshold = 1.5; // Very high threshold by default (50% better needed)
      if (isTonalCorrection) {
        threshold = 0.7; // Low threshold for F→Fm corrections
      } else if (isDimAugCorrection) {
        threshold = 0.9; // Lower threshold for dim/aug corrections
      }
      
      if (altScore > bestScore * threshold) {
        bestChord = altChord;
        bestScore = altScore;
      }
    }

    result.push({
      ...chord,
      chord: bestChord,
      strength: bestScore,
    });
  }

  return result;
}

/**
 * Snap chord changes to nearest beat positions
 */
export function snapChordsToBeats(
  chords: { chord: string; time: number; strength: number }[],
  beats: number[],
  maxSnapDistance: number = 0.25 // Max distance to snap (in seconds)
): { chord: string; time: number; strength: number }[] {
  if (beats.length === 0 || chords.length === 0) return chords;

  return chords.map((chord) => {
    // Find nearest beat
    let nearestBeat = chord.time;
    let minDistance = maxSnapDistance;

    for (const beat of beats) {
      const distance = Math.abs(beat - chord.time);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBeat = beat;
      }
    }

    return {
      ...chord,
      time: nearestBeat,
    };
  });
}
