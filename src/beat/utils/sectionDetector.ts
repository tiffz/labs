/**
 * Section Detector using Self-Similarity Matrix (SSM) analysis
 *
 * Detects song sections (verse, chorus, etc.) by:
 * 1. Extracting MFCC features per frame using Essentia.js
 * 2. Building a self-similarity matrix (spectral and/or chord-based)
 * 3. Detecting novelty peaks using a checkerboard kernel
 * 4. Snapping boundaries to beat/measure/chord positions
 */

import { getEssentia } from './beatAnalyzer';
import type { ChordEvent } from './chordAnalyzer';
import { snapToMeasureStart, generateMeasureLabel } from './measureUtils';

// Re-export for backwards compatibility
export { extendToMeasureBoundary } from './measureUtils';

export interface Section {
  id: string;
  startTime: number; // Start time in seconds
  endTime: number; // End time in seconds
  label: string; // Auto-generated label (e.g., "Section 1", "Verse", "Chorus")
  color: string; // Color for UI display
  confidence: number; // 0-1 confidence score for this boundary
}

export interface SectionDetectionResult {
  sections: Section[];
  confidence: number; // Overall detection confidence
  warnings: string[];
}

// Single accent color for all sections (matches app theme)
const SECTION_COLOR = '#9d8ec7'; // accent-primary
const SECTION_COLORS = [SECTION_COLOR]; // Keep as array for compatibility

/**
 * Extract simple spectral features per frame from audio
 * Uses energy, spectral centroid, and spectral spread as features
 */
async function extractMFCCFeatures(
  audioBuffer: AudioBuffer,
  frameSize: number = 4096,
  hopSize: number = 2048
): Promise<{ features: Float32Array[]; frameTimestamps: number[] }> {
  const essentia = await getEssentia();
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const features: Float32Array[] = [];
  const frameTimestamps: number[] = [];
  let failureCount = 0;

  // Test: try arrayToVector with the same channelData that works for BPM
  try {
    const testVector = essentia.arrayToVector(channelData);
    testVector.delete();
  } catch (testErr) {
    console.error('[Section Detection] Test arrayToVector with channelData: FAILED', testErr);
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
      const spectrumArray = essentia.vectorToArray(spectrum.spectrum);

      // Compute spectral features manually
      // 1. Energy
      let energy = 0;
      for (let j = 0; j < spectrumArray.length; j++) {
        energy += spectrumArray[j] * spectrumArray[j];
      }

      // 2. Spectral centroid (weighted mean of frequencies)
      let centroid = 0;
      let totalWeight = 0;
      for (let j = 0; j < spectrumArray.length; j++) {
        const freq = (j * sampleRate) / (2 * spectrumArray.length);
        centroid += freq * spectrumArray[j];
        totalWeight += spectrumArray[j];
      }
      centroid = totalWeight > 0 ? centroid / totalWeight : 0;

      // 3. Spectral spread (weighted standard deviation)
      let spread = 0;
      if (totalWeight > 0) {
        for (let j = 0; j < spectrumArray.length; j++) {
          const freq = (j * sampleRate) / (2 * spectrumArray.length);
          spread += spectrumArray[j] * (freq - centroid) * (freq - centroid);
        }
        spread = Math.sqrt(spread / totalWeight);
      }

      // 4. Spectral rolloff (frequency below which 85% of energy is contained)
      let cumulativeEnergy = 0;
      const targetEnergy = energy * 0.85;
      let rolloff = 0;
      for (let j = 0; j < spectrumArray.length; j++) {
        cumulativeEnergy += spectrumArray[j] * spectrumArray[j];
        if (cumulativeEnergy >= targetEnergy) {
          rolloff = (j * sampleRate) / (2 * spectrumArray.length);
          break;
        }
      }

      // 5. Zero crossing rate (computed from time domain using windowed frame)
      let zcr = 0;
      for (let j = 1; j < frameSlice.length; j++) {
        if ((frameSlice[j] >= 0) !== (frameSlice[j - 1] >= 0)) {
          zcr++;
        }
      }
      zcr = zcr / frameSlice.length;

      // 6. Spectral flux (we'll compute this relative to a baseline)
      let flux = 0;
      for (let j = 0; j < spectrumArray.length; j++) {
        flux += spectrumArray[j];
      }

      // Create feature vector (normalized)
      const featureVector = new Float32Array([
        Math.log1p(energy),
        centroid / 10000, // Normalize to roughly 0-1
        spread / 5000,
        rolloff / 10000,
        zcr * 10,
        Math.log1p(flux),
      ]);

      features.push(featureVector);
      frameTimestamps.push(i / sampleRate);

      // Clean up vectors
      spectrum.spectrum.delete();
      frameVector.delete();
    } catch (err) {
      failureCount++;
      // Only log first few failures
      if (failureCount <= 3) {
        console.warn('Frame processing failed:', err);
      }
    }
  }

  return { features, frameTimestamps };
}

