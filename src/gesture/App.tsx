import { useCallback, useEffect, useRef, useState } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import { touchLabsGoogleSessionConsumer } from '../shared/google/labsGoogleSessionConsumers';
import GestureAppShell from './components/GestureAppShell';
import { GestureDriveBackupProvider } from './context/GestureDriveBackupContext';
import { applyGestureLinenCssVars } from './design/linenTheme';
import DebriefPhase from './phases/DebriefPhase';
import ZenSessionPhase from './phases/ZenSessionPhase';
import type { AppPhase, SessionConfig, SessionDebrief } from './types';

function GestureAppContent(): React.ReactElement {
  const appRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<AppPhase>('home');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [debrief, setDebrief] = useState<SessionDebrief | null>(null);

  useEffect(() => {
    touchLabsGoogleSessionConsumer('gesture');
  }, []);

  useEffect(() => {
    if (appRef.current) applyGestureLinenCssVars(appRef.current);
  }, []);

  const backHome = useCallback(() => {
    setSessionConfig(null);
    setDebrief(null);
    setPhase('home');
  }, []);

  const startSession = useCallback((config: SessionConfig) => {
    setSessionConfig(config);
    setPhase('session');
  }, []);

  const finishSession = useCallback((result: SessionDebrief) => {
    setDebrief(result);
    setSessionConfig(null);
    setPhase('debrief');
  }, []);

  return (
    <div ref={appRef} className="gesture-app" data-gesture-theme="linen">
      <SkipToMain />
      <main id="main" className="gesture-main">
        {phase === 'home' ? <GestureAppShell onStartSession={startSession} /> : null}
        {phase === 'session' && sessionConfig ? (
          <ZenSessionPhase config={sessionConfig} onExit={finishSession} />
        ) : null}
        {phase === 'debrief' && debrief ? (
          <DebriefPhase debrief={debrief} onHome={backHome} />
        ) : null}
      </main>
    </div>
  );
}

export default function App(): React.ReactElement {
  return (
    <GestureDriveBackupProvider>
      <GestureAppContent />
    </GestureDriveBackupProvider>
  );
}
