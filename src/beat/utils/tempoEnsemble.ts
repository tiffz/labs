/**
 * Tempo Ensemble Detection
 *
 * Uses multiple tempo estimation algorithms and computes consensus
 * to improve accuracy and detect/resolve octave errors (60 vs 120 vs 240 BPM).
 */

import { getEssentia } from './beatAnalyzer';
import { detectOnsets } from './analysis/onsets';
import { normalizeToRange } from './analysis/tempoUtils';

export interface TempoEstimate {
  algorithm: string;
  bpm: number;
  confidence: number;
  beats?: number[];
}

export interface EnsembleResult {
  consensusBpm: number;
  confidence: number;
  estimates: TempoEstimate[];
  agreement: 'strong' | 'moderate' | 'weak';
  warnings: string[];
  /** Best beat positions from the most confident algorithm */
  bestBeats: number[];
}

// normalizeToRange is shared via utils/analysis/tempoUtils.ts

// Onset detection is shared via utils/analysis/onsets.ts

/**
 * Calculate onset density (onsets per second)
 */
function calculateOnsetDensity(onsets: number[], duration: number): number {
  if (duration <= 0) return 0;
  return onsets.length / duration;
}

/**
 * Calculate audio characteristics that help distinguish fast vs slow songs.
 * Returns multiple features:
 * - energyVariance: how "punchy" the audio is (0=smooth, 1=percussive)
 * - spectralCentroid: audio "brightness" (higher = more high-frequency content)
 * - highFreqRatio: ratio of high-frequency energy to total energy
 * @deprecated Currently unused - kept for potential future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _calculateAudioCharacteristics(audioBuffer: AudioBuffer): {
  energyVariance: number;
  spectralBrightness: number;
  highFreqRatio: number;
} {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Use larger frames for analysis (50ms windows)
  const frameSize = Math.floor(sampleRate * 0.05);
  const hopSize = Math.floor(frameSize / 2);
  
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  if (numFrames < 10) {
    return { energyVariance: 0.5, spectralBrightness: 0.5, highFreqRatio: 0.5 };
  }
  
  // Arrays for frame-by-frame analysis
  const energies: number[] = [];
  const centroids: number[] = [];
  const highFreqRatios: number[] = [];
  
  for (let i = 0; i < Math.min(numFrames, 200); i++) { // Sample up to 200 frames
    const start = i * hopSize;
    
    // Calculate RMS energy
    let energy = 0;
    for (let j = 0; j < frameSize; j++) {
      energy += channelData[start + j] * channelData[start + j];
    }
    energies.push(Math.sqrt(energy / frameSize));
    
    // Simple spectral analysis using zero-crossing rate as proxy for brightness
    // (actual FFT would be better but this is fast and reasonably effective)
    let zeroCrossings = 0;
    for (let j = 1; j < frameSize; j++) {
      if ((channelData[start + j - 1] >= 0) !== (channelData[start + j] >= 0)) {
        zeroCrossings++;
      }
    }
    // ZCR is correlated with spectral centroid
    const zcr = zeroCrossings / frameSize;
    centroids.push(zcr);
    
    // Estimate high-frequency content using simple high-pass filter proxy
    // Count zero-crossings in small windows (captures high-frequency activity)
    let highFreqActivity = 0;
    const miniWindowSize = 64;
    for (let j = 0; j < frameSize - miniWindowSize; j += miniWindowSize) {
      let miniZcr = 0;
      for (let k = 1; k < miniWindowSize; k++) {
        if ((channelData[start + j + k - 1] >= 0) !== (channelData[start + j + k] >= 0)) {
          miniZcr++;
        }
      }
      highFreqActivity += miniZcr / miniWindowSize;
    }
    highFreqRatios.push(highFreqActivity / (frameSize / miniWindowSize));
  }
  
  // Calculate energy variance
  const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
  let energyVariance = 0.5;
  if (meanEnergy > 0.001) {
    const energyChanges = energies.slice(1).map((e, i) => Math.abs(e - energies[i]));
    const meanChange = energyChanges.reduce((a, b) => a + b, 0) / energyChanges.length;
    energyVariance = Math.min(1, (meanChange / meanEnergy) * 2);
  }
  
  // Calculate spectral brightness (average ZCR, normalized)
  const meanCentroid = centroids.reduce((a, b) => a + b, 0) / centroids.length;
  // ZCR typically ranges from 0.01 to 0.3 for music
  const spectralBrightness = Math.min(1, meanCentroid * 5);
  
  // Calculate high-frequency ratio
  const meanHighFreq = highFreqRatios.reduce((a, b) => a + b, 0) / highFreqRatios.length;
  const highFreqRatio = Math.min(1, meanHighFreq * 3);
  
  return { energyVariance, spectralBrightness, highFreqRatio };
}

/**
 * Calculate Inter-Onset Intervals (IOIs) from onset times
 * @deprecated Currently unused - kept for potential future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _calculateIOIs(onsets: number[]): number[] {
  const iois: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    iois.push(onsets[i] - onsets[i - 1]);
  }
  return iois;
}

/**
 * Build a histogram of IOIs to find dominant intervals.
 * Returns bins with their counts, sorted by count descending.
 */
