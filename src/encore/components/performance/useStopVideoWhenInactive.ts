import { useEffect, type RefObject } from 'react';

/** Pause (and reset) a native `<video>` when its host surface closes — e.g. performance editor modal. */
export function useStopVideoWhenInactive(
  active: boolean,
  videoRef: RefObject<HTMLVideoElement | null>,
): void {
  useEffect(() => {
    if (active) return;
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      /* Some browsers block seeking while loading. */
    }
  }, [active, videoRef]);
}
