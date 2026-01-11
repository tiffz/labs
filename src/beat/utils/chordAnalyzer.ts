/**
 * Chord Analyzer using Essentia.js
 *
 * Detects chords, chord changes, and song key using:
 * 1. HPCP (Harmonic Pitch Class Profile) extraction per frame
 * 2. ChordsDetection algorithm for chord identification
 * 3. Key algorithm for key/scale detection
 * 4. Chord transition probability model for improved accuracy
 * 5. Beat-aligned chord snapping
 */

import { getEssentia } from './beatAnalyzer';
import { applyTransitionModel, snapChordsToBeats } from './chordTransitions';

export interface ChordEvent {
  time: number; // Time in seconds
  chord: string; // Chord name (e.g., "Am", "G", "F#m")
  strength: number; // 0-1 strength/confidence of this chord
}

export interface KeyChange {
  time: number;
  key: string;
  scale: string;
  confidence: number;
}

export interface ChordAnalysisResult {
  chords: ChordEvent[]; // Chord at each analysis frame
  chordChanges: ChordEvent[]; // Only the points where chords change
  key: string; // Detected key (e.g., "C")
  scale: string; // Detected scale (e.g., "major", "minor")
  keyConfidence: number; // 0-1 confidence
  keyChanges: KeyChange[]; // Key changes if detected (for modulating songs)
  warnings: string[];
}

/**
 * Extract HPCP (Harmonic Pitch Class Profile) features per frame
 * HPCP is a 12-dimensional vector representing the strength of each pitch class (C, C#, D, etc.)
 */
async function extractHPCPFeatures(
  audioBuffer: AudioBuffer,
  frameSize: number = 4096,
  hopSize: number = 2048
): Promise<{ hpcpFrames: Float32Array[]; frameTimestamps: number[] }> {
  const essentia = await getEssentia();
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const hpcpFrames: Float32Array[] = [];
  const frameTimestamps: number[] = [];
  let failureCount = 0;

  // Test: try arrayToVector with the same channelData that works for BPM
  try {
    const testVector = essentia.arrayToVector(channelData);
    testVector.delete();
  } catch (testErr) {
    console.error('[HPCP] arrayToVector test failed:', testErr);
  }

  // Process audio in frames
  for (let i = 0; i + frameSize <= channelData.length; i += hopSize) {
    try {
      // Create windowed frame - try using slice from channelData directly
      const frameSlice = channelData.slice(i, i + frameSize);
      
      // Apply Hann window in place
      const denominator = frameSize > 1 ? frameSize - 1 : 1;
      for (let j = 0; j < frameSize; j++) {
        const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * j) / denominator));
        frameSlice[j] = frameSlice[j] * multiplier;
      }
      
      const frameVector = essentia.arrayToVector(frameSlice);

      // Compute spectrum
      const spectrum = essentia.Spectrum(frameVector);

      // Compute spectral peaks for HPCP
      // SpectralPeaks signature: (spectrum, magnitudeThreshold, maxFrequency, maxPeaks, minFrequency, orderBy, sampleRate)
      // Limit to 5000Hz to focus on fundamental frequencies (most musical content is below 5kHz)
      const spectralPeaks = essentia.SpectralPeaks(
        spectrum.spectrum,
        0.0001,         // magnitudeThreshold
        5000,           // maxFrequency (limit to musical fundamentals)
        60,             // maxPeaks (focus on most prominent)
        40,             // minFrequency
        'magnitude',    // orderBy (prioritize strongest peaks)
        sampleRate      // sampleRate
      );

      /**
       * HPCP signature (from essentia.js-core.es.js):
       * HPCP(frequencies, magnitudes, bandPreset, bandSplitFrequency, harmonics,
       *      maxFrequency, maxShifted, minFrequency, nonLinear, normalized,
       *      referenceFrequency, sampleRate, size, weightType, windowSize)
       *
       * Settings optimized for chord/key detection:
       * - harmonics=4: Include harmonics for richer harmonic content
       * - nonLinear=false: Keep linear weighting for more accurate key detection
       * - maxFrequency limited to 5000Hz to focus on fundamental frequencies
       */
      const hpcp = essentia.HPCP(
        spectralPeaks.frequencies,
        spectralPeaks.magnitudes,
        true,             // bandPreset
        500,              // bandSplitFrequency
        4,                // harmonics (include overtones)
        5000,             // maxFrequency (limit to fundamental range)
        false,            // maxShifted
        40,               // minFrequency
        false,            // nonLinear (linear for accurate key detection)
        'unitMax',        // normalized
        440,              // referenceFrequency
        sampleRate,       // sampleRate
        12,               // size (pitch classes)
        'squaredCosine',  // weightType
        1                 // windowSize
      );

      const hpcpArray = essentia.vectorToArray(hpcp.hpcp);
      
      // CRITICAL: Essentia's HPCP with referenceFrequency=440Hz has A at index 0
      // But our chord templates assume C at index 0
      // Rotate the HPCP by 3 positions: A(0)->C(0), A#(1)->C#(1), B(2)->D(2), C(3)->0
      // Actually: shift so that what was at index 3 (C) is now at index 0
      const rotatedHpcp = new Float32Array(12);
      for (let j = 0; j < 12; j++) {
        // Index 3 in Essentia (C) should map to index 0 in our templates
        rotatedHpcp[j] = hpcpArray[(j + 3) % 12];
      }
      
      hpcpFrames.push(rotatedHpcp);
      frameTimestamps.push(i / sampleRate);

      // Clean up vectors
      spectrum.spectrum.delete();
      spectralPeaks.frequencies.delete();
      spectralPeaks.magnitudes.delete();
      hpcp.hpcp.delete();
      frameVector.delete();
    } catch (err) {
      failureCount++;
      if (failureCount <= 3) {
        console.warn('HPCP frame processing failed:', err, (err as Error)?.message);
      }
    }
  }

  return { hpcpFrames, frameTimestamps };
}

