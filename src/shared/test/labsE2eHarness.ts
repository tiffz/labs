/**
 * True when Playwright / Vite dev server runs e2e hooks. Never true on production Pages deploy.
 */
export function isLabsE2eHarness(): boolean {
  if (import.meta.env.DEV) return true;
  if (import.meta.env.MODE === 'test') return true;
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const hashQuery = window.location.hash.includes('?')
    ? new URLSearchParams(window.location.hash.split('?')[1] ?? '')
    : new URLSearchParams();
  return params.has('labsE2e') || hashQuery.has('labsE2e');
}
