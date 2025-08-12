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