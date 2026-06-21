import { describe, it, expect } from 'vitest';
import { buildDisplayLayer } from './buildDisplayLayer';
import type { CapturedLoop } from '../types';

const baseLoop: CapturedLoop = {
  id: 'test',
  capturedAt: 8000,
  barCount: 1,
  transportSnapshot: {
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    subdivision: 2,
    playbackRate: 1,
    metronomeEnabled: true,
  },
  loopStartPerfMs: 0,
  loopEndPerfMs: 8000,
  events: [
    { id: '1', type: 'noteon', midi: 60, velocity: 0.8, perfMs: 100, deviceId: 'd' },
    { id: '2', type: 'noteoff', midi: 60, velocity: 0, perfMs: 600, deviceId: 'd' },
  ],
};

describe('buildDisplayLayer', () => {
  it('preserves raw beat at strictness 0', () => {
    const layer = buildDisplayLayer(baseLoop, 0);
    expect(layer.notes[0]!.beat).toBeCloseTo(0.2, 2);
  });

  it('snaps toward grid at strictness 1', () => {
    const layer = buildDisplayLayer(baseLoop, 1);
    expect(layer.notes[0]!.beat).toBeCloseTo(0, 2);
  });
});
