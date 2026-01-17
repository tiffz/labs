/**
 * Tempo Detector Implementations
 * 
 * Provides implementations of different tempo detection algorithms
 * wrapped in a common interface for easy comparison.
 */

import type { MockAudioBuffer } from './syntheticAudioGenerator';
import type { TempoDetector, TempoDetectionResult } from './tempoDetectorInterface';
import { registerTempoDetector } from './tempoDetectorInterface';
import { detectTempoEnsemble } from './tempoEnsemble';
import { 
  detectOnsets, 
  estimateTempo, 
  detectMusicStart 
} from './tempoDetectorCore';
import type { UniversalAudioBuffer } from './audioBuffer';

/**
 * Cast MockAudioBuffer to AudioBuffer for browser APIs
 */
function toAudioBuffer(mock: MockAudioBuffer): AudioBuffer {
  return mock as unknown as AudioBuffer;
}

/**
 * Cast MockAudioBuffer to UniversalAudioBuffer for Node.js APIs
 */
function toUniversalAudioBuffer(mock: MockAudioBuffer): UniversalAudioBuffer {
  return mock as UniversalAudioBuffer;
}

// ============================================================
// Algorithm 1: Essentia.js Ensemble (Browser-based)
// ============================================================

const essentiaEnsembleDetector: TempoDetector = {
  name: 'Essentia.js Ensemble',
  description: 'Uses multiple Essentia.js algorithms (RhythmExtractor, PercivalBpm, LoopBpm) with consensus voting and intelligent octave selection.',
  
  async detect(audioBuffer: MockAudioBuffer | AudioBuffer): Promise<TempoDetectionResult> {
    // Cast to AudioBuffer - works because we only use getChannelData, sampleRate, duration
    const buffer = toAudioBuffer(audioBuffer as MockAudioBuffer);
    
    const result = await detectTempoEnsemble(buffer);
    
    return {
      bpm: result.consensusBpm,
      confidence: result.confidence,
      beats: result.bestBeats,
      warnings: result.warnings,
    };
  },
};

// ============================================================
// Algorithm 2: Autocorrelation (Pure JavaScript, Node.js compatible)
// ============================================================

const autocorrelationDetector: TempoDetector = {
  name: 'Autocorrelation',
  description: 'Pure JavaScript implementation using onset detection and autocorrelation. Works in both browser and Node.js.',
  
  async detect(audioBuffer: MockAudioBuffer | AudioBuffer): Promise<TempoDetectionResult> {
    const buffer = toUniversalAudioBuffer(audioBuffer as MockAudioBuffer);
    
    // Detect onsets
    const onsets = detectOnsets(buffer);
    
    // Estimate tempo using autocorrelation
    const { bpm, confidence } = estimateTempo(onsets, buffer.duration);
    
    // Detect music start
    const musicStart = detectMusicStart(buffer);
    
    const warnings: string[] = [];
    if (onsets.length < 30) {
      warnings.push('Few onsets detected - tempo may be unreliable');
    }
    if (musicStart > 1) {
      warnings.push(`Music starts at ${musicStart.toFixed(1)}s`);
    }
    
    return {
      bpm,
      confidence,
      warnings,
    };
  },
};

// ============================================================
// Algorithm 3: IOI Histogram (Simple, fast)
// ============================================================

const ioiHistogramDetector: TempoDetector = {
  name: 'IOI Histogram',
  description: 'Simple inter-onset interval histogram analysis. Fast but less accurate.',
  
  async detect(audioBuffer: MockAudioBuffer | AudioBuffer): Promise<TempoDetectionResult> {
    const buffer = toUniversalAudioBuffer(audioBuffer as MockAudioBuffer);
    
    // Detect onsets
    const onsets = detectOnsets(buffer);
    
    if (onsets.length < 20) {
      return { bpm: 120, confidence: 0, warnings: ['Too few onsets'] };
    }
    
    // Calculate inter-onset intervals
    const iois: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      const ioi = onsets[i] - onsets[i - 1];
      if (ioi >= 0.15 && ioi <= 2.0) {
        iois.push(ioi);
      }
    }
    
    if (iois.length < 10) {
      return { bpm: 120, confidence: 0, warnings: ['Too few intervals'] };
    }
    
    // Build histogram
    const binSize = 0.01;
    const histogram = new Map<number, number>();
    
    for (const ioi of iois) {
      const bin = Math.round(ioi / binSize) * binSize;
      histogram.set(bin, (histogram.get(bin) || 0) + 1);
    }
    
    // Find peak
    let maxCount = 0;
    let dominantIoi = 0.5;
    
    histogram.forEach((count, ioi) => {
      // Smooth by counting neighbors
      let totalCount = count;
      for (let offset = -2; offset <= 2; offset++) {
        if (offset !== 0) {
          totalCount += histogram.get(ioi + offset * binSize) || 0;
        }
      }
      if (totalCount > maxCount) {
        maxCount = totalCount;
        dominantIoi = ioi;
      }
    });
    
    // Convert to BPM, normalize to 60-120
    let bpm = 60 / dominantIoi;
    while (bpm > 120) bpm /= 2;
    while (bpm < 60) bpm *= 2;
    
    const confidence = Math.min(maxCount / iois.length, 1);
    
    return {
      bpm: Math.round(bpm * 100) / 100,
      confidence,
    };
  },
};

// ============================================================
// Register all detectors
// ============================================================

registerTempoDetector('essentia', essentiaEnsembleDetector);
registerTempoDetector('autocorrelation', autocorrelationDetector);
registerTempoDetector('ioi-histogram', ioiHistogramDetector);

// Export for direct use
export {
  essentiaEnsembleDetector,
  autocorrelationDetector,
  ioiHistogramDetector,
};
