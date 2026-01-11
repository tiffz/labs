/**
 * Beat Refinement Utilities
 *
 * Merges beat grids from multiple algorithms and snaps beats to audio onsets
 * for more accurate beat positions.
 */

import { getEssentia } from './beatAnalyzer';
import type { TempoEstimate } from './tempoEnsemble';

/**
 * Merge beat grids from multiple algorithms
 * Keeps beats that have multi-source support
 */
export function mergeBeatGrids(
  estimates: TempoEstimate[],
  consensusBpm: number,
  duration: number
): number[] {
  const beatInterval = 60 / consensusBpm;
  const tolerance = beatInterval * 0.12; // 12% of beat interval for clustering

  // Collect all beats from all estimates
  const allBeats: { time: number; source: string; confidence: number }[] = [];
  for (const est of estimates) {
    if (est.beats && est.beats.length > 0) {
      for (const beat of est.beats) {
        allBeats.push({
          time: beat,
          source: est.algorithm,
          confidence: est.confidence,
        });
      }
    }
  }

  if (allBeats.length === 0) {
    // Generate beats from BPM if no beats available
    return generateRegularBeats(consensusBpm, duration, 0);
  }

  // Sort by time
  allBeats.sort((a, b) => a.time - b.time);

  // Cluster nearby beats
  const clusters: { time: number; sources: Set<string>; totalConfidence: number }[] = [];
  for (const beat of allBeats) {
    const matchingCluster = clusters.find(
      (c) => Math.abs(c.time - beat.time) < tolerance
    );
    if (matchingCluster) {
      // Update cluster with weighted average position
      const newWeight = matchingCluster.totalConfidence + beat.confidence;
      matchingCluster.time =
        (matchingCluster.time * matchingCluster.totalConfidence + beat.time * beat.confidence) /
        newWeight;
      matchingCluster.sources.add(beat.source);
      matchingCluster.totalConfidence = newWeight;
    } else {
      clusters.push({
        time: beat.time,
        sources: new Set([beat.source]),
        totalConfidence: beat.confidence,
      });
    }
  }

  // Keep clusters with multi-source support or high confidence
  const minSources = Math.max(1, Math.floor(estimates.length * 0.4));
  const refinedBeats = clusters
    .filter((c) => c.sources.size >= minSources || c.totalConfidence > 0.8)
    .map((c) => c.time)
    .sort((a, b) => a - b);

  // Fill gaps where beats are missing
  return fillBeatGaps(refinedBeats, beatInterval, duration);
}

/**
 * Fill gaps in beat grid where beats are missing
 */
function fillBeatGaps(beats: number[], beatInterval: number, duration: number): number[] {
  if (beats.length < 2) {
    return generateRegularBeats(60 / beatInterval, duration, beats[0] || 0);
  }

  const filledBeats: number[] = [...beats];

  // Find and fill gaps
  for (let i = 0; i < filledBeats.length - 1; i++) {
    const gap = filledBeats[i + 1] - filledBeats[i];
    const expectedBeats = Math.round(gap / beatInterval);

    if (expectedBeats > 1) {
      // Fill in missing beats
      for (let j = 1; j < expectedBeats; j++) {
        const newBeat = filledBeats[i] + j * beatInterval;
        // Insert in sorted position
        const insertIndex = filledBeats.findIndex((b) => b > newBeat);
        if (insertIndex === -1) {
          filledBeats.push(newBeat);
        } else {
          filledBeats.splice(insertIndex, 0, newBeat);
        }
      }
    }
  }

  // Extend to cover duration
  while (filledBeats.length > 0 && filledBeats[filledBeats.length - 1] + beatInterval < duration) {
    filledBeats.push(filledBeats[filledBeats.length - 1] + beatInterval);
  }

  return filledBeats.sort((a, b) => a - b);
}

/**
 * Generate regular beat grid
 */
function generateRegularBeats(bpm: number, duration: number, startOffset: number = 0): number[] {
  const beatInterval = 60 / bpm;
  const beats: number[] = [];
  let beatTime = startOffset;
  while (beatTime < duration) {
    beats.push(beatTime);
    beatTime += beatInterval;
  }
  return beats;
}

/**
 * Snap beats to nearby audio onsets using onset detection
 */
export async function snapBeatsToOnsets(
  beats: number[],
  audioBuffer: AudioBuffer,
  maxShift: number = 0.05 // 50ms max shift
): Promise<number[]> {
  if (beats.length === 0) return beats;

  try {
    const essentia = await getEssentia();
    const channelData = audioBuffer.getChannelData(0);
    const signal = essentia.arrayToVector(channelData);
    const sampleRate = audioBuffer.sampleRate;

    // Use SuperFluxNovelty for onset detection (good for percussive onsets)
    // Parameters: signal, frameSize, hopSize
    const frameSize = 2048;
    const hopSize = 256;

    // Calculate novelty function
    const novelty = essentia.SuperFluxNovelty(signal, frameSize, hopSize);
    const noveltyArray = essentia.vectorToArray(novelty.novelty);

    // Find onset times from novelty peaks
    const onsetTimes = findNoveltyPeaks(noveltyArray, hopSize, sampleRate);

    signal.delete();
    novelty.novelty.delete();

    // Snap each beat to nearest onset
    const snappedBeats = beats.map((beat) => {
      const nearestOnset = findNearestOnset(beat, onsetTimes, maxShift);
      return nearestOnset !== null ? nearestOnset : beat;
    });


    return snappedBeats;
  } catch (err) {
    console.warn('[BeatRefinement] Onset snapping failed:', err);
    return beats;
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
 * Find nearest onset to a beat position
 */
function findNearestOnset(
  beatTime: number,
  onsetTimes: number[],
  maxShift: number
): number | null {
  let nearestOnset: number | null = null;
  let minDistance = maxShift;

  for (const onset of onsetTimes) {
    const distance = Math.abs(onset - beatTime);
    if (distance < minDistance) {
      minDistance = distance;
      nearestOnset = onset;
    }
  }

  return nearestOnset;
}
