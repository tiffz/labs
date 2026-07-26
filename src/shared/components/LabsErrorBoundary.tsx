import { Component, type ErrorInfo, type ReactNode } from 'react';
import { appendLabsCrashLogEntry } from '../utils/labsCrashLog';
import './LabsErrorBoundary.css';

export type LabsErrorBoundaryProps = {
  appId: string;
  children: ReactNode;
};

type LabsErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
  /** Tripped when the boundary catches repeatedly — a persistent throw loop. */
  fatal: boolean;
};

// Circuit breaker: if the boundary catches this many times within the window, the subtree
// is looping (e.g. an OOM keeps re-throwing). "Try again" just re-enters the same failure and
// each catch allocates + logs, feeding the spiral — so we go fatal: stop logging, offer only
// Reload. Pairs with the crash-logger rate-limit in labsCrashLog.ts.
const CATCH_LIMIT = 3;
const CATCH_WINDOW_MS = 3000;

/**
 * Shared render-error boundary for Labs micro-apps.
 * Recovery: Try again (clear boundary) or Reload (full page). After a repeated-throw loop it
 * goes fatal and offers only Reload, so it can't spiral.
 */
export default class LabsErrorBoundary extends Component<
  LabsErrorBoundaryProps,
  LabsErrorBoundaryState
> {
  public state: LabsErrorBoundaryState = {
    hasError: false,
    error: null,
    copied: false,
    fatal: false,
  };

  private catchTimestamps: number[] = [];

  public static getDerivedStateFromError(error: Error): Partial<LabsErrorBoundaryState> {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    const now = Date.now();
    this.catchTimestamps = this.catchTimestamps.filter((t) => now - t < CATCH_WINDOW_MS);
    this.catchTimestamps.push(now);
    const looping = this.catchTimestamps.length >= CATCH_LIMIT;

    console.error(`[${this.props.appId}] render crash caught by boundary`, error, info?.componentStack);
    // Stop logging once fatal — the logger allocates + reads-and-sorts and would feed an OOM.
    if (!this.state.fatal) {
      void appendLabsCrashLogEntry({
        appId: this.props.appId,
        message: error.message,
        stack: error.stack,
        source: 'error-boundary',
      });
    }
    if (looping && !this.state.fatal) {
      this.setState({ fatal: true });
    }
  }

  private handleTryAgain = (): void => {
    this.setState({ hasError: false, error: null, copied: false });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleCopyError = async (): Promise<void> => {
    const text = [
      `app: ${this.props.appId}`,
      `route: ${window.location.href}`,
      `message: ${this.state.error?.message ?? ''}`,
      this.state.error?.stack ?? '',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
    } catch {
      this.setState({ copied: false });
    }
  };

  public render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message?.trim() || 'An unexpected error occurred.';
    const { fatal } = this.state;
    return (
      <div role="alert" className="labs-error-boundary-page">
        <div className="labs-error-boundary-card">
          <div className="labs-error-boundary-icon" aria-hidden="true">
            !
          </div>
          <h2 className="labs-error-boundary-title">Something went wrong</h2>
          <p className="labs-error-boundary-lede">
            {fatal
              ? 'Your data on this device should be safe. Reload the page to continue.'
              : 'Your data on this device should be safe. Try again, or reload the page.'}
          </p>
          <div className="labs-error-boundary-actions">
            {/* Once fatal (a repeated-throw loop), Try again would just re-enter the failure. */}
            {!fatal ? (
              <button
                type="button"
                onClick={this.handleTryAgain}
                className="labs-error-boundary-btn labs-error-boundary-btn--primary"
              >
                Try again
              </button>
            ) : null}
            <button
              type="button"
              onClick={this.handleReload}
              className={`labs-error-boundary-btn ${fatal ? 'labs-error-boundary-btn--primary' : 'labs-error-boundary-btn--secondary'}`}
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => void this.handleCopyError()}
              className="labs-error-boundary-btn labs-error-boundary-btn--ghost"
            >
              Copy error
            </button>
          </div>
          {this.state.copied ? (
            <p className="labs-error-boundary-copy-hint">Error details copied.</p>
          ) : null}
          <details className="labs-error-boundary-details">
            <summary>Technical details</summary>
            <p className="labs-error-boundary-message">{message}</p>
          </details>
        </div>
      </div>
    );
  }
}
