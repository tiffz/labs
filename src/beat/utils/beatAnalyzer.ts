/**
 * Beat Analyzer using Essentia.js
 * 
 * Uses the industry-standard Essentia library (from MTG/UPF) via its WASM port
 * for accurate BPM detection using the RhythmExtractor2013 algorithm.
 */

type EssentiaConstructor = typeof import('essentia.js/dist/essentia.js-core.es.js').default;
type EssentiaInstance = InstanceType<EssentiaConstructor>;

import { detectTempoEnsemble } from './tempoEnsemble';
import { mergeBeatGrids, snapBeatsToOnsets } from './beatRefinement';
import type { TempoRegion } from './tempoRegions';
import { createDefaultRegion } from './tempoRegions';
import { buildTempoRegionsFromFermatas } from './analysis/tempoRegionsBuilder';
import { detectFermatasFromGaps, detectGapsForResync, detectGapOnsets, type GapWithResync } from './gapFermataDetector';
import { runQuickBpmAccuracyTest, formatBpmAccuracyReport } from './bpmAccuracyTest';
import { analyzeTempoVariation } from './sectionalTempoAnalyzer';
import { detectOnsets } from './analysis/onsets';
import { alignBeatGridToDownbeat } from './downbeatAlignment';
// Legacy detectors - DEPRECATED, kept for API compatibility
// Use detectFermatasFromGaps from './gapFermataDetector' instead
/** @deprecated Use detectFermatasFromGaps from gapFermataDetector instead */
export { detectFermatas, mergeFermataRegions } from './experimental/fermataDetector';
/** @deprecated No longer actively maintained */
export { detectTempoChanges, combineTempoRegions } from './experimental/tempoChangeDetector';

export interface BeatAnalysisResult {
  bpm: number;
  confidence: number; // 0-1 confidence level
  confidenceLevel: 'high' | 'medium' | 'low'; // Human-readable confidence
  beats: number[]; // Beat positions in seconds
  musicStartTime: number; // When music actually begins (in seconds)
  musicEndTime: number; // When music actually ends (may be before track ends)
  offset: number; // Offset from start to first beat
  warnings: string[]; // Warnings about detection quality
  /** Detected tempo regions (fermatas, tempo changes, rubato sections) */
  tempoRegions?: TempoRegion[];
  /** Whether the track has any non-steady tempo regions */
  hasTempoVariance?: boolean;
  /** Detected gaps for re-applying adjustments when BPM changes */
  detectedGaps?: GapWithResync[];
}

// Singleton Essentia instance (initialized lazily)
let essentiaInstance: EssentiaInstance | null = null;
let essentiaInitPromise: Promise<EssentiaInstance> | null = null;
let essentiaConstructor: EssentiaConstructor | null = null;
let essentiaWasmModule: unknown | null = null;

async function loadEssentiaModules(): Promise<{
  Essentia: EssentiaConstructor;
  EssentiaWASM: unknown;
}> {
  if (essentiaConstructor && essentiaWasmModule) {
    return { Essentia: essentiaConstructor, EssentiaWASM: essentiaWasmModule };
  }

  const [{ default: Essentia }, wasmModule] = await Promise.all([
    import('essentia.js/dist/essentia.js-core.es.js'),
    import('essentia.js/dist/essentia-wasm.es.js'),
  ]);

  const EssentiaWASM = (wasmModule as { EssentiaWASM?: unknown; default?: unknown }).EssentiaWASM ??
    (wasmModule as { default?: unknown }).default ??
    wasmModule;

  essentiaConstructor = Essentia;
  essentiaWasmModule = EssentiaWASM;

  return { Essentia, EssentiaWASM };
}

/**
 * Initialize Essentia.js WASM module (cached singleton)
 */
export async function getEssentia(): Promise<EssentiaInstance> {
  if (essentiaInstance) {
    return essentiaInstance;
  }

  if (essentiaInitPromise) {
    return essentiaInitPromise;
  }

  essentiaInitPromise = (async () => {
    try {
      const { Essentia, EssentiaWASM } = await loadEssentiaModules();
      const essentia = new Essentia(EssentiaWASM);
      essentiaInstance = essentia;
      return essentia;
    } catch (error) {
      console.error('Failed to initialize Essentia.js:', error);
      throw error;
    }
  })();

  return essentiaInitPromise;
}

