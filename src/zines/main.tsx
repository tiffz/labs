import ReactDOM from 'react-dom/client'
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger'
import App from './App.tsx'
import './styles/zines.css'

// Install server logging for this app
installServerLogger('ZINES');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
) 