function buildIOIHistogram(iois: number[], binWidth: number = 0.05): Map<number, number> {
  const histogram = new Map<number, number>();
  
  for (const ioi of iois) {
    // Bin the IOI (round to nearest bin center)
    const bin = Math.round(ioi / binWidth) * binWidth;
    histogram.set(bin, (histogram.get(bin) || 0) + 1);
  }
  
  return histogram;
}

/**
 * Find the dominant IOI (most common inter-onset interval).
 * This represents the most common pulse in the music.
 * 
 * We look for peaks in the histogram and also check octave-related intervals
 * (half and double) to find the true dominant pulse.
 * @deprecated Currently unused - kept for potential future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _findDominantIOI(iois: number[]): number {
  if (iois.length === 0) return 0.5; // Default to ~120 BPM
  
  const histogram = buildIOIHistogram(iois, 0.03);
  
  // Find the top bins by count
  const sortedBins = Array.from(histogram.entries())
    .filter(([bin]) => bin >= 0.15 && bin <= 2.0) // Filter to reasonable beat intervals (30-400 BPM)
    .sort((a, b) => b[1] - a[1]);
  
  if (sortedBins.length === 0) return 0.5;
  
  // Get the most frequent IOI
  const topBin = sortedBins[0][0];
  
  // Check if there's also a strong peak at half or double this interval
  // This helps us understand if the dominant pulse is at beat or half-beat level
  const halfBin = topBin / 2;
  const doubleBin = topBin * 2;
  
  const topCount = sortedBins[0][1];
  let halfCount = 0;
  let doubleCount = 0;
  
  // Look for counts near half and double bins
  for (const [bin, count] of histogram) {
    if (Math.abs(bin - halfBin) < 0.05) halfCount += count;
    if (Math.abs(bin - doubleBin) < 0.05) doubleCount += count;
  }
  
  // If half intervals are very common (>50% of top), the music might feel twice as fast
  // If double intervals are common, the music might feel half as fast
  // We return the interval that best represents the "felt" beat
  
  // For now, prefer the dominant bin, but weight by which level has more evidence
  if (halfCount > topCount * 0.7 && halfBin >= 0.2) {
    // Lots of half-beat activity, music feels faster
    return halfBin;
  }
  
  if (doubleCount > topCount * 0.5 && doubleBin <= 1.5) {
    // Strong double-beat grouping, music might feel slower
    // But only if there's clear evidence
    return doubleBin;
  }
  
  return topBin;
}

/**
 * Convert IOI to BPM
 * @deprecated Currently unused - kept for potential future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ioiToBpm(ioi: number): number {
  if (ioi <= 0) return 120;
  return 60 / ioi;
}

/**
 * Compare two BPM candidates by measuring how well they align with onsets.
 * Returns the alignment score for each candidate.
 */
