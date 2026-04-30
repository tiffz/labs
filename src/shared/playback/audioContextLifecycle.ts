const teardownByContext = new WeakMap<AudioContext, () => void>();

export interface ManagedAudioContext {
  context: AudioContext;
  ensureRunning: () => Promise<boolean>;
  dispose: () => void;
}

export function createManagedAudioContext(options?: AudioContextOptions): ManagedAudioContext {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AudioContextClass(options);
  const disposeListeners = attachAudioContextLifecycle(context);
  return {
    context,
    ensureRunning: () => ensureAudioContextRunning(context),
    dispose: () => {
      disposeListeners();
      if (context.state !== 'closed') {
        void context.close();
      }
    },
  };
}

export function attachAudioContextLifecycle(context: AudioContext): () => void {
  const existing = teardownByContext.get(context);
  if (existing) return existing;

  const tryResume = () => {
    if (context.state === 'suspended') {
      void context.resume().catch(() => {
        // no-op
      });
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') tryResume();
  };
  const onStateChange = () => {
    if (context.state === 'suspended' && document.visibilityState === 'visible') tryResume();
  };
  /** Tab can stay "visible" while the context still suspends; focus is a reliable nudge. */
  const onWindowFocus = () => {
    tryResume();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onWindowFocus);
  context.addEventListener('statechange', onStateChange);

  const teardown = () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onWindowFocus);
    context.removeEventListener('statechange', onStateChange);
    if (teardownByContext.get(context) === teardown) {
      teardownByContext.delete(context);
    }
  };
  teardownByContext.set(context, teardown);
  return teardown;
}

/**
 * Wait until the context is running (or closed / timeout). Browsers sometimes
 * resolve `resume()` before `state` flips, or suspend again during async work
 * (e.g. fetch/decode), which caused silent metronome clicks until a full reload.
 */
async function waitForRunningState(
  context: AudioContext,
  maxWaitMs: number,
): Promise<boolean> {
  const deadline = performance.now() + maxWaitMs;
  while (performance.now() < deadline) {
    if (context.state === 'running') return true;
    if (context.state === 'closed') return false;
    await new Promise<void>(r => {
      window.setTimeout(r, 8);
    });
  }
  return context.state === 'running';
}

export async function ensureAudioContextRunning(context: AudioContext): Promise<boolean> {
  const state = context.state;
  if (state === 'running') return true;
  if (state === 'closed') return false;
  try {
    await context.resume();
  } catch {
    return false;
  }
  if (context.state === 'running') return true;
  return waitForRunningState(context, 400);
}

