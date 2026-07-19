/**
 * Deterministic render-hash regression for the WAV/MP3 export encoders.
 * A fixed synthetic buffer must always encode to byte-identical output —
 * catches silent encoder/PCM-conversion changes (e.g. a lamejs upgrade).
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { audioBufferToMp3, audioBufferToWav } from './audioCodecs';

const SAMPLE_RATE = 44100;
const LENGTH = 4410; // 100ms

/** 440 Hz sine at half amplitude — fully deterministic input. */
function makeSineBuffer(): AudioBuffer {
  const data = new Float32Array(LENGTH);
  for (let i = 0; i < LENGTH; i += 1) {
    data[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE);
  }
  return {
    length: LENGTH,
    sampleRate: SAMPLE_RATE,
    numberOfChannels: 1,
    duration: LENGTH / SAMPLE_RATE,
    getChannelData: () => data,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

async function sha256(blob: Blob): Promise<string> {
  // jsdom's Blob lacks arrayBuffer(); FileReader is the reliable path here.
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  return createHash('sha256').update(bytes).digest('hex');
}

describe('audioCodecs render hashes', () => {
  it('WAV encoding of a fixed sine buffer is byte-stable', async () => {
    const wav = audioBufferToWav(makeSineBuffer());
    expect(wav.size).toBe(44 + LENGTH * 2);
    const first = await sha256(wav);
    const second = await sha256(audioBufferToWav(makeSineBuffer()));
    expect(second).toBe(first);
  });

  it('MP3 encoding of a fixed sine buffer is deterministic across runs', async () => {
    const first = await audioBufferToMp3(makeSineBuffer(), 128);
    const second = await audioBufferToMp3(makeSineBuffer(), 128);
    expect(first.size).toBeGreaterThan(0);
    expect(await sha256(second)).toBe(await sha256(first));
  });

  it('MP3 output changes when the input signal changes', async () => {
    const silent = {
      ...makeSineBuffer(),
      getChannelData: () => new Float32Array(LENGTH),
    } as unknown as AudioBuffer;
    const sine = await audioBufferToMp3(makeSineBuffer(), 128);
    const silence = await audioBufferToMp3(silent, 128);
    expect(await sha256(silence)).not.toBe(await sha256(sine));
  });
});
