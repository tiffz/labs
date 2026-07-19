import '../shared/ui/fonts/appFonts';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { LabsUndoProvider } from '../shared/undo/LabsUndoContext';
import { installServerLogger } from '../shared/utils/serverLogger';
import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';
import LabsErrorBoundary from '../shared/components/LabsErrorBoundary';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import { loadProsodyDictionary } from './utils/prosodyDictionary';
import '../shared/components/music/appSharedThemes.css';
import '../shared/styles/labsChrome.css';
import './styles/word-rhythm.css';

installServerLogger('WORDS');
installLabsCrashHandlers('words');
initMaterialIconRuntime();

const root = ReactDOM.createRoot(document.getElementById('root')!);

// The CMU dictionary (~3.6 MB) and the app tree load as separate lazy chunks
// so the eager entry stays small. The dictionary must finish before the app
// module evaluates — wordsAppDefaults generates the default rhythm at import
// time and the prosody engine reads the dictionary synchronously.
void (async () => {
  await loadProsodyDictionary();
  const { default: App } = await import('./App');
  root.render(
    <LabsErrorBoundary appId="words">
      <React.StrictMode>
        <LabsUndoProvider>
          <ThemeProvider theme={getAppTheme('words')}>
            <App />
          </ThemeProvider>
        </LabsUndoProvider>
      </React.StrictMode>
    </LabsErrorBoundary>
  );
})().catch((error: unknown) => {
  console.error('Words failed to load', error);
  root.render(
    <LabsErrorBoundary appId="words">
      <p role="alert">Words could not load. Check your connection and refresh the page.</p>
    </LabsErrorBoundary>
  );
});
