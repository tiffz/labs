import { describe, expect, it, vi } from 'vitest';
import { ensureAudioContextRunning, primeAudioContext } from './audioContextLifecycle';

describe('audioContextLifecycle', () => {
  it('primeAudioContext resumes a suspended context synchronously', () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    const context = {
      state: 'suspended',
      resume,
    } as unknown as AudioContext;

    primeAudioContext(context);

    expect(resume).toHaveBeenCalledTimes(1);
  });

  it('primeAudioContext is a no-op for running or closed contexts', () => {
    const resume = vi.fn();
    primeAudioContext({ state: 'running', resume } as unknown as AudioContext);
    primeAudioContext({ state: 'closed', resume } as unknown as AudioContext);
    expect(resume).not.toHaveBeenCalled();
  });

  it('ensureAudioContextRunning returns false for a closed context', async () => {
    const context = { state: 'closed', resume: vi.fn() } as unknown as AudioContext;
    await expect(ensureAudioContextRunning(context)).resolves.toBe(false);
  });
});
