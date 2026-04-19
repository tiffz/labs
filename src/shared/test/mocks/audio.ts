/**
 * Canonical AudioContext / OfflineAudioContext mocks for tests. Re-exports the
 * long-standing helpers in `src/shared/audio/__test__/mockAudioContext.ts` and
 * adds an OfflineAudioContext factory used by rendering tests.
 *
 * Prefer these over hand-rolling per-test mocks so assertions stay stable as
 * the real audio layer evolves.
 */
import { vi } from 'vitest';

export {
  createMockGainNode,
  createMockSourceNode,
  createMockAudioContext,
  type MockAudioContext,
} from '../../audio/__test__/mockAudioContext';

export interface MockOfflineAudioContext {
  sampleRate: number;
  length: number;
  currentTime: number;
  destination: AudioDestinationNode;
  createGain: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  startRendering: ReturnType<typeof vi.fn>;
}

/**
 * Minimal OfflineAudioContext fake. Enough for "did rendering complete?" style
 * tests; do not use for numerical DSP assertions.
 */
export function createMockOfflineAudioContext(
  {
    sampleRate = 48_000,
    length = 48_000, // 1 second
  }: { sampleRate?: number; length?: number } = {},
): MockOfflineAudioContext {
  const ctx: MockOfflineAudioContext = {
    sampleRate,
    length,
    currentTime: 0,
    destination: {} as AudioDestinationNode,
    createGain: vi.fn(() => ({
      gain: {
        value: 1,
        setValueAtTime: vi.fn().mockReturnThis(),
        linearRampToValueAtTime: vi.fn().mockReturnThis(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    })),
    startRendering: vi.fn(async () => ({
      duration: length / sampleRate,
      length,
      sampleRate,
      numberOfChannels: 2,
      getChannelData: vi.fn(() => new Float32Array(length)),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer)),
  };
  return ctx;
}
