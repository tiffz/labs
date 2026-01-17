/**
 * Tempo Detector Interface
 * 
 * Defines a common interface for tempo detection algorithms,
 * allowing easy comparison and benchmarking of different approaches.
 */

import type { MockAudioBuffer } from './syntheticAudioGenerator';

/**
 * Result from a tempo detection algorithm
 */
export interface TempoDetectionResult {
  /** Detected BPM */
  bpm: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Optional: detected beat positions */
  beats?: number[];
  /** Optional: warnings or notes */
  warnings?: string[];
}

/**
 * Common interface for tempo detection algorithms
 */
export interface TempoDetector {
  /** Human-readable name of the algorithm */
  name: string;
  /** Short description */
  description: string;
  /** Detect tempo from audio buffer */
  detect(audioBuffer: MockAudioBuffer | AudioBuffer): Promise<TempoDetectionResult>;
}

/**
 * Registry of available tempo detection algorithms
 */
export const tempoDetectors: Map<string, TempoDetector> = new Map();

/**
 * Register a tempo detector
 */
export function registerTempoDetector(id: string, detector: TempoDetector): void {
  tempoDetectors.set(id, detector);
}

/**
 * Get a tempo detector by ID
 */
export function getTempoDetector(id: string): TempoDetector | undefined {
  return tempoDetectors.get(id);
}

/**
 * List all available tempo detectors
 */
export function listTempoDetectors(): Array<{ id: string; name: string; description: string }> {
  return Array.from(tempoDetectors.entries()).map(([id, detector]) => ({
    id,
    name: detector.name,
    description: detector.description,
  }));
}
