import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import App from './App';
import './styles/word-rhythm.css';
import '../shared/components/music/appSharedThemes.css';

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // Prevent stale PWA assets from masking local UI updates in dev.
  void navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => void registration.unregister());
  });
}

installServerLogger('WORDS');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={getAppTheme('words')}>
    <App />
  </ThemeProvider>
);
