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

/**
 * Tempo-detection accuracy check, scored against the user's OWN tapped tempos.
 *
 * Run from the console: `await __stanzaTempoEval()`. Full debug tier only — it reads the library
 * and prints song titles. Lazily imported so Essentia never enters the normal bundle.
 *
 * This exists because the committed tempo fixtures are synthetic and all generated at 44100 Hz,
 * so they cannot distinguish a good detector from a bad one. Songs the user tapped by hand are
 * real, human-labelled ground truth that never has to leave the device.
 */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__stanzaTempoEval = async (limit?: number) => {
    const { isLabsDebugFull } = await import('../shared/debug/labsDebugAccess');
    if (!isLabsDebugFull()) {
      return 'Full debug tier required. Open on localhost or sign in as the owner, with ?debug.';
    }
    const { runStanzaTempoEval } = await import('./debug/stanzaTempoEval');
    const result = await runStanzaTempoEval({
      limit,
      onProgress: (done, total, title) => {
        // eslint-disable-next-line no-console
        console.info(`[tempo-eval] ${done}/${total} ${title}`);
      },
    });
    // eslint-disable-next-line no-console
    console.info(result.report);
    return result;
  };
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
