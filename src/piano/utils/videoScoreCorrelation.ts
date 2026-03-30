/**
 * Video/Audio-to-Score Alignment
 *
 * Pipeline:
 *   1. Detect when the music actually starts in the audio (skip silence/quiet)
 *   2. Detect BPM from the audio
 *   3. Use downbeat alignment to find beat 1 (handling pickup notes)
 *   4. Extract chroma from audio (HPCP via Essentia) and score
 *   5. Align with chroma-based DTW for accurate beat-level mapping
 *   6. Optionally refine with BasicPitch note-onset anchoring
 *   7. Suggest BPM if the recording's tempo differs from the score
 *   8. User fine-tunes with offset slider or "tap to align" if needed
 */

import type { BeatAnalysisResult } from '../../shared/audio/beatAnalyzer';
import { getEssentia } from '../../shared/audio/beatAnalyzer';
import { alignBeatGridToDownbeat } from '../../shared/audio/downbeatAlignment';
import { computeDTW } from './dtw';
import { buildScoreChroma } from './scoreChroma';
import type { PianoScore, NoteDuration } from '../types';
import { durationToBeats } from '../types';

/**
 * Extract chroma (HPCP) feature vectors from an AudioBuffer at a target
 * frame rate.  Returns 12-dimensional Float32Array[] with C at index 0,
 * compatible with our DTW and score-chroma representations.
 *
 * Only analyses audio up to `maxDuration` seconds (default: score length + 30s
 * buffer) to avoid processing unnecessary audio.  Frame rate is automatically
 * reduced for long audio to keep DTW tractable.
 *
 * @param audioBuffer   Decoded audio
 * @param startTime     Only analyse audio from this point onward (seconds)
 * @param frameRate     Target frames per second (default 5)
 * @param maxDuration   Max seconds of audio to analyse (0 = all)
 * @param onProgress    Optional progress callback
 */
