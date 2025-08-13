import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { serverLogger } from './utils/serverLogger'
import './styles/cats.css'
import App from './App.tsx'
import { CoordinateSystemProvider } from './context/CoordinateSystemContext'
import WorldProvider from './context/WorldProvider'

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
  }, true);
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
    <CoordinateSystemProvider>
      <WorldProvider>
        <App />
      </WorldProvider>
    </CoordinateSystemProvider>
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