import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { installServerLogger } from '../shared/utils/serverLogger';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import App from './App';
import './styles/ui.css';
import '../shared/components/appSlider.css';
import '../shared/components/music/bpmInput.css';
import '../shared/components/music/keyInput.css';
import '../shared/components/music/chordProgressionInput.css';
import '../shared/components/music/chordStyleInput.css';
import '../shared/components/music/appSharedThemes.css';

installServerLogger('UI');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={getAppTheme('chords')}>
    <App />
  </ThemeProvider>
);
