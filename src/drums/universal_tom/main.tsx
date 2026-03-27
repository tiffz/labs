import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { installServerLogger } from '../../shared/utils/serverLogger'
import { getAppTheme } from '../../shared/ui/theme/appTheme'
import UniversalTomApp from './UniversalTomApp'
import '../styles/drums.css'
import '../../shared/components/music/appSharedThemes.css'

// Install server logging
installServerLogger('DRUMS-UT');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={getAppTheme('drums')}>
    <UniversalTomApp />
  </ThemeProvider>
)
