/**
 * Gap-based Fermata Detector
 *
 * Lightweight single-pass fermata detection.
 * Analyzes inter-onset intervals (IOI) to find gaps significantly longer than
 * the expected beat interval, then validates with simple energy analysis.
 *
 * This approach is much faster than binary search because it:
 * - Computes onsets once with a single energy-based pass
 * - Uses simple RMS for energy validation
 * - Single O(n) pass through onset array
 */

import type { TempoRegion } from './tempoRegions';
import { generateRegionId } from './tempoRegions';
import { detectOnsets, type OnsetPreset } from './analysis/onsets';

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Configuration for fermata detection */
interface FermataConfig {
  /** Minimum gap in beats to consider as fermata candidate (default: 2.5) */
  minGapBeats: number;
  /** Minimum gap in seconds (alternative threshold) */
  minGapSeconds: number;
  /** Minimum fermata duration in seconds (default: 0.4) */
  minDuration: number;
  /** Maximum fermata duration in seconds (default: 3.0) */
  maxDuration: number;
  /** Maximum RMS energy to validate as fermata (default: 0.15) */
  maxEnergy: number;
  /** 
   * When music actually ends (may be before track ends). 
   * Gaps after this time are not fermatas, just trailing silence. 
   */
  musicEndTime?: number;
}

const DEFAULT_CONFIG: FermataConfig = {
  minGapBeats: 2.5,
  minGapSeconds: 2.0,  // Same as detectGapsForResync
  minDuration: 0.4,
  maxDuration: 8.0,  // Increased to catch longer fermatas
  maxEnergy: 0.25,   // Increased - piano fermatas may have sustained notes
};

export function getOnsetPresetForTempo(bpm: number): OnsetPreset {
  if (bpm >= 110) return 'analysis';
  return 'fermata';
}

export function detectGapOnsets(
  audioBuffer: AudioBuffer,
  bpm: number
): number[] {
  return detectOnsets(audioBuffer, { preset: getOnsetPresetForTempo(bpm) });
}

function tightenFermataConfigForTempo(
  bpm: number,
  config: FermataConfig
): FermataConfig {
  if (bpm >= 120) {
    return {
      ...config,
      minGapBeats: Math.max(config.minGapBeats, 3.5),
      minGapSeconds: Math.max(config.minGapSeconds, 3.6),
      minDuration: Math.max(config.minDuration, 0.9),
      maxEnergy: Math.min(config.maxEnergy, 0.18),
    };
  }

  if (bpm <= 85) {
    return {
      ...config,
      minGapBeats: Math.max(config.minGapBeats, 3.0),
      minGapSeconds: Math.max(config.minGapSeconds, 2.3),
      minDuration: Math.max(config.minDuration, 0.5),
      maxEnergy: Math.min(config.maxEnergy, 0.22),
    };
  }

  return {
    ...config,
    minGapBeats: Math.max(config.minGapBeats, 2.8),
    minGapSeconds: Math.max(config.minGapSeconds, 2.2),
  };
}

function shouldRequireGapAndBeats(bpm: number): boolean {
  return bpm >= 120;
}

function getContextEnergyRatio(
  audioBuffer: AudioBuffer,
  gapStart: number,
  gapEnd: number
): { gapEnergy: number; contextEnergy: number; ratio: number } {
  const contextWindow = 0.6;
  const preStart = Math.max(0, gapStart - contextWindow);
  const preEnd = Math.max(preStart, gapStart - 0.1);
  const postStart = Math.min(audioBuffer.duration, gapEnd + 0.1);
  const postEnd = Math.min(audioBuffer.duration, gapEnd + contextWindow);

  const gapEnergy = getGapEnergy(audioBuffer, gapStart, gapEnd);
  const preEnergy = preEnd > preStart ? getGapEnergy(audioBuffer, preStart, preEnd) : 0;
  const postEnergy = postEnd > postStart ? getGapEnergy(audioBuffer, postStart, postEnd) : 0;
  const contextEnergy = Math.max(preEnergy, postEnergy);

  if (contextEnergy <= 0.001) {
    return { gapEnergy, contextEnergy, ratio: 0 };
  }

  return { gapEnergy, contextEnergy, ratio: gapEnergy / contextEnergy };
}

