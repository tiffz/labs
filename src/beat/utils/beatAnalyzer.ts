/**
 * Beat Analyzer using Essentia.js
 * 
 * Uses the industry-standard Essentia library (from MTG/UPF) via its WASM port
 * for accurate BPM detection using the RhythmExtractor2013 algorithm.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - essentia.js module imports
import Essentia from 'essentia.js/dist/essentia.js-core.es.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - WASM module import
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';

export interface BeatAnalysisResult {
  bpm: number;
  confidence: number; // 0-1 confidence level
  confidenceLevel: 'high' | 'medium' | 'low'; // Human-readable confidence
  beats: number[]; // Beat positions in seconds
  musicStartTime: number; // When music actually begins (in seconds)
  offset: number; // Offset from start to first beat
  warnings: string[]; // Warnings about detection quality
}

// Singleton Essentia instance (initialized lazily)
let essentiaInstance: typeof Essentia | null = null;
let essentiaInitPromise: Promise<typeof Essentia> | null = null;

/**
 * Initialize Essentia.js WASM module (cached singleton)
 */
export async function getEssentia(): Promise<typeof Essentia> {
  if (essentiaInstance) {
    return essentiaInstance;
  }

  if (essentiaInitPromise) {
    return essentiaInitPromise;
  }

  essentiaInitPromise = (async () => {
    try {
      const essentia = new Essentia(EssentiaWASM);
      essentiaInstance = essentia;
      console.log('Essentia.js initialized successfully');
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

/**
 * Analyze audio buffer for BPM and beat information
 * Uses Essentia.js RhythmExtractor2013 for accurate detection
 */
export async function analyzeBeat(audioBuffer: AudioBuffer): Promise<BeatAnalysisResult> {
  // Analyze audio characteristics first
  const audioCharacteristics = analyzeAudioCharacteristics(audioBuffer);
  const warnings = [...audioCharacteristics.warnings];

  // Detect when music starts
  const musicStartTime = detectMusicStart(audioBuffer);
  if (musicStartTime > 1) {
    warnings.push(`Music starts ${musicStartTime.toFixed(1)}s into the track`);
  }

  // Run Essentia detection
  const essentiaResult = await detectBpmWithEssentia(audioBuffer);

  let finalBpm: number;
  let confidence: number;
  let confidenceLevel: 'high' | 'medium' | 'low';
  let beats: number[];
  let offset: number;

  if (essentiaResult) {
    finalBpm = Math.round(essentiaResult.bpm);
    beats = essentiaResult.beats;
    offset = beats.length > 0 ? beats[0] : 0;

    // Calculate confidence
    const confidenceResult = calculateConfidenceLevel(
      essentiaResult.confidence,
      audioCharacteristics
    );
    confidence = confidenceResult.confidence;
    confidenceLevel = confidenceResult.level;

    // Add warning for low confidence
    if (confidenceLevel === 'low') {
      warnings.push('Low detection confidence - manually verify tempo');
    }
  } else {
    // Fallback if Essentia fails
    finalBpm = 120;
    offset = 0;
    beats = generateBeats(finalBpm, audioBuffer.duration, offset);
    confidence = 0.1;
    confidenceLevel = 'low';
    warnings.push('Detection failed - using default 120 BPM');
  }

  return {
    bpm: finalBpm,
    confidence,
    confidenceLevel,
    beats,
    musicStartTime,
    offset,
    warnings,
  };
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