/**
 * Compute cosine similarity between two feature vectors
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Build self-similarity matrix from feature vectors
 */
function buildSelfSimilarityMatrix(features: Float32Array[]): Float32Array {
  const n = features.length;
  const ssm = new Float32Array(n * n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ssm[i * n + j] = cosineSimilarity(features[i], features[j]);
    }
  }

  return ssm;
}

/**
 * Build chord-based self-similarity matrix
 * Compares chord sequences to find repeating progressions
 */
function buildChordSimilarityMatrix(
  chords: ChordEvent[],
  frameTimestamps: number[]
): Float32Array {
  const n = frameTimestamps.length;
  const ssm = new Float32Array(n * n);

  // Map frame timestamps to chord indices
  const frameChords: string[] = [];
  for (const timestamp of frameTimestamps) {
    // Find the chord active at this timestamp
    let activeChord = 'N';
    for (let i = chords.length - 1; i >= 0; i--) {
      if (chords[i].time <= timestamp) {
        activeChord = chords[i].chord;
        break;
      }
    }
    frameChords.push(activeChord);
  }

  // Build SSM based on chord matching
  // Use a window-based approach to capture chord progressions
  const windowSize = 4; // Compare sequences of 4 chords

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Simple chord matching (1 if same, 0 if different)
      // But also consider surrounding context for progression matching
      let similarity = frameChords[i] === frameChords[j] ? 1 : 0;

      // Add context-based similarity (chord progression matching)
      if (i >= windowSize && j >= windowSize) {
        let matchCount = 0;
        for (let k = 0; k < windowSize; k++) {
          if (frameChords[i - k] === frameChords[j - k]) {
            matchCount++;
          }
        }
        // Blend direct match with progression match
        similarity = similarity * 0.5 + (matchCount / windowSize) * 0.5;
      }

      ssm[i * n + j] = similarity;
    }
  }

  return ssm;
}

/**
 * Fuse multiple self-similarity matrices with weighted combination
 */
function fuseSSMs(
  spectralSSM: Float32Array,
  chordSSM: Float32Array,
  n: number,
  spectralWeight: number = 0.6,
  chordWeight: number = 0.4
): Float32Array {
  const fused = new Float32Array(n * n);
  const totalWeight = spectralWeight + chordWeight;

  for (let i = 0; i < n * n; i++) {
    fused[i] = (spectralSSM[i] * spectralWeight + chordSSM[i] * chordWeight) / totalWeight;
  }

  return fused;
}

/**
 * Snap a time to the nearest chord change if one is close enough
 * Falls back to measure boundary if no chord change is nearby
 */
