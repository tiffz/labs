import '../shared/ui/fonts/appFonts';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import './styles/corp.css';
import CorpApp from './App';

// Install server logging for this app
installServerLogger('CORP');
initMaterialIconRuntime();

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(
    <ThemeProvider theme={getAppTheme('corp')}>
      <CorpApp />
    </ThemeProvider>
  );
}