function measureBpmAlignment(candidateBpm: number, onsets: number[]): number {
  if (onsets.length < 20) return 0;
  
  // Use stable section of onsets
  const stableOnsets = onsets.filter(t => t >= 10 && t <= Math.max(60, onsets[onsets.length - 1] - 10));
  if (stableOnsets.length < 15) return 0;
  
  const beatInterval = 60 / candidateBpm;
  
  // Find best phase alignment
  let bestScore = 0;
  for (let offset = 0; offset < beatInterval; offset += beatInterval / 20) {
    let score = 0;
    const startTime = stableOnsets[0] + offset;
    const endTime = stableOnsets[stableOnsets.length - 1];
    const numBeats = Math.floor((endTime - startTime) / beatInterval);
    
    // Sample at multiple points throughout the song
    const checkPoints = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
    for (const cp of checkPoints) {
      const beatIdx = Math.floor(numBeats * cp);
      const expectedTime = startTime + beatIdx * beatInterval;
      
      // Find nearest onset
      let minDist = Infinity;
      for (const onset of stableOnsets) {
        const dist = Math.abs(onset - expectedTime);
        if (dist < minDist) minDist = dist;
      }
      
      // Score: 1.0 for perfect alignment, decreasing with distance
      score += Math.max(0, 1 - (minDist / (beatInterval * 0.4)));
    }
    
    if (score > bestScore) bestScore = score;
  }
  
  return bestScore / 7; // Normalize to 0-1 range
}

/**
 * Snap BPM to nearest integer when appropriate.
 * 
 * Most professionally recorded music uses integer BPMs because:
 * 1. Click tracks and DAWs default to whole numbers
 * 2. Musicians think in whole numbers (120, 137, etc.)
 * 3. Fractional BPMs are rare except in live recordings or tempo-mapped productions
 * 
 * We compare the alignment of the detected BPM vs the nearest integer.
 * Only keep the fractional BPM if it aligns SIGNIFICANTLY better than the integer.
 * 
 * @param bpm - The detected BPM (may be fractional)
 * @param onsets - Onset times for alignment comparison
 * @returns The BPM, snapped to integer if appropriate
 */
function snapBpmToIntegerWithOnsets(bpm: number, onsets: number[]): number {
  const nearest = Math.round(bpm);
  const delta = Math.abs(nearest - bpm);
  
  // Already effectively an integer (within 0.15)
  if (delta < 0.15) {
    return nearest;
  }
  
  // For BPMs within 0.5 of an integer, strongly prefer the integer
  // Most studio recordings use integer BPMs (click tracks default to whole numbers)
  if (delta <= 0.5) {
    // If we don't have enough onsets for reliable comparison, just snap to integer
    if (onsets.length < 50) {
      return nearest;
    }
    
    // Compare alignment of fractional vs integer BPM
    const fractionalScore = measureBpmAlignment(bpm, onsets);
    const integerScore = measureBpmAlignment(nearest, onsets);
    
    // The fractional BPM must be SUBSTANTIALLY better to justify keeping it
    // Require at least 12% improvement in alignment score for close values
    // This is aggressive because integer BPMs are far more common in recordings
    const improvementThreshold = 0.12;
    
    if (fractionalScore > integerScore + improvementThreshold) {
      // Fractional BPM is substantially better - keep it but round to 1 decimal
      return Math.round(bpm * 10) / 10;
    } else {
      // Integer is just as good or close enough - snap to it
      return nearest;
    }
  }
  
  // For BPMs further from integers (>0.5 away), still compare but with lower threshold
  if (onsets.length < 50) {
    // Not enough onsets - round to 1 decimal at least
    return Math.round(bpm * 10) / 10;
  }
  
  const fractionalScore = measureBpmAlignment(bpm, onsets);
  const integerScore = measureBpmAlignment(nearest, onsets);
  
  // Require 8% improvement for values further from integers
  const improvementThreshold = 0.08;
  
  if (fractionalScore > integerScore + improvementThreshold) {
    return Math.round(bpm * 10) / 10;
  } else {
    return nearest;
  }
}

