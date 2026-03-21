/**
 * Video/Audio-to-Score Alignment
 *
 * Simple, reliable approach:
 *   1. Detect when the music actually starts in the audio (skip silence/quiet)
 *   2. Detect BPM from the audio
 *   3. Set the offset to the music start time
 *   4. User fine-tunes with offset slider or "tap to align" if needed
 */

import type { BeatAnalysisResult } from '../../beat/utils/beatAnalyzer';

export interface CorrelationResult {
  /** Detected BPM of the audio. */
  detectedBpm: number;
  /** BPM of the score as supplied. */
  scoreBpm: number;
  /** Suggested BPM if the audio tempo differs significantly, or null. */
  suggestedBpm: number | null;
  /** Audio time (seconds) where music begins (after silence). */
  musicStartTime: number;
  /** Confidence description. */
  recommendation: string;
}

/**
 * Detect when music starts in an AudioBuffer by finding the first
 * sustained rise in RMS energy above the noise floor.
 */
function detectMusicStart(audioBuffer: AudioBuffer): number {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.round(sampleRate * 0.05); // 50ms windows
  const hopSize = Math.round(sampleRate * 0.01);    // 10ms hops

  // Compute RMS for each window
  const rmsValues: { time: number; rms: number }[] = [];
  for (let i = 0; i + windowSize <= data.length; i += hopSize) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) {
      sum += data[j] * data[j];
    }
    rmsValues.push({
      time: i / sampleRate,
      rms: Math.sqrt(sum / windowSize),
    });
  }

  if (rmsValues.length === 0) return 0;

  // Find the noise floor from the first 500ms (or less if audio is short)
  const noiseWindowEnd = Math.min(
    rmsValues.length,
    Math.ceil(0.5 / (hopSize / sampleRate)),
  );
  let noiseFloor = 0;
  for (let i = 0; i < noiseWindowEnd; i++) {
    noiseFloor = Math.max(noiseFloor, rmsValues[i].rms);
  }

  // Threshold: 10x the noise floor, with a minimum to handle true silence
  const threshold = Math.max(noiseFloor * 10, 0.005);

  // Find the first window that exceeds the threshold and stays above
  // for at least 100ms (to avoid transient clicks/pops)
  const sustainCount = Math.ceil(0.1 / (hopSize / sampleRate));

  for (let i = 0; i < rmsValues.length - sustainCount; i++) {
    if (rmsValues[i].rms >= threshold) {
      let sustained = true;
      for (let j = 1; j < sustainCount; j++) {
        if (rmsValues[i + j].rms < threshold * 0.5) {
          sustained = false;
          break;
        }
      }
      if (sustained) {
        return Math.max(0, rmsValues[i].time - 0.05);
      }
    }
  }

  return 0;
}

export async function correlateVideoWithScore(
  audioBuffer: AudioBuffer,
  beatResult: BeatAnalysisResult,
  scoreBpm: number,
  onProgress?: (msg: string) => void,
): Promise<CorrelationResult> {
  onProgress?.('Detecting music start...');
  await new Promise(r => setTimeout(r, 0));

  const musicStartTime = detectMusicStart(audioBuffer);

  // BPM suggestion
  const detectedBpm = beatResult.bpm;
  let suggestedBpm: number | null = null;
  const candidates = [detectedBpm, detectedBpm / 2, detectedBpm * 2];
  for (const candidate of candidates) {
    const ratio = candidate / scoreBpm;
    if (Math.abs(ratio - 1) > 0.05 && Math.abs(ratio - 1) < 0.5
      && candidate > 20 && candidate < 300) {
      suggestedBpm = Math.round(candidate);
      break;
    }
  }

  let recommendation = `Music starts at ${musicStartTime.toFixed(1)}s.`;
  if (suggestedBpm !== null) {
    recommendation += ` Audio BPM ~${detectedBpm.toFixed(0)} (score: ${scoreBpm}).`;
  }
  recommendation += ' Use the offset slider or tap-to-align to fine-tune.';

  return {
    detectedBpm,
    scoreBpm,
    suggestedBpm,
    musicStartTime,
    recommendation,
  };
}

// Kept for backward compat with existing tests
export interface TimeMappingPoint {
  scoreSec: number;
  audioSec: number;
}

/** @deprecated */
export function lookupAudioTime(
  mapping: TimeMappingPoint[],
  scoreSec: number,
): number | null {
  if (mapping.length === 0) return null;
  if (scoreSec <= mapping[0].scoreSec) return mapping[0].audioSec;
  if (scoreSec >= mapping[mapping.length - 1].scoreSec) {
    return mapping[mapping.length - 1].audioSec;
  }

  let lo = 0;
  let hi = mapping.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (mapping[mid].scoreSec <= scoreSec) lo = mid;
    else hi = mid;
  }

  const a = mapping[lo];
  const b = mapping[hi];
  const t = (scoreSec - a.scoreSec) / (b.scoreSec - a.scoreSec);
  return a.audioSec + t * (b.audioSec - a.audioSec);
}
