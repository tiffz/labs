/**
 * Downbeat Alignment
 * 
 * Handles songs with pickup notes by finding which onset in the opening
 * measures is most likely to be beat 1, based on:
 * - Onset strength (energy)
 * - How well subsequent beats align with detected onsets
 */

import type { MinimalAudioBuffer } from './analysis/onsets';

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
  if (maxEnergy === 0) return [];
  
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

/**
 * Align beat grid to the first actual downbeat.
 * 
 * Handles songs with pickup notes by finding which onset in the opening
 * measures is most likely to be beat 1, based on:
 * - Onset strength (energy)
 * - How well subsequent beats align with detected onsets
 * 
 * @param audioBuffer - The audio to analyze
 * @param bpm - Detected BPM
 * @param musicStartTime - When audio/music starts (from detectMusicStart)
 * @param beatsPerMeasure - Beats per measure (default 4)
 * @returns Alignment result with the best downbeat time
 */
export function alignBeatGridToDownbeat(
  audioBuffer: MinimalAudioBuffer,
  bpm: number,
  musicStartTime: number,
  beatsPerMeasure: number = 4
): DownbeatAlignmentResult {
  const beatInterval = 60 / bpm;
  const measureDuration = beatInterval * beatsPerMeasure;
  
  // Search window: first 2 measures after music starts
  const searchWindowStart = musicStartTime;
  const searchWindowEnd = musicStartTime + measureDuration * 2;
  
  // Detect onsets with energy
  const allOnsets = detectOnsetsWithEnergy(audioBuffer);
  
  // Filter to onsets in search window
  const candidateOnsets = allOnsets.filter(
    o => o.time >= searchWindowStart && o.time <= searchWindowEnd
  );
  
  if (candidateOnsets.length === 0) {
    // No onsets found, use original musicStartTime
    return {
      alignedStartTime: musicStartTime,
      confidence: 0.5,
      hasPickup: false,
      debugInfo: {
        candidateCount: 0,
        bestScore: 0,
        originalMusicStart: musicStartTime,
      },
    };
  }
  
  // Score each candidate onset as potential beat 1
  let bestCandidate = candidateOnsets[0];
  let bestScore = 0;
  
  for (const candidate of candidateOnsets) {
    const score = calculateAlignmentScore(
      candidate.time,
      beatInterval,
      allOnsets,
      16, // Check 16 beats (4 measures in 4/4)
      0.05 // 50ms tolerance
    );
    
    // Slight bias toward earlier onsets (simpler explanation)
    const timeBonus = 1 - (candidate.time - searchWindowStart) / (searchWindowEnd - searchWindowStart) * 0.1;
    const adjustedScore = score * timeBonus;
    
    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestCandidate = candidate;
    }
  }
  
  // Determine if there's a pickup (best candidate is not the first onset)
  const firstOnset = candidateOnsets[0];
  const hasPickup = bestCandidate.time > firstOnset.time + beatInterval * 0.5;
  
  // Confidence based on score
  const confidence = Math.min(1, bestScore * 1.2);
  
  // Only use aligned time if confidence is reasonable
  const useAlignedTime = confidence >= 0.4 && bestScore >= 0.3;
  
  console.log(`[DownbeatAlignment] Candidates: ${candidateOnsets.length}, Best score: ${bestScore.toFixed(3)}, ` +
    `Original: ${musicStartTime.toFixed(3)}s, Aligned: ${bestCandidate.time.toFixed(3)}s, ` +
    `HasPickup: ${hasPickup}, Using aligned: ${useAlignedTime}`);
  
  return {
    alignedStartTime: useAlignedTime ? bestCandidate.time : musicStartTime,
    confidence,
    hasPickup: useAlignedTime && hasPickup,
    debugInfo: {
      candidateCount: candidateOnsets.length,
      bestScore,
      originalMusicStart: musicStartTime,
    },
  };
}

