import '../shared/ui/fonts/appFonts';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { LabsBlockingJobProvider } from '../shared/jobs/LabsBlockingJobContext';
import { installServerLogger } from '../shared/utils/serverLogger';
import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';
import LabsErrorBoundary from '../shared/components/LabsErrorBoundary';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import App from './App';
import '../shared/components/music/appSharedThemes.css';
import '../shared/styles/labsChrome.css';
import './styles/scales.css';

installServerLogger('SCALES');
installLabsCrashHandlers('scales');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="scales">
    <React.StrictMode>
    <ThemeProvider theme={getAppTheme('scales')}>
      <LabsBlockingJobProvider unloadCaption="Keep this tab open while practice progress syncs to Drive.">
        <App />
      </LabsBlockingJobProvider>
    </ThemeProvider>
  </React.StrictMode>
  </LabsErrorBoundary>
);
