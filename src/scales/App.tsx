import { ScalesProvider, useScales, hasEnabledMidiDevice } from './store';
import HomeScreen from './components/HomeScreen';
import SessionScreen from './components/SessionScreen';
import ProgressScreen from './components/ProgressScreen';
import InputGateway from './components/InputGateway';
import { enableDebug } from './utils/practiceDebugLog';
import DebugPanel from './components/DebugPanel';
import SkipToMain from '../shared/components/SkipToMain';

const debugMode = new URLSearchParams(window.location.search).has('debug');
if (debugMode) enableDebug();

function ScreenRouter() {
  const { state } = useScales();

  switch (state.screen) {
    case 'home':
      return <HomeScreen />;
    case 'session':
      return <SessionScreen />;
    case 'progress':
      return <ProgressScreen />;
    default:
      return <HomeScreen />;
  }
}

function AppContent() {
  const { state, audioBootstrapping } = useScales();
  const hasInput = hasEnabledMidiDevice(state) || state.microphoneActive;

  return (
    <div className="scales-app">
      <SkipToMain />
      <main id="main" className="scales-main">
        <ScreenRouter />
      </main>
      {!hasInput && !audioBootstrapping && <InputGateway />}
      {debugMode && <DebugPanel />}
    </div>
  );
}

export default function App() {
  return (
    <ScalesProvider>
      <AppContent />
    </ScalesProvider>
  );
}
