import './LocalDevBadge.css';

/**
 * True only when the page is served from a local dev host. This is the semantic
 * question the badge actually cares about ("am I on my machine or the deployed
 * site?") — independent of Vite's build mode, so it holds even if a bundle is
 * mis-built without production mode.
 */
function isLocalDevHost(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    host.endsWith('.local')
  );
}

/**
 * Ambient environment indicator for the owner. Shows a tiny fixed corner badge
 * only on the local Vite dev server, so it is obvious at a glance whether a tab
 * is localhost or the deployed production build.
 *
 * Two independent gates, because a bundle built WITHOUT production mode (so
 * `import.meta.env.DEV` is `true`) once shipped to the real site and rendered the
 * badge there — defeating its whole purpose:
 *
 * 1. `import.meta.env.DEV` — `false` in a correct prod build, so the whole
 *    component tree-shakes out entirely.
 * 2. `isLocalDevHost()` — refuses to render on any deployed origin
 *    (labs.tiffzhang.com, *.github.io, …), so even a mis-built dev-mode bundle
 *    that reaches prod never shows the badge.
 *
 * It is NOT a `?debug` tier control. Non-interactive (`pointer-events: none`), so
 * it never blocks clicks on the UI beneath it. Mounted once in
 * `LabsErrorBoundary`, which every micro-app wraps its root in, so all apps get it
 * without per-app edits.
 */
export default function LocalDevBadge(): React.JSX.Element | null {
  if (!import.meta.env.DEV) return null;
  if (!isLocalDevHost()) return null;
  return (
    <div className="labs-local-dev-badge" aria-hidden="true">
      LOCAL
    </div>
  );
}
