import { Component, type ErrorInfo, type ReactNode } from 'react';
import { appendLabsCrashLogEntry } from '../utils/labsCrashLog';

export type LabsErrorBoundaryProps = {
  appId: string;
  children: ReactNode;
};

type LabsErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Shared render-error boundary for Labs micro-apps.
 * Recovery: Try again (clear boundary) or Reload (full page).
 */
export default class LabsErrorBoundary extends Component<
  LabsErrorBoundaryProps,
  LabsErrorBoundaryState
> {
  public state: LabsErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): LabsErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.appId}] render crash caught by boundary`, error, info?.componentStack);
    void appendLabsCrashLogEntry({
      appId: this.props.appId,
      message: error.message,
      stack: error.stack,
      source: 'error-boundary',
    });
  }

  private handleTryAgain = (): void => {
    this.setState({ hasError: false, error: null });
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
    } catch {
      /* ignore */
    }
  };

  public render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message?.trim() || 'An unexpected error occurred.';
    return (
      <div
        role="alert"
        className="labs-error-boundary"
        style={{
          maxWidth: 520,
          margin: '64px auto',
          padding: '24px 28px',
          border: '1px solid var(--theme-border, #d6d3cc)',
          borderRadius: 12,
          background: 'var(--theme-surface, #fffaf5)',
          color: 'var(--theme-text, #1d1d1f)',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          textAlign: 'center',
          boxShadow: '0 6px 24px rgba(29,29,31,0.08)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 600 }}>
          Something went wrong
        </h2>
        <p style={{ margin: '0 0 8px', fontSize: '0.95rem', lineHeight: 1.5, opacity: 0.85 }}>
          Your data on this device should be safe. Try again, or reload the page.
        </p>
        <p
          style={{
            margin: '0 0 18px',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            color: 'var(--theme-text-muted, #5f5f63)',
            wordBreak: 'break-word',
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={this.handleTryAgain} className="labs-error-boundary__retry">
            Try again
          </button>
          <button type="button" onClick={this.handleReload} className="labs-error-boundary__reload">
            Reload
          </button>
          <button type="button" onClick={() => void this.handleCopyError()} className="labs-error-boundary__copy">
            Copy error
          </button>
        </div>
      </div>
    );
  }
}
