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
import './styles/chords.css'

// Install server logging for this app
installServerLogger('CHORDS');
installLabsCrashHandlers('chords');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="chords">
  <ThemeProvider theme={getAppTheme('chords')}>
    <App />
  </ThemeProvider>
  </LabsErrorBoundary>
)

