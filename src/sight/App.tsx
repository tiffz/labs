import { useCallback, useEffect, useState } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import { readLabsDebugFromLocation } from '../shared/debug/readLabsDebugParams';
import { createAppAnalytics } from '../shared/utils/analytics';
import HomePhase from './phases/HomePhase';
import CurriculumMapPhase from './phases/CurriculumMapPhase';
import PracticePhase from './phases/PracticePhase';
import SandboxPhase from './phases/SandboxPhase';
import { updateFocusAfterSession } from './progress/diagnostics';
import { pickPracticeChallenge } from './session/practiceChallenge';
import { clearLegacySessionStorage, readProfile, writeProfile } from './storage';
import type { PracticeRound, SightProfile } from './types';

const analytics = createAppAnalytics('sight');

type AppPhase = 'home' | 'map' | 'practice' | 'sandbox';

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
  const [practiceReviewMode, setPracticeReviewMode] = useState(false);
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

  const startPractice = useCallback((practiceLevel?: number) => {
    const current = readProfile();
    const level = practiceLevel ?? current.level;
    const round = pickPracticeChallenge(current, 0, level);
    const cleared = { ...current, dailyQueue: null };
    writeProfile(cleared);
    setProfile(cleared);
    setPracticeRound(round);
    setPracticeReviewMode(level < current.level);
    setPhase('practice');
    analytics.trackEvent('sight_practice_start', {
      level,
      profileLevel: current.level,
      review: level < current.level,
    });
  }, []);

  const exitPractice = useCallback(() => {
    setPracticeRound(null);
    setPracticeReviewMode(false);
    const latest = updateFocusAfterSession(readProfile());
    writeProfile(latest);
    setProfile(latest);
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
            reviewMode={practiceReviewMode}
            onProfileChange={setProfile}
            onExit={exitPractice}
            simulatePass={debug ? simulatePass : null}
          />
        </main>
      </div>
    );
  }

  if (phase === 'map') {
    return (
      <div className="sight-app">
        <SkipToMain />
        <main id="main" className="sight-main">
          <CurriculumMapPhase
            profile={profile}
            onBack={() => setPhase('home')}
            onPracticeLevel={(level) => startPractice(level)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="sight-app">
      <SkipToMain />
      <main id="main" className="sight-main">
        <HomePhase
          profile={profile}
          onStartPractice={() => startPractice()}
          onOpenMap={() => setPhase('map')}
        />
      </main>
    </div>
  );
}
