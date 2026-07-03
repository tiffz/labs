/** Coalesce duplicate loop wraps from RAF stall + media `ended` in the same turn. */
export const STANZA_LOOP_WRAP_COALESCE_MS = 100;

export type StanzaLoopWrapGuard = {
  tryPerform: (nowMs?: number) => boolean;
  reset: () => void;
};

export function createStanzaLoopWrapGuard(coalesceMs: number = STANZA_LOOP_WRAP_COALESCE_MS): StanzaLoopWrapGuard {
  let inFlightUntil = 0;
  return {
    tryPerform(nowMs: number = performance.now()): boolean {
      if (nowMs < inFlightUntil) return false;
      inFlightUntil = nowMs + coalesceMs;
      return true;
    },
    reset() {
      inFlightUntil = 0;
    },
  };
}
