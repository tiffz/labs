import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger'
import './styles/cats.css'
import App from './App.tsx'
import { CoordinateSystemProvider } from './context/CoordinateSystemContext'
import WorldProvider from './context/WorldProvider'

// Install server logging for this app
installServerLogger('CATS');

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