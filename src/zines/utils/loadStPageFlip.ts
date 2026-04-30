import pageFlipBrowserUrl from 'page-flip/dist/js/page-flip.browser.js?url';

let loadPromise: Promise<void> | null = null;

/**
 * Loads StPageFlip once (HTML mode). BookReader calls this before `new St.PageFlip(...)`.
 * Uses the npm package URL so Vite fingerprints the asset; no CDN on the critical path.
 */
export function loadStPageFlip(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (window.St?.PageFlip) {
    return Promise.resolve();
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = pageFlipBrowserUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loadPromise = null;
        reject(new Error('Failed to load PageFlip'));
      };
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}
