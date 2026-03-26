import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/ui.css';
import '../shared/components/appSlider.css';
import '../shared/components/music/bpmInput.css';
import '../shared/components/music/keyInput.css';
import '../shared/components/music/chordProgressionInput.css';
import '../shared/components/music/chordStyleInput.css';
import '../shared/components/music/appSharedThemes.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
