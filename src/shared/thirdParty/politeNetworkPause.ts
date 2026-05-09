/**
 * Small delays between back-to-back third-party HTTP calls (pagination, retries) so bursts
 * are less likely to trip provider rate limits or anti-automation heuristics.
 */
export const POLITE_THIRD_PARTY_PAGE_GAP_MS = 120;

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}
