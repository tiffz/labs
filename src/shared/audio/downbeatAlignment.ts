/**
 * Downbeat Alignment
 * 
 * Handles songs with pickup notes by finding which onset in the opening
 * measures is most likely to be beat 1, based on:
 * - Onset strength (energy)
 * - How well subsequent beats align with detected onsets
 */

import type { MinimalAudioBuffer } from '../beat/analysis/onsets';

export interface DownbeatAlignmentResult {
  /** The time where beat 1 should start */
  alignedStartTime: number;
  /** Confidence in the alignment (0-1) */
  confidence: number;
  /** Whether pickup notes were detected before beat 1 */
  hasPickup: boolean;
  /** Debug info about the alignment process */
  debugInfo?: {
    candidateCount: number;
    bestScore: number;
    originalMusicStart: number;
  };
}

interface OnsetWithEnergy {
  time: number;
  energy: number;
}

/**
 * Detect onsets with their energy levels for downbeat detection.
 * Uses a slightly different configuration optimized for finding strong beats.
 */
function detectOnsetsWithEnergy(audioBuffer: MinimalAudioBuffer): OnsetWithEnergy[] {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  const frameSize = 1024;
  const hopSize = 512;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  
  if (numFrames <= 0) return [];
  
  // Calculate energy for each frame
  const energies: number[] = [];
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    let sum = 0;
    for (let j = 0; j < frameSize; j++) {
      sum += channelData[start + j] * channelData[start + j];
    }
    energies.push(Math.sqrt(sum / frameSize));
  }
  
  const maxEnergy = Math.max(...energies);
  if (maxEnergy < 0.01) return [];
  
  // Normalize energies
  const normalized = energies.map(e => e / maxEnergy);
  
  // Find onsets (energy increases)
  const onsets: OnsetWithEnergy[] = [];
  const threshold = 0.02;
  const minOnsetInterval = 0.08; // 80ms minimum between onsets
  const localMaxWindow = 2;
  
  for (let i = localMaxWindow; i < normalized.length - localMaxWindow; i++) {
    const current = normalized[i];
    const previous = normalized[i - 1];
    const increase = current - previous;
    
    if (increase < threshold) continue;
    
    // Check if local maximum
    let isLocalMax = true;
    for (let j = 1; j <= localMaxWindow; j++) {
      if (normalized[i - j] >= current || normalized[i + j] > current) {
        isLocalMax = false;
        break;
      }
    }
    
    if (isLocalMax) {
      const timeInSeconds = (i * hopSize) / sampleRate;
      if (onsets.length === 0 || timeInSeconds - onsets[onsets.length - 1].time >= minOnsetInterval) {
        onsets.push({
          time: timeInSeconds,
          energy: current,
        });
      }
    }
  }
  
  return onsets;
}

/**
 * Calculate how well a beat grid starting at candidateTime aligns with detected onsets.
 * 
 * @param candidateTime - The proposed beat 1 time
 * @param beatInterval - Duration of one beat in seconds
 * @param onsets - All detected onsets with energy
 * @param numBeatsToCheck - How many beats to check alignment for
 * @param tolerance - How close a beat must be to an onset to count as aligned (seconds)
 * @returns Alignment score (0-1) where 1 is perfect alignment
 */
function calculateAlignmentScore(
  candidateTime: number,
  beatInterval: number,
  onsets: OnsetWithEnergy[],
  numBeatsToCheck: number = 16,
  tolerance: number = 0.05
): number {
  let alignedBeats = 0;
  let totalEnergyBonus = 0;
  
  for (let i = 0; i < numBeatsToCheck; i++) {
    const expectedBeatTime = candidateTime + i * beatInterval;
    
    // Find the closest onset to this expected beat
    let closestOnset: OnsetWithEnergy | null = null;
    let closestDistance = Infinity;
    
    for (const onset of onsets) {
      const distance = Math.abs(onset.time - expectedBeatTime);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestOnset = onset;
      }
      // Early exit if we've passed the expected time significantly
      if (onset.time > expectedBeatTime + tolerance * 2) break;
    }
    
    if (closestOnset && closestDistance <= tolerance) {
      alignedBeats++;
      // Give extra weight to downbeats (every 4th beat, starting from 0)
      const isDownbeat = i % 4 === 0;
      totalEnergyBonus += closestOnset.energy * (isDownbeat ? 1.5 : 1.0);
    }
  }
  
  const alignmentRatio = alignedBeats / numBeatsToCheck;
  const normalizedEnergyBonus = totalEnergyBonus / (numBeatsToCheck * 1.5); // Normalize
  
  // Combined score: 70% alignment, 30% energy
  return alignmentRatio * 0.7 + normalizedEnergyBonus * 0.3;
}

export interface BeatOneAnchorResolution {
  /** Absolute media time (seconds) for Beat 1. */
  beatOneTime: number;
  confidence: number;
  hasPickup: boolean;
  realigned: boolean;
  debugInfo?: {
    candidateCount: number;
    bestScore: number;
    originalBeatOne: number;
    originalMusicStart: number;
  };
}