/**
 * Detect BPM and beat positions using Essentia's RhythmExtractor2013
 */
async function detectBpmWithEssentia(audioBuffer: AudioBuffer): Promise<{
  bpm: number;
  confidence: number;
  beats: number[];
} | null> {
  try {
    const essentia = await getEssentia();
    
    // Get mono audio data
    const channelData = audioBuffer.getChannelData(0);
    
    // Convert to Essentia vector format
    const signal = essentia.arrayToVector(channelData);
    
    // Run RhythmExtractor2013 with multifeature method (most accurate)
    // Parameters: signal, maxTempo, method, minTempo
    const result = essentia.RhythmExtractor2013(signal, 220, 'multifeature', 40);
    
    // Extract results
    const bpm = result.bpm;
    const confidence = result.confidence;
    const ticks = essentia.vectorToArray(result.ticks);
    
    // Clean up
    signal.delete();
    result.ticks.delete();
    
    return {
      bpm,
      confidence,
      beats: Array.from(ticks),
    };
  } catch (error) {
    console.warn('Essentia BPM detection failed:', error);
    return null;
  }
}

/**
 * Analyze audio characteristics for additional warnings
 */
function analyzeAudioCharacteristics(audioBuffer: AudioBuffer): {
  energyScore: number;
  warnings: string[];
  isDifficultAudio: boolean;
} {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const warnings: string[] = [];
  let isDifficultAudio = false;

  // Calculate overall energy (RMS)
  let sumSquares = 0;
  for (let i = 0; i < channelData.length; i++) {
    sumSquares += channelData[i] * channelData[i];
  }
  const overallRms = Math.sqrt(sumSquares / channelData.length);

  // Energy scoring
  let energyScore = Math.min(1, overallRms / 0.15);
  if (overallRms < 0.03) {
    warnings.push('Very quiet audio - detection may be less accurate');
    isDifficultAudio = true;
    energyScore = 0.3;
  } else if (overallRms < 0.06) {
    warnings.push('Quiet audio - consider increasing volume');
    isDifficultAudio = true;
    energyScore = 0.5;
  }

  // Analyze dynamic range
  const windowSize = Math.floor(sampleRate * 0.05);
  const numWindows = Math.floor(channelData.length / windowSize);
  const rmsValues: number[] = [];

  for (let i = 0; i < numWindows; i++) {
    let windowSum = 0;
    const start = i * windowSize;
    for (let j = 0; j < windowSize; j++) {
      windowSum += channelData[start + j] * channelData[start + j];
    }
    rmsValues.push(Math.sqrt(windowSum / windowSize));
  }

  const sortedRms = [...rmsValues].sort((a, b) => a - b);
  const lowPercentile = sortedRms[Math.floor(sortedRms.length * 0.1)];
  const highPercentile = sortedRms[Math.floor(sortedRms.length * 0.9)];
  const dynamicRange = highPercentile > 0.001 ? (highPercentile - lowPercentile) / highPercentile : 0;

  if (dynamicRange < 0.2) {
    warnings.push('Low dynamic range - may be ambient or heavily compressed');
    isDifficultAudio = true;
  }

  return { 
    energyScore, 
    warnings,
    isDifficultAudio
  };
}

/**
 * Detect when the music actually starts (skip silence)
 */
function detectMusicStart(audioBuffer: AudioBuffer, threshold: number = 0.01): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.05);

  for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j++) {
      sumSquares += channelData[i + j] * channelData[i + j];
    }
    const rms = Math.sqrt(sumSquares / windowSize);

    if (rms > threshold) {
      return i / sampleRate;
    }
  }

  return 0;
}

/**
 * Detect when the music actually ends (find trailing silence)
 * Scans from the end of the audio backward to find where music stops.
 * 
 * @param audioBuffer - The audio to analyze
 * @param threshold - RMS threshold for "silence" (default 0.01)
 * @param minSilenceDuration - Minimum silence duration to count as "end of music" (default 2 seconds)
 * @returns The time when music ends (may be less than track duration)
 */
