import './LocalDevBadge.css';

/**
 * Ambient environment indicator for the owner. Shows a tiny fixed corner badge
 * only on the local Vite dev server, so it is obvious at a glance whether a tab
 * is localhost or the deployed production build.
 *
 * Gated on `import.meta.env.DEV` (true on the dev server, false in the prod
 * build) so it is tree-shaken out of production entirely — it is NOT a `?debug`
 * tier control. Non-interactive (`pointer-events: none`), so it never blocks
 * clicks on the UI beneath it.
 *
 * Mounted once in `LabsErrorBoundary`, which every micro-app wraps its root in,
 * so all apps get it without per-app edits.
 */
export default function LocalDevBadge(): React.JSX.Element | null {
  if (!import.meta.env.DEV) return null;
  return (
    <div className="labs-local-dev-badge" aria-hidden="true">
      LOCAL
    </div>
  );
}
