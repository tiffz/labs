/** Caps practice intensity used for the practice-time meter (same scale as prior tile heat). */
const HEAT_MAX_MS = 300_000;

export function stanzaBarHeatT(totalMs: number): number {
  return Math.min(1, totalMs / HEAT_MAX_MS);
}
