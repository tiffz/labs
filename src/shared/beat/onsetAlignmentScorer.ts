/**
 * Onset Alignment Scorer
 * 
 * Evaluates how well a given BPM aligns with detected audio onsets.
 * This provides an objective measure of BPM accuracy without requiring
 * human listening evaluation.
 * 
 * The approach:
 * 1. Detect onsets from audio (note attacks, beat positions)
 * 2. For each candidate BPM, generate a theoretical beat grid
 * 3. For each beat in the grid, find the nearest onset
 * 4. Score based on how close beats are to onsets
 * 
 * A good BPM will have beats that consistently land near onsets.
 * A bad BPM will have beats that often fall between onsets.
 */

import { detectOnsets, type MinimalAudioBuffer, type OnsetPreset } from './analysis/onsets';

export interface AlignmentScore {
  bpm: number;
  /** Average distance (in seconds) from each beat to nearest onset */
  meanError: number;
  /** Median distance from beat to nearest onset */
  medianError: number;
  /** Percentage of beats within tolerance of an onset */
  hitRate: number;
  /** Standard deviation of errors */
  errorStdDev: number;
  /** Combined score (lower is better) */
  score: number;
}

export interface AlignmentAnalysis {
  /** The detected onsets (in seconds) */
  onsets: number[];
  /** Analysis duration (in seconds) */
  duration: number;
  /** Detected BPM from our algorithm */
  detectedBpm: number;
  /** Scores for each candidate BPM */
  scores: AlignmentScore[];
  /** Best scoring BPM */
  bestBpm: number;
  /** Recommendation based on analysis */
  recommendation: string;
}

interface AlignmentAudioBuffer extends MinimalAudioBuffer {
  duration: number;
}

export interface AlignmentOnsetOptions {
  skipRanges?: Array<[number, number]>;
  preset?: OnsetPreset;
}

/**
 * Detect onsets for alignment diagnostics with optional skip ranges.
 */
export function detectAlignmentOnsets(
  audioBuffer: AlignmentAudioBuffer,
  options: AlignmentOnsetOptions = {}
): number[] {
  const preset = options.preset ?? 'accuracy';
  const allOnsets = detectOnsets(audioBuffer, { preset });

  if (!options.skipRanges || options.skipRanges.length === 0) {
    return allOnsets;
  }

  return allOnsets.filter(onset => {
    return !options.skipRanges!.some(([start, end]) => onset >= start && onset <= end);
  });
}

/**
 * Filter onsets to focus on likely quarter notes (reduce subdivision bias).
 * 
 * The problem: Songs with lots of 8th/16th notes have onsets near almost
 * any beat position, making all BPMs score similarly. We need to focus
 * on onsets that are likely quarter notes.
 * 
 * The solution: Weight onsets by how well they fit a quarter-note pattern.
 * Onsets that have neighbors approximately one beat (±20%) away are more
 * likely to be quarter notes.
 * 
 * @param onsets - All detected onsets
 * @param bpm - The BPM being tested
 * @returns Filtered onsets with weights
 */
function filterToLikelyQuarterNotes(
  onsets: number[],
  bpm: number
): { onset: number; weight: number }[] {
  const beatInterval = 60 / bpm;
  const tolerance = beatInterval * 0.2; // ±20% of beat interval
  
  const sortedOnsets = [...onsets].sort((a, b) => a - b);
  const weighted: { onset: number; weight: number }[] = [];
  
  for (let i = 0; i < sortedOnsets.length; i++) {
    const onset = sortedOnsets[i];
    let weight = 0.3; // Base weight for all onsets
    
    // Check if next onset is approximately one beat away
    if (i < sortedOnsets.length - 1) {
      const nextInterval = sortedOnsets[i + 1] - onset;
      if (Math.abs(nextInterval - beatInterval) < tolerance) {
        weight += 0.35; // Likely quarter note
      } else if (Math.abs(nextInterval - beatInterval * 2) < tolerance * 2) {
        weight += 0.25; // Likely half note (still good)
      }
    }
    
    // Check if previous onset is approximately one beat away
    if (i > 0) {
      const prevInterval = onset - sortedOnsets[i - 1];
      if (Math.abs(prevInterval - beatInterval) < tolerance) {
        weight += 0.35; // Likely quarter note
      } else if (Math.abs(prevInterval - beatInterval * 2) < tolerance * 2) {
        weight += 0.25; // Likely half note (still good)
      }
    }
    
    weighted.push({ onset, weight: Math.min(1, weight) });
  }
  
  return weighted;
}

