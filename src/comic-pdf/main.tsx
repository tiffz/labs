import ReactDOM from 'react-dom/client';
import { installServerLogger } from '../shared/utils/serverLogger';
import App from './App';
import './styles/comic-pdf.css';

// Install server logging for this app
installServerLogger('COMIC-PDF');

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

