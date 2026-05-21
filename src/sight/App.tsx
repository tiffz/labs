import { useCallback, useEffect, useState } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import { readLabsDebugFromLocation } from '../shared/debug/readLabsDebugParams';
import { createAppAnalytics } from '../shared/utils/analytics';
import HomePhase from './phases/HomePhase';
import PracticePhase from './phases/PracticePhase';
import SandboxPhase from './phases/SandboxPhase';
import { pickPracticeChallenge } from './session/practiceChallenge';
import { clearLegacySessionStorage, readProfile, writeProfile } from './storage';
import type { PracticeRound, SightProfile } from './types';

const analytics = createAppAnalytics('sight');

type AppPhase = 'home' | 'practice' | 'sandbox';

function resolveInitialPhase(debug: boolean): AppPhase {
  if (debug && typeof window !== 'undefined' && window.location.hash === '#sandbox') {
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

  useEffect(() => {
    clearLegacySessionStorage();
  }, []);

  useEffect(() => {
    if (debug && window.location.hash === '#sandbox') setPhase('sandbox');
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

  const startPractice = useCallback((practiceLevel: number) => {
    const current = readProfile();
    const round = pickPracticeChallenge(current, 0, practiceLevel);
    setPracticeRound(round);
    setPhase('practice');
    analytics.trackEvent('sight_practice_start', {
      level: practiceLevel,
      profileLevel: current.level,
      review: practiceLevel < current.level,
    });
  }, []);

  const exitPractice = useCallback(() => {
    setPracticeRound(null);
    setProfile(readProfile());
    setPhase('home');
  }, []);

  if (phase === 'sandbox') {
    return (
      <div className="sight-app">
        <SkipToMain />
        <main id="main" className="sight-main">
          <SandboxPhase />
        </main>
      </div>
    );
  }

  if (phase === 'practice' && practiceRound) {
    return (
      <div className="sight-app">
        <SkipToMain />
        <main id="main" className="sight-main">
          <PracticePhase
            profile={profile}
            initialRound={practiceRound}
            onProfileChange={setProfile}
            onExit={exitPractice}
            simulatePass={debug ? simulatePass : null}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="sight-app">
      <SkipToMain />
      <header className="sight-header">
        <h1>Color Sight Trainer</h1>
      </header>
      <main id="main" className="sight-main">
        <HomePhase
          profile={profile}
          onStartPractice={(practiceLevel) => {
            writeProfile(profile);
            startPractice(practiceLevel);
          }}
        />
      </main>
    </div>
  );
}
