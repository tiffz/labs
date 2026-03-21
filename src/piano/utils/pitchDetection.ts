/**
 * YIN-based monophonic pitch detection.
 * Returns a MIDI note number from an audio buffer, or null if no clear pitch.
 */

const YIN_THRESHOLD = 0.15;
const MIN_FREQUENCY = 50;
const MAX_FREQUENCY = 4200;

export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const bufferSize = buffer.length;
  const maxLag = Math.floor(sampleRate / MIN_FREQUENCY);
  const minLag = Math.floor(sampleRate / MAX_FREQUENCY);

  if (bufferSize < maxLag * 2) return null;

  // Step 1: Squared difference function
  const yinBuffer = new Float32Array(maxLag);
  for (let tau = 1; tau < maxLag; tau++) {
    let sum = 0;
    for (let i = 0; i < maxLag; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < maxLag; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  // Step 3: Absolute threshold
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

  // Step 4: Parabolic interpolation
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

  return frequencyToMidi(frequency);
}

function frequencyToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}
