import '../shared/ui/fonts/appFonts'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger'
import { getAppTheme } from '../shared/ui/theme/appTheme'
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap'
import App from './App.tsx'
import './styles/chords.css'
import '../shared/components/music/appSharedThemes.css'

// Install server logging for this app
installServerLogger('CHORDS');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={getAppTheme('chords')}>
    <App />
  </ThemeProvider>
)

