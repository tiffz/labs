import { lazy, Suspense } from 'react';
import { ScalesProvider, useScales, hasEnabledMidiDevice } from './store';
import HomeScreen from './components/HomeScreen';
import ProgressScreen from './components/ProgressScreen';
import InputGateway from './components/InputGateway';
import { enableDebug } from './utils/practiceDebugLog';
import DebugPanel from './components/DebugPanel';
import { ScalesSessionDebugBridgeProvider } from './context/scalesSessionDebugBridge';
import SkipToMain from '../shared/components/SkipToMain';
import { readLabsDebugFromLocation } from '../shared/debug/readLabsDebugParams';
import { ScalesDriveBackupProvider } from './context/ScalesDriveBackupContext';

/** SessionScreen pulls ScoreDisplay/VexFlow — keep off the home-screen first paint. */
const SessionScreen = lazy(() => import('./components/SessionScreen'));
/** Free-practice + routines are secondary surfaces — lazy so they don't weigh the home paint. */
const FreePracticeScreen = lazy(() => import('./components/FreePracticeScreen'));
const RoutinesScreen = lazy(() => import('./components/RoutinesScreen'));

const debugMode = readLabsDebugFromLocation().debug;
if (debugMode) enableDebug();

function ScreenRouter() {
  const { state } = useScales();

  switch (state.screen) {
    case 'home':
      return <HomeScreen />;
    case 'session':
      return (
        <Suspense fallback={null}>
          <SessionScreen />
        </Suspense>
      );
    case 'progress':
      return <ProgressScreen />;
    case 'free-practice':
      return (
        <Suspense fallback={null}>
          <FreePracticeScreen />
        </Suspense>
      );
    case 'routines':
      return (
        <Suspense fallback={null}>
          <RoutinesScreen />
        </Suspense>
      );
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
      <ScalesSessionDebugBridgeProvider>
        <ScalesDriveBackupProvider>
          <AppContent />
        </ScalesDriveBackupProvider>
      </ScalesSessionDebugBridgeProvider>
    </ScalesProvider>
  );
}
