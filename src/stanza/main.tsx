import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/600.css';
import '../shared/ui/fonts/appFonts';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { installServerLogger } from '../shared/utils/serverLogger';
import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';
import LabsErrorBoundary from '../shared/components/LabsErrorBoundary';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import App from './App';
import '../shared/components/music/appSharedThemes.css';
import '../shared/styles/labsChrome.css';
import './stanza.css';

installServerLogger('STANZA');
installLabsCrashHandlers('stanza');
initMaterialIconRuntime();

/**
 * Playwright sets `localStorage.STANZA_E2E_HOOKS = '1'` via `addInitScript` before navigation so
 * this works even when reusing an existing Vite dev server (no special env on the server process).
 */
if (import.meta.env.DEV) {
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem('STANZA_E2E_HOOKS') === '1') {
      void import('./e2e/stanzaE2eBootstrap').then((m) => m.installStanzaE2eHooks());
    }
  } catch {
    /* ignore private mode / blocked storage */
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="stanza">
    <StrictMode>
    <ThemeProvider theme={getAppTheme('stanza')}>
      <App />
    </ThemeProvider>
  </StrictMode>,
  </LabsErrorBoundary>
);
