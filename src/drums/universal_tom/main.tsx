import ReactDOM from 'react-dom/client'
import { installServerLogger } from '../../shared/utils/serverLogger'
import UniversalTomApp from './UniversalTomApp'
import '../styles/drums.css'

// Install server logging
installServerLogger('DRUMS-UT');

ReactDOM.createRoot(document.getElementById('root')!).render(
    <UniversalTomApp />
)
