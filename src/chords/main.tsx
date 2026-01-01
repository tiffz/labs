import ReactDOM from 'react-dom/client'
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger'
import App from './App.tsx'
import './styles/chords.css'

// Install server logging for this app
installServerLogger('CHORDS');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)