/**
 * Resolve Beat 1 anchor time near `musicStartTime`.
 *
 * Essentia beat ticks often start many seconds into the track even when BPM is
 * correct (wrong grid phase). When the current Beat 1 is implausibly late, or
 * an early phase/onset aligns better with onsets, snap the grid to that anchor.
 */
export function resolveBeatOneAnchorTime(
  audioBuffer: MinimalAudioBuffer,
  bpm: number,
  musicStartTime: number,
  currentBeatOne: number,
  beatsPerMeasure: number = 4,
): BeatOneAnchorResolution {
  const beatInterval = 60 / bpm;
  const measureDuration = beatInterval * beatsPerMeasure;
  const searchWindowStart = musicStartTime;
  const searchWindowEnd = musicStartTime + measureDuration * 2;
  const allOnsets = detectOnsetsWithEnergy(audioBuffer);
  const candidateOnsets = allOnsets.filter(
    (o) => o.time >= searchWindowStart && o.time <= searchWindowEnd,
  );

  const scoreCandidate = (candidateTime: number, earlyBias: number): number => {
    const score = calculateAlignmentScore(candidateTime, beatInterval, allOnsets, 16, 0.05);
    return score * earlyBias;
  };

  const currentScore = scoreCandidate(currentBeatOne, 1);
  let bestTime = currentBeatOne;
  let bestScore = currentScore;

  const phaseSteps = 32;
  for (let i = 0; i <= phaseSteps; i++) {
    const candidate = musicStartTime + (i / phaseSteps) * beatInterval;
    const earlyBias = 1 - (candidate - musicStartTime) / beatInterval * 0.08;
    const adjusted = scoreCandidate(candidate, earlyBias);
    if (adjusted > bestScore) {
      bestScore = adjusted;
      bestTime = candidate;
    }
  }

  for (const candidate of candidateOnsets) {
    const span = Math.max(beatInterval, searchWindowEnd - searchWindowStart);
    const earlyBias = 1 - (candidate.time - searchWindowStart) / span * 0.1;
    const adjusted = scoreCandidate(candidate.time, earlyBias);
    if (adjusted > bestScore) {
      bestScore = adjusted;
      bestTime = candidate.time;
    }
  }

  const latePhase = currentBeatOne > musicStartTime + beatInterval * 1.25;
  const improved = bestScore > currentScore + 0.05;
  const useResolved =
    latePhase ||
    (bestScore >= 0.3 && improved) ||
    (bestScore >= 0.4 && Math.abs(bestTime - currentBeatOne) > 0.1);

  if (!useResolved) {
    return {
      beatOneTime: currentBeatOne,
      confidence: Math.min(1, currentScore * 1.2),
      hasPickup: false,
      realigned: false,
      debugInfo: {
        candidateCount: candidateOnsets.length,
        bestScore: currentScore,
        originalBeatOne: currentBeatOne,
        originalMusicStart: musicStartTime,
      },
    };
  }

  const firstOnset = candidateOnsets[0];
  const hasPickup = firstOnset != null && bestTime > firstOnset.time + beatInterval * 0.5;
  const confidence = Math.min(1, bestScore * 1.2);

  return {
    beatOneTime: bestTime,
    confidence,
    hasPickup,
    realigned: Math.abs(bestTime - currentBeatOne) > 0.02,
    debugInfo: {
      candidateCount: candidateOnsets.length,
      bestScore,
      originalBeatOne: currentBeatOne,
      originalMusicStart: musicStartTime,
    },
  };
}

/**
 * Align beat grid to the first actual downbeat.
 *
 * Handles songs with pickup notes by finding which onset in the opening
 * measures is most likely to be beat 1, based on:
 * - Onset strength (energy)
 * - How well subsequent beats align with detected onsets
 */
export function alignBeatGridToDownbeat(
  audioBuffer: MinimalAudioBuffer,
  bpm: number,
  musicStartTime: number,
  beatsPerMeasure: number = 4,
): DownbeatAlignmentResult {
  const resolved = resolveBeatOneAnchorTime(
    audioBuffer,
    bpm,
    musicStartTime,
    musicStartTime,
    beatsPerMeasure,
  );
  const useAlignedTime = resolved.confidence >= 0.4 && resolved.debugInfo?.bestScore != null && resolved.debugInfo.bestScore >= 0.3;

  return {
    alignedStartTime: useAlignedTime ? resolved.beatOneTime : musicStartTime,
    confidence: resolved.confidence,
    hasPickup: useAlignedTime && resolved.hasPickup,
    debugInfo: {
      candidateCount: resolved.debugInfo?.candidateCount ?? 0,
      bestScore: resolved.debugInfo?.bestScore ?? 0,
      originalMusicStart: musicStartTime,
    },
  };
}