// Legacy function for backward compatibility (when onsets aren't available)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _snapBpmToInteger(bpm: number, _confidence: number, _fineTuneScore?: number): number {
  // Without onsets, use simple heuristic: always prefer integers within 0.5 BPM
  const nearest = Math.round(bpm);
  const delta = Math.abs(nearest - bpm);
  
  if (_confidence < 0.3) {
    return Math.round(bpm * 10) / 10;
  }
  
  // Most recordings use integer BPMs - snap within 0.5 BPM
  if (delta <= 0.5) {
    return nearest;
  }
  
  return Math.round(bpm * 10) / 10;
}

/**
 * Fine-tune BPM using drift analysis.
 * 
 * The key insight is that if the BPM is slightly wrong, the beat grid will
 * gradually drift away from the actual onsets over time. The correct BPM
 * will show minimal cumulative drift.
 * 
 * This is similar to how a human knows they're off-tempo - they notice
 * they're gradually getting ahead of or behind the music.
 * 
 * @param candidateBpm - The initially detected BPM
 * @param onsets - Detected onset times  
 * @param searchRange - How far to search (±BPM), default 1.0
 * @param step - Search increment, default 0.05
 * @returns Fine-tuned BPM with higher precision
 */
function fineTuneBpm(
  candidateBpm: number,
  onsets: number[],
  searchRange: number = 1.0,
  step: number = 0.05
): { bpm: number; score: number } {
  // Need enough onsets for meaningful analysis
  if (onsets.length < 30) {
    return { bpm: candidateBpm, score: 0 };
  }
  
  // Use onsets from a stable section (skip intro/outro)
  const stableOnsets = onsets.filter(t => t >= 10 && t <= Math.max(90, onsets[onsets.length - 1] - 10));
  if (stableOnsets.length < 20) {
    return { bpm: candidateBpm, score: 0 };
  }
  
  let bestBpm = candidateBpm;
  let bestScore = -Infinity;
  
  // Search around the candidate BPM
  for (let testBpm = candidateBpm - searchRange; testBpm <= candidateBpm + searchRange; testBpm += step) {
    if (testBpm <= 30) continue;
    
    const beatInterval = 60 / testBpm;
    
    // Find the best starting phase (offset) for this BPM
    // Try different offsets and find one that aligns well with early onsets
    let bestOffset = 0;
    let bestOffsetScore = -Infinity;
    
    for (let offsetTest = 0; offsetTest < beatInterval; offsetTest += beatInterval / 10) {
      let score = 0;
      // Check alignment of first 10 expected beats
      for (let i = 0; i < 10; i++) {
        const expectedBeat = stableOnsets[0] + offsetTest + i * beatInterval;
        // Find nearest onset
        let minDist = Infinity;
        for (const onset of stableOnsets) {
          const dist = Math.abs(onset - expectedBeat);
          if (dist < minDist) minDist = dist;
        }
        // Score inversely proportional to distance
        score += Math.max(0, 1 - minDist / (beatInterval * 0.25));
      }
      if (score > bestOffsetScore) {
        bestOffsetScore = score;
        bestOffset = offsetTest;
      }
    }
    
    // Now measure drift over time with this offset
    // Generate expected beat times
    const startBeat = stableOnsets[0] + bestOffset;
    const numBeats = Math.floor((stableOnsets[stableOnsets.length - 1] - startBeat) / beatInterval);
    
    if (numBeats < 20) continue;
    
    // Measure drift at different points in the song
    const checkPoints = [0.25, 0.5, 0.75, 1.0]; // Check at 25%, 50%, 75%, 100%
    let totalDriftScore = 0;
    
    for (const checkPoint of checkPoints) {
      const beatIndex = Math.floor(numBeats * checkPoint);
      const expectedTime = startBeat + beatIndex * beatInterval;
      
      // Find nearest onset to this expected beat
      let minDist = Infinity;
      for (const onset of stableOnsets) {
        const dist = Math.abs(onset - expectedTime);
        if (dist < minDist) minDist = dist;
      }
      
      // Score: higher is better (less drift)
      // Perfect alignment = 1, half-beat off = 0
      const driftScore = Math.max(0, 1 - (minDist / (beatInterval * 0.5)));
      totalDriftScore += driftScore;
    }
    
    // Average drift score across checkpoints
    const avgDriftScore = totalDriftScore / checkPoints.length;
    
    // Small bonus for being close to the candidate (trust the algorithm somewhat)
    const proximityBonus = 0.02 * (1 - Math.abs(testBpm - candidateBpm) / searchRange);
    
    // Preference for slower tempos to counteract subdivision bias
    // Music with 8th notes tends to falsely favor faster tempos
    const slowerPreference = (candidateBpm - testBpm) * 0.05;
    
    const score = avgDriftScore + proximityBonus + slowerPreference;
    
    if (score > bestScore) {
      bestScore = score;
      bestBpm = testBpm;
    }
  }
  
  // Round to 2 decimal places
  return { 
    bpm: Math.round(bestBpm * 100) / 100, 
    score: bestScore 
  };
}