function snapToNearestChordChange(
  time: number,
  chordChanges: number[],
  bpm: number,
  musicStartTime: number,
  beatsPerMeasure: number,
  maxDistance: number = 2.0 // Maximum distance in seconds to snap to chord change
): number {
  // First, find nearest chord change
  let nearestChordChange = -1;
  let minDistance = Infinity;

  for (const changeTime of chordChanges) {
    const distance = Math.abs(changeTime - time);
    if (distance < minDistance && distance < maxDistance) {
      minDistance = distance;
      nearestChordChange = changeTime;
    }
  }

  // If we found a nearby chord change, check if it's reasonably close to a measure boundary
  if (nearestChordChange >= 0) {
    // Verify the chord change is on or near a strong beat
    const measureBoundary = snapToMeasureStart(nearestChordChange, bpm, musicStartTime, beatsPerMeasure);
    const distanceToMeasure = Math.abs(nearestChordChange - measureBoundary);
    const secondsPerBeat = 60 / bpm;

    // If chord change is within half a beat of measure boundary, use it
    if (distanceToMeasure < secondsPerBeat * 0.5) {
      return nearestChordChange;
    }
  }

  // Fall back to measure boundary
  return snapToMeasureStart(time, bpm, musicStartTime, beatsPerMeasure);
}

/**
 * Apply Gaussian smoothing to novelty curve
 */
function gaussianSmooth(signal: Float32Array, sigma: number = 4): Float32Array {
  const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
  const kernel = new Float32Array(kernelSize);
  const halfSize = Math.floor(kernelSize / 2);

  // Create Gaussian kernel
  let sum = 0;
  for (let i = 0; i < kernelSize; i++) {
    const x = i - halfSize;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  // Normalize
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }

  // Apply convolution
  const result = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) {
    let value = 0;
    for (let j = 0; j < kernelSize; j++) {
      const idx = i + j - halfSize;
      if (idx >= 0 && idx < signal.length) {
        value += signal[idx] * kernel[j];
      }
    }
    result[i] = value;
  }

  return result;
}

/**
 * Detect novelty using a checkerboard kernel on the SSM
 * The checkerboard kernel detects sudden changes along the diagonal
 */
function detectNovelty(ssm: Float32Array, n: number, kernelSize: number = 32): Float32Array {
  const novelty = new Float32Array(n);
  const halfKernel = Math.floor(kernelSize / 2);

  for (let i = halfKernel; i < n - halfKernel; i++) {
    let sum = 0;

    // Checkerboard kernel: compare quadrants around diagonal point
    // Upper-left and lower-right should be similar (within section)
    // Upper-right and lower-left should be different (across boundary)
    for (let di = -halfKernel; di < halfKernel; di++) {
      for (let dj = -halfKernel; dj < halfKernel; dj++) {
        const row = i + di;
        const col = i + dj;

        if (row >= 0 && row < n && col >= 0 && col < n) {
          const value = ssm[row * n + col];
          // Checkerboard sign: positive for same quadrant, negative for different
          const sign = di * dj > 0 ? 1 : -1;
          sum += sign * value;
        }
      }
    }

    // Normalize by kernel size
    novelty[i] = Math.max(0, -sum / (kernelSize * kernelSize));
  }

  return novelty;
}

/**
 * Find peaks in the novelty curve
 */
function findPeaks(
  novelty: Float32Array,
  minDistance: number = 20,
  threshold: number = 0.1
): { indices: number[]; strengths: number[] } {
  const indices: number[] = [];
  const strengths: number[] = [];

  // Find the maximum value for normalization
  let maxNovelty = 0;
  for (let i = 0; i < novelty.length; i++) {
    if (novelty[i] > maxNovelty) maxNovelty = novelty[i];
  }

  if (maxNovelty === 0) return { indices, strengths };

  // Normalize threshold
  const absoluteThreshold = threshold * maxNovelty;

  // Find local maxima
  for (let i = 1; i < novelty.length - 1; i++) {
    if (novelty[i] > absoluteThreshold && novelty[i] > novelty[i - 1] && novelty[i] > novelty[i + 1]) {
      // Check minimum distance from previous peak
      if (indices.length === 0 || i - indices[indices.length - 1] >= minDistance) {
        indices.push(i);
        strengths.push(novelty[i] / maxNovelty);
      } else if (novelty[i] > novelty[indices[indices.length - 1]]) {
        // Replace previous peak if this one is stronger
        indices[indices.length - 1] = i;
        strengths[strengths.length - 1] = novelty[i] / maxNovelty;
      }
    }
  }

  return { indices, strengths };
}

