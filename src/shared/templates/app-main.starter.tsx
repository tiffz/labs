/**
 * Starter main.tsx for new Labs micro-apps.
 *
 * 1. Copy to src/TODO_APP/main.tsx
 * 2. Copy app-index.starter.html → src/TODO_APP/index.html
 * 3. Copy app-layout.starter.css → src/TODO_APP/TODO_APP-layout.css (rename TODO_APP)
 * 4. Register TODO_APP in importBoundaries.test.ts + check-import-boundaries.mjs
 */

import '../shared/ui/fonts/appFonts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import SkipToMain from '../shared/components/SkipToMain';
import { AppShellLayout } from '../shared/layout/AppShellLayout';
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import '../shared/layout/app-shell-layout.css';
import './TODO_APP-layout.css';
import './TODO_APP.css';
import App from './App';

installServerLogger('TODO_APP');
initMaterialIconRuntime();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={getAppTheme('TODO_APP')}>
      <CssBaseline />
      <main id="main" className="TODO_APP">
        <SkipToMain />
        <AppShellLayout
          header={
            <header className="TODO_APP-header">
              <h1>TODO: App Name</h1>
            </header>
          }
        >
          <App />
        </AppShellLayout>
      </main>
    </ThemeProvider>
  </StrictMode>,
);
