import '../shared/ui/fonts/appFonts';
import '../shared/ui/fonts/appFontsJetBrainsMono';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import App from './App';
import './styles/pulse.css';

installServerLogger('COUNT');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={getAppTheme('pulse')}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
