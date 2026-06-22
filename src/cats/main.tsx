import '../shared/ui/fonts/appFonts'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger'
import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';
import LabsErrorBoundary from '../shared/components/LabsErrorBoundary';
import { getAppTheme } from '../shared/ui/theme/appTheme'
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap'
import './styles/cats.css'
import App from './App.tsx'
import { CoordinateSystemProvider } from './context/CoordinateSystemContext'
import WorldProvider from './context/WorldProvider'

// Install server logging for this app
installServerLogger('CATS');
installLabsCrashHandlers('cats');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="cats">
  <StrictMode>
    <ThemeProvider theme={getAppTheme('cats')}>
      <CoordinateSystemProvider>
        <WorldProvider>
          <App />
        </WorldProvider>
      </CoordinateSystemProvider>
    </ThemeProvider>
  </StrictMode>
  </LabsErrorBoundary>
)