/* eslint-disable no-console -- intentional DevTools mirror beside ServerLogger */
/**
 * Structured debug logging for labs apps. When `?debug` or `?dev` is enabled in dev,
 * messages go to the browser console and to {@link ../utils/serverLogger.ts ServerLogger}
 * (Vite `/__debug_log`). Use for non-hot-path diagnostics; keep payloads small.
 */

import { installServerLogger } from '../utils/serverLogger';
import { isLabsDebugEnabled } from './readLabsDebugParams';

function devDebugActive(): boolean {
  return import.meta.env.DEV && typeof window !== 'undefined' && isLabsDebugEnabled(window.location.search);
}

function forwardInfoOrDebug(level: 'info' | 'debug', message: string, data?: unknown): void {
  if (!import.meta.env.DEV) return;
  console.debug('[labs-debug]', message, data ?? '');
  const logger = installServerLogger('LABS');
  if (level === 'info') logger.log(message, data);
  else logger.debug(message, data);
}

export const labsDebug = {
  info(message: string, data?: unknown): void {
    if (!devDebugActive()) return;
    forwardInfoOrDebug('info', message, data);
  },

  debug(message: string, data?: unknown): void {
    if (!devDebugActive()) return;
    forwardInfoOrDebug('debug', message, data);
  },

  /** Warnings still reach the dev server even without URL debug flags. */
  warn(message: string, data?: unknown): void {
    if (!import.meta.env.DEV) return;
    console.warn('[labs-debug]', message, data ?? '');
    installServerLogger('LABS').warn(message, data);
  },
};