/**
 * Detect chords from HPCP sequence using weighted template matching
 * Uses Krumhansl-style weighted templates for better accuracy
 */
function detectChordsFromHPCP(
  hpcpFrames: Float32Array[],
  frameTimestamps: number[]
): ChordEvent[] {
  const chords: ChordEvent[] = [];

  // Helper to create a rotated template starting from a given root
  // Weights: root=1.0, third=0.7, fifth=0.85, seventh=0.5, ninth=0.3
  const rotateTemplate = (template: number[], semitones: number): number[] => {
    const rotated = new Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
      rotated[(i + semitones) % 12] = template[i];
    }
    return rotated;
  };

  // Base templates (starting from C) with Krumhansl-inspired weighting
  // Index 0 = C, 1 = C#/Db, 2 = D, etc.
  const baseTemplates: { suffix: string; template: number[] }[] = [
    // Major triad: 1-3-5 (root, major 3rd at +4, perfect 5th at +7)
    { suffix: '', template: [1.0, 0, 0, 0, 0.7, 0, 0, 0.85, 0, 0, 0, 0] },
    // Minor triad: 1-b3-5 (root, minor 3rd at +3, perfect 5th at +7)
    { suffix: 'm', template: [1.0, 0, 0, 0.7, 0, 0, 0, 0.85, 0, 0, 0, 0] },
    // Dominant 7th: 1-3-5-b7 (major triad + minor 7th at +10)
    { suffix: '7', template: [1.0, 0, 0, 0, 0.7, 0, 0, 0.85, 0, 0, 0.5, 0] },
    // Major 7th: 1-3-5-7 (major triad + major 7th at +11)
    { suffix: 'maj7', template: [1.0, 0, 0, 0, 0.7, 0, 0, 0.85, 0, 0, 0, 0.5] },
    // Minor 7th: 1-b3-5-b7 (minor triad + minor 7th at +10)
    { suffix: 'm7', template: [1.0, 0, 0, 0.7, 0, 0, 0, 0.85, 0, 0, 0.5, 0] },
    // Diminished: 1-b3-b5 (root, minor 3rd at +3, diminished 5th at +6)
    { suffix: 'dim', template: [1.0, 0, 0, 0.7, 0, 0, 0.8, 0, 0, 0, 0, 0] },
    // Augmented: 1-3-#5 (root, major 3rd at +4, augmented 5th at +8)
    { suffix: 'aug', template: [1.0, 0, 0, 0, 0.7, 0, 0, 0, 0.8, 0, 0, 0] },
    // Sus4: 1-4-5 (root, perfect 4th at +5, perfect 5th at +7)
    { suffix: 'sus4', template: [1.0, 0, 0, 0, 0, 0.75, 0, 0.85, 0, 0, 0, 0] },
    // Sus2: 1-2-5 (root, major 2nd at +2, perfect 5th at +7)
    { suffix: 'sus2', template: [1.0, 0, 0.75, 0, 0, 0, 0, 0.85, 0, 0, 0, 0] },
  ];

  // Note names for all 12 pitch classes
  const noteNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Generate all chord templates by rotating base templates through all 12 keys
  const chordTemplates: { name: string; template: number[] }[] = [];
  for (const { suffix, template } of baseTemplates) {
    for (let root = 0; root < 12; root++) {
      chordTemplates.push({
        name: noteNames[root] + suffix,
        template: rotateTemplate(template, root),
      });
    }
  }

  // Normalize templates (L2 normalization for cosine similarity)
  const normalizedTemplates = chordTemplates.map(({ name, template }) => {
    const norm = Math.sqrt(template.reduce((sum, v) => sum + v * v, 0));
    return {
      name,
      template: template.map((v) => v / (norm + 1e-10)),
    };
  });

  // Match each HPCP frame to the best chord
  for (let i = 0; i < hpcpFrames.length; i++) {
    const hpcp = hpcpFrames[i];
    const time = frameTimestamps[i];

    // Normalize HPCP
    const sum = hpcp.reduce((a, b) => a + b, 0);
    const normalizedHpcp = sum > 0 ? hpcp.map((v) => v / sum) : hpcp;

    // Find best matching chord using cosine similarity
    // Track top candidates to prefer simpler chords when scores are close
    const candidates: { name: string; similarity: number }[] = [];

    for (const { name, template } of normalizedTemplates) {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let j = 0; j < 12; j++) {
        dotProduct += normalizedHpcp[j] * template[j];
        normA += normalizedHpcp[j] * normalizedHpcp[j];
        normB += template[j] * template[j];
      }

      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
      candidates.push({ name, similarity });
    }
    
    // Sort by similarity descending
    candidates.sort((a, b) => b.similarity - a.similarity);
    
    // Get best match
    let bestChord = candidates[0]?.name || 'N';
    let bestSimilarity = candidates[0]?.similarity || 0;
    
    // Prefer simpler chord types when scores are close (within 5%)
    // Priority: major triads > minor triads > sus > 7th chords > dim/aug
    const getChordComplexity = (chord: string): number => {
      const suffix = chord.replace(/^[A-G][#b]?/, '').toLowerCase();
      if (suffix === '') return 0;                    // Major triads - simplest
      if (suffix === 'm') return 0.5;                 // Minor triads - slightly more complex
      if (suffix.includes('sus')) return 1;           // Sus chords
      if (suffix.includes('7') || suffix.includes('maj7')) return 2;  // 7th chords
      if (suffix.includes('dim') || suffix.includes('aug')) return 3; // dim/aug - most complex
      return 1;
    };
    
    // Check if a simpler chord is within 5% of the best score
    // This helps avoid spurious dim/aug detections when major/minor is more likely
    for (const candidate of candidates.slice(1, 5)) {
      if (candidate.similarity >= bestSimilarity * 0.95) {
        const bestComplexity = getChordComplexity(bestChord);
        const candidateComplexity = getChordComplexity(candidate.name);
        
        // If candidate is simpler, prefer it
        if (candidateComplexity < bestComplexity) {
          bestChord = candidate.name;
          bestSimilarity = candidate.similarity;
          break; // Take first simpler chord found
        }
      }
    }

    // Only accept chords with reasonable confidence
    // Lower threshold to capture more chords, rely on smoothing to clean up
    if (bestSimilarity < 0.4) {
      bestChord = 'N';
      bestSimilarity = 0;
    }

    chords.push({
      time,
      chord: bestChord,
      strength: bestSimilarity,
    });
  }

  return chords;
}

