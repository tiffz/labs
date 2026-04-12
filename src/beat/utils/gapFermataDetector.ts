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

import { detectOnsets, type OnsetPreset } from './analysis/onsets';

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

function shouldRequireGapAndBeats(bpm: number): boolean {
  return bpm >= 120;
}

/** A gap that requires beat grid resync */
export interface GapWithResync {
  /** Time of the last onset before the gap */
  gapStart: number;
  /** Time of the first onset after the gap (resync point) */
  gapEnd: number;
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
  
  if (onsets.length > 0) {
    const firstOnsets = onsets.slice(0, 20).map(t => t.toFixed(2)).join(', ');
    console.log(`[GapDetector] First onsets: ${firstOnsets}...`);
  }

  if (onsets.length < 2) {
    return [];
  }

  const minGapSeconds = bpm >= 120 ? 2.5 : 2.0;
  const minGapBeatsThreshold = bpm >= 120 ? Math.max(minGapBeats, 2.5) : minGapBeats;
  const requireBoth = shouldRequireGapAndBeats(bpm);
  const gaps: GapWithResync[] = [];
  
  for (let i = 1; i < onsets.length; i++) {
    const duration = onsets[i] - onsets[i - 1];
    const gapBeats = duration / expectedBeatInterval;

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
