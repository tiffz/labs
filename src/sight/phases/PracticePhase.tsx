import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import PracticeFooter from '../components/PracticeFooter';
import CompareView from '../modules/compare/CompareView';
import { scoreCompare } from '../modules/compare/compareLogic';
import AlbersFlashcardView from '../modules/flashcard/AlbersFlashcardView';
import IsolatedFlashcardView from '../modules/flashcard/IsolatedFlashcardView';
import { scoreAlbersFlashcard, scoreIsolatedFlashcard } from '../modules/flashcard/flashcardLogic';
import ContextualMatcherView from '../modules/contextualMatcher/ContextualMatcherView';
import { initialContextualInput, scoreContextual } from '../modules/contextualMatcher/contextualMatcherLogic';
import BrokenBridgeView from '../modules/brokenBridge/BrokenBridgeView';
import { initialBridgeSteps, scoreBridge } from '../modules/brokenBridge/brokenBridgeLogic';
import GamutFinderView from '../modules/gamutFinder/GamutFinderView';
import { scoreGamut } from '../modules/gamutFinder/gamutFinderLogic';
import { getLevelConfig, MAX_LEVEL } from '../levels';
import { deformMask } from '../scoring/gamutOverlap';
import { colorStateToHex } from '../scoring/perceptualScore';
import { autoAdvanceDelayMs } from '../session/practiceAutoAdvance';
import { pickPracticeChallenge, recordChallengeResult, PASSES_TO_ADVANCE } from '../session/practiceChallenge';
import { readProfile, writeProfile } from '../storage';
import type { ColorState, PracticeReveal, PracticeRound, SightChallenge, SightProfile } from '../types';
import type { WheelPoint } from '../scoring/gamutOverlap';

interface PracticePhaseProps {
  profile: SightProfile;
  initialRound: PracticeRound;
  /** True when practicing a level below the saved profile level (home review picker). */
  reviewMode: boolean;
  onProfileChange: (profile: SightProfile) => void;
  onExit: () => void;
  simulatePass: boolean | null;
}

function useChallengeState(challenge: SightChallenge) {
  const [contextualInput, setContextualInput] = useState(() =>
    challenge.kind === 'contextual' ? initialContextualInput(challenge) : null,
  );
  const [bridgeSteps, setBridgeSteps] = useState<ColorState[] | null>(() =>
    challenge.kind === 'bridge' ? initialBridgeSteps(challenge) : null,
  );
  const [bridgeSlot, setBridgeSlot] = useState(1);
  const [gamutDeform, setGamutDeform] = useState({ h: 24, c: 0, scale: 0.85 });
  const userMask = useMemo((): WheelPoint[] | null => {
    if (challenge.kind !== 'gamut') return null;
    return deformMask(challenge.maskVertices, gamutDeform);
  }, [challenge, gamutDeform]);

  const reset = useCallback((c: SightChallenge) => {
    if (c.kind === 'contextual') setContextualInput(initialContextualInput(c));
    if (c.kind === 'bridge') {
      setBridgeSteps(initialBridgeSteps(c));
      setBridgeSlot(1);
    }
    if (c.kind === 'gamut') setGamutDeform({ h: 24, c: 0, scale: 0.85 });
  }, []);

  return {
    contextualInput,
    setContextualInput,
    bridgeSteps,
    setBridgeSteps,
    bridgeSlot,
    setBridgeSlot,
    gamutDeform,
    setGamutDeform,
    userMask,
    reset,
  };
}

