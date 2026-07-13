import '../shared/ui/fonts/appFonts';
import React from 'react';
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
import './styles/scrapboard.css';

installServerLogger('SCRAPBOARD');
installLabsCrashHandlers('scrapboard');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="scrapboard">
    <React.StrictMode>
      <ThemeProvider theme={getAppTheme('scrapboard')}>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  </LabsErrorBoundary>,
);
