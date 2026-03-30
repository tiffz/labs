function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pcm16ToWavDataUrl(samples: Float32Array, sampleRate: number): string {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = clamp(samples[i], -1, 1);
    view.setInt16(offset, sample * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
  return `data:audio/wav;base64,${base64}`;
}

function createToneSample(
  frequency: number,
  durationSec: number,
  decay: number,
  sampleRate = 22050,
): string {
  const length = Math.max(1, Math.floor(durationSec * sampleRate));
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.exp(-decay * t);
    const sine = Math.sin(2 * Math.PI * frequency * t);
    const overtone = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.2;
    samples[i] = (sine + overtone) * envelope * 0.7;
  }
  return pcm16ToWavDataUrl(samples, sampleRate);
}

function createNoiseSample(
  durationSec: number,
  decay: number,
  sampleRate = 22050,
): string {
  const length = Math.max(1, Math.floor(durationSec * sampleRate));
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.exp(-decay * t);
    const white = (Math.random() * 2 - 1) * 0.9;
    samples[i] = white * envelope;
  }
  return pcm16ToWavDataUrl(samples, sampleRate);
}

export const CLICK_SAMPLE_URL = createToneSample(1800, 0.045, 60);

export const DRUM_SAMPLE_URLS: Record<'dum' | 'tak' | 'ka' | 'slap', string> = {
  dum: createToneSample(105, 0.2, 18),
  tak: createToneSample(460, 0.09, 34),
  ka: createToneSample(760, 0.075, 38),
  slap: createNoiseSample(0.07, 45),
};
