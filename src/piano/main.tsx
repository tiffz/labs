import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import App from './App';
import './styles/piano.css';
import '../shared/components/music/appSharedThemes.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={getAppTheme('piano')}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
