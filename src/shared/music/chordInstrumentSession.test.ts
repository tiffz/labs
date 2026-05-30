import { describe, expect, it, vi } from 'vitest';
import { ChordInstrumentSession } from './chordInstrumentSession';

const resume = vi.fn().mockResolvedValue(undefined);

vi.mock('../playback/audioContextLifecycle', () => ({
  createManagedAudioContext: vi.fn(() => ({
    context: {
      state: 'suspended',
      resume,
      destination: {},
    },
    ensureRunning: vi.fn(async () => true),
    dispose: vi.fn(),
  })),
  ensureAudioContextRunning: vi.fn(async () => true),
  primeAudioContext: vi.fn(),
}));

vi.mock('../playback/instrumentFactory', () => ({
  createInstrumentForSoundType: vi.fn(() => ({
    playNote: vi.fn(),
    stopAll: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    getOutput: vi.fn(),
  })),
}));

describe('ChordInstrumentSession', () => {
  it('primeAudioContext forwards to shared audio lifecycle helper', async () => {
    const { primeAudioContext } = await import('../playback/audioContextLifecycle');
    const session = new ChordInstrumentSession();
    session.primeAudioContext();
    expect(primeAudioContext).toHaveBeenCalled();
  });

  it('ensureInstrument returns null after dispose', async () => {
    const session = new ChordInstrumentSession();
    session.dispose();
    await expect(session.ensureInstrument('piano')).resolves.toBeNull();
  });
});
