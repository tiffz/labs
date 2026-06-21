import '../shared/ui/fonts/appFonts';
import '@fontsource/caveat/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import App from './App';
import './midi.css';
import '../shared/components/music/bpmInput.css';
import '../shared/components/music/playbackFieldSelect.css';
import '../shared/components/music/onscreenPianoKeyboard.css';

installServerLogger('MIDI');
initMaterialIconRuntime();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={getAppTheme('midi')}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
