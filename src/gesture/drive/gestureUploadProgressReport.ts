/** Yield so long upload work (hashing, manifest writes) can keep the tab responsive. */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (scheduler?.yield) {
    return scheduler.yield();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Coalesce rapid upload progress callbacks (avoids React + snackbar thrash on large folders). */
export function throttleUploadProgress<T extends (...args: never[]) => void>(
  fn: T,
  intervalMs = 200,
): T {
  let lastFireAt = 0;
  let pendingArgs: Parameters<T> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    if (!pendingArgs) return;
    fn(...pendingArgs);
    pendingArgs = null;
    lastFireAt = Date.now();
  };

  return ((...args: Parameters<T>) => {
    pendingArgs = args;
    const elapsed = Date.now() - lastFireAt;
    if (elapsed >= intervalMs) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      flush();
      return;
    }
    if (!timer) {
      timer = setTimeout(flush, intervalMs - elapsed);
    }
  }) as T;
}
