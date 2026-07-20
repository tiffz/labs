import { useEffect } from 'react';
import { releaseWakeLock, requestWakeLock } from './wakeLock';

/**
 * Keep the device screen awake while audio practice playback is active.
 * Uses the Screen Wake Lock API; no-ops where unsupported.
 *
 * Note: this prevents *automatic* sleep/dimming during practice. If the user
 * locks the phone, browsers may still suspend Web Audio — prefer leaving the
 * screen on with this lock for metronome / chart loops.
 */
export function usePlaybackWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) {
      void releaseWakeLock();
      return;
    }
    void requestWakeLock();
    return () => {
      void releaseWakeLock();
    };
  }, [active]);
}