/**
 * Calculate alignment score for a specific BPM against detected onsets
 * 
 * @param bpm - The BPM to test
 * @param onsets - Array of onset times in seconds
 * @param startTime - When the beat grid should start
 * @param endTime - When to stop analyzing
 * @param tolerance - Maximum distance (seconds) to consider a "hit" (default: 1/8 of beat)
 */
export function calculateAlignmentScore(
  bpm: number,
  onsets: number[],
  startTime: number,
  endTime: number,
  tolerance?: number
): AlignmentScore {
  const beatInterval = 60 / bpm;
  const defaultTolerance = beatInterval / 8; // 1/8 of a beat
  const hitTolerance = tolerance ?? defaultTolerance;
  
  // Generate beat grid
  const beats: number[] = [];
  let beatTime = startTime;
  while (beatTime <= endTime) {
    beats.push(beatTime);
    beatTime += beatInterval;
  }
  
  if (beats.length === 0) {
    return {
      bpm,
      meanError: Infinity,
      medianError: Infinity,
      hitRate: 0,
      errorStdDev: Infinity,
      score: Infinity,
    };
  }
  
  // Filter onsets to focus on likely quarter notes (reduce subdivision bias)
  const weightedOnsets = filterToLikelyQuarterNotes(onsets, bpm);
  const sortedOnsets = weightedOnsets.map(w => w.onset);
  
  // For each beat, find distance to nearest onset (weighted)
  const errors: number[] = [];
  const weightedErrors: number[] = [];
  let hits = 0;
  
  for (const beat of beats) {
    // Find nearest onset and its weight
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < sortedOnsets.length; i++) {
      const dist = Math.abs(beat - sortedOnsets[i]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    
    const error = nearestDist;
    const weight = weightedOnsets[nearestIdx]?.weight ?? 0.3;
    
    errors.push(error);
    weightedErrors.push(error / weight); // Lower error for high-weight onsets
    
    if (error <= hitTolerance) {
      hits++;
      // weightedHits could be used for weighted hit rate in future
      void weight; // Mark as intentionally unused
    }
  }
  
  // Calculate statistics
  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  
  const sortedErrors = [...errors].sort((a, b) => a - b);
  const medianError = sortedErrors[Math.floor(sortedErrors.length / 2)];
  
  const hitRate = hits / beats.length;
  
  const squaredDiffs = errors.map(e => Math.pow(e - meanError, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / errors.length;
  const errorStdDev = Math.sqrt(variance);
  
  // Combined score (lower is better)
  // Weight: mean error (40%), hit rate inverted (40%), std dev (20%)
  const score = meanError * 0.4 + (1 - hitRate) * beatInterval * 0.4 + errorStdDev * 0.2;
  
  return {
    bpm,
    meanError,
    medianError,
    hitRate,
    errorStdDev,
    score,
  };
}

/**
 * Analyze alignment for multiple candidate BPMs
 * 
 * @param onsets - Detected onset times
 * @param detectedBpm - The BPM detected by our algorithm
 * @param startTime - When beat grid starts
 * @param endTime - Analysis end time
 * @param bpmRange - Range of BPMs to test around detected (default: ±5)
 * @param bpmStep - Step size for testing (default: 0.5)
 */
export function analyzeAlignment(
  onsets: number[],
  detectedBpm: number,
  startTime: number,
  endTime: number,
  bpmRange: number = 5,
  bpmStep: number = 0.5
): AlignmentAnalysis {
  const scores: AlignmentScore[] = [];
  
  // Test BPMs around the detected value
  const minBpm = Math.max(30, detectedBpm - bpmRange);
  const maxBpm = Math.min(300, detectedBpm + bpmRange);
  
  for (let bpm = minBpm; bpm <= maxBpm; bpm += bpmStep) {
    const score = calculateAlignmentScore(bpm, onsets, startTime, endTime);
    scores.push(score);
  }
  
  // Also test common round BPMs near detected
  const roundBpms = [
    Math.floor(detectedBpm) - 1,
    Math.floor(detectedBpm),
    Math.ceil(detectedBpm),
    Math.ceil(detectedBpm) + 1,
  ].filter(b => b >= minBpm && b <= maxBpm);
  
  for (const bpm of roundBpms) {
    if (!scores.some(s => Math.abs(s.bpm - bpm) < 0.1)) {
      scores.push(calculateAlignmentScore(bpm, onsets, startTime, endTime));
    }
  }
  
  // Sort by score (lower is better)
  scores.sort((a, b) => a.score - b.score);
  
  const bestBpm = scores[0].bpm;
  const detectedScore = scores.find(s => Math.abs(s.bpm - detectedBpm) < 0.1);
  
  // Generate recommendation
  let recommendation: string;
  const bpmDiff = Math.abs(bestBpm - detectedBpm);
  
  if (bpmDiff < 0.3) {
    recommendation = `Detected BPM (${detectedBpm}) is optimal or very close to optimal.`;
  } else if (bpmDiff < 1) {
    recommendation = `Detected BPM (${detectedBpm}) is close, but ${bestBpm.toFixed(1)} BPM aligns slightly better with onsets.`;
  } else {
    recommendation = `Consider adjusting BPM from ${detectedBpm} to ${bestBpm.toFixed(1)} for better alignment.`;
  }
  
  // Add hit rate comparison
  if (detectedScore) {
    const bestHitRate = scores[0].hitRate;
    const detectedHitRate = detectedScore.hitRate;
    recommendation += ` (Hit rate: detected=${(detectedHitRate * 100).toFixed(1)}%, best=${(bestHitRate * 100).toFixed(1)}%)`;
  }
  
  return {
    onsets,
    duration: endTime - startTime,
    detectedBpm,
    scores: scores.slice(0, 10), // Top 10 candidates
    bestBpm,
    recommendation,
  };
}

/**
 * Format alignment analysis as a readable report
 */
export function formatAlignmentReport(analysis: AlignmentAnalysis): string {
  const lines: string[] = [
    '=== Onset Alignment Analysis ===',
    '',
    `Onsets detected: ${analysis.onsets.length}`,
    `Analysis duration: ${analysis.duration.toFixed(1)}s`,
    `Detected BPM: ${analysis.detectedBpm}`,
    `Best aligned BPM: ${analysis.bestBpm.toFixed(1)}`,
    '',
    'Top 10 BPM candidates (by alignment score):',
    '─'.repeat(60),
    'BPM      Mean Err   Median Err   Hit Rate   Std Dev    Score',
    '─'.repeat(60),
  ];
  
  for (const score of analysis.scores) {
    const marker = Math.abs(score.bpm - analysis.detectedBpm) < 0.1 ? ' ◄ detected' : '';
    lines.push(
      `${score.bpm.toFixed(1).padStart(6)}   ` +
      `${(score.meanError * 1000).toFixed(1).padStart(7)}ms  ` +
      `${(score.medianError * 1000).toFixed(1).padStart(8)}ms  ` +
      `${(score.hitRate * 100).toFixed(1).padStart(7)}%  ` +
      `${(score.errorStdDev * 1000).toFixed(1).padStart(7)}ms  ` +
      `${score.score.toFixed(4).padStart(7)}${marker}`
    );
  }
  
  lines.push('─'.repeat(60));
  lines.push('');
  lines.push(`Recommendation: ${analysis.recommendation}`);
  
  return lines.join('\n');
}
