import { describe, expect, it } from 'vitest';
import { createAudioBuffer } from '../beat/regression/audioBuffer';
import { resolveBeatOneAnchorTime } from './downbeatAlignment';

function makeClickTrackBuffer(options: {
  bpm: number;
  durationSec: number;
  beatOneSec: number;
  sampleRate?: number;
}) {
  const sampleRate = options.sampleRate ?? 44100;
  const length = Math.ceil(options.durationSec * sampleRate);
  const data = new Float32Array(length);
  const beatInterval = 60 / options.bpm;

  for (let beat = 0; options.beatOneSec + beat * beatInterval < options.durationSec; beat++) {
    const t = options.beatOneSec + beat * beatInterval;
    const sample = Math.floor(t * sampleRate);
    for (let i = 0; i < 800 && sample + i < length; i++) {
      const env = 1 - i / 800;
      data[sample + i] += 0.85 * env * Math.sin((i / sampleRate) * 2 * Math.PI * 180);
    }
  }

  return createAudioBuffer(data, sampleRate);
}

describe('resolveBeatOneAnchorTime', () => {
  it('re-phases a late ensemble Beat 1 back to the opening downbeat', () => {
    const buffer = makeClickTrackBuffer({ bpm: 150, durationSec: 12, beatOneSec: 0.05 });
    const beatInterval = 60 / 150;
    const latePhaseBeatOne = 5.803;

    const resolved = resolveBeatOneAnchorTime(buffer, 150, 0, latePhaseBeatOne, 4);

    expect(resolved.realigned).toBe(true);
    expect(resolved.beatOneTime).toBeLessThan(0.5);
    expect(Math.abs(resolved.beatOneTime - 0.05)).toBeLessThan(beatInterval * 0.35);
  });

  it('keeps an already-correct Beat 1 near music start', () => {
    const buffer = makeClickTrackBuffer({ bpm: 120, durationSec: 10, beatOneSec: 0.08 });
    const resolved = resolveBeatOneAnchorTime(buffer, 120, 0, 0.08, 4);

    expect(resolved.beatOneTime).toBeCloseTo(0.08, 1);
  });
});
