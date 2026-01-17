/**
 * Fermata Detector (Experimental)
 *
 * Detects fermatas (held notes/pauses) in audio using inter-onset interval (IOI) analysis.
 * Fermatas are characterized by:
 * 1. Longer-than-expected gaps between note onsets
 * 2. Energy profile showing sustained tone or silence (not just quiet passage)
 * 3. Return to normal rhythm after the held section
 */

import { getEssentia } from '../beatAnalyzer';
import type { TempoRegion } from '../tempoRegions';
import { generateRegionId } from '../tempoRegions';

export interface FermataCandidate {
  /** Time of the last onset before the fermata gap */
  startTime: number;
  /** Time of the first onset after the fermata gap */
  endTime: number;
  /** Duration of the gap in seconds */
  gapDuration: number;
  /** Detection confidence (0-1) */
  confidence: number;
  /** The local BPM before the fermata (for context) */
  precedingBpm: number;
  /** How many expected beats were "held" during this fermata */
  heldBeats: number;
}

export interface FermataDetectionResult {
  /** Detected fermata regions */
  fermatas: TempoRegion[];
  /** All onset times detected in the audio */
  onsetTimes: number[];
  /** Warnings about detection */
  warnings: string[];
}

/**
 * Detect onsets in audio using SuperFluxNovelty
 * Returns onset times in seconds
 */
async function detectOnsets(
  audioBuffer: AudioBuffer,
  options: {
    frameSize?: number;
    hopSize?: number;
    threshold?: number;
  } = {}
): Promise<number[]> {
  const { frameSize = 2048, hopSize = 256, threshold = 0.1 } = options;

  const essentia = await getEssentia();
  const channelData = audioBuffer.getChannelData(0);
  const signal = essentia.arrayToVector(channelData);
  const sampleRate = audioBuffer.sampleRate;

  try {
    // Use SuperFluxNovelty for onset detection (good for percussive and melodic onsets)
    const novelty = essentia.SuperFluxNovelty(signal, frameSize, hopSize);
    const noveltyArray = essentia.vectorToArray(novelty.novelty);

    signal.delete();
    novelty.novelty.delete();

    // Find peaks in novelty function (onset candidates)
    return findNoveltyPeaks(noveltyArray, hopSize, sampleRate, threshold);
  } catch (err) {
    console.warn('[FermataDetector] Onset detection failed:', err);
    signal.delete();
    return [];
  }
}

/**
 * Find peaks in novelty function (onset candidates)
 */
function findNoveltyPeaks(
  novelty: Float32Array,
  hopSize: number,
  sampleRate: number,
  threshold: number = 0.1
): number[] {
  const peaks: number[] = [];
  const windowSize = 3; // Compare with neighbors

  // Normalize novelty
  const maxNovelty = Math.max(...novelty);
  if (maxNovelty === 0) return [];

  const normalizedNovelty = Array.from(novelty).map((v) => v / maxNovelty);

  // Find local maxima above threshold
  for (let i = windowSize; i < normalizedNovelty.length - windowSize; i++) {
    const current = normalizedNovelty[i];

    if (current < threshold) continue;

    // Check if local maximum
    let isMax = true;
    for (let j = 1; j <= windowSize; j++) {
      if (normalizedNovelty[i - j] >= current || normalizedNovelty[i + j] >= current) {
        isMax = false;
        break;
      }
    }

    if (isMax) {
      const timeInSeconds = (i * hopSize) / sampleRate;
      peaks.push(timeInSeconds);
    }
  }

  return peaks;
}

/**
 * Calculate inter-onset intervals (IOIs) from onset times
 */
function calculateIOIs(onsetTimes: number[]): { ioi: number; startTime: number; endTime: number }[] {
  const iois: { ioi: number; startTime: number; endTime: number }[] = [];
  for (let i = 1; i < onsetTimes.length; i++) {
    iois.push({
      ioi: onsetTimes[i] - onsetTimes[i - 1],
      startTime: onsetTimes[i - 1],
      endTime: onsetTimes[i],
    });
  }
  return iois;
}

/**
 * Estimate local tempo from a window of IOIs
 * Returns BPM or null if tempo is unclear
 */
function estimateLocalTempo(iois: { ioi: number }[], minIOIs: number = 4): number | null {
  if (iois.length < minIOIs) return null;

  // Filter out very short and very long IOIs (likely noise or fermatas)
  const filtered = iois.filter((x) => x.ioi >= 0.15 && x.ioi <= 2.0);
  if (filtered.length < minIOIs) return null;

  // Use median IOI for robustness against outliers
  const sortedIOIs = filtered.map((x) => x.ioi).sort((a, b) => a - b);
  const medianIOI = sortedIOIs[Math.floor(sortedIOIs.length / 2)];

  // Convert to BPM (IOI is the beat interval)
  const bpm = 60 / medianIOI;

  // Validate BPM is in reasonable range
  if (bpm < 30 || bpm > 240) return null;

  return bpm;
}

/**
 * Calculate energy in a time window (for validating fermatas vs quiet passages)
 */
function calculateWindowEnergy(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number
): { rms: number; isActive: boolean } {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.min(Math.floor(endTime * sampleRate), channelData.length);

  if (endSample <= startSample) {
    return { rms: 0, isActive: false };
  }

  // Calculate RMS energy
  let sumSquares = 0;
  for (let i = startSample; i < endSample; i++) {
    sumSquares += channelData[i] * channelData[i];
  }
  const rms = Math.sqrt(sumSquares / (endSample - startSample));

  // Consider active if RMS is above noise floor
  // A fermata typically has sustained tone (moderate RMS) or silence (low RMS)
  // This distinguishes from just a quiet passage which might have continuous low activity
  const isActive = rms > 0.005; // Very low threshold to catch held notes

  return { rms, isActive };
}

