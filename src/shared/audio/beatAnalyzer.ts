import type { MinimalAudioBuffer } from '../beat/analysis/onsets';
import { detectOnsets } from '../beat/analysis/onsets';

type EssentiaConstructor = typeof import('essentia.js/dist/essentia.js-core.es.js').default;
type EssentiaInstance = InstanceType<EssentiaConstructor>;

export interface BeatAnalysisResult {
  bpm: number;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  beats: number[];
  musicStartTime: number;
  musicEndTime: number;
  offset: number;
  warnings: string[];
  hasTempoVariance?: boolean;
}

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

  const EssentiaWASM = (wasmModule as { EssentiaWASM?: unknown; default?: unknown }).EssentiaWASM
    ?? (wasmModule as { default?: unknown }).default
    ?? wasmModule;

  essentiaConstructor = Essentia;
  essentiaWasmModule = EssentiaWASM;
  return { Essentia, EssentiaWASM };
}

export async function getEssentia(): Promise<EssentiaInstance> {
  if (essentiaInstance) return essentiaInstance;
  if (essentiaInitPromise) return essentiaInitPromise;

  essentiaInitPromise = (async () => {
    const { Essentia, EssentiaWASM } = await loadEssentiaModules();
    essentiaInstance = new Essentia(EssentiaWASM);
    return essentiaInstance;
  })();
  return essentiaInitPromise;
}

function detectMusicStart(audioBuffer: AudioBuffer, threshold = 0.01): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.05);
  for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j += 1) {
      sumSquares += channelData[i + j] * channelData[i + j];
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    if (rms > threshold) return i / sampleRate;
  }
  return 0;
}

function generateBeats(bpm: number, duration: number, startOffset = 0): number[] {
  const beatInterval = 60 / bpm;
  const beats: number[] = [];
  let beatTime = startOffset;
  while (beatTime < duration) {
    beats.push(beatTime);
    beatTime += beatInterval;
  }
  return beats;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function estimateBpmFromOnsets(onsets: number[]): { bpm: number; confidence: number; hasTempoVariance: boolean } {
  if (onsets.length < 4) {
    return { bpm: 120, confidence: 0.2, hasTempoVariance: false };
  }
  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i += 1) {
    const gap = onsets[i] - onsets[i - 1];
    if (gap > 0.18 && gap < 1.5) intervals.push(gap);
  }
  if (intervals.length === 0) {
    return { bpm: 120, confidence: 0.2, hasTempoVariance: false };
  }
  const intervalMedian = median(intervals);
  const bpm = Math.max(40, Math.min(220, Math.round(60 / intervalMedian)));
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((acc, value) => acc + (value - mean) ** 2, 0) / intervals.length;
  const cv = Math.sqrt(variance) / Math.max(1e-5, mean);
  const confidence = Math.max(0.25, Math.min(0.9, 1 - cv * 1.4));
  return { bpm, confidence, hasTempoVariance: cv > 0.06 };
}

export type AnalysisProgressCallback = (stage: string, progress: number) => void;

export async function analyzeBeat(
  audioBuffer: AudioBuffer,
  onProgress?: AnalysisProgressCallback,
): Promise<BeatAnalysisResult> {
  onProgress?.('Analyzing audio', 10);
  const musicStartTime = detectMusicStart(audioBuffer);
  onProgress?.('Detecting onsets', 40);
  const onsets = detectOnsets(audioBuffer as MinimalAudioBuffer, { preset: 'analysis' });
  const filteredOnsets = onsets.filter((time) => time >= musicStartTime);
  const estimate = estimateBpmFromOnsets(filteredOnsets);
  onProgress?.('Building beat grid', 75);
  const beats = generateBeats(estimate.bpm, audioBuffer.duration, musicStartTime);
  const confidenceLevel = estimate.confidence >= 0.7 ? 'high' : estimate.confidence >= 0.45 ? 'medium' : 'low';
  const warnings: string[] = [];
  if (confidenceLevel === 'low') warnings.push('Low confidence tempo estimate');
  onProgress?.('Complete', 100);
  return {
    bpm: estimate.bpm,
    confidence: estimate.confidence,
    confidenceLevel,
    beats,
    musicStartTime,
    musicEndTime: audioBuffer.duration,
    offset: beats[0] ?? 0,
    warnings,
    hasTempoVariance: estimate.hasTempoVariance,
  };
}
