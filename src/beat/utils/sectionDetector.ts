/**
 * Section Detector using Self-Similarity Matrix (SSM) analysis
 *
 * Detects song sections (verse, chorus, etc.) by:
 * 1. Extracting MFCC features per frame using Essentia.js
 * 2. Building a self-similarity matrix
 * 3. Detecting novelty peaks using a checkerboard kernel
 * 4. Snapping boundaries to beat positions
 */

import { getEssentia } from './beatAnalyzer';

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
 * Apply Hann window to a frame
 */
function applyHannWindow(frame: Float32Array): Float32Array {
  const windowed = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) {
    const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frame.length - 1)));
    windowed[i] = frame[i] * multiplier;
  }
  return windowed;
}

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

  // Process audio in frames
  for (let i = 0; i + frameSize <= channelData.length; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize);
    
    try {
      // Apply Hann window manually
      const windowedFrame = applyHannWindow(frame);
      const frameVector = essentia.arrayToVector(windowedFrame);

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

      // 5. Zero crossing rate (computed from time domain)
      let zcr = 0;
      for (let j = 1; j < frame.length; j++) {
        if ((frame[j] >= 0) !== (frame[j - 1] >= 0)) {
          zcr++;
        }
      }
      zcr = zcr / frame.length;

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

  if (failureCount > 0) {
    console.log(`Feature extraction: ${features.length} successful, ${failureCount} failed frames`);
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
 * Snap a time value to the nearest measure boundary
 */
function snapToMeasureStart(time: number, bpm: number, musicStartTime: number, beatsPerMeasure: number = 4): number {
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
  
  const timeSinceStart = time - musicStartTime;
  if (timeSinceStart <= 0) return musicStartTime;
  
  // Find the measure number (0-indexed for calculation)
  const measureIndex = timeSinceStart / secondsPerMeasure;
  const floorMeasure = Math.floor(measureIndex);
  const ceilMeasure = Math.ceil(measureIndex);
  
  const floorTime = musicStartTime + floorMeasure * secondsPerMeasure;
  const ceilTime = musicStartTime + ceilMeasure * secondsPerMeasure;
  
  // Return the closer one
  return (time - floorTime) <= (ceilTime - time) ? floorTime : ceilTime;
}

/**
 * Extend a time to the nearest measure boundary that expands the range
 * For start times: snap backward (floor)
 * For end times: snap forward (ceil)
 * 
 * Uses a small epsilon for floating point comparisons to ensure times
 * that are very close to a boundary are treated as being on that boundary.
 */
export function extendToMeasureBoundary(
  time: number,
  direction: 'start' | 'end',
  bpm: number,
  musicStartTime: number,
  beatsPerMeasure: number = 4,
  duration?: number
): number {
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
  
  const timeSinceStart = time - musicStartTime;
  if (timeSinceStart <= 0) return musicStartTime;
  
  // Use epsilon for floating point comparison (50ms tolerance)
  const epsilon = 0.05;
  const measureIndex = timeSinceStart / secondsPerMeasure;
  
  if (direction === 'start') {
    // Snap backward to extend the loop start earlier
    // If we're very close to the next measure, don't include it
    const floorMeasure = Math.floor(measureIndex + epsilon);
    const result = Math.max(musicStartTime, musicStartTime + floorMeasure * secondsPerMeasure);
    // Round to nearest millisecond for consistent comparisons
    return Math.round(result * 1000) / 1000;
  } else {
    // Snap forward to extend the loop end later
    // If we're very close to a measure boundary, go to the next one
    const ceilMeasure = Math.ceil(measureIndex - epsilon);
    // Ensure we always extend to at least the next measure if not exactly on a boundary
    const adjustedCeil = (measureIndex - Math.floor(measureIndex)) > epsilon ? ceilMeasure : Math.floor(measureIndex) + 1;
    const extendedTime = musicStartTime + adjustedCeil * secondsPerMeasure;
    // Round to nearest millisecond
    const roundedTime = Math.round(extendedTime * 1000) / 1000;
    // Don't exceed duration if provided
    return duration !== undefined ? Math.min(roundedTime, duration) : roundedTime;
  }
}


/**
 * Get measure number for a given time
 */
function getMeasureNumber(time: number, bpm: number, musicStartTime: number, beatsPerMeasure: number = 4): number {
  const timeSinceStart = time - musicStartTime;
  if (timeSinceStart < 0) return 0;
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
  return Math.floor(timeSinceStart / secondsPerMeasure) + 1;
}

/**
 * Generate measure-based label for a section
 */
function generateMeasureLabel(startTime: number, endTime: number, bpm: number, musicStartTime: number, beatsPerMeasure: number = 4): string {
  const startMeasure = getMeasureNumber(startTime, bpm, musicStartTime, beatsPerMeasure);
  const endMeasure = getMeasureNumber(endTime - 0.1, bpm, musicStartTime, beatsPerMeasure); // -0.1 to not count the next measure
  
  if (startMeasure === endMeasure) {
    return `M${startMeasure}`;
  }
  return `M${startMeasure}-${endMeasure}`;
}

/**
 * Detect sections in an audio buffer
 */
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
  } = {}
): Promise<SectionDetectionResult> {
  const { minSectionDuration = 8, maxSections = 20, sensitivity = 0.5, musicStartTime = 0, bpm = 120, beatsPerMeasure = 4 } = options;

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
    console.log('Starting section detection for', duration, 'second track');
    const { features, frameTimestamps } = await extractMFCCFeatures(audioBuffer);
    console.log('Extracted', features.length, 'MFCC frames');

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
    const ssm = buildSelfSimilarityMatrix(features);
    const n = features.length;

    // Detect novelty - use smaller kernel for shorter songs
    const kernelSize = Math.max(8, Math.min(64, Math.floor(n / 8)));
    console.log('Using kernel size:', kernelSize, 'for', n, 'frames');
    const rawNovelty = detectNovelty(ssm, n, kernelSize);

    // Smooth novelty curve
    const novelty = gaussianSmooth(rawNovelty, 4);

    // Calculate minimum distance between peaks based on minimum section duration
    const hopDuration = frameTimestamps.length > 1 ? frameTimestamps[1] - frameTimestamps[0] : 0.05;
    const minPeakDistance = Math.ceil(minSectionDuration / hopDuration);

    // Find peaks with sensitivity-adjusted threshold - use lower threshold for more sections
    const threshold = 0.2 - sensitivity * 0.15; // 0.05 to 0.2 (was 0.1 to 0.3)
    console.log('Peak detection threshold:', threshold, 'minPeakDistance:', minPeakDistance);
    const { indices: peakIndices, strengths } = findPeaks(novelty, minPeakDistance, threshold);
    console.log('Found', peakIndices.length, 'peaks');

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

    // Use musicStartTime as the first boundary (not 0)
    const firstBoundary = Math.max(0, musicStartTime);
    const boundaries = [firstBoundary, ...peakTimes, duration];

    // Snap to measure boundaries for musically proper section alignment
    const snappedBoundaries = boundaries.map((t, i) => {
      // First boundary should stay at music start
      if (i === 0) return firstBoundary;
      // Last boundary should stay at duration
      if (i === boundaries.length - 1) return duration;
      // All other boundaries snap to nearest measure start
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

    console.log('Section detection complete:', sections.length, 'sections');
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
