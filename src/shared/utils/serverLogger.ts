/**
 * Server Logger - Sends console logs to Vite dev server terminal
 * Shared utility for all micro-apps in the labs project
 */
class ServerLogger {
  private static instance: ServerLogger;
  private isEnabled = false;
  private appName: string;
  private logQueue: Array<{ level: string; message: string; data?: unknown; timestamp: string }> = [];
  private flushTimer: number | null = null;
  private handlingError = false; // Prevent recursive error handling

  static getInstance(appName: string = 'APP'): ServerLogger {
    if (!ServerLogger.instance) {
      ServerLogger.instance = new ServerLogger(appName);
    }
    return ServerLogger.instance;
  }

  constructor(appName: string = 'APP') {
    this.appName = appName.toUpperCase();
    
    // Enable in dev mode only, and skip entirely during E2E runs
    this.isEnabled = import.meta.env.DEV;

    // Allow enabling for tests via environment variable
    if (import.meta.env.VITEST) {
      this.isEnabled = true;
    }

    if (typeof window !== 'undefined') {
      // Playwright/E2E hint set via addInitScript in tests
      const isE2E = Boolean((window as unknown as { __E2E__?: boolean }).__E2E__);
      if (isE2E) {
        this.isEnabled = false;
      }
    }

    if (this.isEnabled && typeof window !== 'undefined') {
      // Global error hooks to capture uncaught exceptions and unhandled rejections
      window.addEventListener('error', (e: ErrorEvent) => {
        if (this.handlingError || !this.isEnabled) return;
        this.handlingError = true;
        try {
          this.error('early window.onerror', {
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
            stack: e.error?.stack || String(e.error)
          });
        } catch {
          // ignore
        } finally {
          this.handlingError = false;
        }
      });
      window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
        if (this.handlingError || !this.isEnabled) return;
        this.handlingError = true;
        try {
          this.error('early unhandledrejection', {
            reason: (e.reason && (e.reason.stack || e.reason.message)) || String(e.reason)
          });
        } catch {
          // ignore
        } finally {
          this.handlingError = false;
        }
      });

      // Don't proxy console methods - they create too much spam
      // Only capture explicit errors and critical logs
      // The original console methods remain unchanged
    }
  }

  private async sendToServer(level: string, message: string, data?: unknown) {
    if (!this.isEnabled || this.handlingError) return;

    // Add to queue instead of sending immediately (prevent memory leak from too many requests)
    const logData = {
      timestamp: new Date().toISOString(),
      app: this.appName,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };

    this.logQueue.push(logData);

    // Limit queue size to prevent memory buildup
    if (this.logQueue.length > 100) {
      this.logQueue.shift(); // Remove oldest log
    }

    // Batch send logs every 500ms to reduce network overhead
    if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => {
        this.flushLogs();
      }, 500);
    }
  }

  private async flushLogs() {
    if (!this.isEnabled || this.logQueue.length === 0) return;

    const logsToSend = [...this.logQueue];
    this.logQueue = []; // Clear queue
    this.flushTimer = null;

    try {
      // Send batched logs
      const response = await fetch('/__debug_log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend })
      });
      
      // If the endpoint doesn't exist, disable logging to prevent infinite loops
      if (response.status === 404) {
        console.warn('[ServerLogger] Debug endpoint not available, disabling server logging');
        this.isEnabled = false;
      }
    } catch (error) {
      // If fetch fails completely, disable logging to prevent infinite error loops
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('[ServerLogger] Debug endpoint unreachable, disabling server logging');
        this.isEnabled = false;
      }
      // Silent fail for other errors - don't break the app
    }
  }

  log(message: string, data?: unknown) {
    this.sendToServer('info', message, data);
  }

  error(message: string, data?: unknown) {
    this.sendToServer('error', message, data);
  }

  debug(message: string, data?: unknown) {
    this.sendToServer('debug', message, data);
  }

  warn(message: string, data?: unknown) {
    this.sendToServer('warn', message, data);
  }
}

/**
 * Install server logging and error handling for a micro-app
 * Call this BEFORE importing any other app modules to capture import-time errors
 */
export function installServerLogger(appName: string) {
  const serverLogger = ServerLogger.getInstance(appName);

  // Note: Error handlers are already set up in the ServerLogger constructor
  // No need to duplicate them here

  return serverLogger;
}

// Test helper to reset singleton (only for testing)
export function resetServerLoggerForTesting() {
  // @ts-expect-error - accessing private static property for testing
  ServerLogger.instance = undefined;
}
