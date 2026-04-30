/**
 * In development, Encore relies on `127.0.0.1` for Spotify OAuth. Browsers also keep a **separate** IndexedDB and
 * `localStorage` origin for `localhost` vs `127.0.0.1`, so you would otherwise see two libraries. Redirect unifies dev.
 */
export function shouldRedirectLocalhostToLoopbackInDev(): boolean {
  return import.meta.env.DEV && typeof window !== 'undefined' && window.location.hostname === 'localhost';
}

export function replaceLocalhostWithLoopbackOrigin(): void {
  const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  window.location.replace(
    `http://127.0.0.1:${port}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}