function detectMusicEnd(
  audioBuffer: AudioBuffer,
  threshold: number = 0.01,
  minSilenceDuration: number = 2.0
): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
  const duration = audioBuffer.duration;
  
  // Scan from end backwards to find where music stops
  let silenceStart = duration;
  let consecutiveSilentWindows = 0;
  const requiredSilentWindows = Math.ceil(minSilenceDuration / 0.05);
  
  for (let i = channelData.length - windowSize; i >= 0; i -= windowSize) {
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j++) {
      sumSquares += channelData[i + j] * channelData[i + j];
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    
    if (rms <= threshold) {
      consecutiveSilentWindows++;
      silenceStart = i / sampleRate;
    } else {
      // Found audio - check if we had enough silence after this
      if (consecutiveSilentWindows >= requiredSilentWindows) {
        // Music ends here (at the start of the trailing silence)
        return silenceStart;
      }
      // Reset - not enough trailing silence yet
      consecutiveSilentWindows = 0;
      silenceStart = (i + windowSize) / sampleRate;
    }
  }
  
  // If we got here, the whole track might be silent (unlikely) or no trailing silence
  return duration;
}

/**
 * Generate beat positions from BPM and duration (fallback)
 */
function generateBeats(
  bpm: number,
  duration: number,
  startOffset: number = 0
): number[] {
  const beatInterval = 60 / bpm;
  const beats: number[] = [];

  let beatTime = startOffset;
  while (beatTime < duration) {
    beats.push(beatTime);
    beatTime += beatInterval;
  }

  return beats;
}

/**
 * Calculate confidence level from Essentia's confidence score
 */
function calculateConfidenceLevel(
  essentiaConfidence: number,
  audioCharacteristics: { energyScore: number; isDifficultAudio: boolean }
): { confidence: number; level: 'high' | 'medium' | 'low' } {
  // Essentia confidence is typically 0-5+ range, normalize to 0-1
  // Higher values indicate more consistent beat detection
  const normalizedConfidence = Math.min(1, essentiaConfidence / 5);
  
  // Factor in audio quality
  const audioQualityFactor = audioCharacteristics.energyScore;
  let finalConfidence = normalizedConfidence * 0.7 + audioQualityFactor * 0.3;
  
  // Cap for difficult audio
  if (audioCharacteristics.isDifficultAudio) {
    finalConfidence = Math.min(finalConfidence, 0.6);
  }

  let level: 'high' | 'medium' | 'low';
  if (finalConfidence >= 0.7) {
    level = 'high';
  } else if (finalConfidence >= 0.4) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return { confidence: finalConfidence, level };
}

/** Progress callback type for analysis */
export type AnalysisProgressCallback = (
  stage: string,
  progress: number // 0-100
) => void;

/**
 * Yield to the main thread to prevent UI freezing
 */
function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Analyze audio buffer for BPM and beat information
 * Uses ensemble of Essentia.js algorithms for improved accuracy
 * 
 * @param audioBuffer The audio buffer to analyze
 * @param onProgress Optional callback for progress updates
 */
