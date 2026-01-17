/**
 * Synthetic Audio Generator for BPM Detection Testing
 * 
 * Generates audio buffers with precise, known BPM values.
 * This allows testing our BPM detection algorithm without
 * relying on external datasets or copyrighted audio.
 * 
 * Features:
 * - Click tracks at exact BPMs
 * - Drum patterns at exact BPMs
 * - Various timbres (sine, noise, drums)
 * - Support for fractional BPMs
 */

/**
 * Configuration for synthetic audio generation
 */
export interface SyntheticAudioConfig {
  /** Target BPM (can be fractional) */
  bpm: number;
  /** Duration in seconds */
  duration: number;
  /** Sample rate (default: 44100) */
  sampleRate?: number;
  /** Type of audio to generate */
  type: 'click' | 'kick' | 'snare' | 'hihat' | 'drumPattern' | 'mixed';
  /** Time signature numerator (default: 4) */
  beatsPerMeasure?: number;
  /** Add some timing variation to simulate real music (0-1, default: 0) */
  humanize?: number;
  /** Add background noise level (0-1, default: 0) */
  noiseLevel?: number;
  /** Optional RNG seed for deterministic generation */
  seed?: number;
}

/**
 * Minimal AudioBuffer-like interface for testing
 */
export interface MockAudioBuffer {
  sampleRate: number;
  duration: number;
  numberOfChannels: number;
  length: number;
  getChannelData(channel: number): Float32Array;
}

/**
 * Create a mock AudioBuffer for testing without Web Audio API
 */
function createMockAudioBuffer(
  numSamples: number,
  sampleRate: number,
  channelData: Float32Array
): MockAudioBuffer {
  return {
    sampleRate,
    duration: numSamples / sampleRate,
    numberOfChannels: 1,
    length: numSamples,
    getChannelData: (channel: number) => {
      if (channel !== 0) throw new Error('Only mono audio supported');
      return channelData;
    },
  };
}

/**
 * Generate a synthetic audio buffer with a known BPM
 * Returns a MockAudioBuffer that can be used with our detection algorithms
 */
export function generateSyntheticAudio(config: SyntheticAudioConfig): MockAudioBuffer {
  const {
    bpm,
    duration,
    sampleRate = 44100,
    type,
    beatsPerMeasure = 4,
    humanize = 0,
    noiseLevel = 0,
    seed,
  } = config;

  const numSamples = Math.floor(duration * sampleRate);
  const channelData = new Float32Array(numSamples);
  const random = createRandom(seed);

  // Calculate beat interval
  const beatInterval = 60 / bpm;

  // Generate beats
  let currentTime = 0;
  let beatIndex = 0;

  while (currentTime < duration) {
    // Apply humanization (random timing variation)
    const variation = humanize > 0 
      ? (random() - 0.5) * humanize * 0.05 // Max ±2.5% variation at humanize=1
      : 0;
    
    const beatTime = currentTime + variation;
    const sampleIndex = Math.floor(beatTime * sampleRate);

    if (sampleIndex >= 0 && sampleIndex < numSamples) {
      // Determine what sound to generate based on type and beat position
      const isDownbeat = beatIndex % beatsPerMeasure === 0;
      
      switch (type) {
        case 'click': {
          // Add click on beat plus 8th note subdivisions for realistic density
          addClick(channelData, sampleIndex, sampleRate, isDownbeat ? 1.0 : 0.7);
          // Add 8th note
          const eighthSample = sampleIndex + Math.floor(beatInterval * 0.5 * sampleRate);
          if (eighthSample < numSamples) {
            addClick(channelData, eighthSample, sampleRate, 0.3);
          }
          break;
        }
        case 'kick':
          addKick(channelData, sampleIndex, sampleRate);
          break;
        case 'snare':
          addSnare(channelData, sampleIndex, sampleRate);
          break;
        case 'hihat':
          addHihat(channelData, sampleIndex, sampleRate);
          break;
        case 'drumPattern': {
          // 4/4 pattern: kick on 1,3 / snare on 2,4 / hihat on 8ths
          addHihat(channelData, sampleIndex, sampleRate, 0.4, random);
          if (beatIndex % 2 === 0) {
            addKick(channelData, sampleIndex, sampleRate, 0.8);
          } else {
            addSnare(channelData, sampleIndex, sampleRate, 0.7, random);
          }
          // Add 8th note hihat
          const hhEighth = sampleIndex + Math.floor(beatInterval * 0.5 * sampleRate);
          if (hhEighth < numSamples) {
            addHihat(channelData, hhEighth, sampleRate, 0.25, random);
          }
          break;
        }
        case 'mixed': {
          // More complex pattern with varied dynamics and subdivisions
          addHihat(channelData, sampleIndex, sampleRate, 0.3 + random() * 0.2, random);
          if (isDownbeat) {
            addKick(channelData, sampleIndex, sampleRate, 1.0);
          } else if (beatIndex % beatsPerMeasure === 2) {
            addSnare(channelData, sampleIndex, sampleRate, 0.9, random);
          } else if (random() > 0.5) {
            addKick(channelData, sampleIndex, sampleRate, 0.5);
          }
          // Add 8th and sometimes 16th notes for realistic density
          const mixedEighth = sampleIndex + Math.floor(beatInterval * 0.5 * sampleRate);
          if (mixedEighth < numSamples) {
            addHihat(channelData, mixedEighth, sampleRate, 0.2, random);
          }
          // Occasional 16th notes
          if (random() > 0.6) {
            const sixteenth1 = sampleIndex + Math.floor(beatInterval * 0.25 * sampleRate);
            const sixteenth3 = sampleIndex + Math.floor(beatInterval * 0.75 * sampleRate);
            if (sixteenth1 < numSamples) addHihat(channelData, sixteenth1, sampleRate, 0.15, random);
            if (sixteenth3 < numSamples) addHihat(channelData, sixteenth3, sampleRate, 0.15, random);
          }
          break;
        }
      }
    }

    currentTime += beatInterval;
    beatIndex++;
  }

  // Add background noise if requested
  if (noiseLevel > 0) {
    for (let i = 0; i < numSamples; i++) {
      channelData[i] += (random() - 0.5) * noiseLevel * 0.1;
    }
  }

  // Normalize to prevent clipping
  normalizeAudio(channelData);

  return createMockAudioBuffer(numSamples, sampleRate, channelData);
}