/**
 * Select the correct octave for the detected BPM based on onset density.
 * 
 * The key insight is that songs with lots of short, dense notes "feel" fast
 * and work better at higher BPMs, while songs with sparse, long notes "feel"
 * slow and work better at lower BPMs.
 * 
 * We measure onset density (note attacks per second) and compare it to what
 * we'd expect at each candidate BPM. The octave whose expected density best
 * matches the observed density wins.
 * 
 * @param candidateBpm - The BPM detected by tempo algorithms
 * @param audioBuffer - The audio data for analysis
 * @returns The BPM adjusted to the musically correct octave
 * @deprecated Use selectCorrectOctaveWithOnsets instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _selectCorrectOctave(candidateBpm: number, audioBuffer: AudioBuffer): number {
  const onsets = detectOnsets(audioBuffer);
  return selectCorrectOctaveWithOnsets(candidateBpm, onsets, audioBuffer.duration);
}

/**
 * Select the correct octave using pre-computed onsets.
 * This avoids redundant onset detection when called from detectTempoEnsemble.
 */
function selectCorrectOctaveWithOnsets(candidateBpm: number, onsets: number[], duration: number): number {
  const onsetDensity = calculateOnsetDensity(onsets, duration);
  
  // Calculate possible octaves
  const halfBpm = candidateBpm / 2;
  const doubleBpm = candidateBpm * 2;
  
  // Expected onset density at each BPM level
  // 
  // The key insight: at a given BPM, we expect a certain number of onsets per beat.
  // Faster songs tend to have simpler patterns per beat (~1.5 onsets/beat)
  // Slower songs tend to have more subdivisions per beat (~3 onsets/beat)
  // 
  // This creates a natural crossing point where density helps distinguish octaves:
  // - At 138 BPM: expect ~1.5 onsets/beat = 3.45 onsets/sec
  // - At 69 BPM: expect ~3 onsets/beat = 3.45 onsets/sec
  // 
  // But the actual observed patterns differ:
  // - "Let It Go" (fast feel): 3.53 onsets/sec with lots of rhythmic activity
  // - "Wish My Life Away" (slow feel): 2.46 onsets/sec with sparser notes
  const onsetsPerBeatFast = 1.5;  // Fast songs: simpler patterns
  const onsetsPerBeatMedium = 2.5; // Medium songs
  const onsetsPerBeatSlow = 3.0;  // Slow songs: more subdivisions
  
  const expectedDensityAtDouble = (doubleBpm / 60) * onsetsPerBeatFast;
  const expectedDensityAtCandidate = (candidateBpm / 60) * onsetsPerBeatMedium;
  const expectedDensityAtHalf = (halfBpm / 60) * onsetsPerBeatSlow;
  
  // Calculate how well each octave matches the observed density (lower = better match)
  const densityErrorDouble = Math.abs(onsetDensity - expectedDensityAtDouble) / expectedDensityAtDouble;
  const densityErrorCandidate = Math.abs(onsetDensity - expectedDensityAtCandidate) / expectedDensityAtCandidate;
  const densityErrorHalf = Math.abs(onsetDensity - expectedDensityAtHalf) / expectedDensityAtHalf;
  
  
  // Build scores for each valid octave (lower score = better)
  interface OctaveScore {
    bpm: number;
    score: number;
    label: string;
  }
  
  // Penalty for extreme tempos - most music feels natural between 60-170 BPM
  // This helps avoid octave errors where density matching alone picks extreme tempos
  // Note: We're more permissive on the slow side (60-70 is common for ballads)
  function getTempoRangePenalty(bpm: number): number {
    if (bpm >= 60 && bpm <= 170) return 0;        // Normal range - no penalty
    if (bpm >= 50 && bpm < 60) return 0.15;       // Slow - somewhat unusual
    if (bpm > 170 && bpm <= 190) return 0.2;      // Fast - somewhat unusual
    if (bpm < 50) return 0.3;                      // Very slow - rare
    return 0.35;                                   // Very fast (>190) - rare
  }
  
  const scores: OctaveScore[] = [];
  
  // Only consider reasonable tempos (40-220 BPM range)
  if (halfBpm >= 40) {
    const penalty = getTempoRangePenalty(halfBpm);
    scores.push({ bpm: halfBpm, score: densityErrorHalf + penalty, label: 'half' });
  }
  
  if (candidateBpm >= 40 && candidateBpm <= 220) {
    // Small preference for keeping the original detection when close
    const penalty = getTempoRangePenalty(candidateBpm);
    scores.push({ bpm: candidateBpm, score: densityErrorCandidate - 0.05 + penalty, label: 'candidate' });
  }
  
  if (doubleBpm <= 220) {
    const penalty = getTempoRangePenalty(doubleBpm);
    scores.push({ bpm: doubleBpm, score: densityErrorDouble + penalty, label: 'double' });
  }
  
  // Sort by score (lower is better)
  scores.sort((a, b) => a.score - b.score);
  
  if (scores.length === 0) {
    return candidateBpm;
  }
  
  const best = scores[0];
  
  // Only switch octaves if there's a meaningful difference
  // If scores are very close, prefer the candidate (original detection)
  if (best.label !== 'candidate' && scores.length > 1) {
    const candidateEntry = scores.find(s => s.label === 'candidate');
    if (candidateEntry && candidateEntry.score - best.score < 0.15) {
      return candidateBpm;
    }
  }
  
  // Return with precision, round to 2 decimal places to preserve accuracy
  // This prevents drift on songs with fractional BPMs (e.g., 69.17 vs 69.2)
  return Math.round(best.bpm * 100) / 100;
}
// function areOctaveRelated(bpm1: number, bpm2: number, tolerance: number = 0.03): boolean {
//   const ratio = bpm1 / bpm2;
//   const octaves = [0.25, 0.5, 1, 2, 4];
//   return octaves.some((oct) => Math.abs(ratio - oct) < tolerance);
// }