export async function analyzeBeat(
  audioBuffer: AudioBuffer,
  onProgress?: AnalysisProgressCallback
): Promise<BeatAnalysisResult> {
  const reportProgress = (stage: string, progress: number) => {
    if (onProgress) {
      onProgress(stage, progress);
    }
  };

  reportProgress('Analyzing audio characteristics', 5);
  await yieldToMainThread();
  
  // Analyze audio characteristics first
  const audioCharacteristics = analyzeAudioCharacteristics(audioBuffer);
  const warnings = [...audioCharacteristics.warnings];

  reportProgress('Detecting music boundaries', 10);
  await yieldToMainThread();
  
  // Detect when music starts and ends
  const musicStartTime = detectMusicStart(audioBuffer);
  const musicEndTime = detectMusicEnd(audioBuffer);
  
  if (musicStartTime > 1) {
    warnings.push(`Music starts ${musicStartTime.toFixed(1)}s into the track`);
  }
  if (musicEndTime < audioBuffer.duration - 2) {
    warnings.push(`Music ends at ${musicEndTime.toFixed(1)}s (track is ${audioBuffer.duration.toFixed(1)}s)`);
  }

  let finalBpm: number;
  let confidence: number;
  let confidenceLevel: 'high' | 'medium' | 'low';
  let beats: number[];
  let offset: number;

  reportProgress('Detecting tempo', 20);
  await yieldToMainThread();
  
  // Use ensemble detection for better accuracy
  const ensembleResult = await detectTempoEnsemble(audioBuffer);
  warnings.push(...ensembleResult.warnings);
  
  reportProgress('Processing beat grid', 50);

  if (ensembleResult.consensusBpm > 0 && ensembleResult.confidence > 0) {
    finalBpm = ensembleResult.consensusBpm;

    // Merge beat grids from multiple algorithms
    beats = mergeBeatGrids(ensembleResult.estimates, finalBpm, audioBuffer.duration);

    // Snap to onsets if agreement is moderate or strong
    if (ensembleResult.agreement !== 'weak' && beats.length > 0) {
      beats = await snapBeatsToOnsets(beats, audioBuffer);
    }

    offset = beats.length > 0 ? beats[0] : 0;

    // Log beat grid info for debugging
    console.log(`[BeatAnalyzer] First 5 beats: ${beats.slice(0, 5).map(b => b.toFixed(2)).join(', ')}`);
    console.log(`[BeatAnalyzer] Beat interval: ${(60/finalBpm).toFixed(3)}s, Offset: ${offset.toFixed(3)}s`);

    // Calculate confidence level
    confidence = ensembleResult.confidence;
    if (audioCharacteristics.isDifficultAudio) {
      confidence = Math.min(confidence, 0.6);
    }

    if (confidence >= 0.7 && ensembleResult.agreement === 'strong') {
      confidenceLevel = 'high';
    } else if (confidence >= 0.4 || ensembleResult.agreement === 'moderate') {
      confidenceLevel = 'medium';
    } else {
      confidenceLevel = 'low';
    }

    // Add warnings based on agreement
    if (ensembleResult.agreement === 'weak') {
      warnings.push('Tempo algorithms disagree - verify manually');
    }
    if (confidenceLevel === 'low') {
      warnings.push('Low detection confidence - manually verify tempo');
    }

  } else {
    // Fallback to single algorithm if ensemble fails
    const essentiaResult = await detectBpmWithEssentia(audioBuffer);

    if (essentiaResult) {
      finalBpm = Math.round(essentiaResult.bpm);
      beats = essentiaResult.beats;
      offset = beats.length > 0 ? beats[0] : 0;

      const confidenceResult = calculateConfidenceLevel(
        essentiaResult.confidence,
        audioCharacteristics
      );
      confidence = confidenceResult.confidence;
      confidenceLevel = confidenceResult.level;

      if (confidenceLevel === 'low') {
        warnings.push('Low detection confidence - manually verify tempo');
      }
    } else {
      // Final fallback
      finalBpm = 120;
      offset = 0;
      beats = generateBeats(finalBpm, audioBuffer.duration, offset);
      confidence = 0.1;
      confidenceLevel = 'low';
      warnings.push('Detection failed - using default 120 BPM');
    }
  }

  // Align beat grid to the first actual downbeat
  // This handles songs with pickup notes (like "La Isla Bonita")
  reportProgress('Aligning beat grid', 52);
  await yieldToMainThread();
  
  let alignedMusicStartTime = musicStartTime;
  try {
    const alignment = alignBeatGridToDownbeat(
      audioBuffer,
      finalBpm,
      musicStartTime,
      4 // beatsPerMeasure (assume 4/4 for now)
    );
    
    if (alignment.confidence >= 0.4) {
      alignedMusicStartTime = alignment.alignedStartTime;
      
      if (alignment.hasPickup) {
        warnings.push('Detected pickup notes - beat 1 adjusted');
      }
      
      // If alignment changed significantly, regenerate beats from new start
      if (Math.abs(alignedMusicStartTime - musicStartTime) > 0.1) {
        console.log(`[BeatAnalyzer] Adjusted music start from ${musicStartTime.toFixed(3)}s to ${alignedMusicStartTime.toFixed(3)}s for downbeat alignment`);
        
        // Regenerate beat grid from aligned start
        const beatInterval = 60 / finalBpm;
        beats = [];
        let beatTime = alignedMusicStartTime;
        while (beatTime < audioBuffer.duration) {
          beats.push(beatTime);
          beatTime += beatInterval;
        }
        offset = alignedMusicStartTime;
      }
    }
  } catch (err) {
    console.warn('[BeatAnalyzer] Downbeat alignment failed:', err);
  }

  // Analyze tempo variation across sections (diagnostic tool)
  // This helps identify if the song has variable tempo
  if (typeof window !== 'undefined' && import.meta.env?.DEV) {
    try {
      const onsets = detectOnsets(audioBuffer, { preset: 'analysis' });
      if (onsets.length > 20) {
        const tempoReport = analyzeTempoVariation(onsets, audioBuffer.duration, finalBpm);
        
        console.log('\n' + tempoReport.detailedAnalysis);
        console.log(`\n${tempoReport.recommendation}\n`);
        
        if (tempoReport.hasVariableTempo) {
          warnings.push(`Tempo varies ±${tempoReport.variationPercent.toFixed(1)}% (${tempoReport.tempoRange.min}-${tempoReport.tempoRange.max} BPM)`);
        }
      }
    } catch (err) {
      console.warn('[BeatAnalyzer] Onset detection failed:', err);
    }
  }

  // Detect gaps and resync beat grid to stay aligned after pauses/fermatas
  reportProgress('Resyncing beat grid', 55);
  await yieldToMainThread();
  
  let detectedGaps: GapWithResync[] = [];
  let gapOnsets: number[] | undefined;
  try {
    gapOnsets = detectGapOnsets(audioBuffer, finalBpm);
    let rawGaps = await detectGapsForResync(audioBuffer, finalBpm, 1.5, gapOnsets);
    
    // Filter out gaps that represent the end of music, not fermatas
    // A gap is "end of music" if:
    // 1. The gap start is after music ends, OR
    // 2. The gap extends past the music end (meaning the music ends during this gap)
    if (musicEndTime < audioBuffer.duration - 1) {
      const gapsBeforeEnd = rawGaps.filter(gap => {
        // Gap starts after music ends - definitely not a fermata
        if (gap.gapStart >= musicEndTime - 1) return false;
        // Gap extends past music end - this is the song ending, not a fermata
        if (gap.gapEnd >= musicEndTime - 0.5) return false;
        return true;
      });
      const filteredCount = rawGaps.length - gapsBeforeEnd.length;
      if (filteredCount > 0) {
        console.log(`[BeatAnalyzer] Filtered ${filteredCount} gap(s) at end of music (music ends at ${musicEndTime.toFixed(1)}s)`);
      }
      rawGaps = gapsBeforeEnd;
    }
    
    detectedGaps = rawGaps;
    if (detectedGaps.length > 0) {
      beats = adjustBeatsForGaps(beats, detectedGaps);
      warnings.push(`Resynced beat grid after ${detectedGaps.length} gap(s)`);
    }
  } catch (err) {
    console.warn('[analyzeBeat] Gap resync failed:', err);
  }

  reportProgress('Detecting fermatas', 60);
  await yieldToMainThread();
  
  // Detect fermatas using gap-based approach (shared onset detection)
  let tempoRegions: TempoRegion[] = [];
  let hasTempoVariance = false;

  try {
    // Pass musicEndTime to fermata detection so it can filter out end-of-track silence
    const fermataResult = await detectFermatasFromGaps(
      audioBuffer, 
      finalBpm, 
      { musicEndTime }, 
      gapOnsets
    );
    warnings.push(...fermataResult.warnings);

    reportProgress('Building tempo regions', 85);
    await yieldToMainThread();
    
    // Use musicEndTime as the effective end of the musical content
    const tempoRegionsResult = buildTempoRegionsFromFermatas(
      fermataResult.fermatas,
      finalBpm,
      musicEndTime
    );
    tempoRegions = tempoRegionsResult.regions;
    hasTempoVariance = tempoRegionsResult.hasTempoVariance;
  } catch (err) {
    console.warn('[analyzeBeat] Fermata detection failed:', err);
    // Fall back to single steady region
    tempoRegions = [createDefaultRegion(finalBpm, musicEndTime)];
  }

  // Warn about songs that likely have tempo changes (musical theater, classical, etc.)
  // Indicators: many gaps, long duration with many fermatas, weak algorithm agreement
  const fermataCount = tempoRegions.filter(r => r.type === 'fermata').length;
  const songDuration = audioBuffer.duration;
  const fermataDensity = fermataCount / (songDuration / 60); // fermatas per minute
  
  const likelyHasTempoChanges = 
    fermataCount >= 6 || // Many fermatas suggest complex structure
    (fermataCount >= 4 && songDuration > 180) || // Long song with several fermatas
    (fermataDensity > 1.5 && songDuration > 120); // High fermata density
  
  if (likelyHasTempoChanges) {
    warnings.push('Song may have tempo changes - metronome may not align with all sections');
    confidenceLevel = 'low';
    hasTempoVariance = true;
  }
  
  reportProgress('Complete', 100);

  // Run BPM accuracy test in background (non-blocking) - only in development
  // This helps verify if our detected BPM is optimal
  const isDev = typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV;
  if (isDev) {
    const fermataRanges: Array<[number, number]> = tempoRegions
      .filter(r => r.type === 'fermata')
      .map(r => [r.startTime, r.endTime] as [number, number]);
    
    // Use a lighter version that skips redundant detection
    runQuickBpmAccuracyTest(audioBuffer, finalBpm, confidence, fermataRanges).then(result => {
      console.log('\n' + formatBpmAccuracyReport(result));
    }).catch(err => {
      console.warn('[BpmAccuracy] Test failed:', err);
    });
  }

  return {
    bpm: finalBpm,
    confidence,
    confidenceLevel,
    beats,
    musicStartTime: alignedMusicStartTime, // Use aligned time for proper beat 1 placement
    musicEndTime,
    offset,
    warnings,
    tempoRegions,
    hasTempoVariance,
    detectedGaps,
  };
}


