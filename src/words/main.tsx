import ReactDOM from 'react-dom/client';
import { installServerLogger } from '../shared/utils/serverLogger';
import App from '../word_rhythm/App';
import '../drums/styles/drums.css';
import '../word_rhythm/styles/word-rhythm.css';

installServerLogger('WORDS');

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
