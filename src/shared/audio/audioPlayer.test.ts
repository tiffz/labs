import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAudioContext, type MockAudioContext } from './__test__/mockAudioContext';
import { AudioPlayer } from './audioPlayer';

vi.mock('./reverb', () => ({
  createReverb: vi.fn(async () => null),
  updateReverbLevel: vi.fn(),
  convertReverbStrengthToWetLevel: vi.fn((s: number) => s / 100),
}));

const fakeBuffer = { duration: 0.3 } as AudioBuffer;

let mockCtx: MockAudioContext & { addEventListener?: ReturnType<typeof vi.fn>; removeEventListener?: ReturnType<typeof vi.fn> };

describe('AudioPlayer', () => {
  beforeEach(() => {
    mockCtx = Object.assign(createMockAudioContext(), {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    mockCtx.decodeAudioData.mockResolvedValue(fakeBuffer);
    vi.stubGlobal('AudioContext', function () {
      return mockCtx;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function makePlayer(): Promise<AudioPlayer> {
    const player = new AudioPlayer({
      soundUrls: { dum: '/dum.wav' },
      clickUrl: '/click.mp3',
      enableReverb: false,
    });
    await player.initialize();
    return player;
  }

  it('loads configured sounds and click on initialize', async () => {
    const player = await makePlayer();
    expect(player.isHealthy()).toBe(true);
    expect(player.getState()).toBe('running');
  });

  it('playNowIfReady schedules at the requested precise audio time', async () => {
    const player = await makePlayer();
    mockCtx._time = 1;
    player.playNowIfReady('dum', 0.8, undefined, 2.25);

    const source = mockCtx._sources.at(-1)!;
    expect(source.start).toHaveBeenCalledWith(2.25);
    expect(mockCtx._gains.at(-1)!.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 2.25);
  });

  it('never schedules a sound in the past', async () => {
    const player = await makePlayer();
    mockCtx._time = 5;
    player.playNowIfReady('dum', 1, undefined, 3);

    const source = mockCtx._sources.at(-1)!;
    expect(source.start).toHaveBeenCalledWith(5);
  });

  it('stopAllSounds stops tracked sources immediately', async () => {
    const player = await makePlayer();
    player.playNowIfReady('dum', 1);
    player.playNowIfReady('dum', 1);
    const sources = [...mockCtx._sources];

    player.stopAllSounds();
    for (const source of sources) {
      expect(source.stop).toHaveBeenCalled();
    }
  });

  it('stopAllSounds(atTime) schedules a future choke instead of an immediate cut', async () => {
    const player = await makePlayer();
    mockCtx._time = 1;
    player.playNowIfReady('dum', 1, undefined, 1.5);
    const source = mockCtx._sources.at(-1)!;

    player.stopAllSounds(2.5);
    expect(source.stop).toHaveBeenCalledWith(2.5);
  });

  it('does not play unknown sounds', async () => {
    const player = await makePlayer();
    const before = mockCtx._sources.length;
    player.playNowIfReady('nope', 1);
    expect(mockCtx._sources.length).toBe(before);
  });

  it('destroy closes the context and detaches listeners', async () => {
    const player = await makePlayer();
    player.destroy();
    expect(mockCtx.close).toHaveBeenCalled();
    expect(player.getState()).toBe('uninitialized');
  });
});
