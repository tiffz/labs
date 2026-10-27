import '../shared/ui/fonts/appFonts';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { installServerLogger } from '../shared/utils/serverLogger';
import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';
import LabsErrorBoundary from '../shared/components/LabsErrorBoundary';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import App from './App';
import { installGestureE2eSeedHook } from './e2e/gestureE2eSeed';
import { LABS_E2E_HOOKS_COMPILED_IN } from '../shared/test/labsE2eHooks';
import '../shared/components/music/appSharedThemes.css';
import '../shared/styles/labsChrome.css';
import './gesture.css';

installServerLogger('GESTURE');
installLabsCrashHandlers('gesture');
initMaterialIconRuntime();
if (LABS_E2E_HOOKS_COMPILED_IN) installGestureE2eSeedHook();

const theme = getAppTheme('gesture');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="gesture">
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </React.StrictMode>
  </LabsErrorBoundary>,
);
