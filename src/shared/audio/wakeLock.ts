/**
 * Screen Wake Lock utility for music apps.
 *
 * Prevents the device screen from dimming/locking during active playback.
 * Uses the Screen Wake Lock API where available and gracefully no-ops
 * on unsupported browsers.
 *
 * The lock is automatically re-acquired when the tab regains visibility,
 * since browsers release the sentinel when a tab is hidden.
 */

let sentinel: WakeLockSentinel | null = null;
let keepActive = false;

function isSupported(): boolean {
  return 'wakeLock' in navigator;
}

async function acquire(): Promise<void> {
  if (!isSupported() || sentinel) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    sentinel = null;
  }
}

function handleVisibilityChange(): void {
  if (keepActive && document.visibilityState === 'visible') {
    acquire();
  }
}

export async function requestWakeLock(): Promise<void> {
  keepActive = true;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  await acquire();
}

export async function releaseWakeLock(): Promise<void> {
  keepActive = false;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (sentinel) {
    try {
      await sentinel.release();
    } catch {
      // Already released
    }
    sentinel = null;
  }
}
