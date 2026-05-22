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
import GamutFinderView, { defaultGamutDeform } from '../modules/gamutFinder/GamutFinderView';
import { scoreGamut } from '../modules/gamutFinder/gamutFinderLogic';
import AlbersEqualizerView from '../modules/albersEqualizer/AlbersEqualizerView';
import { initialEqualizerInput, scoreEqualizer } from '../modules/albersEqualizer/albersEqualizerLogic';
import AnchorPivotView from '../modules/anchorPivot/AnchorPivotView';
import { scoreAnchorPivotReveal } from '../modules/anchorPivot/anchorPivotLogic';
import MunsellSliceView from '../modules/munsellSlice/MunsellSliceView';
import YotCastView from '../modules/yotCast/YotCastView';
import { getLevelConfig, MAX_LEVEL } from '../levels';
import { buildRepRecord, appendRepToProfile, shouldCountTowardLevelAdvance } from '../progress/recordRep';
import type { RepPurpose } from '../progress/types';
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
  reviewMode: boolean;
  onProfileChange: (profile: SightProfile) => void;
  onExit: () => void;
  simulatePass: boolean | null;
}

function useChallengeState(challenge: SightChallenge) {
  const [contextualInput, setContextualInput] = useState(() =>
    challenge.kind === 'contextual' ? initialContextualInput(challenge) : null,
  );
  const [equalizerInput, setEqualizerInput] = useState(() =>
    challenge.kind === 'albers-equalizer' ? initialEqualizerInput(challenge) : null,
  );
  const [pivotHue, setPivotHue] = useState(() =>
    challenge.kind === 'anchor-pivot' ? challenge.pivotHue : 0,
  );
  const [bridgeSteps, setBridgeSteps] = useState<ColorState[] | null>(() =>
    challenge.kind === 'bridge' ? initialBridgeSteps(challenge) : null,
  );
  const [bridgeSlot, setBridgeSlot] = useState(1);
  const [gamutDeform, setGamutDeform] = useState(defaultGamutDeform);
  const userMask = useMemo((): WheelPoint[] | null => {
    if (challenge.kind !== 'gamut') return null;
    return deformMask(challenge.maskVertices, gamutDeform);
  }, [challenge, gamutDeform]);

  const reset = useCallback((c: SightChallenge) => {
    if (c.kind === 'contextual') setContextualInput(initialContextualInput(c));
    if (c.kind === 'albers-equalizer') setEqualizerInput(initialEqualizerInput(c));
    if (c.kind === 'anchor-pivot') setPivotHue(c.pivotHue);
    if (c.kind === 'bridge') {
      setBridgeSteps(initialBridgeSteps(c));
      setBridgeSlot(1);
    }
    if (c.kind === 'gamut') setGamutDeform(defaultGamutDeform);
  }, []);

  return {
    contextualInput,
    setContextualInput,
    equalizerInput,
    setEqualizerInput,
    pivotHue,
    setPivotHue,
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
  const { reset: resetChallengeState } = state;
  const awaitingFeedback = reveal !== null;
  const repPurpose: RepPurpose = reviewMode ? 'practice' : 'curriculum';

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setRound(initialRound);
    setSessionLevel(initialRound.level);
    resetChallengeState(initialRound.challenge);
    setReveal(null);
    clearAdvanceTimer();
  }, [initialRound, clearAdvanceTimer, resetChallengeState]);

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
      const rep = buildRepRecord({ round, reveal: nextReveal, purpose: repPurpose, passed });
      let updated = appendRepToProfile(prev, rep);
      if (shouldCountTowardLevelAdvance(repPurpose, reviewMode)) {
        updated = recordChallengeResult(updated, passed, {
          challengeLevel: reviewMode ? sessionLevel : prev.level,
        });
      } else {
        updated = { ...updated, challengesCompleted: updated.challengesCompleted + 1 };
      }
      writeProfile(updated);
      onProfileChange(updated);
      if (!reviewMode && updated.level > prev.level) {
        setSessionLevel(updated.level);
      }
      setReveal(nextReveal);
      scheduleAutoAdvance(nextReveal);
    },
    [onProfileChange, repPurpose, reviewMode, round, scheduleAutoAdvance, sessionLevel],
  );

  const handleComparePick = (side: 'left' | 'right') => {
    if (challenge.kind !== 'compare' || awaitingFeedback) return;
    const { passed } = scoreCompare(challenge, side, simulatePass);
    finishRound(passed, { kind: 'compare', challenge, pickedSide: side, passed });
  };

  const handleIsolatedPick = (side: 'left' | 'right') => {
    if (challenge.kind !== 'flashcard-isolated' || awaitingFeedback) return;
    const { passed } = scoreIsolatedFlashcard(challenge, side, simulatePass);
    finishRound(passed, { kind: 'flashcard-isolated', challenge, pickedSide: side, passed });
  };

  const handleAlbersSide = (side: 'left' | 'right') => {
    if (challenge.kind !== 'flashcard-albers' || awaitingFeedback) return;
    const { passed } = scoreAlbersFlashcard(challenge, { side }, simulatePass);
    finishRound(passed, { kind: 'flashcard-albers', challenge, pickedSide: side, passed });
  };

  const handleAlbersBinary = (choice: 'same' | 'different') => {
    if (challenge.kind !== 'flashcard-albers' || awaitingFeedback) return;
    const { passed } = scoreAlbersFlashcard(challenge, { binary: choice }, simulatePass);
    finishRound(passed, { kind: 'flashcard-albers', challenge, pickedBinary: choice, passed });
  };

  const handleMunsellPick = (index: number) => {
    if (challenge.kind !== 'munsell-slice' || awaitingFeedback) return;
    const passed = index === challenge.outlierIndex || simulatePass === true;
    finishRound(passed, { kind: 'munsell-slice', challenge, pickedIndex: index, passed });
  };

  const handleYotPick = (index: number) => {
    if (challenge.kind !== 'yot-cast' || awaitingFeedback) return;
    const passed = index === challenge.correctIndex || simulatePass === true;
    finishRound(passed, { kind: 'yot-cast', challenge, pickedIndex: index, passed });
  };

  const handleSubmit = () => {
    if (awaitingFeedback) return;
    if (
      challenge.kind === 'compare' ||
      challenge.kind === 'flashcard-isolated' ||
      challenge.kind === 'flashcard-albers' ||
      challenge.kind === 'munsell-slice' ||
      challenge.kind === 'yot-cast'
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
      const minPct = getLevelConfig(level).minGamutOverlapPct ?? 72;
      finishRound(r.passed, { kind: 'gamut', passed: r.passed, overlapPct: r.overlapPct, minPct });
    } else if (challenge.kind === 'albers-equalizer' && state.equalizerInput) {
      const r = scoreEqualizer(challenge, state.equalizerInput, level, simulatePass);
      finishRound(r.passed, {
        kind: 'albers-equalizer',
        passed: r.passed,
        accuracyRating: r.accuracyRating,
        deltaE: r.deltaE,
      });
    } else if (challenge.kind === 'anchor-pivot') {
      const rev = scoreAnchorPivotReveal(challenge, state.pivotHue, simulatePass);
      finishRound(rev.passed, rev);
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
    ? `Review · level ${sessionLevel}`
    : profile.level < MAX_LEVEL
      ? `${profile.passesAtLevel}/${PASSES_TO_ADVANCE} passes to level ${profile.level + 1}`
      : 'Max level';

  const isTapAnswer =
    challenge.kind === 'compare' ||
    challenge.kind === 'flashcard-isolated' ||
    challenge.kind === 'flashcard-albers' ||
    challenge.kind === 'munsell-slice' ||
    challenge.kind === 'yot-cast';

  const practiceBody = (
    <>
      {challenge.kind === 'compare' && (
        <CompareView challenge={challenge} reveal={reveal} onPick={handleComparePick} disabled={awaitingFeedback} />
      )}
      {challenge.kind === 'flashcard-isolated' && (
        <IsolatedFlashcardView challenge={challenge} reveal={reveal} onPick={handleIsolatedPick} disabled={awaitingFeedback} />
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
      {challenge.kind === 'munsell-slice' && (
        <MunsellSliceView challenge={challenge} reveal={reveal} onPick={handleMunsellPick} disabled={awaitingFeedback} />
      )}
      {challenge.kind === 'yot-cast' && (
        <YotCastView challenge={challenge} reveal={reveal} onPick={handleYotPick} disabled={awaitingFeedback} />
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
      {challenge.kind === 'albers-equalizer' && state.equalizerInput && (
        <AlbersEqualizerView
          challenge={challenge}
          level={level}
          input={state.equalizerInput}
          onInputChange={state.setEqualizerInput}
          reveal={reveal}
          interactionDisabled={awaitingFeedback}
        />
      )}
      {challenge.kind === 'anchor-pivot' && (
        <AnchorPivotView
          challenge={challenge}
          pivotHue={state.pivotHue}
          onPivotChange={state.setPivotHue}
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