/**
 * Normalize enharmonic spelling based on key context
 * Flat keys (F minor, Bb minor, etc.) should use flats: Db not C#
 * Sharp keys (G major, D major, etc.) should use sharps
 */
function normalizeEnharmonic(chord: string, useFlats: boolean = true): string {
  if (chord === 'N') return chord;
  
  const sharpToFlat: Record<string, string> = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
  };
  const flatToSharp: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  };
  
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return chord;
  
  let root = match[1];
  const suffix = match[2];
  
  if (useFlats && sharpToFlat[root]) {
    root = sharpToFlat[root];
  } else if (!useFlats && flatToSharp[root]) {
    root = flatToSharp[root];
  }
  
  return root + suffix;
}

/**
 * Simplify chord to basic triad (remove 7ths, sus, etc.)
 */
function simplifyChordToTriad(chord: string, useFlats: boolean = true): string {
  if (chord === 'N') return chord;
  
  // Extract root note
  const match = chord.match(/^([A-G][#b]?)/);
  if (!match) return chord;
  
  let root = match[1];
  const suffix = chord.slice(root.length).toLowerCase();
  
  // Normalize enharmonic spelling
  root = normalizeEnharmonic(root, useFlats);
  
  // Map extended chords to basic triads
  if (suffix.includes('dim')) return root + 'dim';
  if (suffix.includes('aug')) return root + 'aug';
  if (suffix.includes('m') && !suffix.includes('maj')) return root + 'm';
  if (suffix.includes('sus')) return root; // sus chords -> major
  
  return root; // Default to major
}

/**
 * Smooth chord sequence to reduce noise
 * Uses majority vote within a window, with preference for simpler chords
 */
function smoothChordSequence(chords: ChordEvent[], windowSize: number = 5): ChordEvent[] {
  const smoothed: ChordEvent[] = [];

  for (let i = 0; i < chords.length; i++) {
    const windowStart = Math.max(0, i - Math.floor(windowSize / 2));
    const windowEnd = Math.min(chords.length, i + Math.floor(windowSize / 2) + 1);

    // Count chord occurrences in window, grouping by simplified chord
    const counts: Record<string, { count: number; totalStrength: number; originalChord: string }> = {};
    for (let j = windowStart; j < windowEnd; j++) {
      const originalChord = chords[j].chord;
      const simplified = simplifyChordToTriad(originalChord);
      
      if (!counts[simplified]) {
        counts[simplified] = { count: 0, totalStrength: 0, originalChord };
      }
      counts[simplified].count++;
      counts[simplified].totalStrength += chords[j].strength;
    }

    // Find most common chord (weighted by strength)
    let bestSimplified = simplifyChordToTriad(chords[i].chord);
    let bestScore = 0;

    for (const [simplified, { count, totalStrength }] of Object.entries(counts)) {
      const score = count * (totalStrength / count); // count * avg strength
      if (score > bestScore) {
        bestScore = score;
        bestSimplified = simplified;
      }
    }

    smoothed.push({
      time: chords[i].time,
      chord: bestSimplified, // Use simplified chord
      strength: bestScore / windowSize,
    });
  }

  return smoothed;
}

/**
 * Extract chord changes from a chord sequence with minimum duration filtering
 */
function extractChordChanges(chords: ChordEvent[], minDurationSec: number = 0.3): ChordEvent[] {
  const changes: ChordEvent[] = [];

  if (chords.length === 0) return changes;

  // First chord is always a change
  let currentChord = chords[0].chord;
  let currentStart = chords[0].time;

  changes.push(chords[0]);

  for (let i = 1; i < chords.length; i++) {
    if (chords[i].chord !== currentChord && chords[i].chord !== 'N') {
      // Only count as a change if the previous chord lasted long enough
      const duration = chords[i].time - currentStart;

      if (duration >= minDurationSec || changes.length === 1) {
        changes.push(chords[i]);
      } else {
        // Too short - update the previous change to this new chord
        if (changes.length > 0) {
          changes[changes.length - 1] = chords[i];
        }
      }

      currentChord = chords[i].chord;
      currentStart = chords[i].time;
    }
  }

  return changes;
}

/**
 * Merge short chord "blips" that appear between identical chords
 * e.g., Fm → C → Fm (where C is < minDuration) becomes Fm → Fm
 * This helps filter out transient HPCP artifacts
 */
function mergeShortChords(chords: ChordEvent[], minDurationSec: number = 1.0): ChordEvent[] {
  if (chords.length < 3) return chords;
  
  const result: ChordEvent[] = [chords[0]];
  
  for (let i = 1; i < chords.length; i++) {
    const current = chords[i];
    const prev = result[result.length - 1];
    const next = i < chords.length - 1 ? chords[i + 1] : null;
    
    // Calculate duration of current chord
    const duration = next ? next.time - current.time : 999;
    
    // Check if this is a short chord sandwiched between identical chords
    // e.g., prev=Fm, current=C (short), next=Fm → skip C
    if (duration < minDurationSec && next && prev.chord === next.chord && current.chord !== prev.chord) {
      // Skip this short chord - it's likely noise
      continue;
    }
    
    result.push(current);
  }
  
  // Merge consecutive identical chords
  const merged: ChordEvent[] = [result[0]];
  for (let i = 1; i < result.length; i++) {
    if (result[i].chord !== merged[merged.length - 1].chord) {
      merged.push(result[i]);
    }
  }
  
  return merged;
}

/**
 * Parse chord name to extract root note
 */
function parseChordRoot(chordName: string): number {
  if (!chordName || chordName === 'N') return -1;
  
  const match = chordName.match(/^([A-G][#b]?)/);
  if (!match) return -1;
  
  let root = match[1];
  // Normalize flats to sharps for consistency
  const flatToSharp: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  };
  if (flatToSharp[root]) root = flatToSharp[root];
  
  // Map to semitone
  const rootMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
  };
  return rootMap[root] ?? -1;
}

/**
 * Check if chord is minor quality
 */
function isMinorChord(chordName: string): boolean {
  if (!chordName || chordName === 'N') return false;
  const lower = chordName.toLowerCase();
  return lower.includes('m') && !lower.includes('maj');
}

/**
 * Detect key from chord progression (more accurate than HPCP alone)
 * Uses music theory: analyzing chord roots and qualities to determine likely key
 */
function detectKeyFromChords(chordChanges: ChordEvent[]): { key: string; scale: 'major' | 'minor'; confidence: number } {
  if (chordChanges.length === 0) {
    return { key: 'C', scale: 'major', confidence: 0 };
  }
  
  // Count chord root occurrences weighted by duration
  const rootCounts = new Array(12).fill(0);
  const minorChordRoots = new Array(12).fill(0); // Track which roots appear as minor chords
  const majorChordRoots = new Array(12).fill(0); // Track which roots appear as major chords
  
  for (let i = 0; i < chordChanges.length; i++) {
    const chord = chordChanges[i];
    const root = parseChordRoot(chord.chord);
    if (root === -1) continue;
    
    // Calculate duration until next chord
    const nextTime = chordChanges[i + 1]?.time ?? chord.time + 2; // Default 2 sec if last chord
    const duration = nextTime - chord.time;
    const weight = duration * chord.strength;
    
    // First and last chords are extra important for key
    const positionBonus = (i === 0 || i === chordChanges.length - 1) ? 2 : 1;
    
    rootCounts[root] += weight * positionBonus;
    
    if (isMinorChord(chord.chord)) {
      minorChordRoots[root] += weight * positionBonus;
    } else {
      majorChordRoots[root] += weight * positionBonus;
    }
  }
  
  // For each possible key, calculate how well the chords fit
  const keyScores: { key: number; scale: 'major' | 'minor'; score: number }[] = [];
  
  for (let keyRoot = 0; keyRoot < 12; keyRoot++) {
    // Major key diatonic chords: I(M), ii(m), iii(m), IV(M), V(M), vi(m), vii(dim)
    const majorDiatonic = [
      { interval: 0, expectedMinor: false },  // I
      { interval: 2, expectedMinor: true },   // ii
      { interval: 4, expectedMinor: true },   // iii
      { interval: 5, expectedMinor: false },  // IV
      { interval: 7, expectedMinor: false },  // V
      { interval: 9, expectedMinor: true },   // vi
    ];
    
    // Minor key diatonic chords: i(m), ii(dim), III(M), iv(m), v(m) or V(M), VI(M), VII(M)
    const minorDiatonic = [
      { interval: 0, expectedMinor: true },   // i
      { interval: 3, expectedMinor: false },  // III
      { interval: 5, expectedMinor: true },   // iv
      { interval: 7, expectedMinor: false },  // V (often major in minor keys)
      { interval: 8, expectedMinor: false },  // VI
      { interval: 10, expectedMinor: false }, // VII
    ];
    
    // Score for major key interpretation
    let majorScore = 0;
    for (const { interval, expectedMinor } of majorDiatonic) {
      const chordRoot = (keyRoot + interval) % 12;
      if (expectedMinor) {
        majorScore += minorChordRoots[chordRoot];
      } else {
        majorScore += majorChordRoots[chordRoot];
      }
    }
    // Bonus for I chord being prominent and major
    majorScore += majorChordRoots[keyRoot] * 1.5;
    
    // Score for minor key interpretation
    let minorScore = 0;
    for (const { interval, expectedMinor } of minorDiatonic) {
      const chordRoot = (keyRoot + interval) % 12;
      if (expectedMinor) {
        minorScore += minorChordRoots[chordRoot];
      } else {
        minorScore += majorChordRoots[chordRoot];
      }
    }
    // Big bonus for i chord being prominent and minor
    minorScore += minorChordRoots[keyRoot] * 2.0;
    
    keyScores.push({ key: keyRoot, scale: 'major', score: majorScore });
    keyScores.push({ key: keyRoot, scale: 'minor', score: minorScore });
  }
  
  // Sort by score and pick the best
  keyScores.sort((a, b) => b.score - a.score);
  
  const best = keyScores[0];
  const secondBest = keyScores[1];
  
  // Confidence based on margin between best and second best
  // If best is much better than second, confidence is high
  // If they're close, confidence is lower
  let confidence = 0;
  if (best.score > 0) {
    // How much better is the best compared to second best (as a ratio)
    const margin = secondBest.score > 0 ? best.score / secondBest.score : 2;
    // Convert ratio to 0-1 confidence: ratio of 1 = 0.5 conf, ratio of 2 = 0.75 conf, etc.
    confidence = Math.min(1.0, 0.5 + (margin - 1) * 0.25);
    
    // Also factor in absolute score (if scores are very low, confidence should be lower)
    const topThreeAvg = (keyScores[0].score + keyScores[1].score + keyScores[2].score) / 3;
    if (topThreeAvg < 10) confidence *= 0.5; // Low absolute scores = uncertain
  }
  
  // Convert semitone back to note name
  const semitoneToNote = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const keyName = semitoneToNote[best.key];
  
  return { key: keyName, scale: best.scale, confidence: Math.min(confidence * 2, 1) };
}

/**
 * Detect song key using multiple methods and consensus
 * 1. Chord-based key detection (most musical)
 * 2. Essentia KeyExtractor (audio-based)
 * 3. HPCP averaging with Key algorithm
 */
async function detectKey(
  hpcpFrames: Float32Array[],
  audioBuffer?: AudioBuffer,
  chordChanges?: ChordEvent[]
): Promise<{ key: string; scale: string; confidence: number }> {
  if (hpcpFrames.length === 0) {
    return { key: 'C', scale: 'major', confidence: 0 };
  }

  const essentia = await getEssentia();
  const results: { key: string; scale: string; confidence: number; profile: string; weight: number }[] = [];

  // Method 1: Chord-based key detection (highest weight - most musically accurate)
  if (chordChanges && chordChanges.length > 3) {
    const chordKey = detectKeyFromChords(chordChanges);
    results.push({
      key: chordKey.key,
      scale: chordKey.scale,
      confidence: chordKey.confidence,
      profile: 'ChordBased',
      weight: 3.0, // Triple weight for chord-based detection
    });
  }

  // Method 2: Try KeyExtractor on raw audio (if available)
  if (audioBuffer) {
    try {
      const channelData = audioBuffer.getChannelData(0);
      const signal = essentia.arrayToVector(channelData);
      
      for (const profile of ['krumhansl', 'temperley', 'bgate'] as const) {
        try {
          const keyResult = essentia.KeyExtractor(
            signal,
            true,     // averageDetuningCorrection
            4096,     // frameSize
            4096,     // hopSize
            36,       // hpcpSize
            3500,     // maxFrequency
            60,       // maximumSpectralPeaks
            25,       // minFrequency
            0.2,      // pcpThreshold
            profile,
            audioBuffer.sampleRate,
            0.0001,   // spectralPeaksThreshold
            440,      // tuningFrequency
            'cosine',
            'hann'
          );
          
          results.push({
            key: keyResult.key,
            scale: keyResult.scale,
            confidence: keyResult.strength,
            profile: `KeyExtractor-${profile}`,
            weight: 1.0,
          });
        } catch (err) {
          console.warn(`KeyExtractor with ${profile} failed:`, err);
        }
      }
      
      signal.delete();
    } catch (err) {
      console.warn('KeyExtractor failed:', err);
    }
  }

  // Method 3: Use Key algorithm on averaged HPCP
  try {
    const avgHpcp = new Float32Array(12);
    for (const frame of hpcpFrames) {
      for (let i = 0; i < 12; i++) {
        avgHpcp[i] += frame[i];
      }
    }
    for (let i = 0; i < 12; i++) {
      avgHpcp[i] /= hpcpFrames.length;
    }

    const hpcpVector = essentia.arrayToVector(avgHpcp);

    for (const profile of ['krumhansl', 'temperley', 'bgate'] as const) {
      try {
        const keyResult = essentia.Key(
          hpcpVector,
          4, 12, profile, 0.6, false, true, true
        );

        results.push({
          key: keyResult.key,
          scale: keyResult.scale,
          confidence: keyResult.strength,
          profile: `Key-${profile}`,
          weight: 0.8,
        });
      } catch (err) {
        console.warn(`Key with ${profile} failed:`, err);
      }
    }

    hpcpVector.delete();
  } catch (error) {
    console.warn('Key detection from HPCP failed:', error);
  }

  // Weighted consensus voting
  const votes: Record<string, { weightedScore: number; bestConfidence: number }> = {};
  
  for (const result of results) {
    // Normalize key to handle enharmonic equivalents
    let normalizedKey = result.key;
    // Convert sharps to flats for consistency with note names
    const sharpToFlat: Record<string, string> = {
      'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
    };
    if (sharpToFlat[normalizedKey]) {
      // Keep sharps for some keys where they're more common
      if (result.scale === 'minor' && ['C#', 'F#'].includes(normalizedKey)) {
        // C# minor and F# minor are more common notations
      } else if (sharpToFlat[normalizedKey]) {
        normalizedKey = sharpToFlat[normalizedKey];
      }
    }
    
    const keyScale = `${normalizedKey} ${result.scale}`;
    if (!votes[keyScale]) {
      votes[keyScale] = { weightedScore: 0, bestConfidence: 0 };
    }
    votes[keyScale].weightedScore += result.confidence * result.weight;
    votes[keyScale].bestConfidence = Math.max(votes[keyScale].bestConfidence, result.confidence);
  }

  // Also consider relative keys - if a major key and its relative minor are close in votes,
  // prefer minor for pop/rock music (most songs are actually in minor)
  const normalizedNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  
  // Pick the best key
  let bestKeyScale = 'C major';
  let bestScore = 0;
  for (const [keyScale, data] of Object.entries(votes)) {
    if (data.weightedScore > bestScore) {
      bestScore = data.weightedScore;
      bestKeyScale = keyScale;
    }
  }

  const [key, scale] = bestKeyScale.split(' ');
  let finalKey = key;
  let finalScale = scale;
  const finalConfidence = votes[bestKeyScale]?.bestConfidence || 0;

  // Check if relative minor has strong support
  if (scale === 'major') {
    const majorIdx = normalizedNotes.indexOf(key);
    if (majorIdx !== -1) {
      const relMinorIdx = (majorIdx + 9) % 12;
      const relMinor = normalizedNotes[relMinorIdx];
      const relMinorKey = `${relMinor} minor`;
      
      if (votes[relMinorKey]) {
        const majorScore = votes[bestKeyScale].weightedScore;
        const minorScore = votes[relMinorKey].weightedScore;
        
        
        // If minor is within 30% of major, prefer minor
        if (minorScore > majorScore * 0.7) {
          finalKey = relMinor;
          finalScale = 'minor';
        }
      }
    }
  }

  // Cap confidence at 95% - automated detection can never be 100% certain
  const cappedConfidence = Math.min(0.95, finalConfidence);
  

  return { key: finalKey, scale: finalScale, confidence: cappedConfidence };
}

/**
 * Check if two keys are exactly the same (including enharmonic equivalents)
 */
function areSameKey(
  key1: string, scale1: string,
  key2: string, scale2: string
): boolean {
  if (scale1 !== scale2) return false;
  if (key1 === key2) return true;
  
  // Check enharmonic equivalents
  const noteToSemitone: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };
  
  return noteToSemitone[key1] === noteToSemitone[key2];
}

/**
 * Check if key2 is the relative major/minor of key1
 * @deprecated Currently unused but kept for potential future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _isRelativeKey(
  key1: string, scale1: string,
  key2: string, scale2: string
): boolean {
  if (scale1 === scale2) return false;
  
  const noteToSemitone: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };
  
  const semi1 = noteToSemitone[key1] ?? 0;
  const semi2 = noteToSemitone[key2] ?? 0;
  
  // Minor key's relative major is 3 semitones up
  if (scale1 === 'minor' && scale2 === 'major') {
    return (semi1 + 3) % 12 === semi2;
  }
  // Major key's relative minor is 3 semitones down (9 semitones up)
  if (scale1 === 'major' && scale2 === 'minor') {
    return (semi1 + 9) % 12 === semi2;
  }
  
  return false;
}

/**
 * Normalize key name to use flats or sharps based on context
 * In flat keys (F minor, Bb major, etc.), prefer flat spelling
 */
function normalizeKeySpelling(key: string, scale: string, contextKey: string): string {
  // Sharp to flat mappings
  const sharpToFlat: Record<string, string> = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
  };
  
  // Determine if context uses flats
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];
  const contextUsesFlats = flatKeys.includes(contextKey) || 
    ['Dm', 'Gm', 'Cm', 'Fm', 'Bbm'].some(k => contextKey.includes(k.charAt(0)));
  
  if (contextUsesFlats && sharpToFlat[key]) {
    return sharpToFlat[key];
  }
  
  return key;
}

/**
 * Get the relative major of a minor key (or relative minor of a major key)
 */
function getRelativeKey(key: string, scale: string): { key: string; scale: string } {
  const noteToSemitone: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };
  const semitoneToNote = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  
  const semi = noteToSemitone[key] ?? 0;
  
  if (scale === 'minor') {
    // Relative major is 3 semitones up
    return { key: semitoneToNote[(semi + 3) % 12], scale: 'major' };
  } else {
    // Relative minor is 3 semitones down (9 up)
    return { key: semitoneToNote[(semi + 9) % 12], scale: 'minor' };
  }
}

