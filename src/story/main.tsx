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

installServerLogger('STORY');
installLabsCrashHandlers('story');
initMaterialIconRuntime();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <LabsErrorBoundary appId="story">
    <React.StrictMode>
      <ThemeProvider theme={getAppTheme('story')}>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  </LabsErrorBoundary>,
);

