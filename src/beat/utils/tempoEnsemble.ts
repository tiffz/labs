/**
 * Tempo Ensemble Detection
 *
 * Uses multiple tempo estimation algorithms and computes consensus
 * to improve accuracy and detect/resolve octave errors (60 vs 120 vs 240 BPM).
 */

import { getEssentia } from './beatAnalyzer';

export interface TempoEstimate {
  algorithm: string;
  bpm: number;
  confidence: number;
  beats?: number[];
}

export interface EnsembleResult {
  consensusBpm: number;
  confidence: number;
  estimates: TempoEstimate[];
  agreement: 'strong' | 'moderate' | 'weak';
  warnings: string[];
  /** Best beat positions from the most confident algorithm */
  bestBeats: number[];
}

/**
 * Normalize BPM to 70-140 range to handle octave errors
 */
function normalizeToRange(bpm: number, min: number = 70, max: number = 140): number {
  let normalized = bpm;
  while (normalized < min && normalized > 0) normalized *= 2;
  while (normalized > max) normalized /= 2;
  return normalized;
}

// Note: areOctaveRelated could be used for more advanced octave analysis if needed
// function areOctaveRelated(bpm1: number, bpm2: number, tolerance: number = 0.03): boolean {
//   const ratio = bpm1 / bpm2;
//   const octaves = [0.25, 0.5, 1, 2, 4];
//   return octaves.some((oct) => Math.abs(ratio - oct) < tolerance);
// }

/**
 * Run multiple tempo estimation algorithms
 */
async function runTempoEstimators(audioBuffer: AudioBuffer): Promise<TempoEstimate[]> {
  const essentia = await getEssentia();
  const channelData = audioBuffer.getChannelData(0);
  const signal = essentia.arrayToVector(channelData);
  const estimates: TempoEstimate[] = [];

  // 1. RhythmExtractor2013 (multifeature) - most accurate general-purpose
  try {
    const result = essentia.RhythmExtractor2013(signal, 220, 'multifeature', 40);
    const beats = essentia.vectorToArray(result.ticks);
    estimates.push({
      algorithm: 'multifeature',
      bpm: result.bpm,
      confidence: Math.min(1, result.confidence / 5), // Normalize 0-5+ to 0-1
      beats: Array.from(beats),
    });
    result.ticks.delete();
  } catch (err) {
    console.warn('[TempoEnsemble] multifeature failed:', err);
  }

  // 2. RhythmExtractor2013 (degara) - different onset detection approach
  try {
    const result = essentia.RhythmExtractor2013(signal, 220, 'degara', 40);
    const beats = essentia.vectorToArray(result.ticks);
    estimates.push({
      algorithm: 'degara',
      bpm: result.bpm,
      confidence: Math.min(1, result.confidence / 5),
      beats: Array.from(beats),
    });
    result.ticks.delete();
  } catch (err) {
    console.warn('[TempoEnsemble] degara failed:', err);
  }

  // 3. PercivalBpmEstimator - autocorrelation-based, good for electronic
  try {
    const result = essentia.PercivalBpmEstimator(signal);
    estimates.push({
      algorithm: 'percival',
      bpm: result.bpm,
      confidence: 0.6, // Percival doesn't output confidence, assume medium
    });
  } catch (err) {
    console.warn('[TempoEnsemble] percival failed:', err);
  }

  // 4. LoopBpmEstimator - optimized for loop-based music
  try {
    const result = essentia.LoopBpmEstimator(signal);
    estimates.push({
      algorithm: 'loop',
      bpm: result.bpm,
      confidence: result.confidence || 0.5,
    });
  } catch (err) {
    console.warn('[TempoEnsemble] loop failed:', err);
  }

  signal.delete();
  return estimates;
}

/**
 * Compute weighted consensus from multiple tempo estimates
 */
