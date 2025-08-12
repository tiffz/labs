import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/cats.css'
import { serverLogger } from './utils/serverLogger'

// Dev-only: Proxy all console.* to also send logs to the dev server
if (import.meta.env.DEV && typeof window !== 'undefined' && !(window as unknown as { __consoleProxied?: boolean }).__consoleProxied) {
  (window as unknown as { __consoleProxied?: boolean }).__consoleProxied = true;
  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  const safeSerialize = (value: unknown): string => {
    const seen = new WeakSet();
    try {
      return JSON.stringify(
        value,
        (key, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val as object)) return '[Circular]';
            seen.add(val as object);
          }
          if (typeof val === 'function') return `[Function ${val.name || 'anonymous'}]`;
          if (val instanceof Error) return { name: val.name, message: val.message, stack: val.stack };
          return val;
        }
      );
    } catch {
      try { return String(value); } catch { return '[Unserializable]'; }
    }
  };

  const sendToServer = (level: string, args: unknown[]) => {
    try {
      // Build a concise message string and attach structured data
      const message = args.map(a => {
        if (typeof a === 'string') return a;
        return '';
      }).join(' ').trim();

      const data = args.length ? safeSerialize(args) : undefined;
      // Post directly; do not use console.* inside this function to avoid loops
      fetch('/__debug_log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level, message, data })
      }).catch(() => {
        // ignore network error sending debug log
      });
    } catch {
      // ignore serialization failure
    }
  };

  const wrap = (level: keyof typeof originalConsole) =>
    (...args: unknown[]) => {
      sendToServer(level, args);
      originalConsole[level](...args);
    };

  console.log = wrap('log');
  console.info = wrap('info');
  console.warn = wrap('warn');
  console.error = wrap('error');
  console.debug = wrap('debug');
}

// Global error wiring for dev: send to dev server
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.addEventListener('error', (event: ErrorEvent) => {
    try {
      serverLogger.error('window.onerror', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack || String(event.error)
      });
    } catch {
      // ignore
    }
  });
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    try {
      serverLogger.error('unhandledrejection', {
        reason: event.reason?.stack || String(event.reason)
      });
    } catch {
      // ignore
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
) 

// Mark fonts as loaded as soon as the Material Symbols stylesheet is ready to avoid ligature text flash
try {
  if (document.fonts) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-loaded');
    }).catch(() => {
      document.documentElement.classList.add('fonts-loaded');
    });
  } else {
    document.documentElement.classList.add('fonts-loaded');
  }
} catch {
  document.documentElement.classList.add('fonts-loaded');
}