export default function PracticePhase({
  profile,
  initialRound,
  reviewMode,
  onProfileChange,
  onExit,
  simulatePass,
}: PracticePhaseProps): React.ReactElement {
  const [round, setRound] = useState(initialRound);
  const [reveal, setReveal] = useState<PracticeReveal | null>(null);
  const [sessionLevel, setSessionLevel] = useState(initialRound.level);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { challenge, level } = round;
  const isReviewSession = reviewMode;
  const canGoPrevLevel = sessionLevel > 1;
  const canGoNextLevel = sessionLevel < profile.level;
  const state = useChallengeState(challenge);
  const awaitingFeedback = reveal !== null;

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const { reset: resetChallengeState } = state;

  const loadChallengeAtLevel = useCallback(
    (targetLevel: number) => {
      clearAdvanceTimer();
      const currentProfile = readProfile();
      const maxLevel = currentProfile.level;
      const clamped = Math.max(1, Math.min(maxLevel, Math.floor(targetLevel)));
      const nextRound = pickPracticeChallenge(currentProfile, 0, clamped);
      setSessionLevel(clamped);
      resetChallengeState(nextRound.challenge);
      setRound(nextRound);
      setReveal(null);
    },
    [clearAdvanceTimer, resetChallengeState],
  );

  const loadNextChallenge = useCallback(() => {
    const targetLevel = reviewMode ? sessionLevel : readProfile().level;
    loadChallengeAtLevel(targetLevel);
  }, [loadChallengeAtLevel, reviewMode, sessionLevel]);

  const goToAdjacentLevel = useCallback(
    (delta: -1 | 1) => {
      if (awaitingFeedback) return;
      loadChallengeAtLevel(sessionLevel + delta);
    },
    [awaitingFeedback, loadChallengeAtLevel, sessionLevel],
  );

  const scheduleAutoAdvance = useCallback(
    (nextReveal: PracticeReveal) => {
      clearAdvanceTimer();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const ms = autoAdvanceDelayMs(nextReveal, reduced);
      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
        loadNextChallenge();
      }, ms);
    },
    [clearAdvanceTimer, loadNextChallenge],
  );

  useEffect(() => () => clearAdvanceTimer(), [clearAdvanceTimer]);

  const finishRound = useCallback(
    (passed: boolean, nextReveal: PracticeReveal) => {
      const prev = readProfile();
      const updated = recordChallengeResult(prev, passed, {
        challengeLevel: reviewMode ? sessionLevel : prev.level,
      });
      writeProfile(updated);
      onProfileChange(updated);
      if (!reviewMode && updated.level > prev.level) {
        setSessionLevel(updated.level);
      }
      setReveal(nextReveal);
      scheduleAutoAdvance(nextReveal);
    },
    [onProfileChange, reviewMode, scheduleAutoAdvance, sessionLevel],
  );

  const handleComparePick = (side: 'left' | 'right') => {
    if (challenge.kind !== 'compare' || awaitingFeedback) return;
    const { passed } = scoreCompare(challenge, side, simulatePass);
    finishRound(passed, {
      kind: 'compare',
      challenge,
      pickedSide: side,
      passed,
    });
  };

  const handleIsolatedPick = (side: 'left' | 'right') => {
    if (challenge.kind !== 'flashcard-isolated' || awaitingFeedback) return;
    const { passed } = scoreIsolatedFlashcard(challenge, side, simulatePass);
    finishRound(passed, {
      kind: 'flashcard-isolated',
      challenge,
      pickedSide: side,
      passed,
    });
  };

  const handleAlbersSide = (side: 'left' | 'right') => {
    if (challenge.kind !== 'flashcard-albers' || awaitingFeedback) return;
    const { passed } = scoreAlbersFlashcard(challenge, { side }, simulatePass);
    finishRound(passed, {
      kind: 'flashcard-albers',
      challenge,
      pickedSide: side,
      passed,
    });
  };

  const handleAlbersBinary = (choice: 'same' | 'different') => {
    if (challenge.kind !== 'flashcard-albers' || awaitingFeedback) return;
    const { passed } = scoreAlbersFlashcard(challenge, { binary: choice }, simulatePass);
    finishRound(passed, {
      kind: 'flashcard-albers',
      challenge,
      pickedBinary: choice,
      passed,
    });
  };

  const handleSubmit = () => {
    if (
      awaitingFeedback ||
      challenge.kind === 'compare' ||
      challenge.kind === 'flashcard-isolated' ||
      challenge.kind === 'flashcard-albers'
    ) {
      return;
    }

    if (challenge.kind === 'contextual' && state.contextualInput) {
      const r = scoreContextual(challenge, state.contextualInput, level, simulatePass);
      finishRound(r.passed, {
        kind: 'contextual',
        target: challenge.target,
        input: state.contextualInput,
        targetHex: colorStateToHex(challenge.target),
        inputHex: colorStateToHex(state.contextualInput),
        passed: r.passed,
        accuracyRating: r.accuracyRating,
        deltaE: r.deltaE,
      });
    } else if (challenge.kind === 'bridge' && state.bridgeSteps) {
      const r = scoreBridge(challenge, state.bridgeSteps, level, simulatePass);
      finishRound(r.passed, {
        kind: 'bridge',
        challenge,
        userSteps: state.bridgeSteps,
        passed: r.passed,
        closenessPct: Math.max(0, 100 - r.variancePct),
      });
    } else if (challenge.kind === 'gamut' && state.userMask) {
      const r = scoreGamut(challenge, state.userMask, level, simulatePass);
      const minPct = getLevelConfig(level).minGamutOverlapPct ?? 85;
      finishRound(r.passed, {
        kind: 'gamut',
        passed: r.passed,
        overlapPct: r.overlapPct,
        minPct,
      });
    }
  };

  const skipToNext = useCallback(() => {
    if (!awaitingFeedback) return;
    loadNextChallenge();
  }, [awaitingFeedback, loadNextChallenge]);

  useEffect(() => {
    if (!awaitingFeedback) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      skipToNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [awaitingFeedback, skipToNext]);

  const progressLabel = isReviewSession
    ? `Review · level ${sessionLevel} (progress counts at level ${profile.level})`
    : profile.level < MAX_LEVEL
      ? `${profile.passesAtLevel}/${PASSES_TO_ADVANCE} passes to level ${profile.level + 1}`
      : 'Max level';

  const isTapAnswer =
    challenge.kind === 'compare' ||
    challenge.kind === 'flashcard-isolated' ||
    challenge.kind === 'flashcard-albers';

  const practiceBody = (
    <>
      {challenge.kind === 'compare' && (
        <CompareView
          challenge={challenge}
          reveal={reveal}
          onPick={handleComparePick}
          disabled={awaitingFeedback}
        />
      )}
      {challenge.kind === 'flashcard-isolated' && (
        <IsolatedFlashcardView
          challenge={challenge}
          reveal={reveal}
          onPick={handleIsolatedPick}
          disabled={awaitingFeedback}
        />
      )}
      {challenge.kind === 'flashcard-albers' && (
        <AlbersFlashcardView
          challenge={challenge}
          reveal={reveal}
          onPickSide={handleAlbersSide}
          onPickBinary={handleAlbersBinary}
          disabled={awaitingFeedback}
        />
      )}
      {challenge.kind === 'contextual' && state.contextualInput && (
        <ContextualMatcherView
          challenge={challenge}
          level={level}
          input={state.contextualInput}
          onInputChange={state.setContextualInput}
          reveal={reveal}
          interactionDisabled={awaitingFeedback}
        />
      )}
      {challenge.kind === 'bridge' && state.bridgeSteps && (
        <BrokenBridgeView
          challenge={challenge}
          level={level}
          userSteps={state.bridgeSteps}
          onUserStepsChange={state.setBridgeSteps}
          selectedSlot={state.bridgeSlot}
          onSelectSlot={state.setBridgeSlot}
          reveal={reveal}
          interactionDisabled={awaitingFeedback}
        />
      )}
      {challenge.kind === 'gamut' && state.userMask && (
        <GamutFinderView
          challenge={challenge}
          level={level}
          userMask={state.userMask}
          deform={state.gamutDeform}
          onDeformChange={state.setGamutDeform}
          reveal={reveal}
          interactionDisabled={awaitingFeedback}
        />
      )}
    </>
  );

  return (
    <>
      <header className="sight-header">
        <h1>Color Sight Trainer</h1>
        <div className="sight-level-nav">
          {canGoPrevLevel ? (
            <button
              type="button"
              className="sight-level-nav__arrow"
              onClick={() => goToAdjacentLevel(-1)}
              disabled={awaitingFeedback}
              aria-label={`Previous level (${sessionLevel - 1})`}
            >
              <span className="material-symbols-outlined" aria-hidden>
                chevron_left
              </span>
            </button>
          ) : (
            <span className="sight-level-nav__arrow sight-level-nav__arrow--placeholder" aria-hidden />
          )}
          <span className="sight-practice-label">
            {isReviewSession ? 'Review' : 'Level'} {sessionLevel} ·{' '}
            {getLevelConfig(sessionLevel).label}
          </span>
          {canGoNextLevel ? (
            <button
              type="button"
              className="sight-level-nav__arrow"
              onClick={() => goToAdjacentLevel(1)}
              disabled={awaitingFeedback}
              aria-label={`Next level (${sessionLevel + 1})`}
            >
              <span className="material-symbols-outlined" aria-hidden>
                chevron_right
              </span>
            </button>
          ) : (
            <span className="sight-level-nav__arrow sight-level-nav__arrow--placeholder" aria-hidden />
          )}
        </div>
        <Button size="small" variant="text" onClick={onExit} sx={{ ml: 'auto' }}>
          Exit
        </Button>
      </header>
      {awaitingFeedback ? (
        <button
          type="button"
          className="sight-practice-body sight-practice-body--advance"
          onClick={skipToNext}
          aria-label="Continue to next question"
        >
          {practiceBody}
        </button>
      ) : (
        <div className="sight-practice-body">{practiceBody}</div>
      )}
      <PracticeFooter
        onSubmit={handleSubmit}
        onSkipAdvance={skipToNext}
        awaitingFeedback={awaitingFeedback}
        hideSubmit={isTapAnswer}
        progressHint={progressLabel}
      />
    </>
  );
}
