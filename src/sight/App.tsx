import { useCallback, useEffect, useState } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import { readLabsDebugFromLocation } from '../shared/debug/readLabsDebugParams';
import { createAppAnalytics } from '../shared/utils/analytics';
import SightDebugPanel from './components/SightDebugPanel';
import HomePhase from './phases/HomePhase';
import CurriculumMapPhase from './phases/CurriculumMapPhase';
import PracticePhase from './phases/PracticePhase';
import SandboxPhase from './phases/SandboxPhase';
import { parseSandboxLevelFromHash } from './debug/parseSandboxLevel';
import { profilePeakLevel } from './levels';
import { updateFocusAfterSession } from './progress/diagnostics';
import { pickPracticeChallenge } from './session/practiceChallenge';
import { clearLegacySessionStorage, beginPracticeAtLevel, ensureProfileMigrated, readProfile, writeProfile } from './storage';
import type { PracticeRound, SightProfile } from './types';

const analytics = createAppAnalytics('sight');

type AppPhase = 'home' | 'map' | 'practice' | 'sandbox';

function resolveInitialPhase(debug: boolean): AppPhase {
  if (debug && typeof window !== 'undefined' && window.location.hash.startsWith('#sandbox')) {
    return 'sandbox';
  }
  return 'home';
}

export default function App(): React.ReactElement {
  const debug = readLabsDebugFromLocation().debug;
  const [phase, setPhase] = useState<AppPhase>(() => resolveInitialPhase(debug));
  const [profile, setProfile] = useState<SightProfile>(() => readProfile());
  const [practiceRound, setPracticeRound] = useState<PracticeRound | null>(null);
  const [simulatePass, setSimulatePass] = useState<boolean | null>(null);
  const [sandboxLevel, setSandboxLevel] = useState<number | undefined>(() =>
    typeof window !== 'undefined' ? parseSandboxLevelFromHash() : undefined,
  );

  useEffect(() => {
    clearLegacySessionStorage();
    setProfile(ensureProfileMigrated());
  }, []);

  useEffect(() => {
    if (debug && window.location.hash.startsWith('#sandbox')) {
      setSandboxLevel(parseSandboxLevelFromHash());
      setPhase('sandbox');
    }
  }, [debug]);

  useEffect(() => {
    if (phase !== 'practice') return;
    const onKey = (e: KeyboardEvent) => {
      if (!debug) return;
      if (e.key === 's' || e.key === 'S') {
        setSimulatePass((prev) => (prev === null ? true : prev ? false : null));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, debug]);

  const startPractice = useCallback((practiceLevel?: number) => {
    const current = readProfile();
    const level = practiceLevel ?? current.level;
    const profileForSession =
      practiceLevel !== undefined ? beginPracticeAtLevel(level) : current;
    const round = pickPracticeChallenge(profileForSession, 0, level);
    const cleared = { ...profileForSession, dailyQueue: null };
    writeProfile(cleared);
    setProfile(cleared);
    setPracticeRound(round);
    setPhase('practice');
    analytics.trackEvent('sight_practice_start', {
      level: round.level,
      profileLevel: profileForSession.level,
      peakLevel: profileForSession.peakLevel,
      restudy: round.level < profilePeakLevel(profileForSession),
    });
  }, []);

  const exitPractice = useCallback(() => {
    setPracticeRound(null);
    const latest = updateFocusAfterSession(readProfile());
    writeProfile(latest);
    setProfile(latest);
    setPhase('home');
  }, []);

  const goHome = useCallback(() => {
    setPracticeRound(null);
    setPhase('home');
  }, []);

  const openSandbox = useCallback((level?: number) => {
    window.location.hash = level !== undefined ? `#sandbox&level=${level}` : '#sandbox';
    setSandboxLevel(level ?? parseSandboxLevelFromHash());
    setPhase('sandbox');
  }, []);

  let main: React.ReactElement;
  if (phase === 'sandbox') {
    main = <SandboxPhase initialLevel={sandboxLevel} />;
  } else if (phase === 'practice' && practiceRound) {
    main = (
      <PracticePhase
        profile={profile}
        initialRound={practiceRound}
        onProfileChange={setProfile}
        onExit={exitPractice}
        simulatePass={debug ? simulatePass : null}
      />
    );
  } else if (phase === 'map') {
    main = (
      <CurriculumMapPhase
        profile={profile}
        onBack={() => setPhase('home')}
        onPracticeLevel={(level) => startPractice(level)}
      />
    );
  } else {
    main = (
      <HomePhase
        profile={profile}
        onStartPractice={() => startPractice()}
        onOpenMap={() => setPhase('map')}
      />
    );
  }

  return (
    <div className="sight-app">
      <SkipToMain />
      <main id="main" className="sight-main">
        {main}
      </main>
      {debug && (
        <SightDebugPanel
          profile={profile}
          phase={phase}
          simulatePass={simulatePass}
          onProfileChange={setProfile}
          onOpenSandbox={openSandbox}
          onStartPractice={startPractice}
          onGoHome={goHome}
        />
      )}
    </div>
  );
}
