import { useEffect } from 'react';

import { releaseWakeLock, requestWakeLock } from '../../shared/audio/wakeLock';

/**
 * Keeps the screen awake while Stanza transport is playing (phone practice sessions).
 * Uses the shared Screen Wake Lock helper; no-ops on unsupported browsers.
 */
export function useStanzaPlaybackWakeLock(isPlaying: boolean): void {
  useEffect(() => {
    if (!isPlaying) {
      void releaseWakeLock();
      return;
    }
    void requestWakeLock();
    return () => {
      void releaseWakeLock();
    };
  }, [isPlaying]);
}
