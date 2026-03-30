/**
 * YIN-based monophonic pitch detection helpers shared across music apps.
 */

const YIN_THRESHOLD = 0.15;
const MIN_FREQUENCY = 50;
const MAX_FREQUENCY = 4200;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface PitchInfo {
  frequency: number;
  midi: number;
  noteName: string;
  cents: number;
}

export function detectPitchFrequency(buffer: Float32Array, sampleRate: number): number | null {
  const bufferSize = buffer.length;
  const maxLag = Math.floor(sampleRate / MIN_FREQUENCY);
  const minLag = Math.floor(sampleRate / MAX_FREQUENCY);

  if (bufferSize < maxLag * 2) return null;

  const yinBuffer = new Float32Array(maxLag);
  for (let tau = 1; tau < maxLag; tau++) {
    let sum = 0;
    for (let i = 0; i < maxLag; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < maxLag; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  let tauEstimate = -1;
  for (let tau = minLag; tau < maxLag; tau++) {
    if (yinBuffer[tau] < YIN_THRESHOLD) {
      while (tau + 1 < maxLag && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return null;

  let betterTau: number;
  if (tauEstimate > 0 && tauEstimate < maxLag - 1) {
    const s0 = yinBuffer[tauEstimate - 1];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[tauEstimate + 1];
    betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  } else {
    betterTau = tauEstimate;
  }

  const frequency = sampleRate / betterTau;
  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) return null;
  return frequency;
}

export function frequencyToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export function frequencyToNoteName(freq: number): string {
  return midiToNoteName(frequencyToMidi(freq));
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

export function getCentsOff(frequency: number, midi: number): number {
  const exactMidi = 69 + 12 * Math.log2(frequency / 440);
  return (exactMidi - midi) * 100;
}

export function detectPitchInfo(buffer: Float32Array, sampleRate: number): PitchInfo | null {
  const frequency = detectPitchFrequency(buffer, sampleRate);
  if (frequency === null) return null;
  const midi = frequencyToMidi(frequency);
  return {
    frequency,
    midi,
    noteName: midiToNoteName(midi),
    cents: getCentsOff(frequency, midi),
  };
}