/**
 * Detect sections in an audio buffer
 */
export interface KeyChangeInfo {
  time: number;
  key: string;
  scale: string;
}

export async function detectSections(
  audioBuffer: AudioBuffer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _beats: number[] = [], // Kept for API compatibility, but we now snap to measures instead
  options: {
    minSectionDuration?: number; // Minimum section length in seconds
    maxSections?: number; // Maximum number of sections to detect
    sensitivity?: number; // 0-1, higher = more sections detected
    musicStartTime?: number; // Time when music actually starts (skip silence)
    bpm?: number; // BPM for measure-based labeling
    beatsPerMeasure?: number; // Time signature numerator
    chordEvents?: ChordEvent[]; // Optional chord events for harmonic-aware section detection
    chordChangeTimes?: number[]; // Optional chord change times for boundary snapping
    keyChanges?: KeyChangeInfo[]; // Optional key changes - these mark definite section boundaries
  } = {}
): Promise<SectionDetectionResult> {
  const {
    minSectionDuration = 8,
    maxSections = 20,
    sensitivity = 0.5,
    musicStartTime = 0,
    bpm = 120,
    beatsPerMeasure = 4,
    chordEvents = [],
    chordChangeTimes = [],
    keyChanges = []
  } = options;

  const warnings: string[] = [];
  const duration = audioBuffer.duration;

  // Skip very short audio
  if (duration < 30) {
    return {
      sections: [
        {
          id: 'section-0',
          startTime: Math.max(0, musicStartTime),
          endTime: duration,
          label: 'Full Track',
          color: SECTION_COLORS[0],
          confidence: 1,
        },
      ],
      confidence: 1,
      warnings: ['Track too short for section analysis'],
    };
  }

  try {
    // Extract MFCC features
    const { features, frameTimestamps } = await extractMFCCFeatures(audioBuffer);

    if (features.length < 50) {
      warnings.push('Not enough audio frames for reliable section detection');
      return {
        sections: [
          {
            id: 'section-0',
            startTime: Math.max(0, musicStartTime),
            endTime: duration,
            label: 'Full Track',
            color: SECTION_COLORS[0],
            confidence: 0.5,
          },
        ],
        confidence: 0.5,
        warnings,
      };
    }

    // Build self-similarity matrix
    const spectralSSM = buildSelfSimilarityMatrix(features);
    const n = features.length;

    // Build chord-based SSM if chord data is available
    let ssm = spectralSSM;
    if (chordEvents.length > 0) {
      const chordSSM = buildChordSimilarityMatrix(chordEvents, frameTimestamps);
      // Fuse spectral and chord SSMs (60% spectral, 40% chord)
      ssm = fuseSSMs(spectralSSM, chordSSM, n, 0.6, 0.4);
    }

    // Detect novelty - use smaller kernel for shorter songs
    const kernelSize = Math.max(8, Math.min(64, Math.floor(n / 8)));
    const rawNovelty = detectNovelty(ssm, n, kernelSize);

    // Smooth novelty curve
    const novelty = gaussianSmooth(rawNovelty, 4);

    // Calculate minimum distance between peaks based on minimum section duration
    const hopDuration = frameTimestamps.length > 1 ? frameTimestamps[1] - frameTimestamps[0] : 0.05;
    const minPeakDistance = Math.ceil(minSectionDuration / hopDuration);

    // Find peaks with sensitivity-adjusted threshold - use lower threshold for more sections
    const threshold = 0.2 - sensitivity * 0.15; // 0.05 to 0.2 (was 0.1 to 0.3)
    const { indices: peakIndices, strengths } = findPeaks(novelty, minPeakDistance, threshold);

    // Limit number of sections
    let selectedPeaks = peakIndices;
    let selectedStrengths = strengths;
    if (peakIndices.length > maxSections - 1) {
      // Keep strongest peaks
      const sorted = peakIndices
        .map((idx, i) => ({ idx, strength: strengths[i] }))
        .sort((a, b) => b.strength - a.strength)
        .slice(0, maxSections - 1)
        .sort((a, b) => a.idx - b.idx);
      selectedPeaks = sorted.map((p) => p.idx);
      selectedStrengths = sorted.map((p) => p.strength);
    }

    // Convert peak indices to timestamps, filtering out any before music start
    const peakTimes = selectedPeaks
      .map((idx) => frameTimestamps[idx])
      .filter((t) => t > musicStartTime + minSectionDuration * 0.5); // Only keep peaks after music start

    // Key changes are strong indicators of section boundaries - add them as additional boundary candidates
    // We snap key change times to measure boundaries for cleaner section boundaries
    const keyChangeTimes = keyChanges
      .map(kc => {
        // Snap key change to nearest measure boundary
        const snapped = snapToMeasureStart(kc.time, bpm, musicStartTime, beatsPerMeasure);
        return { original: kc.time, snapped, key: `${kc.key}${kc.scale === 'minor' ? 'm' : ''}` };
      })
      .filter(kc => kc.snapped > musicStartTime + minSectionDuration * 0.5); // Only keep after music start
    
    // Key change times will be used as priority boundary candidates

    // Combine peak times and key change times
    // Key change times take priority - if a peak is within 3 seconds of a key change, use the key change time instead
    const keyChangeSnappedTimes = keyChangeTimes.map(kc => kc.snapped);
    const filteredPeakTimes = peakTimes.filter(pt => {
      // Keep peak if it's not too close to any key change
      return !keyChangeSnappedTimes.some(kct => Math.abs(pt - kct) < 3);
    });
    
    const allBoundaryTimes = [...new Set([...filteredPeakTimes, ...keyChangeSnappedTimes])].sort((a, b) => a - b);

    // Use musicStartTime as the first boundary (not 0)
    const firstBoundary = Math.max(0, musicStartTime);
    const boundaries = [firstBoundary, ...allBoundaryTimes, duration];

    // Snap to measure boundaries (or chord changes if available) for musically proper section alignment
    const snappedBoundaries = boundaries.map((t, i) => {
      // First boundary should stay at music start
      if (i === 0) return firstBoundary;
      // Last boundary should stay at duration
      if (i === boundaries.length - 1) return duration;
      // If we have chord change data, prefer snapping to chord changes near measure boundaries
      if (chordChangeTimes.length > 0) {
        return snapToNearestChordChange(t, chordChangeTimes, bpm, musicStartTime, beatsPerMeasure);
      }
      // Otherwise snap to nearest measure start
      return snapToMeasureStart(t, bpm, musicStartTime, beatsPerMeasure);
    });
    
    // Remove duplicate boundaries that might occur after snapping
    const uniqueBoundaries = snappedBoundaries.filter((t, i) => 
      i === 0 || t > snappedBoundaries[i - 1] + 1 // At least 1 second apart
    );

    // Create sections with measure-based labels
    const sections: Section[] = [];
    for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
      const startTime = uniqueBoundaries[i];
      const endTime = uniqueBoundaries[i + 1];

      // Skip very short sections (but be less aggressive)
      if (endTime - startTime < minSectionDuration * 0.3) {
        continue;
      }

      sections.push({
        id: `section-${sections.length}`,
        startTime,
        endTime,
        label: generateMeasureLabel(startTime, endTime, bpm, musicStartTime, beatsPerMeasure),
        color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
        confidence: i === 0 ? 1 : selectedStrengths[i - 1] || 0.5,
      });
    }

    // If no sections were created, create at least one full track section
    if (sections.length === 0) {
      const fullTrackLabel = generateMeasureLabel(Math.max(0, musicStartTime), duration, bpm, musicStartTime, beatsPerMeasure);
      sections.push({
        id: 'section-0',
        startTime: Math.max(0, musicStartTime),
        endTime: duration,
        label: fullTrackLabel,
        color: SECTION_COLORS[0],
        confidence: 0.5,
      });
      warnings.push('No clear section boundaries detected - using full track');
    }

    // Calculate overall confidence
    const avgConfidence =
      sections.length > 0 ? sections.reduce((sum, s) => sum + s.confidence, 0) / sections.length : 0.5;

    if (sections.length <= 2) {
      warnings.push('Few sections detected - song may have uniform structure');
    }

    return {
      sections,
      confidence: avgConfidence,
      warnings,
    };
  } catch (error) {
    console.error('Section detection failed:', error);
    return {
      sections: [
        {
          id: 'section-0',
          startTime: Math.max(0, musicStartTime),
          endTime: duration,
          label: 'Full Track',
          color: SECTION_COLORS[0],
          confidence: 0.3,
        },
      ],
      confidence: 0.3,
      warnings: ['Section detection failed - using full track as single section'],
    };
  }
}

