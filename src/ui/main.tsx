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
import '../shared/components/appSlider.css';
import '../shared/components/music/bpmInput.css';
import '../shared/components/music/keyInput.css';
import '../shared/components/music/chordProgressionInput.css';
import '../shared/components/music/chordStyleInput.css';
import './styles/ui.css';

installServerLogger('UI');
installLabsCrashHandlers('ui');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="ui">
    <React.StrictMode>
    <ThemeProvider theme={getAppTheme('chords')}>
    <App />
  </ThemeProvider>
  </React.StrictMode>
  </LabsErrorBoundary>
);
