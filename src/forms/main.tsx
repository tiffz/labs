import '../shared/ui/fonts/appFonts';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import { initMaterialIconRuntime } from '../shared/ui/icons/materialIconsBootstrap';
import App from './App';
import './styles/forms.css';

// Install server logging for this app
installServerLogger('FORMS');
initMaterialIconRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={getAppTheme('forms')}>
    <App />
  </ThemeProvider>
);