function getLocalOnsetDensity(
  onsets: number[],
  gapStart: number,
  gapEnd: number,
  window: number = 8
): number {
  if (onsets.length === 0) return 0;

  const preStart = Math.max(0, gapStart - window);
  const preEnd = gapStart;
  const postStart = gapEnd;
  const postEnd = gapEnd + window;

  let preCount = 0;
  let postCount = 0;

  for (const onset of onsets) {
    if (onset >= preStart && onset < preEnd) preCount++;
    if (onset > postStart && onset <= postEnd) postCount++;
  }

  const preDensity = window > 0 ? preCount / window : 0;
  const postDensity = window > 0 ? postCount / window : 0;
  return Math.max(preDensity, postDensity);
}

function getContextRatioThreshold(
  bpm: number,
  gapStart: number,
  gapDuration: number
): number {
  let threshold = 0.65;

  // Be more tolerant for early, slow-tempo intro fermatas.
  if (bpm <= 85 && gapStart <= 20 && gapDuration >= 2.5) {
    threshold = 0.8;
  }

  return threshold;
}

function findEarlyIntroFermata(
  bpm: number,
  gaps: FermataGap[],
  validatedGaps: FermataGap[],
  audioBuffer: AudioBuffer,
  config: FermataConfig
): FermataGap | null {
  if (bpm > 85) return null;

  const alreadyHasEarly = validatedGaps.some((gap) => gap.startTime <= 25);
  if (alreadyHasEarly) return null;

  const candidates = gaps.filter((gap) => {
    if (gap.startTime > 25) return false;
    if (gap.duration < Math.max(config.minDuration, 2.2)) return false;
    if (gap.gapBeats < Math.max(config.minGapBeats - 0.5, 2.5)) return false;

    const energyCheck = getContextEnergyRatio(audioBuffer, gap.startTime, gap.endTime);
    if (energyCheck.gapEnergy > config.maxEnergy * 1.1) return false;

    const ratioThreshold = Math.max(getContextRatioThreshold(bpm, gap.startTime, gap.duration), 0.85);
    if (energyCheck.contextEnergy > 0.02 && energyCheck.ratio > ratioThreshold) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  return candidates.reduce((best, current) => {
    if (!best) return current;
    return current.duration > best.duration ? current : best;
  }, null as FermataGap | null);
}

/** A candidate fermata gap found in the onsets */
interface FermataGap {
  /** Time of the onset before the gap */
  startTime: number;
  /** Time of the onset after the gap */
  endTime: number;
  /** Duration of the gap in seconds */
  duration: number;
  /** Duration of the gap in beats */
  gapBeats: number;
}

/** Result from fermata detection */
export interface GapFermataResult {
  fermatas: TempoRegion[];
  gapsFound: number;
  gapsValidated: number;
  warnings: string[];
}

/** A gap that requires beat grid resync */
export interface GapWithResync {
  /** Time of the last onset before the gap */
  gapStart: number;
  /** Time of the first onset after the gap (resync point) */
  gapEnd: number;
}

/**
 * Detect fermatas by analyzing gaps in onset times
 *
 * @param audioBuffer - Audio buffer to analyze
 * @param bpm - The detected BPM of the track
 * @param config - Optional configuration overrides
 */
export async function detectFermatasFromGaps(
  audioBuffer: AudioBuffer,
  bpm: number,
  config: Partial<FermataConfig> = {},
  precomputedOnsets?: number[]
): Promise<GapFermataResult> {
  const cfg = tightenFermataConfigForTempo(
    bpm,
    { ...DEFAULT_CONFIG, ...config }
  );
  const warnings: string[] = [];
  const expectedBeatInterval = 60 / bpm;

  // Detect onsets once with tempo-aware settings
  let onsets: number[];
  try {
    onsets = precomputedOnsets ?? detectOnsets(audioBuffer, { preset: getOnsetPresetForTempo(bpm) });
  } catch (err) {
    warnings.push('Onset detection failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    return { fermatas: [], gapsFound: 0, gapsValidated: 0, warnings };
  }

  // Need at least 2 onsets to find gaps
  if (onsets.length < 2) {
    return { fermatas: [], gapsFound: 0, gapsValidated: 0, warnings: ['Not enough onsets for fermata detection'] };
  }

  // Phase 1: Find all gaps exceeding threshold
  // Use same thresholds as detectGapsForResync for consistency
  const requireBoth = shouldRequireGapAndBeats(bpm);
  const gaps = findFermataGapsWithTimeThreshold(
    onsets, 
    expectedBeatInterval, 
    cfg.minGapBeats,
    cfg.minGapSeconds,
    requireBoth
  );
  
  const thresholdJoin = requireBoth ? 'AND' : 'OR';
  console.log(`[FermataDetector] Found ${gaps.length} gap candidates (threshold: ${cfg.minGapBeats} beats ${thresholdJoin} ${cfg.minGapSeconds}s)`);
  
  if (gaps.length === 0) {
    return { fermatas: [], gapsFound: 0, gapsValidated: 0, warnings };
  }

  // Phase 2: Validate each gap with duration and energy checks
  const validatedGaps: FermataGap[] = [];
  
  // Get music end time from config (if provided)
  const musicEndTime = cfg.musicEndTime ?? audioBuffer.duration;
  
  for (const gap of gaps) {
    // Skip gaps that represent the end of music, not fermatas
    // A gap is "end of music" if:
    // 1. The gap starts after music ends, OR  
    // 2. The gap extends past the music end (meaning the music ends during this gap)
    if (gap.startTime >= musicEndTime - 1) {
      console.log(`[FermataDetector] Gap ${gap.startTime.toFixed(2)}s skipped: starts after music end (${musicEndTime.toFixed(1)}s)`);
      continue;
    }
    if (gap.endTime >= musicEndTime - 0.5) {
      console.log(`[FermataDetector] Gap ${gap.startTime.toFixed(2)}s skipped: extends past music end (gap ends at ${gap.endTime.toFixed(1)}s, music ends at ${musicEndTime.toFixed(1)}s)`);
      continue;
    }
    
    if (bpm <= 85 && gap.startTime > 25) {
      const localDensity = getLocalOnsetDensity(onsets, gap.startTime, gap.endTime);
      if (localDensity > 3.2 && gap.duration < 6.5) {
        console.log(`[FermataDetector] Gap ${gap.startTime.toFixed(2)}s rejected: dense onsets around gap (${localDensity.toFixed(2)} onsets/sec)`);
        continue;
      }
    }

    // Check duration bounds
    if (gap.duration < cfg.minDuration || gap.duration > cfg.maxDuration) {
      console.log(`[FermataDetector] Gap ${gap.startTime.toFixed(2)}s rejected: duration ${gap.duration.toFixed(2)}s outside bounds [${cfg.minDuration}, ${cfg.maxDuration}]`);
      continue;
    }

    // Check energy during the gap (should be low for fermata)
    const energyCheck = getContextEnergyRatio(audioBuffer, gap.startTime, gap.endTime);
    if (energyCheck.gapEnergy > cfg.maxEnergy) {
      console.log(`[FermataDetector] Gap ${gap.startTime.toFixed(2)}s rejected: energy ${energyCheck.gapEnergy.toFixed(3)} > max ${cfg.maxEnergy}`);
      continue;
    }

    // Reject gaps that are not significantly quieter than surrounding audio
    const ratioThreshold = getContextRatioThreshold(bpm, gap.startTime, gap.duration);
    if (energyCheck.contextEnergy > 0.02 && energyCheck.ratio > ratioThreshold) {
      console.log(`[FermataDetector] Gap ${gap.startTime.toFixed(2)}s rejected: gap energy ${energyCheck.gapEnergy.toFixed(3)} too close to context ${energyCheck.contextEnergy.toFixed(3)} (ratio ${energyCheck.ratio.toFixed(2)})`);
      continue;
    }

    if (bpm <= 85 && gap.startTime > 30 && gap.endTime < audioBuffer.duration - 30) {
      const score = gap.duration * (1 - energyCheck.ratio);
      if (score < 3.0) {
        console.log(`[FermataDetector] Gap ${gap.startTime.toFixed(2)}s rejected: weak mid-section fermata score (${score.toFixed(2)})`);
        continue;
      }
    }

    console.log(`[FermataDetector] Gap ${gap.startTime.toFixed(2)}s -> ${gap.endTime.toFixed(2)}s VALIDATED (energy=${energyCheck.gapEnergy.toFixed(3)})`);
    validatedGaps.push(gap);
  }

  const earlyIntroFermata = findEarlyIntroFermata(bpm, gaps, validatedGaps, audioBuffer, cfg);
  if (earlyIntroFermata) {
    console.log(`[FermataDetector] Early intro fermata added: ${earlyIntroFermata.startTime.toFixed(2)}s -> ${earlyIntroFermata.endTime.toFixed(2)}s`);
    validatedGaps.push(earlyIntroFermata);
  }

  warnings.push(`Found ${gaps.length} gap(s), validated ${validatedGaps.length}`);

  // Convert to TempoRegions with timestamp info
  const fermatas: TempoRegion[] = validatedGaps.map((gap, index) => ({
    id: generateRegionId(index, 'fermata'),
    startTime: gap.startTime,
    endTime: gap.endTime,
    type: 'fermata' as const,
    bpm: null,
    confidence: Math.min(1, 0.5 + (gap.gapBeats - cfg.minGapBeats) * 0.1),
    description: `Fermata at ${formatTime(gap.startTime)} (~${gap.gapBeats.toFixed(1)} beats, ${gap.duration.toFixed(1)}s)`,
  }));

  // Merge adjacent fermatas (use wider threshold for slower tempos)
  const mergeThreshold =
    bpm <= 85
      ? Math.max(0.8, expectedBeatInterval * 3)
      : bpm >= 120
        ? 0.6
        : 0.8;
  const mergedFermatas = mergeFermatas(fermatas, mergeThreshold);

  return {
    fermatas: mergedFermatas,
    gapsFound: gaps.length,
    gapsValidated: validatedGaps.length,
    warnings,
  };
}

/**
 * Detect gaps in onset pattern for beat grid resync
 * 
 * This is used to find places where the beat grid needs to be shifted
 * to stay aligned with the actual music after pauses/fermatas.
 * 
 * @param audioBuffer - Audio buffer to analyze
 * @param bpm - The detected BPM of the track
 * @param minGapBeats - Minimum gap in beats to trigger resync (default: 1.5)
 */
export async function detectGapsForResync(
  audioBuffer: AudioBuffer,
  bpm: number,
  minGapBeats: number = 1.5,
  precomputedOnsets?: number[]
): Promise<GapWithResync[]> {
  const expectedBeatInterval = 60 / bpm;

  // Detect onsets with tempo-aware settings
  let onsets: number[];
  try {
    onsets = precomputedOnsets ?? detectOnsets(audioBuffer, { preset: getOnsetPresetForTempo(bpm) });
  } catch (err) {
    console.warn('[GapDetector] Onset detection failed:', err);
    return [];
  }

  console.log(`[GapDetector] Detected ${onsets.length} onsets, BPM=${bpm}, beat interval=${expectedBeatInterval.toFixed(3)}s`);
  
  // Log first 20 onsets for debugging
  if (onsets.length > 0) {
    const firstOnsets = onsets.slice(0, 20).map(t => t.toFixed(2)).join(', ');
    console.log(`[GapDetector] First onsets: ${firstOnsets}...`);
  }

  if (onsets.length < 2) {
    return [];
  }

  // Find gaps that exceed threshold
  // Be selective - only catch REAL fermatas, not normal phrase breaks
  const minGapSeconds = bpm >= 120 ? 2.5 : 2.0; // At least 2 seconds - real fermatas are longer
  const minGapBeatsThreshold = bpm >= 120 ? Math.max(minGapBeats, 2.5) : minGapBeats;
  const requireBoth = shouldRequireGapAndBeats(bpm);
  const gaps: GapWithResync[] = [];
  
  for (let i = 1; i < onsets.length; i++) {
    const duration = onsets[i] - onsets[i - 1];
    const gapBeats = duration / expectedBeatInterval;

    // Only trigger on significant gaps:
    // - At least 2 seconds long, OR
    // - At least 2.5 beats (more than 2 full beats)
    const matchesDuration = duration >= minGapSeconds;
    const matchesBeats = gapBeats >= minGapBeatsThreshold;
    if (requireBoth ? (matchesDuration && matchesBeats) : (matchesDuration || matchesBeats)) {
      console.log(`[GapDetector] Found gap: ${onsets[i - 1].toFixed(2)}s -> ${onsets[i].toFixed(2)}s (${duration.toFixed(2)}s = ${gapBeats.toFixed(1)} beats)`);
      gaps.push({
        gapStart: onsets[i - 1],
        gapEnd: onsets[i],
      });
    }
  }

  console.log(`[GapDetector] Total gaps found: ${gaps.length}`);
  return gaps;
}

// Onset detection is shared via utils/analysis/onsets.ts

/**
 * Find all gaps in onset array that exceed the threshold
 * @deprecated Use findFermataGapsWithTimeThreshold instead for consistency
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _findFermataGaps(
  onsets: number[],
  expectedBeatInterval: number,
  minGapBeats: number
): FermataGap[] {
  const gaps: FermataGap[] = [];

  for (let i = 1; i < onsets.length; i++) {
    const duration = onsets[i] - onsets[i - 1];
    const gapBeats = duration / expectedBeatInterval;

    if (gapBeats >= minGapBeats) {
      gaps.push({
        startTime: onsets[i - 1],
        endTime: onsets[i],
        duration,
        gapBeats,
      });
    }
  }

  return gaps;
}

/**
 * Find gaps using both beat and absolute time thresholds
 * This ensures consistency with detectGapsForResync
 */
function findFermataGapsWithTimeThreshold(
  onsets: number[],
  expectedBeatInterval: number,
  minGapBeats: number,
  minGapSeconds: number,
  requireBoth: boolean = false
): FermataGap[] {
  const gaps: FermataGap[] = [];

  for (let i = 1; i < onsets.length; i++) {
    const duration = onsets[i] - onsets[i - 1];
    const gapBeats = duration / expectedBeatInterval;

    // Match the same logic as detectGapsForResync
    const matchesDuration = duration >= minGapSeconds;
    const matchesBeats = gapBeats >= minGapBeats;
    if (requireBoth ? (matchesDuration && matchesBeats) : (matchesDuration || matchesBeats)) {
      gaps.push({
        startTime: onsets[i - 1],
        endTime: onsets[i],
        duration,
        gapBeats,
      });
    }
  }

  return gaps;
}

/**
 * Calculate RMS energy in a time window (no Essentia required)
 */
function getGapEnergy(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number
): number {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  const startSample = Math.max(0, Math.floor(startTime * sampleRate));
  const endSample = Math.min(data.length, Math.floor(endTime * sampleRate));
  const numSamples = endSample - startSample;

  if (numSamples <= 0) {
    return 0;
  }

  let sumSquares = 0;
  for (let i = startSample; i < endSample; i++) {
    sumSquares += data[i] * data[i];
  }

  return Math.sqrt(sumSquares / numSamples);
}

/**
 * Merge fermatas that are close together (within threshold)
 */
function mergeFermatas(fermatas: TempoRegion[], threshold: number = 0.5): TempoRegion[] {
  if (fermatas.length <= 1) {
    return fermatas;
  }

  const sorted = [...fermatas].sort((a, b) => a.startTime - b.startTime);
  const merged: TempoRegion[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    
    // If next fermata starts within threshold of current end, merge them
    if (next.startTime - current.endTime <= threshold) {
      current.endTime = next.endTime;
      current.confidence = Math.max(current.confidence, next.confidence);
      // Update description to reflect merged duration
      const duration = current.endTime - current.startTime;
      current.description = `Fermata (~${duration.toFixed(1)}s)`;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}
