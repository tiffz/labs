import ReactDOM from 'react-dom/client';
import { installServerLogger } from '../shared/utils/serverLogger';
import App from './App';
import '../drums/styles/drums.css';
import './styles/word-rhythm.css';

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // Prevent stale PWA assets from masking local UI updates in dev.
  void navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => void registration.unregister());
  });
}

installServerLogger('WORDS');

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
