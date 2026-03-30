/**
 * Shared onset detection utilities.
 *
 * Centralizes onset detection so analysis, benchmarks, and refinement
 * use consistent logic with preset parameter sets.
 */

export interface MinimalAudioBuffer {
  getChannelData(channel: number): Float32Array;
  sampleRate: number;
}

export type OnsetPreset = 'analysis' | 'snapping' | 'fermata' | 'accuracy' | 'core';

export interface OnsetDetectionOptions {
  frameSize?: number;
  hopSize?: number;
  threshold?: number;
  minOnsetInterval?: number;
  localMaxWindow?: number;
  useRelativeIncrease?: boolean;
  relativeIncreaseThreshold?: number;
}

const PRESET_OPTIONS: Record<OnsetPreset, OnsetDetectionOptions> = {
  analysis: {
    frameSize: 1024,
    hopSize: 512,
    threshold: 0.02,
    minOnsetInterval: 0.05,
    localMaxWindow: 2,
    useRelativeIncrease: true,
    relativeIncreaseThreshold: 0.3,
  },
  snapping: {
    frameSize: 1024,
    hopSize: 512,
    threshold: 0.02,
    minOnsetInterval: 0.05,
    localMaxWindow: 2,
    useRelativeIncrease: true,
    relativeIncreaseThreshold: 0.3,
  },
  fermata: {
    frameSize: 512,
    hopSize: 256,
    threshold: 0.02,
    minOnsetInterval: 0.1,
    localMaxWindow: 2,
    useRelativeIncrease: true,
    relativeIncreaseThreshold: 0.3,
  },
  accuracy: {
    frameSize: 512,
    hopSize: 256,
    threshold: 0.02,
    minOnsetInterval: 0.1,
    localMaxWindow: 2,
    useRelativeIncrease: true,
    relativeIncreaseThreshold: 0.3,
  },
  core: {
    frameSize: 1024,
    hopSize: 512,
    threshold: 0.015,
    minOnsetInterval: 0.05,
    localMaxWindow: 3,
    useRelativeIncrease: false,
    relativeIncreaseThreshold: 0.3,
  },
};

/**
 * Detect onsets in audio using energy-based detection.
 */
export function detectOnsets(
  audioBuffer: MinimalAudioBuffer,
  options: OnsetDetectionOptions & { preset?: OnsetPreset } = {}
): number[] {
  const preset = options.preset ?? 'analysis';
  const merged = { ...PRESET_OPTIONS[preset], ...options };

  const frameSize = merged.frameSize ?? 1024;
  const hopSize = merged.hopSize ?? 512;
  const threshold = merged.threshold ?? 0.02;
  const minOnsetInterval = merged.minOnsetInterval ?? 0.05;
  const localMaxWindow = merged.localMaxWindow ?? 2;
  const useRelativeIncrease = merged.useRelativeIncrease ?? true;
  const relativeIncreaseThreshold = merged.relativeIncreaseThreshold ?? 0.3;

  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  if (numFrames <= 0) return [];

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
  const normalized = energies.map((e) => e / maxEnergy);

  const onsets: number[] = [];
  for (let i = localMaxWindow; i < normalized.length - localMaxWindow; i++) {
    const current = normalized[i];
    const previous = normalized[i - 1];
    const increase = current - previous;
    const relativeIncrease = previous > 0.01 ? increase / previous : increase;

    if (increase < threshold) {
      if (!useRelativeIncrease || relativeIncrease < relativeIncreaseThreshold) {
        continue;
      }
    }

    let isLocalMax = true;
    for (let j = 1; j <= localMaxWindow; j++) {
      if (normalized[i - j] >= current || normalized[i + j] > current) {
        isLocalMax = false;
        break;
      }
    }

    if (isLocalMax) {
      const timeInSeconds = (i * hopSize) / sampleRate;
      if (onsets.length === 0 || timeInSeconds - onsets[onsets.length - 1] >= minOnsetInterval) {
        onsets.push(timeInSeconds);
      }
    }
  }

  return onsets;
}