/**
 * Generate a click sound (short sine burst)
 */
function addClick(
  channelData: Float32Array,
  startSample: number,
  sampleRate: number,
  amplitude: number = 1.0
): void {
  const clickDuration = 0.01; // 10ms click
  const clickSamples = Math.floor(clickDuration * sampleRate);
  const frequency = 1000; // 1kHz click

  for (let i = 0; i < clickSamples && startSample + i < channelData.length; i++) {
    const t = i / sampleRate;
    // Sine wave with exponential decay
    const envelope = Math.exp(-t * 100);
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * amplitude;
    channelData[startSample + i] += sample;
  }
}

/**
 * Generate a kick drum sound (low frequency with punch)
 */
function addKick(
  channelData: Float32Array,
  startSample: number,
  sampleRate: number,
  amplitude: number = 1.0
): void {
  const kickDuration = 0.15; // 150ms
  const kickSamples = Math.floor(kickDuration * sampleRate);

  for (let i = 0; i < kickSamples && startSample + i < channelData.length; i++) {
    const t = i / sampleRate;
    // Frequency sweep from 150Hz down to 50Hz
    const freq = 150 * Math.exp(-t * 20) + 50;
    // Amplitude envelope
    const envelope = Math.exp(-t * 15);
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * amplitude;
    channelData[startSample + i] += sample;
  }
}

/**
 * Generate a snare drum sound (noise + tone)
 */
function addSnare(
  channelData: Float32Array,
  startSample: number,
  sampleRate: number,
  amplitude: number = 1.0,
  random: () => number = Math.random
): void {
  const snareDuration = 0.12; // 120ms
  const snareSamples = Math.floor(snareDuration * sampleRate);

  for (let i = 0; i < snareSamples && startSample + i < channelData.length; i++) {
    const t = i / sampleRate;
    // Body (low tone)
    const bodyEnv = Math.exp(-t * 25);
    const body = Math.sin(2 * Math.PI * 180 * t) * bodyEnv * 0.5;
    // Snares (noise)
    const noiseEnv = Math.exp(-t * 20);
    const noise = (random() - 0.5) * noiseEnv * 0.8;
    
    channelData[startSample + i] += (body + noise) * amplitude;
  }
}

/**
 * Generate a hi-hat sound (filtered noise)
 */
function addHihat(
  channelData: Float32Array,
  startSample: number,
  sampleRate: number,
  amplitude: number = 0.5,
  random: () => number = Math.random
): void {
  const hihatDuration = 0.05; // 50ms
  const hihatSamples = Math.floor(hihatDuration * sampleRate);

  for (let i = 0; i < hihatSamples && startSample + i < channelData.length; i++) {
    const t = i / sampleRate;
    // High-frequency noise with fast decay
    const envelope = Math.exp(-t * 80);
    // Band-limited noise (simulate high-pass)
    const noise = (random() - 0.5) * 0.5 + 
                  (random() - 0.5) * 0.3 + 
                  Math.sin(2 * Math.PI * 8000 * t) * 0.2;
    
    channelData[startSample + i] += noise * envelope * amplitude;
  }
}

/**
 * Create a deterministic RNG if a seed is provided.
 */
function createRandom(seed?: number): () => number {
  if (seed === undefined) {
    return Math.random;
  }

  let t = seed >>> 0;
  return function mulberry32(): number {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Normalize audio to prevent clipping
 */
function normalizeAudio(channelData: Float32Array): void {
  let maxAbs = 0;
  for (let i = 0; i < channelData.length; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(channelData[i]));
  }
  
  if (maxAbs > 0.95) {
    const scale = 0.9 / maxAbs;
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] *= scale;
    }
  }
}

/**
 * Test case definition for BPM detection testing
 */
