import '../shared/ui/fonts/appFonts';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
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
import './muscle.css';

installServerLogger('MUSCLE');
installLabsCrashHandlers('muscle');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="muscle">
    <React.StrictMode>
    <ThemeProvider theme={getAppTheme('muscle')}>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
  </LabsErrorBoundary>
);
