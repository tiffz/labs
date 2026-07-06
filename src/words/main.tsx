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
import App from './App';
import '../shared/components/music/appSharedThemes.css';
import '../shared/styles/labsChrome.css';
import './styles/word-rhythm.css';

installServerLogger('WORDS');
installLabsCrashHandlers('words');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
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
