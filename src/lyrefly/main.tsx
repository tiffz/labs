import '../shared/ui/fonts/appFonts';
import './fonts/lyreflyFonts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { installServerLogger } from '../shared/utils/serverLogger';
import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';
import LabsErrorBoundary from '../shared/components/LabsErrorBoundary';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import { LabsBlockingJobProvider } from '../shared/jobs/LabsBlockingJobContext';
import '../shared/components/music/appSharedThemes.css';
import '../shared/styles/labsChrome.css';
import '../shared/layout/app-shell-layout.css';
import '../shared/zine/comicScrollReader.css';
import './lyrefly-layout.css';
import './styles/lyrefly.css';
import App from './App';
import { LyreflyThemeProvider } from './context/LyreflyThemeContext';

installServerLogger('LYREFLY');
installLabsCrashHandlers('lyrefly');
initMaterialIconRuntime();

createRoot(document.getElementById('root')!).render(
  <LabsErrorBoundary appId="lyrefly">
    <StrictMode>
      <LyreflyThemeProvider>
        <LabsBlockingJobProvider unloadCaption="Keep this tab open. Closing it can cancel a Drive backup in progress.">
          <App />
        </LabsBlockingJobProvider>
      </LyreflyThemeProvider>
    </StrictMode>
  </LabsErrorBoundary>,
);