/**
 * Adjust beat positions to account for gaps (fermatas/pauses)
 * 
 * When there's a gap in the music (like a fermata), the beat grid continues
 * mathematically but the music pauses. This causes all subsequent beats to be
 * out of sync. This function shifts beats after each gap to realign with
 * where the music actually resumes.
 */
export function adjustBeatsForGaps(
  beats: number[],
  gaps: GapWithResync[]
): number[] {
  if (gaps.length === 0 || beats.length === 0) {
    console.log('[BeatAdjust] No gaps or beats to adjust');
    return beats;
  }

  console.log(`[BeatAdjust] Adjusting ${beats.length} beats for ${gaps.length} gap(s)`);

  const adjusted = [...beats];

  // Sort gaps by start time
  const sortedGaps = [...gaps].sort((a, b) => a.gapStart - b.gapStart);

  for (const gap of sortedGaps) {
    // Find the first beat that falls after the gap start
    const firstBeatAfterGapIdx = adjusted.findIndex(b => b > gap.gapStart);
    if (firstBeatAfterGapIdx === -1) {
      console.log(`[BeatAdjust] No beats after gap at ${gap.gapStart.toFixed(2)}s`);
      continue;
    }

    // Where the beat grid thinks the next beat should be
    const expectedBeatTime = adjusted[firstBeatAfterGapIdx];

    // Where music actually resumes (the resync point)
    const actualResyncTime = gap.gapEnd;

    // Calculate shift needed
    const shift = actualResyncTime - expectedBeatTime;

    console.log(`[BeatAdjust] Gap at ${gap.gapStart.toFixed(2)}s: expected beat at ${expectedBeatTime.toFixed(2)}s, music resumes at ${actualResyncTime.toFixed(2)}s, shift=${shift.toFixed(3)}s`);

    // Only shift if the gap is significant (> 100ms)
    if (Math.abs(shift) < 0.1) {
      console.log(`[BeatAdjust] Shift too small (${shift.toFixed(3)}s), skipping`);
      continue;
    }

    // Shift all beats from this point onward
    console.log(`[BeatAdjust] Shifting ${adjusted.length - firstBeatAfterGapIdx} beats by ${shift.toFixed(3)}s`);
    for (let i = firstBeatAfterGapIdx; i < adjusted.length; i++) {
      adjusted[i] += shift;
    }
  }

  return adjusted;
}

/**
 * Update beat positions when BPM is manually changed
 */
export function regenerateBeats(
  bpm: number,
  duration: number,
  offset: number = 0
): number[] {
  return generateBeats(bpm, duration, offset);
}

// Onset detection is shared via utils/analysis/onsets.ts
