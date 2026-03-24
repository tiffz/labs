import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={getAppTheme('story')}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