export interface BpmTestCase {
  id: string;
  name: string;
  config: SyntheticAudioConfig;
  expectedBpm: number;
  /** Tolerance for BPM detection (default: 1) */
  tolerance?: number;
  /** Expected to detect at half/double time? */
  octaveError?: 'half' | 'double' | 'none';
}

/**
 * Standard test suite covering various BPM ranges and patterns
 * Uses 'mixed' type for most tests as it provides realistic onset density
 * 
 * Note: Synthetic audio has different characteristics than real music.
 * Very slow (<70) and very fast (>120) tempos may have octave ambiguity.
 */
export const STANDARD_BPM_TEST_CASES: BpmTestCase[] = [
  // Core range (70-110 BPM) - most reliable detection
  { id: 'core-70', name: '70 BPM Drums', config: { bpm: 70, duration: 30, type: 'drumPattern', seed: 7001 }, expectedBpm: 70, tolerance: 2 },
  { id: 'core-75', name: '75 BPM Mixed', config: { bpm: 75, duration: 30, type: 'mixed', seed: 7501 }, expectedBpm: 75, tolerance: 2 },
  { id: 'core-80', name: '80 BPM Mixed', config: { bpm: 80, duration: 30, type: 'mixed', seed: 8001 }, expectedBpm: 80, tolerance: 2 },
  { id: 'core-85', name: '85 BPM Drums', config: { bpm: 85, duration: 30, type: 'drumPattern', seed: 8501 }, expectedBpm: 85, tolerance: 2 },
  { id: 'core-90', name: '90 BPM Mixed', config: { bpm: 90, duration: 30, type: 'mixed', seed: 9001 }, expectedBpm: 90, tolerance: 2 },
  { id: 'core-95', name: '95 BPM Drums', config: { bpm: 95, duration: 30, type: 'drumPattern', seed: 9501 }, expectedBpm: 95, tolerance: 2 },
  { id: 'core-98', name: '98 BPM Mixed', config: { bpm: 98, duration: 30, type: 'mixed', seed: 9801 }, expectedBpm: 98, tolerance: 2 },
  { id: 'core-102', name: '102 BPM Drums', config: { bpm: 102, duration: 30, type: 'drumPattern', seed: 10201 }, expectedBpm: 102, tolerance: 2 },
  
  // Fractional BPMs (precision test in core range)
  { id: 'frac-72.5', name: '72.5 BPM', config: { bpm: 72.5, duration: 30, type: 'mixed', seed: 72501 }, expectedBpm: 72.5, tolerance: 1 },
  { id: 'frac-88.3', name: '88.3 BPM', config: { bpm: 88.3, duration: 30, type: 'drumPattern', seed: 88301 }, expectedBpm: 88.3, tolerance: 1 },
  { id: 'frac-99.5', name: '99.5 BPM', config: { bpm: 99.5, duration: 30, type: 'mixed', seed: 99501 }, expectedBpm: 99.5, tolerance: 1 },
  
  // Humanized (with timing variation)
  { id: 'human-78', name: '78 BPM Humanized', config: { bpm: 78, duration: 30, type: 'drumPattern', humanize: 0.3, seed: 7801 }, expectedBpm: 78, tolerance: 3 },
  { id: 'human-92', name: '92 BPM Humanized', config: { bpm: 92, duration: 30, type: 'mixed', humanize: 0.4, seed: 9201 }, expectedBpm: 92, tolerance: 3 },
  
  // Noisy
  { id: 'noisy-84', name: '84 BPM with Noise', config: { bpm: 84, duration: 30, type: 'drumPattern', noiseLevel: 0.2, seed: 8401 }, expectedBpm: 84, tolerance: 3 },
];

/**
 * Octave ambiguity test cases (tempos that could be detected at half/double)
 * Uses realistic 'mixed' patterns to give proper onset density cues
 * Focused on the core reliable range (70-105 BPM)
 */
export const OCTAVE_AMBIGUITY_TEST_CASES: BpmTestCase[] = [
  // Core range tempos (should be exact)
  { id: 'oct-73', name: '73 BPM', config: { bpm: 73, duration: 30, type: 'mixed', seed: 7301 }, expectedBpm: 73, tolerance: 2, octaveError: 'none' },
  { id: 'oct-82', name: '82 BPM', config: { bpm: 82, duration: 30, type: 'drumPattern', seed: 8201 }, expectedBpm: 82, tolerance: 2, octaveError: 'none' },
  { id: 'oct-91', name: '91 BPM', config: { bpm: 91, duration: 30, type: 'mixed', seed: 9101 }, expectedBpm: 91, tolerance: 2, octaveError: 'none' },
  { id: 'oct-96', name: '96 BPM', config: { bpm: 96, duration: 30, type: 'drumPattern', seed: 9601 }, expectedBpm: 96, tolerance: 2, octaveError: 'none' },
  { id: 'oct-99', name: '99 BPM', config: { bpm: 99, duration: 30, type: 'mixed', seed: 9901 }, expectedBpm: 99, tolerance: 2, octaveError: 'none' },
];