/**
 * Run multiple tempo estimation algorithms
 * 
 * Performance optimization: For long audio (>3min), skip redundant algorithms
 * and exit early if we get high-confidence results.
 */
async function runTempoEstimators(audioBuffer: AudioBuffer): Promise<TempoEstimate[]> {
  const essentia = await getEssentia();
  const channelData = audioBuffer.getChannelData(0);
  const signal = essentia.arrayToVector(channelData);
  const estimates: TempoEstimate[] = [];
  
  // For long audio, be more selective about which algorithms to run
  const isLongAudio = audioBuffer.duration > 180; // > 3 minutes

  // 1. RhythmExtractor2013 (multifeature) - most accurate general-purpose
  let multifeatureConfidence = 0;
  try {
    const result = essentia.RhythmExtractor2013(signal, 220, 'multifeature', 40);
    const beats = essentia.vectorToArray(result.ticks);
    multifeatureConfidence = Math.min(1, result.confidence / 5);
    estimates.push({
      algorithm: 'multifeature',
      bpm: result.bpm,
      confidence: multifeatureConfidence,
      beats: Array.from(beats),
    });
    result.ticks.delete();
  } catch (err) {
    console.warn('[TempoEnsemble] multifeature failed:', err);
  }

  // 2. RhythmExtractor2013 (degara) - different onset detection approach
  // Skip for long audio if multifeature gave good results (similar algorithm)
  if (!isLongAudio || multifeatureConfidence < 0.6) {
    try {
      const result = essentia.RhythmExtractor2013(signal, 220, 'degara', 40);
      const beats = essentia.vectorToArray(result.ticks);
      estimates.push({
        algorithm: 'degara',
        bpm: result.bpm,
        confidence: Math.min(1, result.confidence / 5),
        beats: Array.from(beats),
      });
      result.ticks.delete();
    } catch (err) {
      console.warn('[TempoEnsemble] degara failed:', err);
    }
  }

  // 3. PercivalBpmEstimator - autocorrelation-based, good for electronic
  // Fast algorithm, always run
  try {
    const result = essentia.PercivalBpmEstimator(signal);
    estimates.push({
      algorithm: 'percival',
      bpm: result.bpm,
      confidence: 0.6, // Percival doesn't output confidence, assume medium
    });
  } catch (err) {
    console.warn('[TempoEnsemble] percival failed:', err);
  }

  // 4. LoopBpmEstimator - optimized for loop-based music
  // Skip for long audio (loops are typically short)
  if (!isLongAudio) {
    try {
      const result = essentia.LoopBpmEstimator(signal);
      estimates.push({
        algorithm: 'loop',
        bpm: result.bpm,
        confidence: result.confidence || 0.5,
      });
    } catch (err) {
      console.warn('[TempoEnsemble] loop failed:', err);
    }
  }

  signal.delete();
  return estimates;
}