export async function extractAudioChroma(
  audioBuffer: AudioBuffer,
  startTime = 0,
  frameRate = 5,
  maxDuration = 0,
  onProgress?: (msg: string) => void,
): Promise<{ frames: Float32Array[]; actualFrameRate: number }> {
  const essentia = await getEssentia();
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const startSample = Math.max(0, Math.round(startTime * sampleRate));
  const endSample = maxDuration > 0
    ? Math.min(channelData.length, startSample + Math.round(maxDuration * sampleRate))
    : channelData.length;
  const analysisDuration = (endSample - startSample) / sampleRate;

  // Cap frame count to keep DTW tractable (N*M matrix).
  // 1200 frames × 1200 frames = ~11.5MB Float64 — manageable.
  const MAX_FRAMES = 1200;
  const estimatedFrames = Math.ceil(analysisDuration * frameRate);
  const effectiveFrameRate = estimatedFrames > MAX_FRAMES
    ? MAX_FRAMES / analysisDuration
    : frameRate;

  const frameSize = 4096;
  const hopSize = Math.max(1, Math.round(sampleRate / effectiveFrameRate));

  const frames: Float32Array[] = [];

  const denominator = frameSize > 1 ? frameSize - 1 : 1;
  const hannWindow = new Float32Array(frameSize);
  for (let j = 0; j < frameSize; j++) {
    hannWindow[j] = 0.5 * (1 - Math.cos((2 * Math.PI * j) / denominator));
  }

  const totalFrames = Math.max(1, Math.ceil((endSample - startSample - frameSize) / hopSize));
  let frameIdx = 0;

  for (let i = startSample; i + frameSize <= endSample; i += hopSize) {
    try {
      const frameSlice = channelData.slice(i, i + frameSize);
      for (let j = 0; j < frameSize; j++) frameSlice[j] *= hannWindow[j];

      const frameVector = essentia.arrayToVector(frameSlice);
      const spectrum = essentia.Spectrum(frameVector);
      const spectralPeaks = essentia.SpectralPeaks(
        spectrum.spectrum,
        0.0001, 5000, 60, 40, 'magnitude', sampleRate,
      );
      const hpcp = essentia.HPCP(
        spectralPeaks.frequencies, spectralPeaks.magnitudes,
        true, 500, 4, 5000, false, 40, false, 'unitMax',
        440, sampleRate, 12, 'squaredCosine', 1,
      );

      const raw = essentia.vectorToArray(hpcp.hpcp);
      const chroma = new Float32Array(12);
      for (let k = 0; k < 12; k++) chroma[k] = raw[(k + 3) % 12];

      let norm = 0;
      for (let k = 0; k < 12; k++) norm += chroma[k] * chroma[k];
      norm = Math.sqrt(norm);
      if (norm > 0) for (let k = 0; k < 12; k++) chroma[k] /= norm;

      frames.push(chroma);

      spectrum.spectrum.delete();
      spectralPeaks.frequencies.delete();
      spectralPeaks.magnitudes.delete();
      hpcp.hpcp.delete();
      frameVector.delete();
    } catch {
      frames.push(new Float32Array(12));
    }

    frameIdx++;
    if (frameIdx % 30 === 0) {
      onProgress?.(`Extracting audio chroma… ${Math.round(100 * frameIdx / totalFrames)}%`);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  return { frames, actualFrameRate: effectiveFrameRate };
}

/**
 * Sample the DTW warp path at each integer beat position to produce
 * per-beat audio timestamps.
 *
 * @param path        DTW warp path — [scoreFrame, audioFrame] pairs
 * @param scoreBpm    Score tempo (beats per minute)
 * @param frameRate   Chroma frame rate in Hz (same for score & audio)
 * @param audioOffset Seconds added to raw audio-frame times (e.g. musicStartTime)
 * @param totalBeats  Total number of beats to sample
 */
function sampleDtwPathAtBeats(
  path: [number, number][],
  scoreBpm: number,
  frameRate: number,
  audioOffset: number,
  totalBeats: number,
): number[] {
  if (path.length === 0 || totalBeats <= 0) return [];

  const secPerBeat = 60 / scoreBpm;

  // Build a lookup: for each score frame → average audio frame
  const scoreToAudio = new Map<number, number[]>();
  for (const [sf, af] of path) {
    const arr = scoreToAudio.get(sf);
    if (arr) arr.push(af);
    else scoreToAudio.set(sf, [af]);
  }

  // Sorted list of score frames in path for interpolation
  const sortedScoreFrames = [...scoreToAudio.keys()].sort((a, b) => a - b);
  const scoreFrameToAudioSec = (sf: number): number => {
    const mapped = scoreToAudio.get(sf);
    if (mapped) {
      const avg = mapped.reduce((a, b) => a + b, 0) / mapped.length;
      return audioOffset + avg / frameRate;
    }
    // Interpolate between nearest path entries
    let lo = 0;
    let hi = sortedScoreFrames.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (sortedScoreFrames[mid] <= sf) lo = mid;
      else hi = mid;
    }
    const sfLo = sortedScoreFrames[lo];
    const sfHi = sortedScoreFrames[hi];
    if (sfHi === sfLo) return audioOffset + (scoreToAudio.get(sfLo)![0]) / frameRate;
    const t = (sf - sfLo) / (sfHi - sfLo);
    const aLo = scoreToAudio.get(sfLo)!;
    const aHi = scoreToAudio.get(sfHi)!;
    const avgLo = aLo.reduce((a, b) => a + b, 0) / aLo.length;
    const avgHi = aHi.reduce((a, b) => a + b, 0) / aHi.length;
    return audioOffset + (avgLo + t * (avgHi - avgLo)) / frameRate;
  };

  const beats: number[] = [];
  for (let b = 0; b < totalBeats; b++) {
    const scoreSec = b * secPerBeat;
    const scoreFrame = scoreSec * frameRate;
    beats.push(scoreFrameToAudioSec(scoreFrame));
  }

  return beats;
}

/**
 * Fix outlier beats in a DTW-derived beat sequence.
 *
 * Only corrects beats whose interval is wildly different (>2.5× or <0.4×)
 * from their local neighborhood.  Preserves all natural rubato timing.
 */
function fixDtwOutliers(beats: number[]): number[] {
  if (beats.length < 5) return beats;

  const result = [...beats];

  // Compute intervals
  const intervals: number[] = [];
  for (let i = 1; i < result.length; i++) {
    intervals.push(result[i] - result[i - 1]);
  }

  // For each interval, compare to the median of a local window (±3).
  // If it's an extreme outlier, replace with the local median.
  const HALF = 3;
  const fixedIntervals = [...intervals];
  for (let i = 0; i < intervals.length; i++) {
    const lo = Math.max(0, i - HALF);
    const hi = Math.min(intervals.length - 1, i + HALF);
    const window: number[] = [];
    for (let j = lo; j <= hi; j++) window.push(intervals[j]);
    window.sort((a, b) => a - b);
    const localMedian = window[Math.floor(window.length / 2)];

    if (localMedian > 0 && (intervals[i] > localMedian * 2.5 || intervals[i] < localMedian * 0.4)) {
      fixedIntervals[i] = localMedian;
    }
  }

  // Reconstruct beat times from fixed intervals
  const fixed = [result[0]];
  for (let i = 0; i < fixedIntervals.length; i++) {
    fixed.push(fixed[i] + fixedIntervals[i]);
  }

  // Ensure monotonicity
  for (let i = 1; i < fixed.length; i++) {
    if (fixed[i] <= fixed[i - 1]) {
      fixed[i] = fixed[i - 1] + 0.01;
    }
  }

  return fixed;
}

export interface CorrelationResult {
  /** Detected BPM of the audio (raw). */
  detectedBpm: number;
  /** BPM of the score as supplied. */
  scoreBpm: number;
  /** Best-matching BPM candidate (considering half/double). null if score BPM is close enough. */
  suggestedBpm: number | null;
  /** Audio time (seconds) where music first becomes audible. */
  musicStartTime: number;
  /** Audio time (seconds) of the detected beat 1 (after pickup notes). */
  downbeatTime: number;
  /** Whether the audio appears to have pickup notes before beat 1. */
  hasPickup: boolean;
  /** The computed best offset to use (accounts for score pickup measures). */
  bestOffset: number;
  /** Per-beat timestamps from the audio analysis (seconds). */
  beats: number[];
  /** Whether the recording has variable tempo (rubato, fermatas, etc.). */
  hasTempoVariance: boolean;
  /** Human-readable summary. */
  recommendation: string;
}

/**
 * Detect when music starts in an AudioBuffer by finding the first
 * sustained rise in RMS energy above the noise floor.
 */
function detectMusicStart(audioBuffer: AudioBuffer): number {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.round(sampleRate * 0.05);
  const hopSize = Math.round(sampleRate * 0.01);

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

  const noiseWindowEnd = Math.min(
    rmsValues.length,
    Math.ceil(0.5 / (hopSize / sampleRate)),
  );
  let noiseFloor = 0;
  for (let i = 0; i < noiseWindowEnd; i++) {
    noiseFloor = Math.max(noiseFloor, rmsValues[i].rms);
  }

  const threshold = Math.max(noiseFloor * 10, 0.005);
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

/**
 * Compute the duration (in seconds) of any pickup (anacrusis) in the score.
 * A pickup measure is measure 0 when its total beats are less than a full measure.
 */
function getScorePickupDuration(score: PianoScore): number {
  const part = score.parts[0];
  if (!part || part.measures.length === 0) return 0;

  const fullMeasureBeats = score.timeSignature.numerator *
    (4 / score.timeSignature.denominator);
  const firstMeasure = part.measures[0];

  let measureBeats = 0;
  for (const note of firstMeasure.notes) {
    measureBeats += durationToBeats(note.duration as NoteDuration, note.dotted);
  }

  if (measureBeats < fullMeasureBeats - 0.01) {
    return measureBeats * (60 / score.tempo);
  }
  return 0;
}

/**
 * Find the best BPM candidate from detected BPM, considering
 * half and double tempo interpretations.
 */
function findBestBpmCandidate(
  detectedBpm: number,
  scoreBpm: number,
): { bestCandidate: number; ratio: number } {
  const candidates = [
    detectedBpm,
    detectedBpm / 2,
    detectedBpm * 2,
    detectedBpm * 3 / 2,
    detectedBpm * 2 / 3,
  ].filter(c => c > 20 && c < 300);

  let bestCandidate = detectedBpm;
  let bestRatio = Math.abs(detectedBpm / scoreBpm - 1);

  for (const c of candidates) {
    const ratio = Math.abs(c / scoreBpm - 1);
    if (ratio < bestRatio) {
      bestRatio = ratio;
      bestCandidate = c;
    }
  }

  return { bestCandidate: Math.round(bestCandidate), ratio: bestCandidate / scoreBpm };
}

/**
 * Resample detected beat timestamps to match the score's beat subdivision.
 *
 * The beat tracker often detects at a different rate than the score expects:
 * - Detected ~154 BPM, score ~80 BPM → tracker found eighth notes, take every 2nd
 * - Detected ~80 BPM, score ~80 BPM → 1:1 mapping
 * - Detected ~40 BPM, score ~80 BPM → tracker found half notes, interpolate
 *
 * Also fills gaps (e.g., long rests) by interpolating at the local tempo.
 */
function resampleBeatsToScoreRate(
  rawBeats: number[],
  detectedBpm: number,
  bestCandidate: number,
  scoreBpm: number,
): number[] {
  if (rawBeats.length < 2) return rawBeats;

  // The ratio of detected beats per score beat
  // e.g., detected 154 BPM / score 80 BPM ≈ 1.925 → ~2 detected beats per score beat
  const rawRatio = detectedBpm / scoreBpm;

  // Determine the integer step: how many raw beats correspond to one score beat
  let step: number;
  if (rawRatio > 2.7) step = Math.round(rawRatio);       // 3:1 or higher
  else if (rawRatio > 1.7) step = 2;                      // 2:1 (eighth notes)
  else if (rawRatio > 1.3) step = Math.round(rawRatio * 2) / 2; // 3:2
  else if (rawRatio > 0.7) step = 1;                      // 1:1
  else if (rawRatio > 0.35) step = 0.5;                   // 1:2 (half notes)
  else step = 1;

  if (step === 1) return rawBeats;

  if (step >= 2 && Math.round(step) === step) {
    // Take every Nth beat (e.g., every 2nd for 2:1)
    const intStep = Math.round(step);
    const thinned: number[] = [];
    for (let i = 0; i < rawBeats.length; i += intStep) {
      thinned.push(rawBeats[i]);
    }
    return fillBeatGaps(thinned, scoreBpm);
  }

  if (step < 1) {
    // Tracker found beats slower than the score: interpolate between raw beats
    const interpolated: number[] = [];
    for (let i = 0; i < rawBeats.length - 1; i++) {
      const t0 = rawBeats[i];
      const t1 = rawBeats[i + 1];
      const subdivisions = Math.round(1 / step);
      for (let s = 0; s < subdivisions; s++) {
        interpolated.push(t0 + (s / subdivisions) * (t1 - t0));
      }
    }
    interpolated.push(rawBeats[rawBeats.length - 1]);
    return fillBeatGaps(interpolated, scoreBpm);
  }

  // Fractional step (e.g. 1.5 for 3:2): use the bestCandidate for resampling
  // Generate a new beat grid using the bestCandidate BPM timing
  const interval = 60 / bestCandidate;
  const result: number[] = [];
  const end = rawBeats[rawBeats.length - 1];
  let t = rawBeats[0];
  while (t <= end + interval * 0.5) {
    result.push(t);
    // Snap to nearest raw beat for accuracy
    const nextTarget = t + interval;
    let closest = nextTarget;
    let minDist = Infinity;
    for (const b of rawBeats) {
      const d = Math.abs(b - nextTarget);
      if (d < minDist) { minDist = d; closest = b; }
    }
    t = minDist < interval * 0.3 ? closest : nextTarget;
  }
  return fillBeatGaps(result, scoreBpm);
}

/**
 * Fill gaps in the beat sequence where beats are missing (e.g., during
 * long rests or silence). A "gap" is an interval > 2x the median interval.
 */
function fillBeatGaps(beats: number[], fallbackBpm: number): number[] {
  if (beats.length < 3) return beats;

  // Compute median inter-beat interval
  const intervals: number[] = [];
  for (let i = 1; i < beats.length; i++) {
    intervals.push(beats[i] - beats[i - 1]);
  }
  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];

  const gapThreshold = median * 2.5;
  const result: number[] = [beats[0]];

  for (let i = 1; i < beats.length; i++) {
    const gap = beats[i] - beats[i - 1];
    if (gap > gapThreshold) {
      // Fill in using the local tempo (last known interval or fallback)
      const fillInterval = i >= 2
        ? beats[i - 1] - beats[i - 2]
        : 60 / fallbackBpm;
      let t = beats[i - 1] + fillInterval;
      while (t < beats[i] - fillInterval * 0.5) {
        result.push(t);
        t += fillInterval;
      }
    }
    result.push(beats[i]);
  }

  return result;
}

/**
 * Run DTW chroma alignment and return smoothed beat times.
 * Returns an empty array if alignment fails or data is insufficient.
 */
async function runDtwAlignment(
  audioBuffer: AudioBuffer,
  score: PianoScore,
  chromaBpm: number,
  frameRate: number,
  musicStartTime: number,
  playbackOrder: number[] | undefined,
  onProgress?: (msg: string) => void,
): Promise<number[]> {
  onProgress?.('Building score chroma...');
  await new Promise(r => setTimeout(r, 0));
  const scoreChroma = buildScoreChroma(score, chromaBpm, frameRate, playbackOrder);

  if (scoreChroma.frames.length < 3) return [];

  const scoreDuration = scoreChroma.durationSec;
  const audioDuration = (audioBuffer.length / audioBuffer.sampleRate) - musicStartTime;

  // If the expanded score is >2x longer than the audio, the playback
  // order probably doesn't match the recording — return empty to trigger retry.
  if (scoreDuration > audioDuration * 2.2) {
    console.warn(
      `[Correlation] Score duration (${scoreDuration.toFixed(0)}s) >> audio (${audioDuration.toFixed(0)}s). ` +
      `Likely structural mismatch.`,
    );
    return [];
  }

  const maxAudioDuration = scoreDuration + 30;
  const audioChromaResult = await extractAudioChroma(
    audioBuffer, musicStartTime, frameRate, maxAudioDuration, onProgress,
  );

  if (audioChromaResult.frames.length < 3) return [];

  onProgress?.('Aligning with score (DTW)...');
  await new Promise(r => setTimeout(r, 0));

  const effectiveRate = audioChromaResult.actualFrameRate;

  let scoreFrames = scoreChroma.frames;
  let scoreTotalBeats = scoreChroma.totalBeats;
  if (Math.abs(effectiveRate - frameRate) > 0.1) {
    const adjusted = buildScoreChroma(score, chromaBpm, effectiveRate, playbackOrder);
    scoreFrames = adjusted.frames;
    scoreTotalBeats = adjusted.totalBeats;
  }

  // Use wider band (35%) for rubato tolerance
  const dtwResult = await computeDTW(
    scoreFrames, audioChromaResult.frames, 0.35, 'cosine', 50,
  );

  console.log(
    `[Correlation] DTW: ${scoreFrames.length} score × ${audioChromaResult.frames.length} audio frames ` +
    `@ ${effectiveRate.toFixed(1)} Hz, cost=${dtwResult.normalizedCost.toFixed(4)}, ` +
    `${scoreTotalBeats} beats`,
  );

  const rawBeats = sampleDtwPathAtBeats(
    dtwResult.path, chromaBpm, effectiveRate, musicStartTime, scoreTotalBeats,
  );

  if (rawBeats.length < 4) return rawBeats;

  // Fix only outlier jumps — preserve natural rubato timing
  return fixDtwOutliers(rawBeats);
}

export async function correlateVideoWithScore(
  audioBuffer: AudioBuffer,
  score: PianoScore,
  beatResult: BeatAnalysisResult,
  scoreBpm: number,
  onProgress?: (msg: string) => void,
): Promise<CorrelationResult> {
  onProgress?.('Detecting music start...');
  await new Promise(r => setTimeout(r, 0));

  const musicStartTime = detectMusicStart(audioBuffer);

  const detectedBpm = beatResult.bpm;
  const { bestCandidate, ratio } = findBestBpmCandidate(detectedBpm, scoreBpm);

  const alignBpm = Math.abs(ratio - 1) < 0.15 ? bestCandidate : scoreBpm;

  onProgress?.('Finding beat 1...');
  await new Promise(r => setTimeout(r, 0));

  const beatsPerMeasure = score.timeSignature.numerator *
    (4 / score.timeSignature.denominator);
  const alignment = alignBeatGridToDownbeat(
    audioBuffer, alignBpm, musicStartTime, beatsPerMeasure,
  );

  const downbeatTime = alignment.alignedStartTime;
  const hasPickup = alignment.hasPickup;

  const scorePickupDuration = getScorePickupDuration(score);

  const suggestedBpm = Math.abs(ratio - 1) > 0.05 ? bestCandidate : null;

  // ── Chroma-based DTW alignment ──
  let playbackOrder: number[] | undefined;
  try {
    const { resolvePlaybackOrder } = await import('./scorePlayback');
    playbackOrder = resolvePlaybackOrder(score);
  } catch { /* fall through to linear order */ }

  // Score chroma must be built at scoreBpm so that beat indices match
  // the score engine's beat positions.  The DTW handles the tempo
  // difference between score BPM and actual audio tempo via warping.
  const CHROMA_FRAME_RATE = 8;

  let beats: number[];
  let hasTempoVariance = beatResult.hasTempoVariance ?? false;

  beats = await runDtwAlignment(
    audioBuffer, score, scoreBpm, CHROMA_FRAME_RATE,
    musicStartTime, playbackOrder, onProgress,
  );

  // If DTW with expanded playback order produced poor results or the
  // score is much longer than the audio, retry without expansion.
  if (beats.length < 4 && playbackOrder) {
    onProgress?.('Retrying alignment without repeat expansion…');
    await new Promise(r => setTimeout(r, 0));
    beats = await runDtwAlignment(
      audioBuffer, score, scoreBpm, CHROMA_FRAME_RATE,
      musicStartTime, undefined, onProgress,
    );
  }

  if (beats.length < 4) {
    beats = resampleBeatsToScoreRate(
      beatResult.beats, detectedBpm, bestCandidate, scoreBpm,
    );
  }

  // When DTW beats are available, derive bestOffset from beats[0].
  // This avoids a mismatch between the downbeat alignment's estimate
  // and the DTW-computed timeline, which previously caused the offset
  // to "fight" the SmartBeatMap (e.g. 0.54s when 0 was correct).
  const bestOffset = beats.length >= 4
    ? beats[0]
    : (downbeatTime - scorePickupDuration);

  // Determine tempo variance from beat intervals
  if (beats.length >= 4) {
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    let variance = 0;
    for (const iv of intervals) variance += (iv - mean) * (iv - mean);
    variance /= intervals.length;
    const cv = Math.sqrt(variance) / mean;
    hasTempoVariance = cv > 0.05;
  }

  const parts: string[] = [];
  parts.push(`Detected ~${Math.round(detectedBpm)} BPM`);
  if (suggestedBpm !== null && suggestedBpm !== Math.round(detectedBpm)) {
    parts.push(`(best match: ${suggestedBpm} BPM)`);
  }
  if (hasPickup) {
    parts.push('— pickup notes detected');
  }
  parts.push('— use tap-to-align or offset slider to fine-tune');
  const recommendation = parts.join(' ');

  return {
    detectedBpm,
    scoreBpm,
    suggestedBpm,
    musicStartTime,
    downbeatTime,
    hasPickup,
    bestOffset,
    beats,
    hasTempoVariance,
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
