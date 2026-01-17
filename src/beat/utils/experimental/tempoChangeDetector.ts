/**
 * Tempo Change Detector (Experimental)
 *
 * Detects tempo changes in audio using windowed BPM analysis.
 * Identifies sections with different steady tempos (like "Defying Gravity").
 *
 * Algorithm:
 * 1. Run tempo detection on overlapping windows
 * 2. Track BPM stability within each window
 * 3. Find change points where consecutive stable windows have different BPMs
 * 4. Correlate with section boundaries
 */

import { getEssentia } from '../beatAnalyzer';
import type { TempoRegion } from '../tempoRegions';
import { generateRegionId, createSteadyRegion, findBpmForTime } from '../tempoRegions';
import { normalizeToRange } from '../analysis/tempoUtils';

export interface TempoWindow {
  /** Start time of the window in seconds */
  startTime: number;
  /** End time of the window in seconds */
  endTime: number;
  /** Detected BPM for this window */
  bpm: number;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Whether this window has a stable tempo */
  isStable: boolean;
}

export interface TempoChangeResult {
  /** Detected tempo regions with different BPMs */
  tempoRegions: TempoRegion[];
  /** All analyzed windows (for debugging) */
  windows: TempoWindow[];
  /** Warnings about detection */
  warnings: string[];
}

// normalizeToRange is shared via utils/analysis/tempoUtils.ts

/**
 * Run tempo detection on an audio segment
 */
async function detectTempoInSegment(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number
): Promise<{ bpm: number; confidence: number } | null> {
  try {
    const essentia = await getEssentia();
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // Extract segment
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.min(Math.floor(endTime * sampleRate), channelData.length);
    const segmentLength = endSample - startSample;

    if (segmentLength < sampleRate * 2) {
      // Segment too short (< 2 seconds)
      return null;
    }

    // Create segment array
    const segment = new Float32Array(segmentLength);
    for (let i = 0; i < segmentLength; i++) {
      segment[i] = channelData[startSample + i];
    }

    const signal = essentia.arrayToVector(segment);

    // Run RhythmExtractor2013
    const result = essentia.RhythmExtractor2013(signal, 220, 'multifeature', 40);
    const bpm = result.bpm;
    const confidence = Math.min(1, result.confidence / 5);

    signal.delete();
    result.ticks.delete();

    return { bpm, confidence };
  } catch (err) {
    console.warn('[TempoChangeDetector] Segment detection failed:', err);
    return null;
  }
}

/**
 * Check if two BPMs are significantly different (accounting for octave errors)
 * Uses a stricter threshold to avoid false positives from natural tempo variance
 */
function areBpmsDifferent(
  bpm1: number,
  bpm2: number,
  threshold: number = 0.15 // 15% difference required - more conservative
): boolean {
  const norm1 = normalizeToRange(bpm1);
  const norm2 = normalizeToRange(bpm2);
  const ratio = Math.abs(norm1 - norm2) / Math.max(norm1, norm2);
  return ratio > threshold;
}

/**
 * Detect tempo changes in audio using windowed analysis
 *
 * @param audioBuffer The audio to analyze
 * @param globalBpm The overall detected BPM (used as reference)
 * @param musicStartTime When music starts
 * @param windowDuration Duration of each analysis window in seconds (default: 8 seconds)
 * @param hopDuration How much to advance between windows (default: 4 seconds)
 */
