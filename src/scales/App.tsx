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
  const { state, audioBootstrapping, midiReady } = useScales();
  const hasInput = hasEnabledMidiDevice(state) || state.microphoneActive;
  // Wait out mic permission restore AND the first Web MIDI enumeration so
  // "Connect your piano" does not flash for users whose keyboard is
  // already plugged in (midiDevices is empty until requestMIDIAccess resolves).
  const suppressConnectModal = audioBootstrapping || !midiReady;

  return (
    <div className="scales-app">
      <SkipToMain />
      <main id="main" className="scales-main">
        <ScreenRouter />
      </main>
      {!hasInput && !suppressConnectModal && <InputGateway />}
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
