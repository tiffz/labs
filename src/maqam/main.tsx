import '../shared/ui/fonts/appFonts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import LabsErrorBoundary from '../shared/components/LabsErrorBoundary';
import {
  LabsKeyboardShortcutsHost,
  labsCommonHelpShortcutSection,
} from '../shared/keyboardShortcuts';
import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import '../shared/components/music/appSharedThemes.css';
import '../shared/components/music/onscreenPianoKeyboard.css';
import '../shared/styles/labsChrome.css';
import '../shared/layout/app-shell-layout.css';
import './maqam-layout.css';
import './maqam.css';
import App from './App';

installServerLogger('maqam');
installLabsCrashHandlers('maqam');
initMaterialIconRuntime();

// The `<main id="main">` landmark, <SkipToMain /> and the shell layout live in
// App.tsx — that is where `spaGuardrails.test.ts` looks for them, and where
// every other Labs app keeps them.
createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="maqam">
    <StrictMode>
      <ThemeProvider theme={getAppTheme('maqam')}>
        <CssBaseline />
        <LabsKeyboardShortcutsHost sections={() => [labsCommonHelpShortcutSection()]}>
          <App />
        </LabsKeyboardShortcutsHost>
      </ThemeProvider>
    </StrictMode>
  </LabsErrorBoundary>,
);
