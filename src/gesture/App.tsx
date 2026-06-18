import { useCallback, useEffect, useRef, useState } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import { touchLabsGoogleSessionConsumer } from '../shared/google/labsGoogleSessionConsumers';
import GestureAppShell from './components/GestureAppShell';
import { GestureDriveBackupProvider } from './context/GestureDriveBackupContext';
import GesturePackStatsProvider from './context/GesturePackStatsProvider';
import { LabsBlockingJobProvider } from '../shared/jobs/LabsBlockingJobContext';
import { seedGestureE2ePreviewFixtures } from './e2e/gestureE2eSeed';
import { applyGestureLinenCssVars } from './design/linenTheme';
import { gestureGoogleClientConfigured } from './hooks/useGestureDriveBackup';
import { useGestureAutoReindex } from './hooks/useGestureAutoReindex';
import DebriefPhase from './phases/DebriefPhase';
import ZenSessionPhase from './phases/ZenSessionPhase';
import type { AppPhase, SessionConfig, SessionDebrief } from './types';

function GestureMaintenanceEffects(): null {
  useGestureAutoReindex(gestureGoogleClientConfigured());
  return null;
}

function GestureAppContent(): React.ReactElement {
  const appRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<AppPhase>('home');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [debrief, setDebrief] = useState<SessionDebrief | null>(null);
  const [e2eSeedReady, setE2eSeedReady] = useState(() => {
    if (!import.meta.env.DEV) return true;
    const params = new URLSearchParams(window.location.search);
    return !params.has('e2eSeed') && !params.has('e2eInterruptedUpload');
  });

  useEffect(() => {
    touchLabsGoogleSessionConsumer('gesture');
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('e2eInterruptedUpload')) {
      void import('./e2e/gestureE2eSeed')
        .then((m) => m.seedGestureE2eInterruptedUpload())
        .finally(() => setE2eSeedReady(true));
      return;
    }
    if (!params.has('e2eSeed')) return;
    const seedScroll = params.has('e2eScrollGrid');
    const run = seedScroll
      ? import('./e2e/gestureE2eSeed').then((m) => m.seedGestureE2eScrollGridFixtures())
      : seedGestureE2ePreviewFixtures();
    void run.finally(() => setE2eSeedReady(true));
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
    setPhase('debrief');
  }, []);

  const restartSession = useCallback(() => {
    if (!debrief) return;
    setSessionConfig(debrief.config);
    setDebrief(null);
    setPhase('session');
  }, [debrief]);

  return (
    <div ref={appRef} className="gesture-app" data-gesture-theme="linen">
      <GestureMaintenanceEffects />
      <SkipToMain />
      <main id="main" className="gesture-main">
        {e2eSeedReady && phase === 'home' ? <GestureAppShell onStartSession={startSession} /> : null}
        {e2eSeedReady && phase === 'session' && sessionConfig ? (
          <ZenSessionPhase config={sessionConfig} onExit={finishSession} />
        ) : null}
        {e2eSeedReady && phase === 'debrief' && debrief ? (
          <DebriefPhase debrief={debrief} onHome={backHome} onRestart={restartSession} />
        ) : null}
      </main>
    </div>
  );
}

export default function App(): React.ReactElement {
  return (
    <LabsBlockingJobProvider unloadCaption="Keep this tab open. Closing it or leaving The Gesture Room can cancel in-progress work.">
      <GestureDriveBackupProvider>
        <GesturePackStatsProvider>
          <GestureAppContent />
        </GesturePackStatsProvider>
      </GestureDriveBackupProvider>
    </LabsBlockingJobProvider>
  );
}