/**
 * Merge adjacent sections
 */
export function mergeSections(sections: Section[], indexA: number, indexB: number): Section[] {
  if (indexA > indexB) [indexA, indexB] = [indexB, indexA];
  if (indexA < 0 || indexB >= sections.length || indexB - indexA !== 1) {
    return sections;
  }

  const merged = [...sections];
  merged[indexA] = {
    ...merged[indexA],
    endTime: merged[indexB].endTime,
    confidence: (merged[indexA].confidence + merged[indexB].confidence) / 2,
  };
  merged.splice(indexB, 1);

  // Renumber IDs
  return merged.map((s, i) => ({ ...s, id: `section-${i}` }));
}

/**
 * Split a section at a specific time
 */
export function splitSection(sections: Section[], index: number, splitTime: number): Section[] {
  if (index < 0 || index >= sections.length) {
    return sections;
  }

  const section = sections[index];
  if (splitTime <= section.startTime || splitTime >= section.endTime) {
    return sections;
  }

  const newSections = [...sections];
  const newSection: Section = {
    id: `section-${index + 1}`,
    startTime: splitTime,
    endTime: section.endTime,
    label: `${section.label} (b)`,
    color: SECTION_COLORS[(index + 1) % SECTION_COLORS.length],
    confidence: section.confidence,
  };

  newSections[index] = {
    ...section,
    endTime: splitTime,
    label: `${section.label} (a)`,
  };

  newSections.splice(index + 1, 0, newSection);

  // Renumber IDs
  return newSections.map((s, i) => ({ ...s, id: `section-${i}` }));
}

/**
 * Update a section boundary
 */
export function updateSectionBoundary(
  sections: Section[],
  index: number,
  boundary: 'start' | 'end',
  newTime: number
): Section[] {
  if (index < 0 || index >= sections.length) {
    return sections;
  }

  const updated = [...sections];
  const section = { ...updated[index] };

  if (boundary === 'start') {
    // Ensure we don't go before previous section or after current end
    const minTime = index > 0 ? sections[index - 1].startTime + 1 : 0;
    const maxTime = section.endTime - 1;
    section.startTime = Math.max(minTime, Math.min(maxTime, newTime));

    // Update previous section's end time
    if (index > 0) {
      updated[index - 1] = { ...updated[index - 1], endTime: section.startTime };
    }
  } else {
    // Ensure we don't go after next section or before current start
    const minTime = section.startTime + 1;
    const maxTime = index < sections.length - 1 ? sections[index + 1].endTime - 1 : Infinity;
    section.endTime = Math.max(minTime, Math.min(maxTime, newTime));

    // Update next section's start time
    if (index < sections.length - 1) {
      updated[index + 1] = { ...updated[index + 1], startTime: section.endTime };
    }
  }

  updated[index] = section;
  return updated;
}
