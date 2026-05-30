import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureSalamanderPianoSamples,
  getSalamanderPianoLoadState,
  isSalamanderPianoReady,
  resetSalamanderPianoSamplePoolForTests,
  subscribeSalamanderPianoLoadState,
} from './salamanderPianoSamplePool';

vi.mock('./sampleLoader', () => ({
  noteToMidi: () => 60,
  loadSamples: vi.fn(async (_ctx: AudioContext, _entries: unknown[], onProgress?: (l: number, t: number) => void) => {
    onProgress?.(1, 1);
    return [{ note: 'C4', midiNote: 60, buffer: {} as AudioBuffer, velocityLayer: 'default' }];
  }),
}));

describe('salamanderPianoSamplePool', () => {
  beforeEach(() => {
    resetSalamanderPianoSamplePoolForTests();
  });

  it('shares one load across callers and reports ready', async () => {
    const ctx = { decodeAudioData: vi.fn() } as unknown as AudioContext;
    const states: string[] = [];
    subscribeSalamanderPianoLoadState((state) => {
      if (state.ready) states.push('ready');
    });

    await ensureSalamanderPianoSamples(ctx);
    await ensureSalamanderPianoSamples(ctx);

    expect(isSalamanderPianoReady()).toBe(true);
    expect(getSalamanderPianoLoadState().ready).toBe(true);
    expect(states.filter((s) => s === 'ready').length).toBeGreaterThanOrEqual(1);
    const { loadSamples } = await import('./sampleLoader');
    expect(loadSamples).toHaveBeenCalledTimes(1);
  });
});