/**
 * Compute weighted consensus from multiple tempo estimates
 */
function computeConsensus(estimates: TempoEstimate[]): {
  consensusBpm: number;
  confidence: number;
  agreement: 'strong' | 'moderate' | 'weak';
} {
  if (estimates.length === 0) {
    return { consensusBpm: 120, confidence: 0, agreement: 'weak' };
  }

  if (estimates.length === 1) {
    return {
      consensusBpm: estimates[0].bpm, // Keep precision, don't round
      confidence: estimates[0].confidence,
      agreement: 'weak',
    };
  }

  // Normalize all BPMs to 70-140 range for comparison
  const normalized = estimates.map((e) => ({
    ...e,
    normalizedBpm: normalizeToRange(e.bpm),
  }));

  // Group estimates by similarity (within 5% of each other)
  const groups: { bpm: number; members: typeof normalized }[] = [];
  for (const est of normalized) {
    const matchingGroup = groups.find(
      (g) => Math.abs(g.bpm - est.normalizedBpm) / g.bpm < 0.05
    );
    if (matchingGroup) {
      matchingGroup.members.push(est);
      // Update group BPM to weighted average
      const totalWeight = matchingGroup.members.reduce((sum, m) => sum + m.confidence, 0);
      matchingGroup.bpm =
        matchingGroup.members.reduce((sum, m) => sum + m.normalizedBpm * m.confidence, 0) /
        totalWeight;
    } else {
      groups.push({ bpm: est.normalizedBpm, members: [est] });
    }
  }

  // Find the group with most agreement (weighted by confidence)
  let bestGroup = groups[0];
  let bestScore = 0;
  for (const group of groups) {
    const score = group.members.reduce((sum, m) => sum + m.confidence, 0);
    if (score > bestScore) {
      bestScore = score;
      bestGroup = group;
    }
  }

  // Determine agreement level
  const agreementRatio = bestGroup.members.length / estimates.length;
  let agreement: 'strong' | 'moderate' | 'weak';
  if (agreementRatio >= 0.75 && bestGroup.members.length >= 3) {
    agreement = 'strong';
  } else if (agreementRatio >= 0.5 || bestGroup.members.length >= 2) {
    agreement = 'moderate';
  } else {
    agreement = 'weak';
  }

  // Calculate consensus BPM using normalized values
  const totalWeight = bestGroup.members.reduce((sum, m) => sum + m.confidence, 0);
  const weightedNormalizedBpm =
    bestGroup.members.reduce((sum, m) => sum + m.normalizedBpm * m.confidence, 0) / totalWeight;

  // Return the raw consensus - octave selection is done later by selectCorrectOctaveWithOnsets()
  // Keep precision (don't round) so octave correction can be more accurate
  const consensusBpm = weightedNormalizedBpm;

  // Confidence based on agreement and individual confidences
  const avgConfidence = totalWeight / bestGroup.members.length;
  const confidence = Math.min(1, avgConfidence * (0.5 + agreementRatio * 0.5));

  return { consensusBpm, confidence, agreement };
}