export async function detectTempoChanges(
  audioBuffer: AudioBuffer,
  globalBpm: number,
  musicStartTime: number = 0,
  windowDuration: number = 8,
  hopDuration: number = 4
): Promise<TempoChangeResult> {
  const warnings: string[] = [];
  const duration = audioBuffer.duration;
  const windows: TempoWindow[] = [];

  // Skip if audio is too short
  if (duration - musicStartTime < windowDuration * 2) {
    warnings.push('Audio too short for tempo change detection');
    return { tempoRegions: [], windows: [], warnings };
  }

  // Analyze overlapping windows
  let windowStart = musicStartTime;
  while (windowStart + windowDuration <= duration) {
    const windowEnd = windowStart + windowDuration;

    const result = await detectTempoInSegment(audioBuffer, windowStart, windowEnd);

    if (result) {
      // Normalize BPM to compare properly
      const normalizedBpm = normalizeToRange(result.bpm);

      // Check if this window is stable (confidence > threshold)
      // Higher threshold (0.6) to be more conservative
      const isStable = result.confidence > 0.6;

      windows.push({
        startTime: windowStart,
        endTime: windowEnd,
        bpm: normalizedBpm,
        confidence: result.confidence,
        isStable,
      });
    }

    windowStart += hopDuration;
  }

  if (windows.length < 2) {
    warnings.push('Not enough windows for tempo change detection');
    return { tempoRegions: [], windows, warnings };
  }

  // Find tempo change points with confirmation
  // Require 2 consecutive windows with the new tempo to confirm a change
  const changePoints: { time: number; bpmBefore: number; bpmAfter: number; confidence: number }[] = [];

  // Also filter out windows that differ too much from global BPM (likely errors)
  const globalBpmNorm = normalizeToRange(globalBpm);
  const stableWindows = windows.filter(w => {
    if (!w.isStable) return false;
    // Window BPM should be within 25% of global BPM to be considered valid
    const ratio = Math.abs(w.bpm - globalBpmNorm) / globalBpmNorm;
    return ratio < 0.25;
  });

  for (let i = 1; i < stableWindows.length; i++) {
    const prev = stableWindows[i - 1];
    const curr = stableWindows[i];

    // Check if BPMs are significantly different
    if (areBpmsDifferent(prev.bpm, curr.bpm)) {
      // Look ahead to confirm the tempo change persists
      // Need at least one more window with similar BPM to confirm
      let confirmed = false;
      if (i + 1 < stableWindows.length) {
        const next = stableWindows[i + 1];
        // Next window should be close to curr (confirming the new tempo)
        if (!areBpmsDifferent(curr.bpm, next.bpm)) {
          confirmed = true;
        }
      } else {
        // Last window - accept if confidence is high
        confirmed = curr.confidence > 0.7;
      }

      if (confirmed) {
        // Change point is in the overlap between windows
        const changeTime = (prev.endTime + curr.startTime) / 2;
        const avgConfidence = (prev.confidence + curr.confidence) / 2;

        changePoints.push({
          time: changeTime,
          bpmBefore: Math.round(prev.bpm),
          bpmAfter: Math.round(curr.bpm),
          confidence: avgConfidence,
        });
      }
    }
  }

  // Merge nearby change points
  const mergedChangePoints = mergeNearbyChangePoints(changePoints, 3);

  // Build tempo regions from change points
  const tempoRegions: TempoRegion[] = [];

  if (mergedChangePoints.length === 0) {
    // No tempo changes detected - single steady region
    return { tempoRegions: [], windows, warnings };
  }

  // Create regions based on change points
  let currentTime = musicStartTime;
  let currentBpm = mergedChangePoints[0].bpmBefore;

  for (let i = 0; i < mergedChangePoints.length; i++) {
    const change = mergedChangePoints[i];

    // Add region before this change point
    if (change.time > currentTime + 1) {
      tempoRegions.push(createSteadyRegion({
        id: generateRegionId(tempoRegions.length, 'steady'),
        startTime: currentTime,
        endTime: change.time,
        bpm: currentBpm,
        confidence: change.confidence,
        description: `${currentBpm} BPM`,
      }));
    }

    currentTime = change.time;
    currentBpm = change.bpmAfter;
  }

  // Add final region
  if (currentTime < duration) {
    tempoRegions.push(createSteadyRegion({
      id: generateRegionId(tempoRegions.length, 'steady'),
      startTime: currentTime,
      endTime: duration,
      bpm: currentBpm,
      confidence: mergedChangePoints[mergedChangePoints.length - 1].confidence,
      description: `${currentBpm} BPM`,
    }));
  }

  if (tempoRegions.length > 1) {
    warnings.push(`Detected ${tempoRegions.length} tempo regions`);
  }

  return { tempoRegions, windows, warnings };
}

/**
 * Merge change points that are very close together
 */
function mergeNearbyChangePoints(
  changePoints: { time: number; bpmBefore: number; bpmAfter: number; confidence: number }[],
  maxDistance: number
): { time: number; bpmBefore: number; bpmAfter: number; confidence: number }[] {
  if (changePoints.length <= 1) return changePoints;

  const sorted = [...changePoints].sort((a, b) => a.time - b.time);
  const merged: typeof changePoints = [];

  let current = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    if (next.time - current.time < maxDistance) {
      // Merge: take the one with higher confidence
      if (next.confidence > current.confidence) {
        current = {
          ...next,
          bpmBefore: current.bpmBefore, // Keep original "before" BPM
        };
      } else {
        current = {
          ...current,
          bpmAfter: next.bpmAfter, // Take final "after" BPM
        };
      }
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged;
}

/**
 * Combine fermata detection and tempo change detection results
 * Interleaves fermata regions with steady tempo regions
 */
export function combineTempoRegions(
  fermataRegions: TempoRegion[],
  tempoChangeRegions: TempoRegion[],
  globalBpm: number,
  duration: number,
  musicStartTime: number
): TempoRegion[] {
  // If no tempo changes, just use fermata regions
  if (tempoChangeRegions.length === 0) {
    return fermataRegions.length > 0 ? fermataRegions : [];
  }

  // Sort all regions by start time
  const allRegions = [...fermataRegions, ...tempoChangeRegions].sort(
    (a, b) => a.startTime - b.startTime
  );

  // Resolve overlaps - fermatas take priority over steady regions
  const resolved: TempoRegion[] = [];
  let currentTime = musicStartTime;

  for (const region of allRegions) {
    // Skip if region is before current time (overlap)
    if (region.endTime <= currentTime) continue;

    // Adjust region start if it overlaps
    const adjustedStart = Math.max(region.startTime, currentTime);

    if (adjustedStart >= region.endTime) continue;

    resolved.push({
      ...region,
      startTime: adjustedStart,
      id: generateRegionId(resolved.length, region.type),
    });

    currentTime = region.endTime;
  }

  // Fill gaps with steady regions using the appropriate BPM
  const filled: TempoRegion[] = [];
  currentTime = musicStartTime;

  for (const region of resolved) {
    if (region.startTime > currentTime + 0.1) {
      // Find the BPM for this gap (from surrounding tempo change regions)
      const gapBpm = findBpmForTime(currentTime, tempoChangeRegions) || globalBpm;
      filled.push(createSteadyRegion({
        id: generateRegionId(filled.length, 'steady'),
        startTime: currentTime,
        endTime: region.startTime,
        bpm: gapBpm,
        confidence: 1.0,
      }));
    }
    filled.push(region);
    currentTime = region.endTime;
  }

  // Add final region if needed
  if (currentTime < duration - 0.1) {
    const finalBpm = findBpmForTime(currentTime, tempoChangeRegions) || globalBpm;
    filled.push(createSteadyRegion({
      id: generateRegionId(filled.length, 'steady'),
      startTime: currentTime,
      endTime: duration,
      bpm: finalBpm,
      confidence: 1.0,
    }));
  }

  return filled;
}

// findBpmForTime lives in tempoRegions.ts
