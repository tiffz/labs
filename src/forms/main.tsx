import ReactDOM from 'react-dom/client';
import { installServerLogger } from '../shared/utils/serverLogger';
import App from './App';
import './styles/forms.css';

// Install server logging for this app
installServerLogger('FORMS');

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
