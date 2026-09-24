import { lazy, Suspense } from 'react';
import { ScalesProvider, useScales, hasEnabledMidiDevice } from './store';
import HomeScreen from './components/HomeScreen';
import ProgressScreen from './components/ProgressScreen';
import InputGateway from './components/InputGateway';
import { enableDebug } from './utils/practiceDebugLog';
import DebugPanel from './components/DebugPanel';
import { ScalesSessionDebugBridgeProvider } from './context/scalesSessionDebugBridge';
import SkipToMain from '../shared/components/SkipToMain';
import { isLabsDebugVisible } from '../shared/debug/labsDebugAccess';
import { ScalesDriveBackupProvider } from './context/ScalesDriveBackupContext';

/** SessionScreen pulls ScoreDisplay/VexFlow — keep off the home-screen first paint. */
const SessionScreen = lazy(() => import('./components/SessionScreen'));

/*
 * Diagnostics tier (ADR 0026), not the raw `?debug` flag.
 *
 * The panel itself is a read-only event log plus help-surface previews, so it belongs at
 * `isLabsDebugVisible()`. Its one mutating control — "complete exercise perfectly" — is rendered
 * only when `sessionApi` is non-null, and `SessionScreen` now publishes that API at the `full` tier
 * only. So an anonymous production `?debug` gets the log and the previews and cannot touch progress.
 */
const debugMode = isLabsDebugVisible();
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
