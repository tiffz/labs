/**
 * Core Tempo Detection Algorithm (No Browser Dependencies)
 * 
 * This module provides tempo detection using only basic signal processing.
 * It can run in both Node.js and browser environments.
 * 
 * Unlike tempoEnsemble.ts which uses Essentia.js (WASM), this module uses
 * pure JavaScript algorithms:
 * - Energy-based onset detection
 * - IOI (Inter-Onset Interval) histogram analysis
 * - Octave selection based on onset density
 * - Sectional tempo analysis
 */

import type { UniversalAudioBuffer } from './audioBuffer';
import { detectOnsets as detectOnsetsShared } from './analysis/onsets';
import { analyzeSectionTempoWindows } from './analysis/sectionalTempo';

/**
 * Result of tempo analysis
 */
export interface TempoAnalysisResult {
  /** Detected BPM */
  bpm: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Detected onset times in seconds */
  onsets: number[];
  /** Estimated music start time */
  musicStartTime: number;
  /** Warnings/notes about the analysis */
  warnings: string[];
}

/**
 * Result of sectional tempo analysis
 */
export interface SectionalAnalysis {
  globalBpm: number;
  sections: Array<{
    startTime: number;
    endTime: number;
    estimatedBpm: number;
    ioiStdDev: number;
  }>;
  tempoRange: { min: number; max: number };
  variationPercent: number;
  trend: 'stable' | 'speeds_up' | 'slows_down';
  trendAmount: number;
}

/**
 * Energy-based onset detection
 * 
 * Detects sudden increases in audio energy that typically correspond to
 * note attacks, drum hits, etc.
 */
export function detectOnsets(
  audioBuffer: UniversalAudioBuffer,
  options: {
    frameSize?: number;
    hopSize?: number;
    threshold?: number;
    minOnsetInterval?: number;
  } = {}
): number[] {
  return detectOnsetsShared(audioBuffer, {
    preset: 'core',
    ...options,
  });
}

/**
 * Estimate tempo from onset times using autocorrelation
 * 
 * Autocorrelation finds periodicities in the onset pattern,
 * which is more robust than simple IOI histograms.
 */
export function estimateTempo(
  onsets: number[],
  duration: number,
  options: {
    minBpm?: number;
    maxBpm?: number;
  } = {}
): { bpm: number; confidence: number } {
  const { minBpm = 50, maxBpm = 180 } = options;
  
  if (onsets.length < 20) {
    return { bpm: 120, confidence: 0 };
  }
  
  // Create an onset strength signal (impulse at each onset)
  const resolution = 0.01; // 10ms resolution
  const signalLength = Math.ceil(duration / resolution);
  const onsetSignal = new Float32Array(signalLength);
  
  for (const onset of onsets) {
    const idx = Math.floor(onset / resolution);
    if (idx >= 0 && idx < signalLength) {
      onsetSignal[idx] = 1;
    }
  }
  
  // Compute autocorrelation for lag values corresponding to BPM range
  // BPM = 60 / (lag * resolution)
  // lag = 60 / (BPM * resolution)
  const minLag = Math.floor(60 / (maxBpm * resolution)); // Fast tempo = short lag
  const maxLag = Math.ceil(60 / (minBpm * resolution));  // Slow tempo = long lag
  
  const correlations: Array<{ lag: number; correlation: number }> = [];
  
  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < signalLength - lag; i++) {
      correlation += onsetSignal[i] * onsetSignal[i + lag];
      count++;
    }
    
    if (count > 0) {
      correlation /= count;
      correlations.push({ lag, correlation });
    }
  }
  
  // Find peaks in autocorrelation
  const peaks: Array<{ lag: number; correlation: number }> = [];
  
  for (let i = 1; i < correlations.length - 1; i++) {
    const prev = correlations[i - 1].correlation;
    const curr = correlations[i].correlation;
    const next = correlations[i + 1].correlation;
    
    if (curr > prev && curr > next && curr > 0.001) {
      peaks.push(correlations[i]);
    }
  }
  
  // Sort by correlation strength
  peaks.sort((a, b) => b.correlation - a.correlation);
  
  if (peaks.length === 0) {
    return { bpm: 120, confidence: 0 };
  }
  
  // Find best BPM considering octave relationships
  let bestBpm = 60 / (peaks[0].lag * resolution);
  let bestScore = peaks[0].correlation;
  
  // Check top peaks and prefer tempos in the 60-90 BPM range for ballads
  // or 90-130 for more upbeat songs
  for (const peak of peaks.slice(0, 5)) {
    let bpm = 60 / (peak.lag * resolution);
    
    // Normalize to 60-120 range
    while (bpm > 120) bpm /= 2;
    while (bpm < 60) bpm *= 2;
    
    // Bonus for common tempo ranges
    let rangeBonus = 0;
    if (bpm >= 60 && bpm <= 90) rangeBonus = 0.1; // Ballad range
    else if (bpm >= 90 && bpm <= 130) rangeBonus = 0.05; // Pop range
    
    const score = peak.correlation + rangeBonus;
    
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }
  
  // Final octave check
  const correctedBpm = selectCorrectOctave(bestBpm, onsets, duration);
  
  return {
    bpm: Math.round(correctedBpm * 100) / 100,
    confidence: Math.min(bestScore * 10, 1), // Scale confidence
  };
}

/**
 * Select the correct octave based on onset density
 * 
 * Uses a simple heuristic: normalize to 60-120 BPM range which covers
 * most popular music tempos.
 */