/**
 * Detect tempo using ensemble of algorithms
 */
export async function detectTempoEnsemble(audioBuffer: AudioBuffer): Promise<EnsembleResult> {
  const warnings: string[] = [];

  // Run all estimators
  const estimates = await runTempoEstimators(audioBuffer);

  if (estimates.length === 0) {
    warnings.push('All tempo estimators failed');
    return {
      consensusBpm: 120,
      confidence: 0,
      estimates: [],
      agreement: 'weak',
      warnings,
      bestBeats: [],
    };
  }

  // Filter out invalid estimates (BPM of 0 or very low confidence)
  const validEstimates = estimates.filter(
    (e) => e.bpm > 30 && e.bpm < 300 && e.confidence > 0.01
  );

  if (validEstimates.length === 0) {
    warnings.push('No valid tempo estimates');
    return {
      consensusBpm: 120,
      confidence: 0,
      estimates,
      agreement: 'weak',
      warnings,
      bestBeats: [],
    };
  }

  // Check for octave disagreement
  const normalizedBpms = validEstimates.map((e) => normalizeToRange(e.bpm));
  const minNorm = Math.min(...normalizedBpms);
  const maxNorm = Math.max(...normalizedBpms);
  if (maxNorm / minNorm > 1.1) {
    warnings.push('Tempo estimates disagree - verify manually');
  }

  // Compute consensus using only valid estimates
  const { consensusBpm: rawConsensusBpm, confidence, agreement } = computeConsensus(validEstimates);

  // Detect onsets for octave selection and fine-tuning
  const onsets = detectOnsets(audioBuffer);

  // Apply intelligent octave selection based on musical characteristics
  // This analyzes onset density and inter-onset intervals to determine
  // whether the song "feels" slow or fast
  const octaveCorrectedBpm = selectCorrectOctaveWithOnsets(rawConsensusBpm, onsets, audioBuffer.duration);
  

  // Fine-tune the BPM using drift analysis
  // This catches fractional BPMs by measuring how well the beat grid stays
  // aligned with onsets over time
  const { bpm: fineTunedBpm, score: fineTuneScore } = fineTuneBpm(octaveCorrectedBpm, onsets);
  
  const bpmDiff = Math.abs(fineTunedBpm - octaveCorrectedBpm);
  
  // Apply fine-tuning if:
  // 1. Score is good (>0.6 means onsets align well at checkpoint)
  // 2. Difference is meaningful but not too large (0.1-1.5 BPM)
  const minFineTuneScore = octaveCorrectedBpm >= 120 ? 0.75 : 0.6;
  const maxFineTuneDiff = octaveCorrectedBpm >= 120 ? 0.6 : 1.5;
  const consensusBpm = (fineTuneScore > minFineTuneScore && bpmDiff >= 0.1 && bpmDiff <= maxFineTuneDiff)
    ? fineTunedBpm
    : octaveCorrectedBpm;

  // Snap to integer BPM when appropriate
  // Compare alignment of detected BPM vs nearest integer
  // Only keep fractional BPM if it aligns significantly better
  const snappedBpm = snapBpmToIntegerWithOnsets(consensusBpm, onsets);

  // Get best beats from most confident algorithm with beats
  const estimatesWithBeats = estimates.filter((e) => e.beats && e.beats.length > 0);
  const bestEstimate =
    estimatesWithBeats.length > 0
      ? estimatesWithBeats.reduce((best, e) => (e.confidence > best.confidence ? e : best))
      : null;

  return {
    consensusBpm: snappedBpm,
    confidence,
    estimates,
    agreement,
    warnings,
    bestBeats: bestEstimate?.beats || [],
  };
}
