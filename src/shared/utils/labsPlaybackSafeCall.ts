/**
 * Defensive wrappers for playback hot paths (RAF, media poll, Web Audio).
 * Failures are logged and swallowed so one bad tick does not take down the app.
 */

export function labsPlaybackSafeCall(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.warn(`[labs-playback] ${label} failed`, err);
  }
}

export async function labsPlaybackSafeCallAsync(
  label: string,
  fn: () => void | Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.warn(`[labs-playback] ${label} failed`, err);
  }
}
