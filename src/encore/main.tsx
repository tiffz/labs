import '../shared/ui/fonts/appFonts';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import { EncoreProvider } from './context/EncoreContext';
import App from './App';
import { syncEncoreGuestShareRobotsFromHash } from './seo/guestShareRobots';
import './styles/encore.css';

installServerLogger('ENCORE');
initMaterialIconRuntime();

syncEncoreGuestShareRobotsFromHash();
window.addEventListener('hashchange', syncEncoreGuestShareRobotsFromHash);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={getAppTheme('encore')}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <EncoreProvider>
          <App />
        </EncoreProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
