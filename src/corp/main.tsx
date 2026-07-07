import '../shared/ui/fonts/appFonts';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger';
import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';
import LabsErrorBoundary from '../shared/components/LabsErrorBoundary';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import '../shared/components/music/appSharedThemes.css';
import '../shared/styles/labsChrome.css';
import './styles/corp.css';
import CorpApp from './App';

// Install server logging for this app
installServerLogger('CORP');
installLabsCrashHandlers('corp');
initMaterialIconRuntime();

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(
    <LabsErrorBoundary appId="corp">
      <StrictMode>
      <ThemeProvider theme={getAppTheme('corp')}>
        <CorpApp />
      </ThemeProvider>
      </StrictMode>
    </LabsErrorBoundary>,
  );
}