/**
 * Detect fermatas in audio
 *
 * @param audioBuffer The audio to analyze
 * @param globalBpm The overall BPM of the track (used as baseline)
 * @param musicStartTime When music starts (to avoid detecting silence at beginning)
 */
export async function detectFermatas(
  audioBuffer: AudioBuffer,
  globalBpm: number,
  musicStartTime: number = 0
): Promise<FermataDetectionResult> {
  const warnings: string[] = [];

  // Detect onsets
  const onsetTimes = await detectOnsets(audioBuffer);

  if (onsetTimes.length < 10) {
    warnings.push('Too few onsets detected for reliable fermata detection');
    return { fermatas: [], onsetTimes, warnings };
  }

  // Filter onsets that occur before music starts (plus small buffer)
  const filteredOnsets = onsetTimes.filter((t) => t >= musicStartTime - 0.5);

  // Calculate IOIs
  const iois = calculateIOIs(filteredOnsets);

  if (iois.length < 5) {
    warnings.push('Not enough inter-onset intervals for fermata detection');
    return { fermatas: [], onsetTimes: filteredOnsets, warnings };
  }

  // Expected beat interval based on global BPM
  const expectedBeatInterval = 60 / globalBpm;

  // Find fermata candidates: IOIs significantly longer than expected
  // A fermata typically holds for at least 3 beats worth of time (more conservative)
  const fermataThreshold = expectedBeatInterval * 3.0;
  const candidates: FermataCandidate[] = [];

  for (let i = 0; i < iois.length; i++) {
    const { ioi, startTime, endTime } = iois[i];

    // Skip if too close to track boundaries
    if (startTime < musicStartTime + 0.5) continue;
    if (endTime > audioBuffer.duration - 0.5) continue;

    if (ioi > fermataThreshold) {
      // Calculate how many beats this gap represents
      const heldBeats = ioi / expectedBeatInterval;

      // Estimate local tempo from surrounding IOIs (excluding current gap)
      const surroundingIOIs = [
        ...iois.slice(Math.max(0, i - 6), i),
        ...iois.slice(i + 1, Math.min(iois.length, i + 7)),
      ];
      const localBpm = estimateLocalTempo(surroundingIOIs) || globalBpm;

      // Calculate confidence based on:
      // 1. How much longer than expected (more = higher confidence)
      // 2. Whether rhythm resumes after (check IOI variance after)
      const gapRatio = ioi / expectedBeatInterval;
      let confidence = Math.min(1, (gapRatio - 2) / 3); // Scale from 2x to 5x expected

      // Check if rhythm resumes after the gap
      const afterIOIs = iois.slice(i + 1, Math.min(iois.length, i + 5));
      if (afterIOIs.length >= 2) {
        const afterVariance = calculateIOIVariance(afterIOIs);
        // Low variance after = rhythm resumes = higher confidence
        if (afterVariance < 0.3) {
          confidence = Math.min(1, confidence + 0.2);
        }
      }

      // Check energy during the gap (should be sustained or silent, not active)
      const energy = calculateWindowEnergy(audioBuffer, startTime, endTime);
      // Very high energy during gap suggests it's not a fermata but continuous music
      if (energy.rms > 0.15) {
        confidence *= 0.5; // Reduce confidence but don't eliminate
      }

      candidates.push({
        startTime,
        endTime,
        gapDuration: ioi,
        confidence,
        precedingBpm: localBpm,
        heldBeats,
      });
    }
  }

  // Convert candidates to TempoRegions
  // Use high confidence threshold (0.5) to avoid false positives
  const fermatas: TempoRegion[] = candidates
    .filter((c) => c.confidence > 0.5 && c.heldBeats >= 2.5) // Require high confidence AND significant hold
    .map((c, index) => ({
      id: generateRegionId(index, 'fermata'),
      startTime: c.startTime,
      endTime: c.endTime,
      type: 'fermata' as const,
      bpm: null,
      confidence: c.confidence,
      description: `Fermata (~${c.heldBeats.toFixed(1)} beats held)`,
    }));

  if (fermatas.length > 0) {
    warnings.push(`Detected ${fermatas.length} fermata(s)`);
  }

  return { fermatas, onsetTimes: filteredOnsets, warnings };
}

/**
 * Calculate variance in IOIs (for rhythm stability detection)
 */
function calculateIOIVariance(iois: { ioi: number }[]): number {
  if (iois.length < 2) return 1;

  const values = iois.map((x) => x.ioi);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Return coefficient of variation (stdDev / mean)
  return mean > 0 ? stdDev / mean : 1;
}

/**
 * Merge overlapping or adjacent fermata regions
 */
export function mergeFermataRegions(
  fermatas: TempoRegion[],
  minGap: number = 0.5
): TempoRegion[] {
  if (fermatas.length <= 1) return fermatas;

  // Sort by start time
  const sorted = [...fermatas].sort((a, b) => a.startTime - b.startTime);
  const merged: TempoRegion[] = [];

  let current = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Check if regions overlap or are very close
    if (next.startTime <= current.endTime + minGap) {
      // Merge: extend current region
      current.endTime = Math.max(current.endTime, next.endTime);
      current.confidence = Math.max(current.confidence, next.confidence);
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);

  // Re-assign IDs
  return merged.map((f, i) => ({
    ...f,
    id: generateRegionId(i, 'fermata'),
  }));
}
