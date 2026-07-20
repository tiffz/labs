/**
 * Pause look-ahead transports when the tab is hidden and re-anchor on return.
 *
 * When Chrome suspends AudioContext, `currentTime` freezes while `performance.now()`
 * keeps advancing. Hosts that map perf→audio time then clamp every overdue note to
 * "now"; on resume they fire as one loud blast. Pausing scheduling + flushing voices
 * on hide, then re-anchoring on show, prevents that.
 */

export type TransportVisibilityHandlers = {
  /** Tab hidden (or page frozen) — stop scheduling and silence active voices. */
  onHidden: () => void;
  /** Tab visible again — re-anchor clocks and resume if still "playing". */
  onVisible: () => void;
};

export function attachTransportVisibilityGuard(handlers: TransportVisibilityHandlers): () => void {
  let hidden = typeof document !== 'undefined' && document.hidden;

  const onVisibility = () => {
    const nextHidden = document.hidden;
    if (nextHidden === hidden) return;
    hidden = nextHidden;
    if (nextHidden) handlers.onHidden();
    else handlers.onVisible();
  };

  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