/**
 * Detect key changes using chord-based analysis
 * This is more accurate than HPCP-only detection because it uses
 * the actual detected chords to determine the key in each segment.
 * 
 * Strategy:
 * - Divide song into time segments
 * - For each segment, use the detected chords to determine the key
 * - Only report significant key changes (sustained, different from previous)
 */
function detectKeyChangesFromChords(
  chordChanges: ChordEvent[],
  duration: number,
  overallKey: string,
  overallScale: string,
  segmentDuration: number = 25 // seconds per segment
): KeyChange[] {
  if (chordChanges.length < 4 || duration < 60) {
    return [];
  }

  const numSegments = Math.max(1, Math.ceil(duration / segmentDuration));
  
  // First pass: detect key for each segment using chords
  const segmentResults: Array<{
    time: number;
    endTime: number;
    key: string;
    scale: string;
    confidence: number;
  }> = [];

  for (let i = 0; i < numSegments; i++) {
    const startTime = i * segmentDuration;
    const endTime = Math.min((i + 1) * segmentDuration, duration);
    
    // Get chords in this segment
    const segmentChords = chordChanges.filter(
      c => c.time >= startTime && c.time < endTime
    );
    
    if (segmentChords.length < 2) continue;
    
    // Use chord-based key detection for this segment
    const { key: detectedKey, scale: detectedScale, confidence } = detectKeyFromChords(segmentChords);
    let key = detectedKey;
    let scale = detectedScale;
    
    // Normalize key spelling based on overall key context
    key = normalizeKeySpelling(key, scale, overallKey);
    
    // Special handling: if we're in a minor key, check for relative major patterns
    const relativeMajor = getRelativeKey(overallKey, overallScale);
    if (overallScale === 'minor') {
      const noteToSemi: Record<string, number> = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
        'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
      };
      const detectedSemi = noteToSemi[key] ?? 0;
      const relativeSemi = noteToSemi[relativeMajor.key] ?? 0;
      const overallSemi = noteToSemi[overallKey] ?? 0;
      
      // Check for relative major tonic chord (Ab in F minor context)
      const relMajorTonicCount = segmentChords.filter(c => {
        const root = c.chord.match(/^([A-G][#b]?)/)?.[1];
        if (!root) return false;
        const rootSemi = noteToSemi[root] ?? -1;
        return rootSemi === relativeSemi && !isMinorChord(c.chord);
      }).length;
      
      // If detected key is the home minor key but relative major tonic chord appears frequently,
      // this is likely a chorus in the relative major (e.g., Let It Go chorus is Ab major)
      if (detectedSemi === overallSemi && scale === 'minor' && relMajorTonicCount >= 2) {
        const relMajorRatio = relMajorTonicCount / segmentChords.length;
        if (relMajorRatio >= 0.15) { // At least 15% relative major tonic
          key = relativeMajor.key;
          scale = 'major';
        }
      }
      
      // If detected key is the bVI chord (Db in F minor), check for relative major (Ab)
      const bVIofKey = (overallSemi + 8) % 12;
      if (detectedSemi === bVIofKey && confidence < 0.6 && scale === 'major') {
        // Check if relative major chords are present
        const relMajorChords = segmentChords.filter(c => {
          const root = c.chord.match(/^([A-G][#b]?)/)?.[1];
          if (!root) return false;
          const rootSemi = noteToSemi[root] ?? -1;
          // Check if chord root is diatonic to relative major
          const relMajorDiatonic = [0, 2, 4, 5, 7, 9, 11].map(i => (relativeSemi + i) % 12);
          return relMajorDiatonic.includes(rootSemi);
        });
        
        if (relMajorChords.length >= segmentChords.length * 0.5) {
          key = relativeMajor.key;
          scale = 'major';
        }
      }
    }
    
    
    segmentResults.push({
      time: startTime,
      endTime,
      key,
      scale,
      confidence,
    });
  }

  // Second pass: merge consecutive segments with the same key
  const keyRegions: Array<{
    startTime: number;
    endTime: number;
    key: string;
    scale: string;
    avgConfidence: number;
    chordCount: number;
  }> = [];

  let currentRegion: typeof keyRegions[0] | null = null;
  
  for (const segment of segmentResults) {
    // Only consider segments with reasonable confidence
    if (segment.confidence < 0.3) continue;
    
    const isSameKey = currentRegion && areSameKey(
      currentRegion.key, currentRegion.scale,
      segment.key, segment.scale
    );
    
    if (isSameKey && currentRegion) {
      // Extend current region
      currentRegion.endTime = segment.endTime;
      currentRegion.chordCount++;
      currentRegion.avgConfidence = (currentRegion.avgConfidence * (currentRegion.chordCount - 1) + segment.confidence) / currentRegion.chordCount;
    } else {
      // Start new region
      if (currentRegion) {
        keyRegions.push(currentRegion);
      }
      currentRegion = {
        startTime: segment.time,
        endTime: segment.endTime,
        key: segment.key,
        scale: segment.scale,
        avgConfidence: segment.confidence,
        chordCount: 1,
      };
    }
  }
  
  // Don't forget the last region
  if (currentRegion) {
    keyRegions.push(currentRegion);
  }

  // Third pass: filter to only significant key changes
  const MIN_REGION_DURATION = 15; // seconds - key must be sustained
  const MIN_CONFIDENCE = 0.35;
  
  const keyChanges: KeyChange[] = [];
  let lastReportedKey = overallKey;
  let lastReportedScale = overallScale;
  let lastChangeTime = 0;
  
  for (const region of keyRegions) {
    const regionDuration = region.endTime - region.startTime;
    
    // Skip very short regions or very low confidence
    if (regionDuration < MIN_REGION_DURATION || region.avgConfidence < MIN_CONFIDENCE) {
      continue;
    }
    
    // Skip if same as last reported key (including enharmonic)
    if (areSameKey(lastReportedKey, lastReportedScale, region.key, region.scale)) {
      continue;
    }
    
    // Skip if this is the first segment and it matches overall key
    // (We don't need to report "key change" to the starting key)
    if (keyChanges.length === 0 && region.startTime < 10 &&
        areSameKey(overallKey, overallScale, region.key, region.scale)) {
      lastReportedKey = region.key;
      lastReportedScale = region.scale;
      continue;
    }
    
    // Require minimum time between key changes (avoid rapid back-and-forth)
    if (region.startTime - lastChangeTime < 10) {
      continue;
    }
    
    // Normalize key spelling for output
    const normalizedKey = normalizeKeySpelling(region.key, region.scale, overallKey);
    
    // This is a real key change
    keyChanges.push({
      time: region.startTime,
      key: normalizedKey,
      scale: region.scale,
      confidence: region.avgConfidence,
    });
    
    lastReportedKey = normalizedKey;
    lastReportedScale = region.scale;
    lastChangeTime = region.startTime;
  }

  return keyChanges;
}

// Note to semitone mapping for transition model
const NOTE_TO_SEMITONE_CHORD: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

/**
 * Main chord analysis function
 * @param audioBuffer - Audio to analyze
 * @param beats - Optional beat positions for beat-aligned chord snapping
 */
export async function analyzeChords(
  audioBuffer: AudioBuffer,
  beats?: number[]
): Promise<ChordAnalysisResult> {
  const warnings: string[] = [];


  // Extract HPCP features
  let hpcpFrames: Float32Array[] = [];
  let frameTimestamps: number[] = [];
  
  try {
    const result = await extractHPCPFeatures(audioBuffer);
    hpcpFrames = result.hpcpFrames;
    frameTimestamps = result.frameTimestamps;
  } catch (error) {
    console.error('[ChordAnalyzer] HPCP extraction failed:', error);
    warnings.push('HPCP feature extraction failed');
    return {
      chords: [],
      chordChanges: [],
      key: 'Unknown',
      scale: 'unknown',
      keyConfidence: 0,
      keyChanges: [],
      warnings,
    };
  }

  if (hpcpFrames.length === 0) {
    warnings.push('No HPCP features could be extracted');
    return {
      chords: [],
      chordChanges: [],
      key: 'C',
      scale: 'major',
      keyConfidence: 0,
      keyChanges: [],
      warnings,
    };
  }


  // Detect chords from HPCP
  const rawChords = detectChordsFromHPCP(hpcpFrames, frameTimestamps);

  // Smooth chord sequence with larger window for more stable detection
  const smoothedChords = smoothChordSequence(rawChords, 15);

  // Extract chord changes with minimum duration filtering
  let chordChanges = extractChordChanges(smoothedChords, 0.5);


  // Detect overall key using chord-based analysis (most accurate), plus HPCP and KeyExtractor
  const { key, scale, confidence: keyConfidence } = await detectKey(hpcpFrames, audioBuffer, chordChanges);


  // Apply chord transition model if we have a key
  if (key && scale && chordChanges.length > 2) {
    const keyRoot = NOTE_TO_SEMITONE_CHORD[key] ?? 0;
    const isMinorKey = scale === 'minor';

    chordChanges = applyTransitionModel(chordChanges, keyRoot, isMinorKey, 0.25);
    
    // Post-process: merge short "blip" chords that appear between identical chords
    // e.g., Fm → C → Fm (where C is < 1s) becomes Fm → Fm
    chordChanges = mergeShortChords(chordChanges, 1.0);
  }

  // Snap chord changes to beat positions if beats are available
  if (beats && beats.length > 0) {
    const beatInterval = beats.length > 1 ? beats[1] - beats[0] : 0.5;
    const maxSnapDistance = beatInterval * 0.4; // Snap within 40% of beat interval
    
    chordChanges = snapChordsToBeats(chordChanges, beats, maxSnapDistance);
  }

  // Detect key changes using chord-based analysis (more accurate than HPCP-only)
  // This analyzes the detected chords in segments to find key modulations
  const keyChanges = detectKeyChangesFromChords(chordChanges, audioBuffer.duration, key, scale);

  if (keyChanges.length > 0) {
    warnings.push(`Detected ${keyChanges.length} key change${keyChanges.length > 1 ? 's' : ''}`);
  }

  if (keyConfidence < 0.3) {
    warnings.push('Low confidence in key detection');
  }

  if (chordChanges.length < 3) {
    warnings.push('Few chord changes detected - song may be harmonically simple or detection may be limited');
  }

  return {
    chords: smoothedChords,
    chordChanges,
    key,
    scale,
    keyConfidence,
    keyChanges,
    warnings,
  };
}

/**
 * Get chord change times as an array of numbers (for easy integration)
 */
export function getChordChangeTimes(chordChanges: ChordEvent[]): number[] {
  return chordChanges.map((c) => c.time);
}