function selectCorrectOctave(
  candidateBpm: number,
  onsets: number[],
  duration: number
): number {
  // Simple approach: normalize to 60-120 BPM range
  // This covers most music: ballads (60-80), pop (100-120), etc.
  let bpm = candidateBpm;
  
  while (bpm > 120) bpm /= 2;
  while (bpm < 60) bpm *= 2;
  
  // Use onset density as a sanity check
  const onsetDensity = onsets.length / duration;
  const beatsPerSecond = bpm / 60;
  const expectedOnsetsPerBeat = onsetDensity / beatsPerSecond;
  
  // If we're getting way too many onsets per beat (>6), the tempo is probably too slow
  // If we're getting too few (<1), the tempo is probably too fast
  if (expectedOnsetsPerBeat > 6 && bpm < 120) {
    bpm *= 2;
  } else if (expectedOnsetsPerBeat < 1 && bpm > 60) {
    bpm /= 2;
  }
  
  return bpm;
}

/**
 * Analyze tempo variations across different sections of the song
 */
export function analyzeSections(
  onsets: number[],
  duration: number,
  globalBpm: number,
  sectionDuration: number = 15
): SectionalAnalysis {
  const windows = analyzeSectionTempoWindows(onsets, duration, globalBpm, sectionDuration);
  const sections: SectionalAnalysis['sections'] = windows.map(window => ({
    startTime: window.startTime,
    endTime: window.endTime,
    estimatedBpm: window.estimatedBpm,
    ioiStdDev: window.ioiStdDev,
  }));
  
  if (sections.length === 0) {
    return {
      globalBpm,
      sections: [],
      tempoRange: { min: globalBpm, max: globalBpm },
      variationPercent: 0,
      trend: 'stable',
      trendAmount: 0,
    };
  }
  
  // Calculate statistics
  const bpms = sections.map(s => s.estimatedBpm);
  
  // Use interquartile range to filter outliers
  const sortedBpms = [...bpms].sort((a, b) => a - b);
  const q1 = sortedBpms[Math.floor(sortedBpms.length * 0.25)];
  const q3 = sortedBpms[Math.floor(sortedBpms.length * 0.75)];
  const iqr = q3 - q1;
  const filteredBpms = bpms.filter(b => b >= q1 - iqr * 1.5 && b <= q3 + iqr * 1.5);
  
  const minBpm = Math.min(...filteredBpms);
  const maxBpm = Math.max(...filteredBpms);
  const avgBpm = filteredBpms.reduce((a, b) => a + b, 0) / filteredBpms.length;
  const variationPercent = ((maxBpm - minBpm) / avgBpm) * 100;
  
  // Analyze trend
  let trend: 'stable' | 'speeds_up' | 'slows_down' = 'stable';
  let trendAmount = 0;
  
  if (sections.length >= 4) {
    const firstHalf = sections.slice(0, Math.floor(sections.length / 2));
    const secondHalf = sections.slice(Math.floor(sections.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b.estimatedBpm, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.estimatedBpm, 0) / secondHalf.length;
    
    trendAmount = secondAvg - firstAvg;
    if (trendAmount > 0.5) {
      trend = 'speeds_up';
    } else if (trendAmount < -0.5) {
      trend = 'slows_down';
    }
  }
  
  return {
    globalBpm,
    sections,
    tempoRange: { min: Math.round(minBpm * 100) / 100, max: Math.round(maxBpm * 100) / 100 },
    variationPercent: Math.round(variationPercent * 100) / 100,
    trend,
    trendAmount: Math.round(Math.abs(trendAmount) * 100) / 100,
  };
}

/**
 * Detect the music start time (when audio becomes significant)
 */
export function detectMusicStart(audioBuffer: UniversalAudioBuffer): number {
  const samples = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Calculate RMS energy in 100ms windows
  const windowSize = Math.floor(sampleRate * 0.1);
  const hopSize = Math.floor(windowSize / 4);
  
  const energies: number[] = [];
  for (let i = 0; i < samples.length - windowSize; i += hopSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += samples[i + j] * samples[i + j];
    }
    energies.push(Math.sqrt(sum / windowSize));
  }
  
  // Find the max energy
  const maxEnergy = Math.max(...energies, 0.0001);
  
  // Music starts when energy exceeds 5% of max
  const threshold = maxEnergy * 0.05;
  
  for (let i = 0; i < energies.length; i++) {
    if (energies[i] > threshold) {
      return (i * hopSize) / sampleRate;
    }
  }
  
  return 0;
}

/**
 * Complete tempo analysis
 */
export function analyzeTempoComplete(
  audioBuffer: UniversalAudioBuffer
): TempoAnalysisResult & { sectionalAnalysis: SectionalAnalysis } {
  const warnings: string[] = [];
  
  // Detect onsets
  const onsets = detectOnsets(audioBuffer);
  
  if (onsets.length < 20) {
    warnings.push('Few onsets detected - tempo may be unreliable');
  }
  
  // Estimate global tempo
  const { bpm, confidence } = estimateTempo(onsets, audioBuffer.duration);
  
  // Analyze sections
  const sectionalAnalysis = analyzeSections(onsets, audioBuffer.duration, bpm);
  
  // Add warnings based on sectional analysis
  if (sectionalAnalysis.variationPercent > 5) {
    warnings.push(`High tempo variation (±${sectionalAnalysis.variationPercent.toFixed(1)}%) - song may have tempo changes`);
  }
  
  if (sectionalAnalysis.trend !== 'stable') {
    const direction = sectionalAnalysis.trend === 'speeds_up' ? 'speeds up' : 'slows down';
    warnings.push(`Song ${direction} by ~${sectionalAnalysis.trendAmount} BPM`);
  }
  
  // Detect music start
  const musicStartTime = detectMusicStart(audioBuffer);
  
  return {
    bpm,
    confidence,
    onsets,
    musicStartTime,
    warnings,
    sectionalAnalysis,
  };
}
