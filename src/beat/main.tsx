import ReactDOM from 'react-dom/client';
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger';
import App from './App';
import './styles/beat.css';

// Install server logging for this app
installServerLogger('BEAT');

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
