/**
 * When the user switches YouTube ↔ uploaded practice source, clamp the playhead
 * to the destination transport duration so seek does not land past EOF.
 */
export function resolvePracticeSourceSwitchSeek(opts: {
  previousTime: number;
  destinationDurationSec: number | null;
  timeEps: number;
}): number {
  const { previousTime: t, destinationDurationSec: d, timeEps } = opts;
  if (d != null && d > 0 && Number.isFinite(t)) {
    return Math.max(0, Math.min(d - timeEps * 0.5, t));
  }
  return Number.isFinite(t) ? Math.max(0, t) : 0;
}
