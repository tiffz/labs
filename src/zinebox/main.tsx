import '../shared/ui/fonts/appFonts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installServerLogger } from '../shared/utils/serverLogger';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import { LabsBlockingJobProvider } from '../shared/jobs/LabsBlockingJobContext';
import '../shared/layout/app-shell-layout.css';
import './zinebox-layout.css';
import './styles/zinebox.css';
import './styles/zinebox-design-themes.css';
import './styles/zinebox-design-riso.css';
import App from './App';
import { ZineboxDesignThemeProvider } from './context/ZineboxDesignThemeContext';

installServerLogger('ZINEBOX');
initMaterialIconRuntime();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ZineboxDesignThemeProvider>
      <LabsBlockingJobProvider unloadCaption="Keep this tab open. Closing it can cancel an import in progress.">
        <App />
      </LabsBlockingJobProvider>
    </ZineboxDesignThemeProvider>
  </StrictMode>,
);
