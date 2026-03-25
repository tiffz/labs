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

  const onVisibility = () => {
    if (document.visibilityState === 'visible' && context.state === 'suspended') {
      void context.resume().catch(() => {
        // no-op
      });
    }
  };
  const onStateChange = () => {
    if (context.state === 'suspended' && document.visibilityState === 'visible') {
      void context.resume().catch(() => {
        // no-op
      });
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  context.addEventListener('statechange', onStateChange);

  const teardown = () => {
    document.removeEventListener('visibilitychange', onVisibility);
    context.removeEventListener('statechange', onStateChange);
    if (teardownByContext.get(context) === teardown) {
      teardownByContext.delete(context);
    }
  };
  teardownByContext.set(context, teardown);
  return teardown;
}

export async function ensureAudioContextRunning(context: AudioContext): Promise<boolean> {
  if (context.state === 'running') return true;
  if (context.state === 'closed') return false;
  try {
    await context.resume();
    return context.state === 'running';
  } catch {
    return false;
  }
}

