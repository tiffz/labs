import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import App from './App';
import './styles/piano.css';
import '../shared/components/music/appSharedThemes.css';

installServerLogger('PIANO');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={getAppTheme('piano')}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
