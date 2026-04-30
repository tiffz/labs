import '../shared/ui/fonts/appFonts';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger'
import { getAppTheme } from '../shared/ui/theme/appTheme'
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap'
import App from './App.tsx'
import './styles/zines.css'

// Install server logging for this app
installServerLogger('ZINES');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={getAppTheme('zines')}>
    <App />
  </ThemeProvider>
) 