/**
 * Server Logger - Sends console logs to Vite dev server terminal
 */
class ServerLogger {
  private static instance: ServerLogger;
  private isEnabled = false;

  static getInstance(): ServerLogger {
    if (!ServerLogger.instance) {
      ServerLogger.instance = new ServerLogger();
    }
    return ServerLogger.instance;
  }

  constructor() {
    // Enable in dev mode only
    this.isEnabled = import.meta.env.DEV;

    if (this.isEnabled && typeof window !== 'undefined') {
      // Global error hooks to capture uncaught exceptions and unhandled rejections
      window.addEventListener('error', (e: ErrorEvent) => {
        try {
          this.error('window.onerror', {
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
            stack: e.error?.stack || String(e.error)
          });
        } catch {
          // ignore
        }
      });
      window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
        try {
          this.error('unhandledrejection', {
            reason: (e.reason && (e.reason.stack || e.reason.message)) || String(e.reason)
          });
        } catch {
          // ignore
        }
      });

      // Proxy console methods to also send to the server (avoid loops)
      const original = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: console.debug.bind(console),
      } as const;

      const forward = (level: keyof typeof original) =>
        (...args: unknown[]) => {
          try {
            const message = args.map(a => (typeof a === 'string' ? a : '')).join(' ').trim();
            const data = args.length ? args : undefined;
            this.sendToServer(level, message || `[${level}]`, data);
          } catch {
            // ignore
          }
          original[level](...args);
        };

      console.log = forward('log');
      console.info = forward('info');
      console.warn = forward('warn');
      console.error = forward('error');
      console.debug = forward('debug');
    }
  }

  private async sendToServer(level: string, message: string, data?: unknown) {
    if (!this.isEnabled) return;

    try {
      const logData = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data: data ? JSON.stringify(data, null, 2) : undefined
      };

      // Send to a custom endpoint that Vite can intercept
      await fetch('/__debug_log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      }).catch(() => {
        // Fallback to console if server endpoint fails (debug only)
        if (import.meta.env.DEV) {
          console.debug(`[${level.toUpperCase()}] ${message}`, data || '');
        }
      });
    } catch {
      // Silent fail - don't break the app
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

export const serverLogger = ServerLogger.getInstance();