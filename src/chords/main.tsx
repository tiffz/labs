import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger'
import { getAppTheme } from '../shared/ui/theme/appTheme'
import App from './App.tsx'
import './styles/chords.css'

// Install server logging for this app
installServerLogger('CHORDS');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={getAppTheme('chords')}>
    <App />
  </ThemeProvider>
)

