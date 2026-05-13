/**
 * StanzaErrorBoundary — last-ditch render-error catcher for the Stanza app.
 *
 * Why a dedicated boundary (not the shared `ErrorBoundary` in `src/zines/`):
 *   - That one uses Tailwind classes Stanza doesn't ship; the fallback would render
 *     unstyled.
 *   - Stanza state lives in IndexedDB / localStorage, so we want a fallback that
 *     points the user at "Reload" first (HMR / network glitch) and at a hard reset
 *     only when reload doesn't recover. Stanza's library survives both because
 *     the data lives in Dexie, not in component state.
 *
 * Recovery contract:
 *   - `Try again` clears the boundary's `hasError` flag so React re-renders the
 *     subtree. Useful when the failure was a transient prop / `useLiveQuery` race
 *     and the underlying state has since moved on.
 *   - `Reload` does a full page reload (cheap; Stanza is a tiny bundle and Dexie
 *     keeps the library + markers).
 *
 * Logging:
 *   - `componentDidCatch` forwards to `console.error` so the dev `?debug` dock and
 *     `serverLogger` can capture the trace. We deliberately do NOT auto-clear on
 *     mount — once a render has thrown, repeated retries with the same state can
 *     infinite-loop, so the user has to choose.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface StanzaErrorBoundaryProps {
  children: ReactNode;
}

interface StanzaErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class StanzaErrorBoundary extends Component<
  StanzaErrorBoundaryProps,
  StanzaErrorBoundaryState
> {
  public state: StanzaErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): StanzaErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[stanza] render crash caught by boundary', error, info?.componentStack);
  }

  private handleTryAgain = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message?.trim() || 'An unexpected error occurred.';
    return (
      <div
        role="alert"
        className="stanza-error-boundary"
        style={{
          maxWidth: 520,
          margin: '64px auto',
          padding: '24px 28px',
          border: '1px solid var(--stanza-line, #d6d3cc)',
          borderRadius: 12,
          background: 'var(--stanza-card-bg, #fffaf5)',
          color: 'var(--stanza-text, #1d1d1f)',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          textAlign: 'center',
          boxShadow: '0 6px 24px rgba(29,29,31,0.08)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 600 }}>
          Stanza hit a snag
        </h2>
        <p style={{ margin: '0 0 8px', fontSize: '0.95rem', lineHeight: 1.5, opacity: 0.85 }}>
          Your library and section edits stay safe on this device. Try again, or reload the page.
        </p>
        <p
          style={{
            margin: '0 0 18px',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            color: 'var(--stanza-text-muted, #5f5f63)',
            wordBreak: 'break-word',
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={this.handleTryAgain}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--stanza-line, #d6d3cc)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--stanza-accent, #1d1d1f)',
              color: 'var(--stanza-accent-on, #fff)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
