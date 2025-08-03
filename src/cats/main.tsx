// React import not needed for this file
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/cats.css'

// Disable StrictMode temporarily to reduce development re-renders
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
) 