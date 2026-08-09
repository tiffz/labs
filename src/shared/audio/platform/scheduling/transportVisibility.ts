/**
 * Fire host callbacks on tab hide / show. A thin dispatcher — the host decides what
 * hide and show mean.
 *
 * Historically hosts PAUSED on hide: when Chrome suspends AudioContext, `currentTime`
 * freezes while `performance.now()` keeps advancing, and a host that clamped overdue
 * notes to "now" would blast a pile of voices on resume. With the single late gate
 * (ADR 0025) an overdue backlog is dropped, not clamped, so background playback can
 * keep scheduling while hidden and only re-anchor if the context actually suspended.
 */

export type TransportVisibilityHandlers = {
  /** Tab hidden (or page frozen). A background-playback host keeps scheduling here. */
  onHidden: () => void;
  /** Tab visible again — re-anchor the clock if it suspended while hidden. */
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