function computeConsensus(estimates: TempoEstimate[]): {
  consensusBpm: number;
  confidence: number;
  agreement: 'strong' | 'moderate' | 'weak';
} {
  if (estimates.length === 0) {
    return { consensusBpm: 120, confidence: 0, agreement: 'weak' };
  }

  if (estimates.length === 1) {
    return {
      consensusBpm: Math.round(estimates[0].bpm),
      confidence: estimates[0].confidence,
      agreement: 'weak',
    };
  }

  // Normalize all BPMs to 70-140 range for comparison
  const normalized = estimates.map((e) => ({
    ...e,
    normalizedBpm: normalizeToRange(e.bpm),
  }));

  // Group estimates by similarity (within 5% of each other)
  const groups: { bpm: number; members: typeof normalized }[] = [];
  for (const est of normalized) {
    const matchingGroup = groups.find(
      (g) => Math.abs(g.bpm - est.normalizedBpm) / g.bpm < 0.05
    );
    if (matchingGroup) {
      matchingGroup.members.push(est);
      // Update group BPM to weighted average
      const totalWeight = matchingGroup.members.reduce((sum, m) => sum + m.confidence, 0);
      matchingGroup.bpm =
        matchingGroup.members.reduce((sum, m) => sum + m.normalizedBpm * m.confidence, 0) /
        totalWeight;
    } else {
      groups.push({ bpm: est.normalizedBpm, members: [est] });
    }
  }

  // Find the group with most agreement (weighted by confidence)
  let bestGroup = groups[0];
  let bestScore = 0;
  for (const group of groups) {
    const score = group.members.reduce((sum, m) => sum + m.confidence, 0);
    if (score > bestScore) {
      bestScore = score;
      bestGroup = group;
    }
  }

  // Determine agreement level
  const agreementRatio = bestGroup.members.length / estimates.length;
  let agreement: 'strong' | 'moderate' | 'weak';
  if (agreementRatio >= 0.75 && bestGroup.members.length >= 3) {
    agreement = 'strong';
  } else if (agreementRatio >= 0.5 || bestGroup.members.length >= 2) {
    agreement = 'moderate';
  } else {
    agreement = 'weak';
  }

  // Calculate consensus BPM using normalized values
  // This gives us the "true" tempo after correcting for octave errors
  const totalWeight = bestGroup.members.reduce((sum, m) => sum + m.confidence, 0);
  const weightedNormalizedBpm =
    bestGroup.members.reduce((sum, m) => sum + m.normalizedBpm * m.confidence, 0) / totalWeight;

  // The normalized BPM is already in the 70-140 range
  // For most music, we want to report the tempo in the "full" range (80-180)
  // Use the normalized value directly and only double if too low
  let consensusBpm = Math.round(weightedNormalizedBpm);
  
  // Prefer the value in 80-180 range for most music
  // Half-tempo detection is common - prefer full tempo
  if (consensusBpm < 80) consensusBpm *= 2;
  if (consensusBpm > 200) consensusBpm /= 2;

  // Confidence based on agreement and individual confidences
  const avgConfidence = totalWeight / bestGroup.members.length;
  const confidence = Math.min(1, avgConfidence * (0.5 + agreementRatio * 0.5));

  return { consensusBpm, confidence, agreement };
}

/**
 * Detect tempo using ensemble of algorithms
 */
export async function detectTempoEnsemble(audioBuffer: AudioBuffer): Promise<EnsembleResult> {
  const warnings: string[] = [];

  // Run all estimators
  const estimates = await runTempoEstimators(audioBuffer);

  if (estimates.length === 0) {
    warnings.push('All tempo estimators failed');
    return {
      consensusBpm: 120,
      confidence: 0,
      estimates: [],
      agreement: 'weak',
      warnings,
      bestBeats: [],
    };
  }

  // Filter out invalid estimates (BPM of 0 or very low confidence)
  const validEstimates = estimates.filter(
    (e) => e.bpm > 30 && e.bpm < 300 && e.confidence > 0.01
  );

  if (validEstimates.length === 0) {
    warnings.push('No valid tempo estimates');
    return {
      consensusBpm: 120,
      confidence: 0,
      estimates,
      agreement: 'weak',
      warnings,
      bestBeats: [],
    };
  }

  // Check for octave disagreement
  const normalizedBpms = validEstimates.map((e) => normalizeToRange(e.bpm));
  const minNorm = Math.min(...normalizedBpms);
  const maxNorm = Math.max(...normalizedBpms);
  if (maxNorm / minNorm > 1.1) {
    warnings.push('Tempo estimates disagree - verify manually');
  }

  // Compute consensus using only valid estimates
  const { consensusBpm, confidence, agreement } = computeConsensus(validEstimates);

  // Get best beats from most confident algorithm with beats
  const estimatesWithBeats = estimates.filter((e) => e.beats && e.beats.length > 0);
  const bestEstimate =
    estimatesWithBeats.length > 0
      ? estimatesWithBeats.reduce((best, e) => (e.confidence > best.confidence ? e : best))
      : null;

  return {
    consensusBpm,
    confidence,
    estimates,
    agreement,
    warnings,
    bestBeats: bestEstimate?.beats || [],
  };
}
