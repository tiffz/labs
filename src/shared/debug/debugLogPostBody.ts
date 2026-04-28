/* eslint-disable no-console -- prints to the Node/Vite dev terminal only */
/**
 * Normalizes POST bodies sent to Vite's `/__debug_log` middleware.
 * Supports:
 * - Batched `{ logs: [...] }` from {@link ../utils/serverLogger.ts ServerLogger}
 * - Single-object payloads (e.g. cats index.html early error hook)
 */

export type DebugLogPostEntry = {
  timestamp?: string;
  level?: string;
  message?: string;
  app?: string;
  data?: unknown;
};

function coerceEntry(raw: unknown): DebugLogPostEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.message !== 'string') return null;
  return {
    timestamp: typeof o.timestamp === 'string' ? o.timestamp : undefined,
    level: typeof o.level === 'string' ? o.level : undefined,
    message: o.message,
    app: typeof o.app === 'string' ? o.app : undefined,
    data: o.data,
  };
}

/** Parses JSON body from `/__debug_log` into zero or more log lines to print. */
export function parseDebugLogPostBody(parsed: unknown): DebugLogPostEntry[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const o = parsed as Record<string, unknown>;
  if (Array.isArray(o.logs)) {
    return o.logs.map(coerceEntry).filter((e): e is DebugLogPostEntry => e !== null);
  }
  const single = coerceEntry(parsed);
  return single ? [single] : [];
}

/** Prints one batch of entries to the Node console (used by Vite dev middleware). */
export function printDebugLogEntriesToConsole(entries: DebugLogPostEntry[]): void {
  for (const logData of entries) {
    const timestamp = logData.timestamp
      ? new Date(logData.timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString();
    const level = (logData.level || 'info').toUpperCase();
    const app = logData.app || 'APP';
    const message = logData.message ?? '';
    const line = `\n[${app}-DEBUG ${timestamp}] [${level}] ${message}`;
    const method = String(logData.level || 'info').toLowerCase();
    const out: (...args: unknown[]) => void =
      method === 'error'
        ? console.error
        : method === 'warn'
          ? console.warn
          : method === 'debug'
            ? console.debug
            : method === 'info'
              ? console.info
              : console.log;
    out(line);
    if (logData.data !== undefined && logData.data !== null) {
      out(logData.data);
    }
  }
}
