import { useEffect, useRef } from 'react';

/**
 * Tell {@link EncoreMainShell} the heavy list tab has real content on screen (Dexie hydrated + one paint).
 * Fires once per active+ready cycle so keep-alive remounts do not spam the shell.
 */
export function useEncoreHeavyListTabLaidOut(
  active: boolean,
  ready: boolean,
  onHeavyTabLaidOut?: () => void,
): void {
  const signaledRef = useRef(false);

  useEffect(() => {
    if (!active) {
      signaledRef.current = false;
      return;
    }
    if (!ready || !onHeavyTabLaidOut) return;
    if (signaledRef.current) return;

    let cancelled = false;
    const outerRaf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled || signaledRef.current) return;
        signaledRef.current = true;
        onHeavyTabLaidOut();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(outerRaf);
    };
  }, [active, ready, onHeavyTabLaidOut]);
}
