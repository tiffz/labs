import '../shared/ui/fonts/appFonts'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger'
import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';
import LabsErrorBoundary from '../shared/components/LabsErrorBoundary';
import { getAppTheme } from '../shared/ui/theme/appTheme'
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap'
import App from './App.tsx'
import '../shared/components/music/appSharedThemes.css'
import './styles/drums.css'

// Install server logging for this app
installServerLogger('DRUMS');
installLabsCrashHandlers('drums');
initMaterialIconRuntime();

// Warm the VexFlow chunk after first paint so the staff loads without blocking input.
if (typeof window !== 'undefined') {
  const prefetchVexFlow = () => {
    void import('./components/VexFlowRenderer');
  };
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(prefetchVexFlow, { timeout: 2500 });
  } else {
    window.setTimeout(prefetchVexFlow, 100);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="drums">
  <ThemeProvider theme={getAppTheme('drums')}>
    <App />
  </ThemeProvider>
  </LabsErrorBoundary>
)

