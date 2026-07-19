import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import type { Theme } from '@mui/material/styles';
import ScoreDisplay from '../../shared/notation/ScoreDisplay';
import { useScales, hasEnabledMidiDevice, type ExerciseResult } from '../store';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import { getScorePlaybackEngine } from '../../shared/playback/scorePlayback';
import type { ScorePlaybackEngine } from '../../shared/playback/scorePlayback';
import { slotsPerQuarterBeat } from '../../shared/audio/metronome/subdivisionClickSchedule';
import { TIERS, findStage, findExercise, isPentascaleKind } from '../curriculum/tiers';
import { formatStageSummary, formatOctaveLabel } from '../curriculum/stageSummary';
import { pickPracticeTip } from '../curriculum/practiceTips';
import {
  getNewCliffConceptKeys,
  stuckJumpCoachingModalTip,
} from '../curriculum/concepts';
import {
  guidedStageIdForBeatOnly,
  isBeatOnlySubdivisionStage,
  isGuidedSubdivisionStage,
} from '../curriculum/guidedStages';
import { pickShakyHint } from './shakyHint';
import type { PracticeRecord } from '../progress/types';
import {
  getExerciseProgress,
  getAdvancementCriteria,
  formatAdvancementPerfectRunsLabel,
  formatAdvancementCleanRunsLabel,
  getCleanRunStreak,
  getOverlearningUiState,
  isPracticingAdvancementStage,
  OVERLEARN_MIN_STREAK,
  runOutcomeTier,
  consecutiveRoughRunsOnStage,
  type RunOutcomeTier,
} from '../progress/store';
import type { SessionExercise } from '../curriculum/types';
import FreeTempoGrader from './FreeTempoGrader';
import PreStartFreeTempoProbe from './PreStartFreeTempoProbe';
import TimedGrader from './TimedGrader';
import ScalesInputSources from './InputSources';
import ScalesAccountMenu from './ScalesAccountMenu';
import {
  useAutoLoopScheduler,
  DEFAULT_AUTO_LOOP_DWELL_MS as AUTO_LOOP_DWELL_MS,
} from './useAutoLoopScheduler';
import { isDebugEnabled, logDebugEvent } from '../utils/practiceDebugLog';
import { readLabsDebugFromLocation } from '../../shared/debug/readLabsDebugParams';
import { useScalesSessionDebugBridge } from '../context/scalesSessionDebugBridge';
import type { ScalesDebugHelpSurface } from '../context/scalesSessionDebugTypes';
import {
  collectGradedScoreNotes,
  perfectPracticeResultForNote,
} from '../utils/debugPerfectPracticeResults';
import { collectFingerCrossingRegions } from '../utils/fingerCrossingHighlights';
import {
  canAdvanceToNextInSessionPlan,
  findNextUnlockedSessionIndex,
} from '../curriculum/exerciseUnlock';
import {
  nextDrillStreak as computeNextDrillStreak,
  isDrillStuck as computeIsDrillStuck,
  isRegularStuckGated as computeIsRegularStuckGated,
  effectiveConsecutiveRough,
  type DrillState,
} from './drillState';
import GuidanceCallout from './GuidanceCallout';
import { computeGuidance, isGuidancePayloadEmpty, resolveHandGuidance } from '../guidance/computeGuidance';
import {
  applyPianoDoubleTapStep,
  PIANO_ADVANCE_BUTTON_TOOLTIP,
  PIANO_ADVANCE_BUTTON_TOOLTIP_MIC_ONLY,
  type PianoDoubleTapArm,
} from '../utils/pianoAdvanceDoubleTap';
import {
  DEBUG_PREVIEW_JUMP_CONCEPT_KEYS,
  DEBUG_SHAKY_MOCK_FEW_NOTES,
  DEBUG_SHAKY_MOCK_PITCH,
  DEBUG_SHAKY_MOCK_TIMING,
  DRILL_SNOOZE_BY,
  DRILL_STUCK_AT,
  DRILL_TARGET_PERFECT_RUNS,
  FREE_TEMPO_WARMUP_UI_MS,
  HAND_SHORT,
  REGULAR_STUCK_AT,
  REGULAR_STUCK_MIN_ATTEMPTS_FOR_JUMP,
  type DwellBadgeSnapshot,
} from './sessionScreenConstants';
import {
  buildLastRunPracticeRecord,
  computeDwellToastCopy,
  dwellStreakDenominator,
  midiToNoteName,
} from './sessionScreenHelpers';
import { SessionAdvanceActionTooltip as AdvanceActionTooltip } from './sessionScreen/SessionAdvanceActionTooltip';
import { SessionExerciseResultBreakdown } from './sessionScreen/SessionExerciseResultBreakdown';
import { SessionScreenIcon as Icon } from './sessionScreen/SessionScreenIcon';

export default function SessionScreen() {
  const labsDebug = readLabsDebugFromLocation().debug;
  const { setSessionApi } = useScalesSessionDebugBridge();
  const [helpPreview, setHelpPreview] = useState<ScalesDebugHelpSurface | null>(null);

  const { state, dispatch } = useScales();
  const { activeExercise, sessionPlan, score, practiceResults, isPlaying, lastExerciseResult } = state;
  const engineRef = useRef<ScorePlaybackEngine | null>(null);
  // Distinguishes a user-initiated Stop from natural engine completion. The
  // engine fires its finish callbacks regardless of how playback ended, so
  // without this flag a manual Stop would still call `finishExercise` →
  // populate `lastExerciseResult` → satisfy the auto-retry effect →
  // immediately restart the exercise. Set before `engine.stop()`, checked by
  // the finish callback, cleared by `startPlayback`.
  const manuallyStoppedRef = useRef(false);
  // The score-playback engine fires both its position callback (with
  // playing=false) AND its onEnd callback at natural completion, so a single
  // run would otherwise dispatch FINISH_EXERCISE twice and append the same
  // PracticeRecord to history twice. That double-counting was the root
  // cause of the "streak shows 2/3 after the first clean run" report and
  // also caused advancement to fire one real attempt earlier than the
  // strict "3 in a row" rule advertises. `finishedRef` is reset on every
  // fresh `startPlayback`, on each `restartFreeTempoRun`, and set on the
  // first finish dispatch for that run.
  const finishedRef = useRef(false);
  /** Last `midiNoteOnPulse` consumed for session piano shortcuts (advance / pre-start / guidance). */
  const sessionMidiLastProcessedPulseRef = useRef(0);
  /** Guidance modal dismiss: same double-tap arm as session advance (MIDI/mic shortcut stream). */
  const guidancePianoDoubleTapArmRef = useRef<PianoDoubleTapArm>(null);
  /** Session "Continue" / stuck-dismiss: same double-tap semantics as home Practice now. */
  const sessionAdvancePianoArmRef = useRef<PianoDoubleTapArm>(null);
  /** Timed metronome pre-start: same key twice (release between) as Continue / home Practice now. */
  const timedPreStartPianoArmRef = useRef<PianoDoubleTapArm>(null);
  /** Free-tempo pre-start: double-tap starts like the Start button (bypasses silent dry run). */
  const freeTempoPreStartPianoArmRef = useRef<PianoDoubleTapArm>(null);
  /** Mirrors `open={hasResult && stuckVisible}` so MIDI advance does not rely on DOM probes. */
  const stuckDialogOpenForMidiRef = useRef(false);
  /** When true, piano "dismiss stuck" should only clear debug stuck preview (no real stuck state). */
  const stuckPreviewPianoDismissRef = useRef(false);
  const handleStuckDialogCloseRef = useRef<
    (reason: 'backdropClick' | 'escapeKeyDown') => void
  >(() => {});
  const loadedStageRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [wrongNoteDisplay, setWrongNoteDisplay] = useState<string | null>(null);
  const wrongNoteKeyRef = useRef(0);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);
  const countInTimerIdsRef = useRef<number[]>([]);
  /** Bumps on each fresh timed start so stale async count-in / engine.start paths bail out. */
  const playbackSessionRef = useRef(0);
  /** After a silent free-tempo dry run, brief overlay + 1s pause before {@link startPlayback}. */
  const warmupTimerRef = useRef<number | null>(null);
  const [perfectWarmupUi, setPerfectWarmupUi] = useState(false);
  /**
   * Timed (metronome) stages with MIDI: the learner must complete a silent
   * pitch dry run (same rules as free-tempo pre-start) before Enter / first
   * note / Start can kick off playback — mirrors sandbox orientation. Auto-
   * loop restarts and explicit "Practice Again" still call `startPlayback`
   * directly. Mic-only / no MIDI skips this gate.
   */
  const [timedDryRunReady, setTimedDryRunReady] = useState(false);
  const advanceCooldownUntilRef = useRef(0);
  const cancelWarmupCountdown = useCallback(() => {
    if (warmupTimerRef.current != null) {
      window.clearTimeout(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
    setPerfectWarmupUi(false);
  }, []);

  useEffect(() => () => cancelWarmupCountdown(), [cancelWarmupCountdown]);

  const armAdvanceCooldown = useCallback(() => {
    advanceCooldownUntilRef.current = Date.now() + 550;
  }, []);

  useEffect(() => {
    if (state.wrongNoteFlash && state.wrongNoteFlash.length > 0) {
      const names = [...new Set(state.wrongNoteFlash.map(midiToNoteName))].join(' ');
      setWrongNoteDisplay(names);
      wrongNoteKeyRef.current += 1;
      const id = setTimeout(() => setWrongNoteDisplay(null), 600);
      return () => clearTimeout(id);
    }
  }, [state.wrongNoteFlash]);

  useEffect(() => {
    if (!activeExercise) return;
    // LOAD_STAGE already set the score and activeExercise — don't override
    if (loadedStageRef.current === activeExercise.stageId) {
      setLoaded(true);
      return;
    }
    const generated = generateScoreForExercise(activeExercise);
    if (generated) {
      dispatch({ type: 'SET_ACTIVE_EXERCISE', index: state.activeExerciseIndex, score: generated });
      setLoaded(true);
    }
    loadedStageRef.current = activeExercise.stageId;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only regenerate when exercise identity changes; dispatch is stable
  }, [activeExercise?.exerciseId, activeExercise?.stageId]);

  const finishExercise = useCallback((opts?: { purpose?: 'drill' }) => {
    if (!activeExercise) return;
    // Idempotent guard. The engine fires both its position callback and its
    // onEnd callback at natural completion, and the free-tempo auto-save
    // effect can also trigger a finish — without this guard the same run
    // would record twice. Reset on every fresh `startPlayback`.
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (isDebugEnabled()) {
      const total = score
        ? score.parts.reduce((s, p) => s + p.measures.reduce((ms, m) => ms + m.notes.filter(n => !n.rest).length, 0), 0)
        : 0;
      // Match the canonical scoring rule: pitch AND perfect timing.
      const correct = Array.from(state.practiceResults.values()).filter(
        r => r.pitchCorrect && r.timing === 'perfect'
      ).length;
      logDebugEvent({
        type: 'practice_end', t: performance.now(),
        resultCount: state.practiceResults.size,
        accuracy: total > 0 ? correct / total : 0,
      });
    }
    dispatch({
      type: 'FINISH_EXERCISE',
      exerciseId: activeExercise.exerciseId,
      stageId: activeExercise.stageId,
      purpose: opts?.purpose,
    });
  }, [activeExercise, dispatch, score, state.practiceResults]);

  const advanceToNext = useCallback(() => {
    if (!sessionPlan) {
      dispatch({ type: 'COMPLETE_SESSION' });
      return;
    }
    const nextIdx = findNextUnlockedSessionIndex(state.progress, sessionPlan, state.activeExerciseIndex);
    if (nextIdx === null) {
      dispatch({ type: 'COMPLETE_SESSION' });
      return;
    }
    const nextExercise = sessionPlan.exercises[nextIdx];
    const nextScore = generateScoreForExercise(nextExercise);
    if (nextScore) {
      dispatch({ type: 'NEXT_EXERCISE', score: nextScore, targetIndex: nextIdx });
    } else {
      dispatch({ type: 'COMPLETE_SESSION' });
    }
  }, [state.activeExerciseIndex, state.progress, sessionPlan, dispatch]);

  // Auto-save progress when a free-tempo run completes
  useEffect(() => {
    if (!activeExercise?.bpm && state.freeTempoRunComplete && !state.lastExerciseResult) {
      finishExercise();
    }
  }, [activeExercise?.bpm, state.freeTempoRunComplete, state.lastExerciseResult, finishExercise]);

  /**
   * The user can break out of the auto-loop between attempts ("Stop").
   * When set, the loop effect skips scheduling the next attempt and the
   * UI surfaces the full results panel + manual action buttons. Reset
   * whenever a new attempt starts, the stage/exercise changes, or the
   * user clicks Practice Again.
   */
  const [loopPaused, setLoopPaused] = useState(false);

  /**
   * Sticky "this exercise has been passed in this session" flag. The store
   * already tracks completedStageId, but `lastExerciseResult.advanced` is
   * only true for the *exact* attempt that crossed the threshold. We need
   * to know "is the user past the advancement gate right now?" so the
   * boundary results panel + Continue/Drill it CTA stay up across the
   * dwell-and-resume rhythm rather than disappearing the moment the next
   * loop tick fires. Reset on exercise/stage change.
   */
  const [passedThisExercise, setPassedThisExercise] = useState(false);

  /**
   * Drill state machine. 'inactive' -> regular auto-loop. The user opts
   * in to 'active' from the boundary screen via "Drill it"; the streak
   * effect transitions to 'completed' after 3 perfect runs. The completed
   * state is intentionally distinct from 'inactive' so the post-drill
   * banner sticks until the user chooses what to do next.
   */
  const [drillState, setDrillState] = useState<DrillState>('inactive');
  const [drillStreak, setDrillStreak] = useState(0);
  const [drillAttempts, setDrillAttempts] = useState(0);
  /**
   * "How many drill attempts must accumulate before the stuck prompt
   * fires?" The user can dismiss the prompt with "Keep drilling", which
   * snoozes by DRILL_SNOOZE_BY more attempts. Stored as the absolute
   * threshold rather than a snooze count so the predicate stays a clean
   * `attempts >= snoozedUntil` comparison.
   */
  const [drillSnoozedUntil, setDrillSnoozedUntil] = useState(DRILL_STUCK_AT);

  /**
   * Per-stage attempt count + the "Try going back?" snooze threshold.
   * Reset on every stage change so an old grind doesn't carry forward.
   */
  const [attemptsThisStage, setAttemptsThisStage] = useState(0);
  const [regularSnoozedUntil, setRegularSnoozedUntil] = useState(REGULAR_STUCK_AT);
  /** Rough-run tally resets when the learner dismisses the stuck-session modal. */
  const [regularRoughBaseline, setRegularRoughBaseline] = useState(0);

  /**
   * Tracks the most recent result we've already counted toward attempts /
   * drill streak. lastExerciseResult is referentially stable until the
   * next dispatch, so a ref + identity-equality check is enough to make
   * the counting effect run exactly once per attempt (re-renders from
   * unrelated state changes won't re-fire it).
   */
  const lastCountedResultRef = useRef<typeof lastExerciseResult>(null);
  const dwellBadgeSnapshotRef = useRef<DwellBadgeSnapshot | null>(null);

  const clearCountInTimers = useCallback(() => {
    for (const id of countInTimerIdsRef.current) window.clearTimeout(id);
    countInTimerIdsRef.current = [];
    setCountInBeat(null);
  }, []);

  const startPlayback = useCallback(async () => {
    cancelWarmupCountdown();
    if (!score || !activeExercise) return;
    const session = ++playbackSessionRef.current;
    clearCountInTimers();
    // Reset the manual-stop flag on every fresh start so the engine's
    // finish callback behaves normally unless the user explicitly stops.
    manuallyStoppedRef.current = false;
    // Re-arm the once-guard for this run.
    finishedRef.current = false;
    // The mid-playback Stop button sets loopPaused=true to break out of the
    // auto-loop, but Stop also routes through the no-result path so the
    // user lands back on the pre-start instruction panel + primary "Start"
    // button (not "Practice Again"). Without this reset, clicking Start
    // again leaves loopPaused=true lingering from the earlier Stop, so the
    // next finished sub-threshold attempt skips the dwell entirely. Reset
    // here covers every entry path uniformly (Start, Practice Again, Drill
    // it, auto-loop tick); the others would set it to false themselves.
    setLoopPaused(false);
    const engine = getScorePlaybackEngine();
    engine.stop();
    engine.primeAudioContext();
    engineRef.current = engine;
    engine.setTempo(activeExercise.bpm || 80);
    engine.setMetronome(activeExercise.useMetronome);
    engine.setMetronomeClickMode(activeExercise.clickMode ?? 'beat');
    if (
      activeExercise.subdivision === 'eighth'
      || activeExercise.subdivision === 'triplet'
      || activeExercise.subdivision === 'sixteenth'
    ) {
      engine.setMetronomeSubdivision(activeExercise.subdivision);
    }

    if (activeExercise.mutePlayback) {
      score.parts.forEach(p => engine.setTrackMuted(p.id, true));
    }

    dispatch({ type: 'START_PRACTICE_RUN' });
    // Mark guidance flags on every run start. A user who dismisses the
    // modal or hits Play has effectively seen it. Resolve stage here
    // (not from an outer `stageInfo` closure) so this always matches the
    // active exercise even if the callback identity lags a render.
    const resolvedStage = findStage(activeExercise.exerciseId, activeExercise.stageId);
    if (resolvedStage) {
      dispatch({
        type: 'MARK_GUIDANCE_INTRODUCED',
        stage: resolvedStage.stage,
        exercise: resolvedStage.exercise,
      });
    }
    if (isDebugEnabled()) {
      logDebugEvent({
        type: 'practice_start', t: performance.now(),
        mode: activeExercise.bpm ? 'timed' : 'free-tempo',
        bpm: activeExercise.bpm || 0,
        exerciseId: activeExercise.exerciseId,
        hand: activeExercise.hand,
        micActive: !!state.microphoneActive,
        midiActive: !!state.midiConnected,
      });
    }

    if (!activeExercise.bpm) {
      dispatch({ type: 'SET_FREE_TEMPO_POSITION', measureIndex: 0, noteIndex: 0 });
      dispatch({ type: 'SET_PLAYING', isPlaying: true });
      return;
    }

    // Count-in: one measure of metronome clicks before playback starts
    if (activeExercise.useMetronome) {
      dispatch({ type: 'SET_PLAYING', isPlaying: true });
      const msPerBeat = 60000 / (activeExercise.bpm || 80);
      const startDelay = 150;
      const clickMode = activeExercise.clickMode ?? 'beat';
      const subdivision = activeExercise.subdivision;
      const usesSubdivisionClicks =
        clickMode === 'subdivision'
        && (subdivision === 'eighth' || subdivision === 'triplet' || subdivision === 'sixteenth');
      if (usesSubdivisionClicks) {
        const slotsPerBeat = slotsPerQuarterBeat(subdivision);
        const msPerSlot = msPerBeat / slotsPerBeat;
        const measureBeats = 4;
        for (let q = 0; q < measureBeats; q++) {
          for (let s = 0; s < slotsPerBeat; s++) {
            const slot = q * slotsPerBeat + s;
            const id = window.setTimeout(
              () => {
                if (s === 0) setCountInBeat(q + 1);
              },
              startDelay + slot * msPerSlot,
            );
            countInTimerIdsRef.current.push(id);
          }
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const id = window.setTimeout(
            () => setCountInBeat(i + 1),
            startDelay + i * msPerBeat,
          );
          countInTimerIdsRef.current.push(id);
        }
      }
      await engine.playCountIn(activeExercise.bpm || 80, {
        clickMode,
        subdivision:
          activeExercise.subdivision === 'eighth'
          || activeExercise.subdivision === 'triplet'
          || activeExercise.subdivision === 'sixteenth'
            ? activeExercise.subdivision
            : 'eighth',
      });
      if (session !== playbackSessionRef.current) return;
      clearCountInTimers();
      // Dwell verdict chip may persist through count-in; clear once notes begin.
      dwellBadgeSnapshotRef.current = null;
    } else {
      dwellBadgeSnapshotRef.current = null;
    }

    // Capture the drill flag at the moment the run starts. If the user
    // stops/aborts a drill mid-loop, drillState may have already changed
    // by the time the engine fires its finish callback — but the run
    // they just played was still under "drill" intent, so we record it
    // as such.
    const purposeForRun = drillState === 'active' ? ({ purpose: 'drill' } as const) : undefined;
    await engine.start(
      score,
      'piano',
      (_beat, measureIndex, noteIndices, playing) => {
        dispatch({ type: 'UPDATE_POSITION', measureIndex, noteIndices });
        if (!playing) {
          dispatch({ type: 'SET_PLAYING', isPlaying: false });
          // Skip finalization when the user manually stopped — otherwise
          // the partial run would populate `lastExerciseResult` and the
          // auto-retry effect would immediately restart the exercise.
          if (!manuallyStoppedRef.current) finishExercise(purposeForRun);
        }
      },
      () => {
        dispatch({ type: 'SET_PLAYING', isPlaying: false });
        if (!manuallyStoppedRef.current) finishExercise(purposeForRun);
      },
    );
    if (session !== playbackSessionRef.current) return;
    dispatch({ type: 'SET_PLAYING', isPlaying: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state.microphoneActive/midiConnected read at call-time for debug only
  }, [score, activeExercise, dispatch, finishExercise, drillState, cancelWarmupCountdown, clearCountInTimers]);

  const schedulePostDryRunStart = useCallback((opts: { recordWarmupHit: boolean }) => {
    if (warmupTimerRef.current != null) return;
    if (opts.recordWarmupHit && activeExercise && score && !activeExercise.bpm) {
      const noteCount = score.parts.reduce(
        (sum, p) => sum + p.measures.reduce((ms, m) => ms + m.notes.filter(n => !n.rest).length, 0),
        0,
      );
      if (noteCount > 0) {
        dispatch({
          type: 'RECORD_FREE_TEMPO_WARMUP_HIT',
          exerciseId: activeExercise.exerciseId,
          stageId: activeExercise.stageId,
          noteCount,
        });
      }
    }
    if (!opts.recordWarmupHit && activeExercise?.bpm) {
      setTimedDryRunReady(true);
    }
    setPerfectWarmupUi(true);
    warmupTimerRef.current = window.setTimeout(() => {
      warmupTimerRef.current = null;
      setPerfectWarmupUi(false);
      void startPlayback();
    }, FREE_TEMPO_WARMUP_UI_MS);
  }, [startPlayback, activeExercise, score, dispatch]);

  const stopPlayback = useCallback(() => {
    playbackSessionRef.current += 1;
    clearCountInTimers();
    // Flag before stopping so the engine's finish callback (fired
    // synchronously from `stop()`) can tell this apart from natural
    // completion and skip the FINISH_EXERCISE dispatch.
    manuallyStoppedRef.current = true;
    engineRef.current?.stop();
    // STOP_PRACTICE_RUN (rather than just SET_PLAYING: false) wipes the
    // partial run state — per-note colors, playhead, free-tempo cursor —
    // so a manually-stopped exercise returns to a clean pre-run view
    // instead of leaving "ghost" grading on the score.
    if (activeExercise?.bpm) setTimedDryRunReady(false);
    dispatch({ type: 'STOP_PRACTICE_RUN' });
  }, [dispatch, activeExercise?.bpm, clearCountInTimers]);

  const completeExercisePerfectDebug = useCallback(() => {
    if (!labsDebug || !score || !activeExercise) return;
    if (state.isPlaying) stopPlayback();
    finishedRef.current = false;
    manuallyStoppedRef.current = false;
    dispatch({ type: 'START_PRACTICE_RUN' });
    for (const n of collectGradedScoreNotes(score)) {
      dispatch({ type: 'ADD_PRACTICE_RESULT', result: perfectPracticeResultForNote(n) });
    }
    setHelpPreview(null);
    finishExercise();
    // Same as breaking out of the auto-loop after a natural finish: stay on
    // the results / boundary interstitial instead of scheduling another run.
    setLoopPaused(true);
  }, [
    labsDebug,
    score,
    activeExercise,
    state.isPlaying,
    stopPlayback,
    dispatch,
    finishExercise,
    setLoopPaused,
  ]);

  const sessionDebugApi = useMemo(
    () => (
      labsDebug && activeExercise && loaded && score
        ? {
            completeExercisePerfect: completeExercisePerfectDebug,
            setHelpPreview: (s: ScalesDebugHelpSurface | null) => setHelpPreview(s),
            clearHelpPreview: () => setHelpPreview(null),
          }
        : null
    ),
    [labsDebug, activeExercise, loaded, score, completeExercisePerfectDebug],
  );

  useEffect(() => {
    if (!labsDebug) {
      setSessionApi(null);
      return;
    }
    if (!sessionDebugApi) {
      setSessionApi(null);
      return;
    }
    setSessionApi(sessionDebugApi);
    return () => {
      setHelpPreview(null);
      setSessionApi(null);
    };
  }, [labsDebug, sessionDebugApi, setSessionApi]);

  useEffect(() => {
    if (!labsDebug || !helpPreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelpPreview(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [labsDebug, helpPreview]);

  useEffect(() => {
    if (!labsDebug || helpPreview !== 'wrong_note') return;
    dispatch({ type: 'WRONG_NOTE_FLASH', notes: [60, 64] });
  }, [labsDebug, helpPreview, dispatch]);

  const goToStage = useCallback((stageId: string) => {
    if (!activeExercise) return;
    const found = findExercise(activeExercise.exerciseId);
    if (!found) return;
    const stage = found.exercise.stages.find(s => s.id === stageId);
    if (!stage) return;
    stopPlayback();
    const stageExercise: SessionExercise = {
      exerciseId: activeExercise.exerciseId,
      stageId: stage.id,
      key: activeExercise.key,
      kind: activeExercise.kind,
      hand: stage.hand,
      bpm: stage.bpm,
      useMetronome: stage.useMetronome,
      subdivision: stage.subdivision,
      clickMode: stage.clickMode ?? 'beat',
      mutePlayback: stage.mutePlayback,
      octaves: stage.octaves,
      purpose: activeExercise.purpose,
    };
    const newScore = generateScoreForExercise(stageExercise);
    if (newScore) {
      loadedStageRef.current = stage.id;
      dispatch({ type: 'LOAD_STAGE', exercise: stageExercise, score: newScore });
    }
  }, [activeExercise, stopPlayback, dispatch]);

  const handleFinishAndNext = useCallback(() => {
    stopPlayback();
    finishExercise();
  }, [stopPlayback, finishExercise]);

  const restartFreeTempoRun = useCallback(() => {
    finishedRef.current = false;
    dispatch({ type: 'RESTART_FREE_TEMPO' });
  }, [dispatch]);

  const handleKeepPracticing = useCallback(() => {
    restartFreeTempoRun();
  }, [restartFreeTempoRun]);

  // Reset the loop pause state whenever the user changes exercise/stage
  // so a stale Stop click doesn't carry forward into the next exercise.
  // Drill + stuck state belong to a single (exercise, stage) pair too —
  // moving on or stepping back wipes them clean.
  useEffect(() => {
    setLoopPaused(false);
    setDrillState('inactive');
    setDrillStreak(0);
    setDrillAttempts(0);
    setDrillSnoozedUntil(DRILL_STUCK_AT);
    setAttemptsThisStage(0);
    setRegularSnoozedUntil(REGULAR_STUCK_AT);
    lastCountedResultRef.current = null;
    setTimedDryRunReady(false);
    dwellBadgeSnapshotRef.current = null;

    let roughBaselineAtEntry = 0;
    if (activeExercise) {
      const found = findExercise(activeExercise.exerciseId);
      const stages = found?.exercise.stages ?? [];
      const stageIdx = stages.findIndex((s) => s.id === activeExercise.stageId);
      const stage = stageIdx >= 0 ? stages[stageIdx] : null;
      if (found && stage) {
        const exerciseProgress = getExerciseProgress(state.progress, activeExercise.exerciseId);
        roughBaselineAtEntry = consecutiveRoughRunsOnStage(
          exerciseProgress.history,
          activeExercise.stageId,
          found.exercise.kind,
          stage,
          stageIdx === stages.length - 1,
        );
      }
    }
    setRegularRoughBaseline(roughBaselineAtEntry);
    // Intentionally omit state.progress — baseline is fixed at stage entry, not after each run.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stage identity only
  }, [activeExercise?.exerciseId, activeExercise?.stageId]);

  // Sticky boundary / "level cleared" must not carry across stages: after
  // advancing within the same exercise (LOAD_STAGE), the next level still
  // needs its own streak — otherwise auto-loop stops and the UI reads as
  // "ready to progress" after the first clean run on the new stage.
  useEffect(() => {
    setPassedThisExercise(false);
  }, [activeExercise?.exerciseId, activeExercise?.stageId]);

  useEffect(() => {
    cancelWarmupCountdown();
  }, [activeExercise?.exerciseId, activeExercise?.stageId, cancelWarmupCountdown]);

  /**
   * Count one attempt per finished result, exactly once. We watch
   * `lastExerciseResult` identity rather than any specific field because
   * the reducer always dispatches a fresh object on FINISH_EXERCISE.
   * Drill streak/attempt counters live alongside the regular
   * attemptsThisStage (display) and FINISH identity; rough streak for
   * "Try going back?" comes from progress history.
   */
  useEffect(() => {
    if (!lastExerciseResult) return;
    if (lastCountedResultRef.current === lastExerciseResult) return;
    lastCountedResultRef.current = lastExerciseResult;
    if (lastExerciseResult.advanced) {
      setPassedThisExercise(true);
    }
    if (drillState === 'active') {
      setDrillAttempts(prev => prev + 1);
      setDrillStreak(prev => {
        const next = computeNextDrillStreak(prev, lastExerciseResult.accuracy);
        if (next >= DRILL_TARGET_PERFECT_RUNS) {
          setDrillState('completed');
          setLoopPaused(true);
        }
        return next;
      });
    } else {
      setAttemptsThisStage(prev => prev + 1);
    }
  }, [lastExerciseResult, drillState]);

  // Pre-derive the stuck-prompt inputs (defensive against a null
  // activeExercise so we can stay above the early-return required for
  // the scheduler hook). When null, the scheduler's own
  // `!lastExerciseResult` guard takes over and these values are unused.
  const _exerciseDefForScheduler = activeExercise ? findExercise(activeExercise.exerciseId) : null;
  const _allStagesForScheduler = _exerciseDefForScheduler?.exercise.stages ?? [];
  const _currentStageIdxForScheduler = activeExercise
    ? _allStagesForScheduler.findIndex(s => s.id === activeExercise.stageId)
    : -1;
  const _hasFallbackStageForScheduler = _currentStageIdxForScheduler > 0;

  const timedMidiDryRunRequired =
    Boolean(activeExercise?.bpm)
    && state.inputMode === 'midi'
    && hasEnabledMidiDevice(state);
  const timedDryRunEffectiveReady = !timedMidiDryRunRequired || timedDryRunReady;

  const _curStageSch =
    activeExercise && _currentStageIdxForScheduler >= 0
      ? _allStagesForScheduler[_currentStageIdxForScheduler]
      : null;
  const _isFinalStageSch =
    _curStageSch != null && _currentStageIdxForScheduler === _allStagesForScheduler.length - 1;
  const _advCritSch = _curStageSch
    ? getAdvancementCriteria(_curStageSch, !!_isFinalStageSch, _exerciseDefForScheduler?.exercise.kind)
    : { threshold: 0.9, runs: 3 };
  const _exerciseProgressSch = activeExercise && loaded
    ? getExerciseProgress(state.progress, activeExercise.exerciseId)
    : null;
  const _overlearnSch = _exerciseProgressSch && _curStageSch
    && isPracticingAdvancementStage(_exerciseProgressSch, _exerciseProgressSch.currentStageId)
    ? getOverlearningUiState(_exerciseProgressSch, _exerciseProgressSch.currentStageId)
    : null;
  const _usesGuidedSch = Boolean(
    activeExercise?.bpm && _curStageSch && isGuidedSubdivisionStage(_curStageSch),
  );
  const _rawCleanStreakSch = _exerciseProgressSch && activeExercise && _curStageSch
    ? getCleanRunStreak(_exerciseProgressSch, activeExercise.stageId)
    : 0;
  const _requiredRunsSch = _usesGuidedSch
    ? _advCritSch.runs
    : (_overlearnSch?.requiredPerfectStreak ?? OVERLEARN_MIN_STREAK);
  const _cleanStreakSch = _usesGuidedSch
    ? _rawCleanStreakSch
    : (_overlearnSch?.perfectStreak ?? 0);
  const _streakGateActiveSch = _usesGuidedSch || (_overlearnSch?.requiredPerfectStreak != null);

  const _rawConsecutiveRoughSch =
    activeExercise
      && loaded
      && score
      && _exerciseProgressSch
      && _curStageSch
      && _exerciseDefForScheduler
      ? consecutiveRoughRunsOnStage(
        _exerciseProgressSch.history,
        activeExercise.stageId,
        _exerciseDefForScheduler.exercise.kind,
        _curStageSch,
        !!_isFinalStageSch,
      )
      : 0;
  const _consecutiveRoughSch = effectiveConsecutiveRough(_rawConsecutiveRoughSch, regularRoughBaseline);

  const _baseRegularStuckSch =
    Boolean(
      activeExercise
        && loaded
        && score
        && _exerciseProgressSch
        && computeIsRegularStuckGated({
          drillState,
          passedThisExercise,
          attemptsThisStage,
          consecutiveRoughOnStage: _consecutiveRoughSch,
          cleanStreak: _cleanStreakSch,
          requiredRuns: _requiredRunsSch,
          hasFallbackStage: _hasFallbackStageForScheduler,
          snoozedUntil: regularSnoozedUntil,
          stageId: activeExercise.stageId,
          threshold: _advCritSch.threshold,
          history: _exerciseProgressSch.history,
          streakGateActive: _streakGateActiveSch,
        }),
    );

  const isRegularStuckGatedForScheduler = Boolean(
    _baseRegularStuckSch
      && attemptsThisStage >= REGULAR_STUCK_MIN_ATTEMPTS_FOR_JUMP,
  );

  // The scheduler treats a non-advancing result as "keep looping". Sticky
  // boundary, drill completion, and stuck prompts are all "user must
  // choose" states that should NOT auto-restart, so we OR them into the
  // pause flag.
  //
  // `passedThisExercise` is what makes the regular auto-loop come to rest
  // on the boundary screen, but during a drill the user has explicitly
  // opted into looping past the pass — so we deliberately exclude it
  // when drilling is active. The drill state machine has its own exit
  // points (`drillState === 'completed'` and `computeIsDrillStuck`)
  // that keep firing inside this same expression.
  const inDrill = drillState === 'active';
  const schedulerPaused = loopPaused
    || (passedThisExercise && !inDrill)
    || drillState === 'completed'
    || computeIsDrillStuck({ drillState, drillAttempts, drillStreak, snoozedUntil: drillSnoozedUntil })
    || isRegularStuckGatedForScheduler;

  const { countdown: loopCountdown } = useAutoLoopScheduler({
    lastExerciseResult,
    isPlaying,
    paused: schedulerPaused,
    // In drill mode every round comes back from the reducer with
    // `advanced: true` (the user already cleared the stage; recordPractice
    // doesn't re-advance them). The scheduler's default `stopOnAdvance`
    // would therefore treat each drill round as the natural exit and
    // never schedule round N+1, so we explicitly opt out for drilling.
    stopOnAdvance: !inDrill,
    onTick: () => {
      if (!activeExercise?.bpm) {
        restartFreeTempoRun();
      } else {
        void startPlayback();
      }
    },
  });

  // User-facing "Stop the auto-loop" — pauses scheduling AND surfaces the
  // full results panel + manual buttons. The loop re-engages on the next
  // explicit Practice Again click.
  const pauseAutoLoop = useCallback(() => {
    setLoopPaused(true);
  }, []);

  // Used when the user moves on / advances — keeps the API symmetric with
  // the old explicit cancel. The hook's own cleanup handles the timer; we
  // just need the pause flag set so the next render skips re-scheduling.
  const cancelAutoLoop = pauseAutoLoop;

  // Enter drill mode and immediately fire the first round. Counters reset
  // to 0 so a snoozed/abandoned drill doesn't poison the new session.
  const startDrill = useCallback(() => {
    setDrillState('active');
    setDrillStreak(0);
    setDrillAttempts(0);
    setDrillSnoozedUntil(DRILL_STUCK_AT);
    setLoopPaused(false);
    void startPlayback();
  }, [startPlayback]);

  // Exit drill mode. Doesn't auto-resume the regular loop — the user
  // explicitly chose to stop drilling, so put them on the boundary screen
  // (passedThisExercise stays true) and let them pick what's next.
  const stopDrilling = useCallback(() => {
    setDrillState('inactive');
    setLoopPaused(true);
  }, []);

  const stageInfo = activeExercise
    ? findStage(activeExercise.exerciseId, activeExercise.stageId)
    : null;

  /**
   * Persist concept-intro flags for the current stage. Called both
   * when the user clicks "Got it" on the onboarding modal and when they kick
   * off a run — either path means "you've seen this," so the modal
   * shouldn't reappear next render. Defined up here (above the early
   * loading-screen return) so the hook ordering stays stable; the
   * callback no-ops while stageInfo is null anyway.
   */
  const dismissGuidance = useCallback(() => {
    if (!stageInfo) return;
    dispatch({
      type: 'MARK_GUIDANCE_INTRODUCED',
      stage: stageInfo.stage,
      exercise: stageInfo.exercise,
    });
  }, [dispatch, stageInfo]);

  const { freeTempoRunComplete: freeTempoCompleteForGuidance, lastExerciseResult: lastResultForGuidance, isPlaying: isPlayingForGuidance } = state;
  const guidancePayload = stageInfo
    ? computeGuidance(stageInfo.stage, stageInfo.exercise, state.progress)
    : { concepts: [] };
  const showGuidanceCallout = !!stageInfo
    && !isPlayingForGuidance
    && !freeTempoCompleteForGuidance
    && !lastResultForGuidance
    && !isGuidancePayloadEmpty(guidancePayload);
  const showGuidanceDebug = labsDebug && helpPreview === 'guidance' && !!stageInfo && !isGuidancePayloadEmpty(guidancePayload);
  const guidanceModal = showGuidanceCallout ? (
    <GuidanceCallout payload={guidancePayload} onDismiss={dismissGuidance} />
  ) : null;
  const guidanceModalDebug = showGuidanceDebug ? (
    <GuidanceCallout
      payload={guidancePayload}
      onDismiss={() => setHelpPreview(null)}
    />
  ) : null;

  useEffect(() => {
    if (showGuidanceCallout || showGuidanceDebug) {
      guidancePianoDoubleTapArmRef.current = null;
      timedPreStartPianoArmRef.current = null;
      freeTempoPreStartPianoArmRef.current = null;
    }
  }, [showGuidanceCallout, showGuidanceDebug]);

  // Simple session shortcuts (see AGENTS / WCAG: avoid single printable keys
  // for destructive actions; Enter/Space here mirror the primary Start path).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.key === 'Enter' || e.key === ' ') && (showGuidanceCallout || showGuidanceDebug)) {
        e.preventDefault();
        if (showGuidanceDebug) setHelpPreview(null);
        else dismissGuidance();
        return;
      }
      if (target?.closest('.MuiDialog-root')) {
        const stuckOpen = document.getElementById('stuck-prompt-title');
        if (
          stuckOpen
          && (e.key === 'Enter' || e.key === ' ')
          && !!state.lastExerciseResult
          && !state.isPlaying
        ) {
          e.preventDefault();
          handleStuckDialogCloseRef.current('backdropClick');
        }
        return;
      }

      const hasResult = !!state.lastExerciseResult && !state.isPlaying;
      // Use `lastExerciseResult.advanced` here, not only `passedThisExercise`:
      // the latter flips in an effect one tick later; until then Enter/Space
      // would hit the `lastExerciseResult` guard below and do nothing.
      const boundaryNow = hasResult
        && drillState !== 'active'
        && (
          Boolean(state.lastExerciseResult?.advanced)
          || passedThisExercise
          || drillState === 'completed'
        );

      if (boundaryNow) {
        if (e.key === 'Tab') return;
        if (e.key === 'Escape') {
          if (state.isPlaying) {
            e.preventDefault();
            stopPlayback();
          }
          return;
        }
        e.preventDefault();
        armAdvanceCooldown();
        cancelAutoLoop();
        advanceToNext();
        return;
      }

      if (e.key === 'Escape') {
        if (state.isPlaying) {
          e.preventDefault();
          stopPlayback();
        }
        return;
      }

      if (e.key !== 'Enter' && e.key !== ' ') return;

      const { isPlaying, freeTempoRunComplete, lastExerciseResult } = state;
      if (isPlaying || freeTempoRunComplete || lastExerciseResult) return;
      if (!activeExercise || !loaded || !score) return;
      if (activeExercise.bpm && timedMidiDryRunRequired && !timedDryRunEffectiveReady) return;

      e.preventDefault();
      void startPlayback();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    activeExercise,
    loaded,
    score,
    state,
    showGuidanceCallout,
    showGuidanceDebug,
    dismissGuidance,
    setHelpPreview,
    startPlayback,
    stopPlayback,
    passedThisExercise,
    drillState,
    cancelAutoLoop,
    advanceToNext,
    timedMidiDryRunRequired,
    timedDryRunEffectiveReady,
    armAdvanceCooldown,
  ]);

  /**
   * True when the store will emit `midiShortcutLast` from hardware (enabled
   * MIDI port or active mic). This does not require `inputMode === 'midi'` —
   * the Web MIDI callback dispatches while a device is enabled even if
   * `inputMode` has not flipped yet, which blocked "New for you" double-tap
   * dismiss.
   */
  const midiShortcutStreamActive =
    hasEnabledMidiDevice(state) || state.microphoneActive;

  const advanceActionTooltipTitle = hasEnabledMidiDevice({
    midiDevices: state.midiDevices,
    disabledMidiDeviceIds: state.disabledMidiDeviceIds,
  })
    ? PIANO_ADVANCE_BUTTON_TOOLTIP
    : PIANO_ADVANCE_BUTTON_TOOLTIP_MIC_ONLY;

  useEffect(() => {
    sessionAdvancePianoArmRef.current = null;
    timedPreStartPianoArmRef.current = null;
    freeTempoPreStartPianoArmRef.current = null;
  }, [activeExercise?.exerciseId, activeExercise?.stageId, state.activeExerciseIndex, state.lastExerciseResult, loopPaused]);

  // Absorb the current pulse when the active exercise changes so entering a
  // new item (or the screen) does not treat prior key activity as "Continue".
  useEffect(() => {
    sessionMidiLastProcessedPulseRef.current = state.midiNoteOnPulse;
    guidancePianoDoubleTapArmRef.current = null;
    // Intentionally not keyed on `midiNoteOnPulse` — that would reset after every tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm only when the active exercise row changes.
  }, [activeExercise?.exerciseId, activeExercise?.stageId, state.activeExerciseIndex]);

  // Guidance modal: piano double-tap dismiss (MIDI/mic shortcut stream).
  useEffect(() => {
    const p = state.midiNoteOnPulse;
    const guidanceModalOpen = showGuidanceCallout || showGuidanceDebug;
    if (guidanceModalOpen) {
      if (!midiShortcutStreamActive) return;
      const last = state.midiShortcutLast;
      if (!last) {
        guidancePianoDoubleTapArmRef.current = null;
        return;
      }
      const { complete, next } = applyPianoDoubleTapStep(
        guidancePianoDoubleTapArmRef.current,
        last.kind,
        last.note,
        last.perfMs,
      );
      guidancePianoDoubleTapArmRef.current = next;
      if (!complete) return;
      guidancePianoDoubleTapArmRef.current = null;
      sessionMidiLastProcessedPulseRef.current = p;
      if (showGuidanceDebug) setHelpPreview(null);
      else dismissGuidance();
      return;
    }
    guidancePianoDoubleTapArmRef.current = null;

    // Match pre-start gates: only absorb when the stuck-session dialog is
    // actually open — not any `.MuiDialog-root` (e.g. portaled menus), which
    // would clear the double-tap arm and block Start.
    if (stuckDialogOpenForMidiRef.current) {
      sessionMidiLastProcessedPulseRef.current = p;
      timedPreStartPianoArmRef.current = null;
      freeTempoPreStartPianoArmRef.current = null;
      return;
    }
  }, [
    state.midiNoteOnPulse,
    state.midiShortcutWave,
    state.midiShortcutLast,
    showGuidanceCallout,
    showGuidanceDebug,
    dismissGuidance,
    setHelpPreview,
    midiShortcutStreamActive,
  ]);

  // Free-tempo pre-start: double-tap matches Start Playing (bypasses silent
  // dry run). useLayoutEffect runs before PreStartFreeTempoProbe's useEffect so
  // the probe does not reset local dry-run state before we see a completed
  // double-tap on the same commit.
  useLayoutEffect(() => {
    if (showGuidanceCallout || showGuidanceDebug) return;
    if (!activeExercise || !loaded || !score) return;
    // Do not use a broad `.MuiDialog-root` probe: MUI menus/popovers can leave a
    // modal subtree in the document and would silence double-tap start forever.
    if (stuckDialogOpenForMidiRef.current) {
      freeTempoPreStartPianoArmRef.current = null;
      return;
    }
    if (activeExercise.bpm) {
      freeTempoPreStartPianoArmRef.current = null;
      return;
    }
    if (perfectWarmupUi) {
      freeTempoPreStartPianoArmRef.current = null;
      return;
    }
    if (Date.now() < advanceCooldownUntilRef.current) {
      freeTempoPreStartPianoArmRef.current = null;
      return;
    }
    if (state.isPlaying || state.freeTempoRunComplete || state.lastExerciseResult) {
      freeTempoPreStartPianoArmRef.current = null;
      return;
    }
    if (!midiShortcutStreamActive) {
      freeTempoPreStartPianoArmRef.current = null;
      return;
    }

    const last = state.midiShortcutLast;
    if (!last) {
      freeTempoPreStartPianoArmRef.current = null;
      return;
    }

    const { complete, next } = applyPianoDoubleTapStep(
      freeTempoPreStartPianoArmRef.current,
      last.kind,
      last.note,
      last.perfMs,
    );
    freeTempoPreStartPianoArmRef.current = next;
    if (!complete) return;
    freeTempoPreStartPianoArmRef.current = null;
    // Defer past this layout pass so PreStartFreeTempoProbe's useEffect (same
    // commit) cannot race START_PRACTICE_RUN / SET_PLAYING.
    queueMicrotask(() => {
      void startPlayback();
    });
  }, [
    activeExercise,
    loaded,
    score,
    state.midiShortcutWave,
    state.midiShortcutLast,
    state.isPlaying,
    state.freeTempoRunComplete,
    state.lastExerciseResult,
    showGuidanceCallout,
    showGuidanceDebug,
    startPlayback,
    midiShortcutStreamActive,
    perfectWarmupUi,
  ]);

  // Timed metronome pre-start: double-tap the same key (mic or MIDI). Same
  // layout timing as free-tempo so PreStartFreeTempoProbe runs after this.
  useLayoutEffect(() => {
    if (showGuidanceCallout || showGuidanceDebug) return;
    if (!activeExercise || !loaded || !score) return;
    if (stuckDialogOpenForMidiRef.current) {
      timedPreStartPianoArmRef.current = null;
      freeTempoPreStartPianoArmRef.current = null;
      return;
    }
    if (!activeExercise.bpm) {
      timedPreStartPianoArmRef.current = null;
      return;
    }
    freeTempoPreStartPianoArmRef.current = null;
    if (Date.now() < advanceCooldownUntilRef.current) {
      timedPreStartPianoArmRef.current = null;
      return;
    }
    if (state.isPlaying || state.freeTempoRunComplete || state.lastExerciseResult) {
      timedPreStartPianoArmRef.current = null;
      return;
    }
    if (!midiShortcutStreamActive) {
      timedPreStartPianoArmRef.current = null;
      return;
    }
    // Deliberately do **not** gate double-tap on `timedDryRunReady`. The dry
    // run is optional safety (Space/Enter stay off until Start or a tap —
    // see keydown handler); the Start button already calls `startPlayback`
    // without completing the probe. Double-tap must match that affordance.

    const last = state.midiShortcutLast;
    if (!last) {
      timedPreStartPianoArmRef.current = null;
      return;
    }

    const { complete, next } = applyPianoDoubleTapStep(
      timedPreStartPianoArmRef.current,
      last.kind,
      last.note,
      last.perfMs,
    );
    timedPreStartPianoArmRef.current = next;
    if (!complete) return;
    timedPreStartPianoArmRef.current = null;
    queueMicrotask(() => {
      void startPlayback();
    });
  }, [
    activeExercise,
    loaded,
    score,
    state.midiShortcutWave,
    state.midiShortcutLast,
    state.isPlaying,
    state.freeTempoRunComplete,
    state.lastExerciseResult,
    showGuidanceCallout,
    showGuidanceDebug,
    startPlayback,
    midiShortcutStreamActive,
  ]);

  const canAdvanceToNextExercise = useMemo(
    () => canAdvanceToNextInSessionPlan(state.progress, state.sessionPlan, state.activeExerciseIndex),
    [state.progress, state.sessionPlan, state.activeExerciseIndex],
  );
  const isLastSessionExercise = Boolean(
    state.sessionPlan
    && state.activeExerciseIndex >= state.sessionPlan.exercises.length - 1,
  );
  /** Move on / piano shortcut: jump to next unlockable, or finish session from the last slot. */
  const showMoveOnFromPausedFullResults = canAdvanceToNextExercise || isLastSessionExercise;
  const continueOrFinishLabel = !canAdvanceToNextExercise
    ? 'Finish session'
    : 'Continue';

  /**
   * Piano double-tap: (1) level-cleared Continue, (2) Move on from the paused
   * full-results bar (Practice Again / Move on), (3) dismiss stuck prompt.
   */
  useEffect(() => {
    if (!activeExercise || !loaded || !score) return;
    // Piano double-tap advance requires a real MIDI device — mic-only pitch
    // events would otherwise skip exercises on every detected note/noise.
    if (!hasEnabledMidiDevice({
      midiDevices: state.midiDevices,
      disabledMidiDeviceIds: state.disabledMidiDeviceIds,
    })) {
      sessionAdvancePianoArmRef.current = null;
      return;
    }
    const last = state.midiShortcutLast;
    if (!last) {
      sessionAdvancePianoArmRef.current = null;
      return;
    }

    const hasRes = !!state.lastExerciseResult && !state.isPlaying;
    const boundaryPiano = hasRes
      && drillState !== 'active'
      && (
        Boolean(state.lastExerciseResult?.advanced)
        || passedThisExercise
        || drillState === 'completed'
      );

    const stuckDialogOpen = stuckDialogOpenForMidiRef.current;

    const moveOnPianoEligible = hasRes
      && drillState !== 'active'
      && loopPaused
      && !boundaryPiano
      && !stuckDialogOpen
      && showMoveOnFromPausedFullResults;

    if (!boundaryPiano && !stuckDialogOpen && !moveOnPianoEligible) {
      sessionAdvancePianoArmRef.current = null;
      return;
    }

    if (Date.now() < advanceCooldownUntilRef.current) return;

    if (boundaryPiano) {
      const { complete, next } = applyPianoDoubleTapStep(
        sessionAdvancePianoArmRef.current,
        last.kind,
        last.note,
        last.perfMs,
      );
      sessionAdvancePianoArmRef.current = next;
      if (!complete) return;
      armAdvanceCooldown();
      cancelAutoLoop();
      advanceToNext();
      sessionAdvancePianoArmRef.current = null;
      return;
    }

    if (moveOnPianoEligible) {
      const { complete, next } = applyPianoDoubleTapStep(
        sessionAdvancePianoArmRef.current,
        last.kind,
        last.note,
        last.perfMs,
      );
      sessionAdvancePianoArmRef.current = next;
      if (!complete) return;
      armAdvanceCooldown();
      cancelAutoLoop();
      advanceToNext();
      sessionAdvancePianoArmRef.current = null;
      return;
    }

    if (stuckDialogOpen) {
      const { complete, next } = applyPianoDoubleTapStep(
        sessionAdvancePianoArmRef.current,
        last.kind,
        last.note,
        last.perfMs,
      );
      sessionAdvancePianoArmRef.current = next;
      if (!complete) return;
      if (stuckPreviewPianoDismissRef.current) setHelpPreview(null);
      else handleStuckDialogCloseRef.current('backdropClick');
      sessionAdvancePianoArmRef.current = null;
    }
  }, [
    activeExercise,
    loaded,
    score,
    state.midiShortcutWave,
    state.midiShortcutLast,
    state.lastExerciseResult,
    state.isPlaying,
    drillState,
    passedThisExercise,
    loopPaused,
    showMoveOnFromPausedFullResults,
    canAdvanceToNextExercise,
    advanceToNext,
    cancelAutoLoop,
    armAdvanceCooldown,
    setHelpPreview,
    state.midiDevices,
    state.disabledMidiDeviceIds,
  ]);

  const fingerCrossingRegions = useMemo(() => {
    if (!activeExercise || !loaded || !score) return undefined;
    if (activeExercise.bpm) return undefined;
    if (isPentascaleKind(activeExercise.kind)) return undefined;
    if (!String(activeExercise.kind).includes('-scale')) return undefined;
    if (state.hasCompletedRun) return undefined;
    const regions = collectFingerCrossingRegions(score);
    return regions.length > 0 ? regions : undefined;
  }, [activeExercise, loaded, score, state.hasCompletedRun]);

  if (!activeExercise || !loaded || !score) {
    stuckDialogOpenForMidiRef.current = false;
    return (
      <>
        {guidanceModal}
        {guidanceModalDebug}
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Loading exercise…</Typography>
        </Box>
      </>
    );
  }

  const exerciseNumber = state.activeExerciseIndex + 1;
  const totalExercises = sessionPlan?.exercises.length ?? 0;
  const isFreeTempo = !activeExercise.bpm;

  const exerciseDef = findExercise(activeExercise.exerciseId);
  const exerciseProgress = getExerciseProgress(state.progress, activeExercise.exerciseId);
  const allStages = exerciseDef?.exercise.stages ?? [];
  const currentStageIdx = allStages.findIndex(s => s.id === activeExercise.stageId);
  const progressStageIdx = allStages.findIndex(s => s.id === exerciseProgress.currentStageId);
  const maxAccessibleStageIdx = Math.max(currentStageIdx, progressStageIdx);
  const canGoPrevStage = currentStageIdx > 0;
  const canGoNextStage = currentStageIdx < maxAccessibleStageIdx;
  const curriculumTierIdx = TIERS.findIndex(t => t.id === state.progress.currentTierId);
  const safeCurriculumTierIdx = curriculumTierIdx >= 0 ? curriculumTierIdx : 0;
  const showEarlierTiersOnProgressMap = state.activeExerciseIndex === 0 && !canGoPrevStage && safeCurriculumTierIdx > 0;
  const { freeTempoRunComplete, hasCompletedRun } = state;
  // "Has the user practiced this exercise before?" — drives the
  // pre-start panel's compact mode (tighter padding, lighter font
  // weight on the stage description). Fingering + video stay in this
  // panel (not the modal) so they stay beside the score.
  const hasExerciseHistory = exerciseProgress.history.length > 0;

  const currentStage = stageInfo?.stage ?? null;
  const isFinalStage = currentStage ? currentStageIdx === allStages.length - 1 : false;
  const advancementCriteria = currentStage
    ? getAdvancementCriteria(currentStage, isFinalStage, exerciseDef?.exercise.kind)
    : { threshold: 0.9, runs: 3 };
  const practicingAdvancementStage = Boolean(
    currentStage && isPracticingAdvancementStage(exerciseProgress, currentStage.id),
  );
  const usesGuidedSubdivisionRegimen = !isFreeTempo
    && Boolean(currentStage && isGuidedSubdivisionStage(currentStage));
  const usesPerfectRegimen = !isFreeTempo
    && Boolean(currentStage?.useTempo)
    && !usesGuidedSubdivisionRegimen;
  const overlearnState = currentStage && usesPerfectRegimen
    ? getOverlearningUiState(exerciseProgress, currentStage.id)
    : {
      attemptCount: 0,
      requiredPerfectStreak: null,
      perfectStreak: 0,
      unlocked: false,
    };
  const requiredPerfectRuns = overlearnState.requiredPerfectStreak;
  const rawCleanStreak = currentStage ? getCleanRunStreak(exerciseProgress, currentStage.id) : 0;
  /** Perfect-run streak on beat-only metronome stages. */
  const perfectStreak = usesPerfectRegimen ? overlearnState.perfectStreak : 0;
  const cleanStreak = usesGuidedSubdivisionRegimen ? rawCleanStreak : perfectStreak;
  const requiredCleanRuns = usesGuidedSubdivisionRegimen ? advancementCriteria.runs : null;
  const perfectRunsProgressLabel = requiredPerfectRuns != null
    ? formatAdvancementPerfectRunsLabel(perfectStreak, requiredPerfectRuns)
    : String(perfectStreak);
  const advancementChipLabel = usesGuidedSubdivisionRegimen && requiredCleanRuns != null
    ? `${formatAdvancementCleanRunsLabel(cleanStreak, requiredCleanRuns)} clean in a row to advance`
    : overlearnState.unlocked
      ? `${perfectRunsProgressLabel} perfect in a row to advance`
      : overlearnState.attemptCount > 0
        ? `Attempt ${overlearnState.attemptCount + 1} · first perfect sets your target`
        : 'First perfect run sets your practice target';

  const scaleHowToText = stageInfo
    ? resolveHandGuidance(stageInfo.exercise, activeExercise.hand)
    : null;
  const scaleHowToTitle = scaleHowToText
    ? `How to play (${HAND_SHORT[activeExercise.hand]})`
    : '';

  const showCleanStreakChipPreStart = !isFreeTempo
    && !!currentStage
    && (
      (usesGuidedSubdivisionRegimen
        && requiredCleanRuns != null
        && cleanStreak > 0
        && cleanStreak < requiredCleanRuns)
      || (usesPerfectRegimen
        && overlearnState.unlocked
        && requiredPerfectRuns != null
        && perfectStreak > 0
        && perfectStreak < requiredPerfectRuns)
    );
  const competingPreStartScore = (stageInfo?.stage.description?.trim() ? 1 : 0)
    + (scaleHowToText ? 1 : 0)
    + (stageInfo?.exercise.helpUrl ? 1 : 0)
    + (showCleanStreakChipPreStart ? 1 : 0);

  const practiceTip = stageInfo
    ? pickPracticeTip(stageInfo.stage, stageInfo.exercise.id, {
      competingContentScore: competingPreStartScore,
    })
    : null;
  const lastRunPracticeRecord: PracticeRecord | null = buildLastRunPracticeRecord(
    lastExerciseResult,
    activeExercise,
    exerciseDef,
  );
  const lastRunOutcomeTier: RunOutcomeTier = lastRunPracticeRecord && currentStage && exerciseDef
    ? runOutcomeTier(lastRunPracticeRecord, exerciseDef.exercise.kind, currentStage, isFinalStage)
    : 'rough';
  const lastWasClean = Boolean(
    lastExerciseResult
    && (usesPerfectRegimen
      ? lastExerciseResult.accuracy >= 1
      : lastRunOutcomeTier === 'clean'),
  );
  const lastRunUiSuccess = usesPerfectRegimen ? lastWasClean : lastRunOutcomeTier === 'clean';
  const lastRunUiNear = !usesPerfectRegimen && lastRunOutcomeTier === 'near';

  // Adaptive coaching: when the most recent run scored sub-fluent and we
  // can't yet diagnose with stuck-detection, surface a one-line hint that
  // points at the dominant error (timing vs pitch vs few-notes). The
  // helper itself returns null on perfect/fluent runs and on empty
  // scores, so we only need to additionally suppress it during drill
  // mode (which has its own stuck path) and at the boundary panel
  // (which celebrates the pass).
  const shakyHint = lastExerciseResult && currentStage && drillState !== 'active' && exerciseDef
    ? pickShakyHint(lastExerciseResult, currentStage)
    : null;

  // Stuck-detection prompts. Both predicates short-circuit when the
  // sticky `passedThisExercise` flag is set (regular case) or the drill
  // already completed — the user shouldn't see a "step back" suggestion
  // after they've cleared the stage. `hasFallbackStage` defends against
  // the very first stage of an exercise where there's nowhere to drop to.
  const hasFallbackStage = currentStageIdx > 0;
  const guidedFallbackId = currentStage && isBeatOnlySubdivisionStage(currentStage)
    ? guidedStageIdForBeatOnly(currentStage.id)
    : null;
  const guidedFallbackStage = guidedFallbackId
    ? allStages.find(s => s.id === guidedFallbackId) ?? null
    : null;
  const stuckFallbackStage = guidedFallbackStage
    ?? (hasFallbackStage ? allStages[currentStageIdx - 1] : null);
  const stuckFallbackLabel = stuckFallbackStage
    ? `Level ${stuckFallbackStage.stageNumber}`
    : 'an earlier level';
  const newCliffConceptKeysForStuck = exerciseDef && currentStage && stuckFallbackStage
    ? getNewCliffConceptKeys(currentStage, stuckFallbackStage, exerciseDef.exercise)
    : [];
  const regularStuckJumpCoaching = newCliffConceptKeysForStuck.length > 0;
  const isDrillStuck = computeIsDrillStuck({
    drillState,
    drillAttempts,
    drillStreak,
    snoozedUntil: drillSnoozedUntil,
  });
  const rawConsecutiveRoughOnStage = exerciseDef && currentStage
    ? consecutiveRoughRunsOnStage(
      exerciseProgress.history,
      activeExercise.stageId,
      exerciseDef.exercise.kind,
      currentStage,
      isFinalStage,
    )
    : 0;
  const consecutiveRoughOnStage = effectiveConsecutiveRough(
    rawConsecutiveRoughOnStage,
    regularRoughBaseline,
  );
  const resetRegularStuckCounter = () => {
    setRegularRoughBaseline(rawConsecutiveRoughOnStage);
    setRegularSnoozedUntil(REGULAR_STUCK_AT);
  };
  const baseRegularStuckGated = computeIsRegularStuckGated({
    drillState,
    passedThisExercise,
    attemptsThisStage,
    consecutiveRoughOnStage,
    cleanStreak,
    requiredRuns: usesGuidedSubdivisionRegimen
      ? (requiredCleanRuns ?? advancementCriteria.runs)
      : (requiredPerfectRuns ?? OVERLEARN_MIN_STREAK),
    hasFallbackStage: hasFallbackStage || guidedFallbackStage != null,
    snoozedUntil: regularSnoozedUntil,
    stageId: activeExercise.stageId,
    threshold: advancementCriteria.threshold,
    history: exerciseProgress.history,
    streakGateActive: usesGuidedSubdivisionRegimen
      || overlearnState.unlocked,
  });
  const regularStuckGated = Boolean(
    baseRegularStuckGated
      && attemptsThisStage >= REGULAR_STUCK_MIN_ATTEMPTS_FOR_JUMP,
  );
  const stuckVisible = isDrillStuck || regularStuckGated;
  const attemptsOnLevelLabel = attemptsThisStage === 1
    ? '1 attempt on this level'
    : `${attemptsThisStage} attempts on this level`;

  const dismissStuckSessionDialog = (reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') return;
    if (isDrillStuck) {
      setDrillSnoozedUntil(drillAttempts + DRILL_STUCK_AT);
      setDrillState('inactive');
      setLoopPaused(true);
    } else {
      resetRegularStuckCounter();
    }
  };
  handleStuckDialogCloseRef.current = dismissStuckSessionDialog;

  /**
   * Five post-attempt UI modes once an attempt has finished:
   *   - inDwell  : auto-loop is active; show only the compact toast over the
   *                score and skip the full results Paper to keep the
   *                between-rounds beat tight.
   *   - boundary : the user has cleared this exercise this session
   *                (passed at least once). Show the full results Paper
   *                with a "Level cleared" banner and "Continue" / "Drill
   *                it" actions. Sticky across loop rounds so a sub-100%
   *                victory lap doesn't dismiss the celebration.
   *   - drillActive    : drilling in progress; tight loop with drill-
   *                      specific copy in the dwell toast.
   *   - drillCompleted : drilled to perfection (3-in-a-row); banner plus
   *                      Continue/Drill more actions.
   *   - paused         : user broke out of the loop; show full results
   *                      Paper + manual action buttons.
   */
  const hasResult = !!lastExerciseResult && !isPlaying;
  const stuckDialogDebugOnly = labsDebug && (
    helpPreview === 'stuck_drill'
    || helpPreview === 'stuck_regular'
    || helpPreview === 'stuck_tip'
  );
  stuckDialogOpenForMidiRef.current = (hasResult && stuckVisible) || stuckDialogDebugOnly;
  stuckPreviewPianoDismissRef.current = stuckDialogDebugOnly && !(hasResult && stuckVisible);
  // The sticky boundary takes precedence over inDwell so the level-
  // cleared banner doesn't disappear if the user keeps playing after
  // passing — or, in drill mode, after the drill completes. Include
  // `lastExerciseResult.advanced` so the celebration + keyboard shortcuts
  // match the run that cleared the streak (before the effect sets
  // `passedThisExercise`).
  const boundary = hasResult && (
    Boolean(lastExerciseResult.advanced)
    || passedThisExercise
    || drillState === 'completed'
  );
  const inDwell = hasResult && !boundary && !loopPaused && !stuckVisible;
  const showFullResults = hasResult && !inDwell;

  if (inDwell && lastExerciseResult && currentStage && exerciseDef) {
    const snapRecord: PracticeRecord = {
      exerciseId: activeExercise.exerciseId,
      stageId: activeExercise.stageId,
      timestamp: 0,
      accuracy: lastExerciseResult.accuracy,
      noteCount: lastExerciseResult.total,
      correctCount: lastExerciseResult.correct,
      breakdown: lastExerciseResult.breakdown,
    };
    const snapTier = runOutcomeTier(
      snapRecord,
      exerciseDef.exercise.kind,
      currentStage,
      isFinalStage,
    );
    dwellBadgeSnapshotRef.current = {
      result: { ...lastExerciseResult },
      inDrill: drillState === 'active',
      drillStreak,
      cleanStreak,
      displayRunStreak: usesPerfectRegimen ? cleanStreak : rawCleanStreak,
      requiredRuns: usesGuidedSubdivisionRegimen
        ? (requiredCleanRuns ?? advancementCriteria.runs)
        : (requiredPerfectRuns ?? 0),
      practicingAdvancementStage,
      usesPerfectRegimen,
      overlearnUnlocked: overlearnState.unlocked,
      lastWasClean: usesPerfectRegimen
        ? lastExerciseResult.accuracy >= 1
        : snapTier === 'clean',
      lastRunOutcomeTier: snapTier,
    };
  }

  const showDwellDuringCountIn =
    isPlaying
    && activeExercise.useMetronome
    && countInBeat !== null
    && dwellBadgeSnapshotRef.current !== null;

  const stuckDialogOpen = Boolean((hasResult && stuckVisible) || stuckDialogDebugOnly);
  const regressNotice = exerciseProgress.pendingRegressNotice;
  const regressTargetStage = regressNotice
    ? allStages.find(s => s.id === regressNotice.toStageId)
    : null;
  const dismissRegressNotice = () => {
    if (regressTargetStage) {
      goToStage(regressTargetStage.id);
    }
    dispatch({ type: 'CLEAR_REGRESS_NOTICE', exerciseId: activeExercise.exerciseId });
  };
  const stuckShowDrillCopy = stuckDialogDebugOnly
    ? helpPreview === 'stuck_drill'
    : isDrillStuck;
  const stuckShowJumpCopy = stuckDialogDebugOnly
    ? helpPreview === 'stuck_tip'
    : (!isDrillStuck && regularStuckJumpCoaching);
  const stuckPreviewDrillRounds = stuckDialogDebugOnly && helpPreview === 'stuck_drill' ? 6 : drillAttempts;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}>
      {/* Header bar */}
      <Paper
        elevation={0}
        sx={{
          px: 2, py: 1,
          display: 'flex', alignItems: 'center', gap: 1,
          borderBottom: 1, borderColor: 'divider',
          position: 'relative',
          zIndex: 0,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
          <IconButton size="small" onClick={() => { stopPlayback(); dispatch({ type: 'SET_SCREEN', screen: 'home' }); }}>
            <Icon name="home" />
          </IconButton>
          {showEarlierTiersOnProgressMap && (
            <Tooltip title="Open progress map for earlier tiers or a tier-wide session">
              <IconButton
                size="small"
                aria-label="Open progress map for earlier tiers"
                onClick={() => {
                  stopPlayback();
                  dispatch({ type: 'SET_SCREEN', screen: 'progress' });
                }}
                sx={{ p: 0.25 }}
              >
                <Icon name="map" size={18} />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size="small"
            disabled={!canGoPrevStage}
            onClick={() => canGoPrevStage && goToStage(allStages[currentStageIdx - 1].id)}
            sx={{ p: 0.25 }}
          >
            <Icon name="chevron_left" size={18} />
          </IconButton>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              minWidth: 28,
              textAlign: 'center'
            }}>
            {exerciseNumber}/{totalExercises}
          </Typography>
          <IconButton
            size="small"
            disabled={!canGoNextStage}
            onClick={() => canGoNextStage && goToStage(allStages[currentStageIdx + 1].id)}
            sx={{ p: 0.25 }}
          >
            <Icon name="chevron_right" size={18} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, minWidth: 0 }}>
          <Typography variant="h3" sx={{ fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {stageInfo?.exercise.label ?? 'Exercise'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            <Chip label={HAND_SHORT[activeExercise.hand]} size="small" variant="outlined" />
            <Chip
              label={formatOctaveLabel(activeExercise.octaves)}
              size="small"
              variant="outlined"
              color={activeExercise.octaves > 1 ? 'primary' : 'default'}
            />
            {activeExercise.bpm > 0 && (
              <Chip label={`${activeExercise.bpm} BPM`} size="small" variant="outlined" />
            )}
            {activeExercise.subdivision === 'eighth' && (
              <Chip label="Eighths" size="small" variant="outlined" />
            )}
            {activeExercise.subdivision === 'triplet' && (
              <Chip label="Triplets" size="small" variant="outlined" />
            )}
            {activeExercise.subdivision === 'sixteenth' && (
              <Chip label="Sixteenths" size="small" variant="outlined" />
            )}
            {isFreeTempo && <Chip label="Free tempo" size="small" color="info" variant="outlined" />}
            {activeExercise.purpose === 'review' && (
              <Chip label="Review" size="small" color="warning" variant="outlined" />
            )}
            {/* Advancement-rule chip: stays in layout during play so the
                header row does not jump; hidden visually while running. */}
            {currentStage && (
              <Chip
                label={advancementChipLabel}
                size="small"
                color="success"
                variant="outlined"
                sx={{
                  flexShrink: 0,
                  opacity: !isPlaying && !freeTempoRunComplete && !lastExerciseResult ? 1 : 0,
                  pointerEvents:
                    !isPlaying && !freeTempoRunComplete && !lastExerciseResult ? undefined : 'none',
                }}
                aria-hidden={Boolean(isPlaying || freeTempoRunComplete || lastExerciseResult)}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ScalesInputSources />
          <ScalesAccountMenu />
        </Box>
      </Paper>
      {/* Exercise result. shown only when the loop is paused or the
          stage advanced. During the auto-loop dwell we collapse this into
          the compact toast over the score so the between-rounds beat
          stays tight. */}
      {showFullResults && lastExerciseResult && (
        <Paper
          elevation={0}
          sx={{
            mx: 2, mt: 2, p: 2.5,
            borderRadius: 2,
            textAlign: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontSize: '2.5rem',
              fontWeight: 700,
              color: lastRunUiSuccess ? 'success.main'
                : lastRunUiNear || lastExerciseResult.accuracy >= 0.6 ? 'warning.main'
                : 'error.main',
              mb: 0.5,
            }}
          >
            {Math.round(lastExerciseResult.accuracy * 100)}%
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 1
            }}>
            {lastExerciseResult.correct} of {lastExerciseResult.total} notes hit on time
            {usesPerfectRegimen && lastExerciseResult.accuracy < 1
              ? ' · need every note on the beat to advance'
              : ''}
          </Typography>
          {/*
            Breakdown matches the note colors in the score (perfect/early/
            late/wrong/missed) so the user can see where their score came
            from rather than just a single percentage. Only non-zero
            categories render to avoid noise.
          */}
          <SessionExerciseResultBreakdown breakdown={lastExerciseResult.breakdown} />
          {boundary && (
            <Box
              role="status"
              sx={{
                mt: 0.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.25,
                pl: 0.75,
                pr: 2,
                py: 0.75,
                borderRadius: 999,
                bgcolor: theme => `${theme.palette.success.main}14`,
                border: 1,
                borderColor: theme => `${theme.palette.success.main}40`,
                textAlign: 'left',
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  bgcolor: 'success.main',
                  color: 'success.contrastText',
                }}
              >
                <Icon name="emoji_events" size={18} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'success.dark', lineHeight: 1.2 }}>
                  {drillState === 'completed'
                    ? 'Drilled to perfection'
                    : activeExercise.purpose === 'review'
                      ? 'Review complete'
                      : allStages[currentStageIdx]
                        ? `Level ${allStages[currentStageIdx].stageNumber} cleared`
                        : 'Level complete'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    lineHeight: 1.25
                  }}>
                  {drillState === 'completed'
                    ? `${DRILL_TARGET_PERFECT_RUNS}/${DRILL_TARGET_PERFECT_RUNS} perfect runs`
                    : activeExercise.purpose === 'review'
                      ? 'Nice refresh. continue when you are ready.'
                      : usesGuidedSubdivisionRegimen && lastExerciseResult.accuracy < 1
                        ? `${formatAdvancementCleanRunsLabel(cleanStreak, requiredCleanRuns ?? advancementCriteria.runs)} clean · next level unlocked`
                        : allStages[currentStageIdx]
                          ? `${formatStageSummary(allStages[currentStageIdx])} · next level unlocked`
                          : 'You unlocked the next level.'}
                </Typography>
              </Box>
            </Box>
          )}
          {/* Adaptive coaching hint. only when the loop is paused on a
              sub-fluent run. The helper hides itself on passing runs;
              we additionally hide while at the boundary celebration so
              "Level cleared" stays the loudest signal. */}
          {!boundary && shakyHint && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: 'block',
                maxWidth: 460,
                mx: 'auto',
                mt: 1,
                mb: 0.5,
                lineHeight: 1.4,
                fontStyle: 'italic',
                textAlign: 'center'
              }}>
              <Box component="span" sx={{ fontWeight: 600, mr: 0.5, fontStyle: 'normal' }}>
                Hint &middot;
              </Box>
              {shakyHint.text}
            </Typography>
          )}
          {/* Paused mid-streak (loop stopped by user, not yet advanced).
              Streak progress + clear copy on what it'll take to advance. */}
          {!boundary && currentStage && (
            <Box
              role="status"
              sx={{
                mt: 0.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.25,
                pl: 0.75,
                pr: 2,
                py: 0.75,
                borderRadius: 999,
                bgcolor: theme => (lastRunUiSuccess
                  ? `${theme.palette.success.main}0D`
                  : lastRunUiNear
                    ? `${theme.palette.warning.main}14`
                    : `${theme.palette.error.main}12`),
                border: 1,
                borderColor: theme => (lastRunUiSuccess
                  ? `${theme.palette.success.main}40`
                  : lastRunUiNear
                    ? `${theme.palette.warning.main}40`
                    : `${theme.palette.error.main}35`),
                textAlign: 'left',
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  bgcolor: lastRunUiSuccess
                    ? 'success.main'
                    : lastRunUiNear
                      ? 'warning.main'
                      : 'error.main',
                  color: lastRunUiSuccess
                    ? 'success.contrastText'
                    : lastRunUiNear
                      ? 'warning.contrastText'
                      : 'error.contrastText',
                }}
              >
                <Icon
                  name={lastRunUiSuccess ? 'check' : lastRunUiNear ? 'schedule' : 'replay'}
                  size={20}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2 }}>
                  {overlearnState.unlocked
                    ? `Perfect runs: ${perfectRunsProgressLabel}`
                    : `Attempts: ${overlearnState.attemptCount}`}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    lineHeight: 1.25
                  }}>
                  {overlearnState.unlocked
                    ? (lastExerciseResult && lastExerciseResult.accuracy >= 1
                      ? `Need ${requiredPerfectRuns} perfect runs in a row to advance.`
                      : 'Streak reset. Every note must be pitch- and timing-perfect.')
                    : (lastExerciseResult && lastExerciseResult.accuracy >= 1
                      ? `Your target is ${requiredPerfectRuns} perfect runs in a row.`
                      : 'Land one perfect run to unlock your practice target.')}
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      )}
      {/* "New for you". modal when this stage introduces a new concept
          (also shown over the loading screen so tips are not skipped while
          the score generates). See guidance/computeGuidance.ts for triggers. */}
      {guidanceModal}
      {guidanceModalDebug}
      {/* Instruction panel. visible before starting.
          Stage description leads (it's level-specific and changes
          between stages). The exercise-level fingering guidance and
          video tutorial link sit in this panel next to the score so you
          can glance back while you play. Hand / octaves / tempo aren't restated
          here either: the header bar already carries that as a row of
          chips ("Both" · "2 octaves" · "72 BPM" etc.). */}
      {!isPlaying && !freeTempoRunComplete && !lastExerciseResult && (
        <Paper
          elevation={0}
          sx={{
            mx: 2, mt: 2,
            p: hasExerciseHistory ? 1.25 : 2.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          {stageInfo?.stage.description && (
            <Typography
              variant="body2"
              sx={{
                color: "text.primary",
                maxWidth: 520,
                mx: 'auto',
                fontWeight: hasExerciseHistory ? 400 : 500,
                lineHeight: 1.45
              }}>
              {stageInfo.stage.description}
            </Typography>
          )}

          {scaleHowToText && stageInfo && (
            <Box sx={{ mt: stageInfo.stage.description ? 1.25 : 0, maxWidth: 520, mx: 'auto' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {scaleHowToTitle}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 0.5,
                  lineHeight: 1.45
                }}>
                {scaleHowToText}
              </Typography>
              {stageInfo.exercise.helpUrl && (
                <Link
                  href={stageInfo.exercise.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  color="primary"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mt: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="play_circle" size={18} />
                  Watch a video tutorial
                </Link>
              )}
            </Box>
          )}

          {/* Cross-session streak carry-over. The advancement rule
              walks history newest-first regardless of when each record
              was made (see store.recordPractice's slice(0, runs)). When
              the user returns mid-streak we surface that explicitly so
              they don't think they're starting over. Only relevant on
              tempo stages with a real streak gate. */}
          {!isFreeTempo && currentStage && overlearnState.unlocked && requiredPerfectRuns != null && perfectStreak > 0 && perfectStreak < requiredPerfectRuns && (
            <Box sx={{ mt: hasExerciseHistory ? 0.75 : 1.5 }}>
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`${perfectRunsProgressLabel} perfect already · ${requiredPerfectRuns - perfectStreak} more to advance`}
              />
            </Box>
          )}

          {/* Rotating tip. omitted when the panel is already dense (see
              pickPracticeTip competingContentScore). Styled as its own
              callout so it does not read as more body copy. */}
          {practiceTip && (
            <Alert
              severity="info"
              variant="outlined"
              sx={{
                mt: 2,
                mx: 'auto',
                maxWidth: 520,
                textAlign: 'left',
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <AlertTitle sx={{ mb: 0.25, fontWeight: 600 }}>Practice tip</AlertTitle>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  lineHeight: 1.45
                }}>
                {practiceTip.text}
              </Typography>
            </Alert>
          )}
        </Paper>
      )}
      {/* Score display */}
      <Box
        className="main-content"
        sx={{
          flex: 1,
          flexBasis: 0,
          minHeight: 0,
          overflow: 'auto',
          py: 2,
          px: 1,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <ScoreDisplay
          score={score}
          currentMeasureIndex={isFreeTempo ? state.freeTempoMeasureIndex : state.currentMeasureIndex}
          currentNoteIndices={state.currentNoteIndices}
          activeMidiNotes={state.activeMidiNotes}
          practiceResultsByNoteId={practiceResults}
          crossingHighlightRegions={fingerCrossingRegions}
          // Live "you played a matching note" green only when the user
          // isn't actively being graded — otherwise the live tint conflicts
          // with per-note timing colours and lights up upcoming notes.
          highlightActiveMatches={!isPlaying && !lastExerciseResult}
          // Mic is monophonic: match written MIDI octaves so RH-only C4 does
          // not light LH C3 (pitch-class mode would light both).
          highlightActiveMatchMode="writtenMidi"
          // ±1 semitone slack is for YIN mic rounding only; hardware MIDI must
          // be exact so F does not tint E.
          highlightActiveMatchSemitoneSlack={
            state.microphoneActive && !hasEnabledMidiDevice(state) ? 1 : 0
          }
        />
        {wrongNoteDisplay && (
          <Box
            key={wrongNoteKeyRef.current}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              px: 2,
              py: 0.75,
              borderRadius: 2,
              fontWeight: 700,
              fontSize: '1rem',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              '@keyframes wrongFlash': {
                '0%': { opacity: 1, transform: 'scale(1)' },
                '60%': { opacity: 0.9 },
                '100%': { opacity: 0, transform: 'scale(0.9)' },
              },
              animation: 'wrongFlash 0.6s ease-out forwards',
            }}
          >
            <Icon name="close" size={18} />
            {wrongNoteDisplay}
          </Box>
        )}
        {((inDwell && lastExerciseResult) || showDwellDuringCountIn) && (() => {
          const snap = dwellBadgeSnapshotRef.current;
          const live = Boolean(inDwell && lastExerciseResult);
          const fromCountIn = showDwellDuringCountIn && !live && snap;
          if (!live && !fromCountIn) return null;

          const result: ExerciseResult = live ? lastExerciseResult! : snap!.result;
          const inDrill = live ? drillState === 'active' : snap!.inDrill;
          const streakNumerator = live
            ? (inDrill ? drillStreak : (usesPerfectRegimen ? cleanStreak : rawCleanStreak))
            : (inDrill ? snap!.drillStreak : snap!.displayRunStreak);
          const streakDenominator = live
            ? dwellStreakDenominator(
              inDrill,
              usesGuidedSubdivisionRegimen
                ? (requiredCleanRuns ?? advancementCriteria.runs)
                : requiredPerfectRuns,
            )
            : dwellStreakDenominator(inDrill, snap!.requiredRuns || null);
          const wasClean = live ? lastWasClean : snap!.lastWasClean;
          const outcomeTier = live ? lastRunOutcomeTier : snap!.lastRunOutcomeTier;
          const usesPerfectRegimenLive = live ? usesPerfectRegimen : snap!.usesPerfectRegimen;
          const overlearnUnlocked = live ? overlearnState.unlocked : snap!.overlearnUnlocked;
          const {
            statusBg,
            statusContrast,
            statusHeadlineColor,
            dwellStatusIcon,
            headline,
            subline,
          } = computeDwellToastCopy({
            result,
            inDrill,
            wasClean,
            outcomeTier,
            streakNumerator,
            streakDenominator,
            usesPerfectRegimen: usesPerfectRegimenLive,
            overlearnUnlocked,
          });
          const secondsLeft = loopCountdown ?? Math.ceil(AUTO_LOOP_DWELL_MS / 1000);
          const showLoopChrome = live && !fromCountIn;
          return (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 16,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 8,
              }}
            >
              <Box
                sx={{
                  pointerEvents: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  pl: 1,
                  pr: 1.5,
                  py: 1,
                  borderRadius: 999,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                  '@keyframes loopFlashIn': {
                    '0%': { opacity: 0, transform: 'translateY(-6px) scale(0.98)' },
                    '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
                  },
                  animation: 'loopFlashIn 0.22s ease-out',
                }}
              >
                {/*
                  Pass/fail badge. Saturated background + white glyph for
                  high contrast. both colors come from the palette's
                  `contrastText` so they read on either status hue.
                */}
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor: statusBg,
                    color: statusContrast,
                  }}
                >
                  <Icon name={dwellStatusIcon} size={28} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: 320 }}>
                  <Typography
                    sx={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      lineHeight: 1.15,
                      color: statusHeadlineColor,
                    }}
                  >
                    {headline}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.25
                    }}>
                    {subline}
                  </Typography>
                </Box>
                {showLoopChrome && (
                  <>
                    <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider', mx: 0.5 }} />
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        color: 'primary.main',
                      }}
                    >
                      <Icon name="autorenew" size={16} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                        {`↻ ${secondsLeft}s`}
                      </Typography>
                    </Box>
                    <Tooltip title={inDrill ? 'Stop drilling' : 'Stop the auto-loop'}>
                      <IconButton
                        size="small"
                        onClick={inDrill ? stopDrilling : pauseAutoLoop}
                        aria-label={inDrill ? 'Stop drilling' : 'Stop the auto-loop'}
                      >
                        <Icon name="stop_circle" size={20} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
            </Box>
          );
        })()}
        {/* Stuck prompts: modal (same visual language as GuidanceCallout).
            Scheduler pauses while open so the user can respond before any restart. */}
        <Dialog
          open={stuckDialogOpen}
          onClose={(_event, reason) => {
            if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') return;
            if (stuckDialogDebugOnly) {
              setHelpPreview(null);
              return;
            }
            dismissStuckSessionDialog(reason);
          }}
          aria-labelledby="stuck-prompt-title"
          maxWidth={false}
          fullWidth
          scroll="paper"
          sx={{ zIndex: 2000 }}
          slotProps={{
            backdrop: {
              sx: { bgcolor: 'rgba(0, 0, 0, 0.32)' },
            },
            paper: {
              elevation: 3,
              sx: (theme: Theme) => ({
                maxWidth: 480,
                width: '100%',
                borderRadius: '28px',
                overflow: 'hidden',
                mx: 2,
                boxShadow: theme.shadows[8],
              }),
            },
          }}
        >
          <DialogContent
            sx={{
              p: { xs: 6, sm: 8 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: theme => `${theme.palette.primary.main}1F`,
                  color: 'primary.main',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 4,
                }}
              >
                <Icon
                  name={stuckShowDrillCopy ? 'self_improvement' : (stuckShowJumpCopy ? 'lightbulb' : 'undo')}
                  size={28}
                />
              </Box>
              <Typography
                id="stuck-prompt-title"
                component="h2"
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  lineHeight: '2rem',
                  letterSpacing: 0,
                  color: 'text.primary',
                }}
              >
                {stuckShowDrillCopy
                  ? 'Pause for a moment?'
                  : (stuckShowJumpCopy ? 'Tip' : 'Want a stepping-stone?')}
              </Typography>
            </Box>
            {stuckShowDrillCopy ? (
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: '1.25rem',
                  letterSpacing: '0.015625rem',
                  color: 'text.secondary',
                  textAlign: 'center',
                }}
              >
                {`You have put in ${stuckPreviewDrillRounds} drill rounds. Thank you for sticking with it. A short pause before the next round often helps more than pushing when your hands feel tired.`}
              </Typography>
            ) : stuckShowJumpCopy ? (
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  letterSpacing: '0.015625rem',
                  color: 'text.secondary',
                  textAlign: 'center',
                }}
              >
                {stuckJumpCoachingModalTip(
                  stuckDialogDebugOnly ? DEBUG_PREVIEW_JUMP_CONCEPT_KEYS : newCliffConceptKeysForStuck,
                )}
              </Typography>
            ) : (
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.55,
                  letterSpacing: '0.015625rem',
                  color: 'text.secondary',
                  textAlign: 'center',
                }}
              >
                {`You have been on this level (${attemptsOnLevelLabel}). If you want steadier footing, ${stuckFallbackLabel} is there. Staying here is fine too.`}
              </Typography>
            )}
            <Box
              sx={{
                mt: 6,
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              {stuckShowDrillCopy ? (
                <Stack
                  direction={{ xs: 'column-reverse', sm: 'row' }}
                  spacing={1}
                  sx={{
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AdvanceActionTooltip title={advanceActionTooltipTitle}>
                    <Button
                      variant="text"
                      onClick={() => {
                        if (stuckDialogDebugOnly) {
                          setHelpPreview(null);
                          return;
                        }
                        setDrillSnoozedUntil(drillAttempts + DRILL_SNOOZE_BY);
                      }}
                      sx={{
                        textTransform: 'none',
                        borderRadius: '999px',
                        flex: { sm: '0 0 auto' },
                      }}
                    >
                      Keep drilling
                    </Button>
                  </AdvanceActionTooltip>
                  <AdvanceActionTooltip title={advanceActionTooltipTitle}>
                    <Button
                      variant="contained"
                      disableElevation
                      onClick={() => {
                        if (stuckDialogDebugOnly) {
                          setHelpPreview(null);
                          return;
                        }
                        setDrillState('inactive');
                        setLoopPaused(true);
                      }}
                      sx={{
                        textTransform: 'none',
                        borderRadius: '999px',
                        height: 40,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        minWidth: 140,
                      }}
                    >
                      Move on
                    </Button>
                  </AdvanceActionTooltip>
                </Stack>
              ) : stuckShowJumpCopy ? (
                <Stack
                  direction={{ xs: 'column-reverse', sm: 'row' }}
                  spacing={1}
                  sx={{
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {stuckFallbackStage && (
                    <AdvanceActionTooltip title={advanceActionTooltipTitle}>
                      <Button
                        variant="text"
                        onClick={() => {
                          if (stuckDialogDebugOnly) {
                            setHelpPreview(null);
                            return;
                          }
                          goToStage(stuckFallbackStage.id);
                        }}
                        sx={{ textTransform: 'none', borderRadius: '999px', flex: { sm: '0 0 auto' } }}
                      >
                        Review previous level
                      </Button>
                    </AdvanceActionTooltip>
                  )}
                  <AdvanceActionTooltip title={advanceActionTooltipTitle}>
                    <Button
                      variant="contained"
                      color="primary"
                      disableElevation
                      onClick={() => {
                        if (stuckDialogDebugOnly) {
                          setHelpPreview(null);
                          return;
                        }
                        resetRegularStuckCounter();
                      }}
                      sx={{
                        textTransform: 'none',
                        borderRadius: '999px',
                        height: 40,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        minWidth: 140,
                      }}
                    >
                      Got it
                    </Button>
                  </AdvanceActionTooltip>
                </Stack>
              ) : (
                <Stack
                  direction={{ xs: 'column-reverse', sm: 'row' }}
                  spacing={1}
                  sx={{
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AdvanceActionTooltip title={advanceActionTooltipTitle}>
                    <Button
                      variant="text"
                      onClick={() => {
                        if (stuckDialogDebugOnly) {
                          setHelpPreview(null);
                          return;
                        }
                        resetRegularStuckCounter();
                      }}
                      sx={{
                        textTransform: 'none',
                        borderRadius: '999px',
                        flex: { sm: '0 0 auto' },
                      }}
                    >
                      Stay here
                    </Button>
                  </AdvanceActionTooltip>
                  {stuckFallbackStage && (
                    <AdvanceActionTooltip title={advanceActionTooltipTitle}>
                      <Button
                        variant="contained"
                        disableElevation
                        onClick={() => {
                          if (stuckDialogDebugOnly) {
                            setHelpPreview(null);
                            return;
                          }
                          goToStage(stuckFallbackStage.id);
                        }}
                        sx={{
                          textTransform: 'none',
                          borderRadius: '999px',
                          height: 40,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          minWidth: 140,
                        }}
                      >
                        {`Drop to ${stuckFallbackLabel}`}
                      </Button>
                    </AdvanceActionTooltip>
                  )}
                </Stack>
              )}
            </Box>
          </DialogContent>
        </Dialog>
        <Dialog
          open={regressNotice != null}
          onClose={(_event, reason) => {
            if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') return;
            dismissRegressNotice();
          }}
          aria-labelledby="regress-notice-title"
          maxWidth={false}
          fullWidth
          scroll="paper"
          sx={{ zIndex: 2001 }}
          slotProps={{
            backdrop: { sx: { bgcolor: 'rgba(0, 0, 0, 0.32)' } },
            paper: {
              elevation: 3,
              sx: (theme: Theme) => ({
                maxWidth: 440,
                width: '100%',
                borderRadius: '28px',
                overflow: 'hidden',
                mx: 2,
                boxShadow: theme.shadows[8],
              }),
            },
          }}
        >
          <DialogContent sx={{ p: { xs: 6, sm: 8 }, textAlign: 'center' }}>
            <Typography
              id="regress-notice-title"
              component="h2"
              sx={{ fontSize: '1.25rem', fontWeight: 500, mb: 2 }}
            >
              Stepped back for more practice
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.55, color: 'text.secondary', mb: 4 }}>
              {regressTargetStage
                ? `This level needs more foundation. Practice Level ${regressTargetStage.stageNumber} until a perfect run feels reachable.`
                : 'This level needs more foundation. Try an earlier level until a perfect run feels reachable.'}
            </Typography>
            <Button
              variant="contained"
              disableElevation
              onClick={dismissRegressNotice}
              sx={{ textTransform: 'none', borderRadius: '999px', minWidth: 120 }}
            >
              Got it
            </Button>
          </DialogContent>
        </Dialog>
        {countInBeat !== null && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <Typography
              key={countInBeat}
              sx={{
                fontSize: '5rem',
                fontWeight: 800,
                color: 'primary.main',
                lineHeight: 1,
                '@keyframes countPulse': {
                  '0%': { transform: 'scale(1.2)', opacity: 1 },
                  '100%': { transform: 'scale(1)', opacity: 0.7 },
                },
                animation: 'countPulse 0.3s ease-out forwards',
              }}
            >
              {countInBeat}
            </Typography>
          </Box>
        )}
        {perfectWarmupUi && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 11,
              pointerEvents: 'none',
              px: 2,
            }}
          >
            {/*
              Same visual language as the post-run dwell toast: paper pill,
              saturated status circle + headline, so the dry-run success
              reads like pass/fail badges instead of a full-screen wash.
            */}
            <Box
              role="status"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                pl: 1,
                pr: 1.75,
                py: 1.125,
                maxWidth: 440,
                borderRadius: 999,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                '@keyframes warmupToastIn': {
                  '0%': { opacity: 0, transform: 'translateY(-6px) scale(0.98)' },
                  '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
                },
                animation: 'warmupToastIn 0.22s ease-out',
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  bgcolor: 'success.main',
                  color: 'success.contrastText',
                }}
              >
                <Icon name="check" size={28} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: 'success.main',
                  }}
                >
                  Nice. Right notes, ready to go
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    lineHeight: 1.35,
                    mt: 0.25
                  }}>
                  {activeExercise.bpm
                    ? 'Starting metronome run in a moment.'
                    : 'Starting scored run in a moment.'}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
      {/* Grading engines (no visual output) */}
      {isFreeTempo
        && !isPlaying
        && !freeTempoRunComplete
        && !lastExerciseResult
        && !showGuidanceCallout
        && !perfectWarmupUi
        && state.inputMode === 'midi'
        && hasEnabledMidiDevice(state) && (
          <PreStartFreeTempoProbe
            score={score}
            hand={activeExercise.hand}
            exerciseId={activeExercise.exerciseId}
            stageId={activeExercise.stageId}
            onPerfectDryRun={() => schedulePostDryRunStart({ recordWarmupHit: true })}
          />
        )}
      {!isFreeTempo
        && !isPlaying
        && !freeTempoRunComplete
        && !lastExerciseResult
        && !showGuidanceCallout
        && !perfectWarmupUi
        && timedMidiDryRunRequired
        && (
          <PreStartFreeTempoProbe
            score={score}
            hand={activeExercise.hand}
            exerciseId={activeExercise.exerciseId}
            stageId={activeExercise.stageId}
            onPerfectDryRun={() => schedulePostDryRunStart({ recordWarmupHit: false })}
          />
        )}
      {isFreeTempo && isPlaying && !freeTempoRunComplete && (
        <FreeTempoGrader />
      )}
      {!isFreeTempo && isPlaying && (
        <TimedGrader />
      )}
      {/* Bottom action bar */}
      <Paper
        elevation={3}
        sx={{
          px: 2, py: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
          borderTop: 1, borderColor: 'divider',
          position: 'relative',
          zIndex: 2,
          bgcolor: 'background.paper',
        }}
      >
        {/* Active drill: single CTA to break out. The auto-loop keeps
            firing rounds; the user just needs an out. */}
        {drillState === 'active' && hasResult && (
          <Button
            variant="outlined"
            size="large"
            onClick={stopDrilling}
            sx={{ gap: 1, minWidth: 200, py: 1, textTransform: 'none' }}
          >
            <Icon name="stop_circle" size={22} /> Stop drilling
          </Button>
        )}

        {/* Boundary state: stage cleared this session. Continue moves on;
            optional "Practice until perfect" loop (timed stages only). */}
        {boundary && drillState !== 'active' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <AdvanceActionTooltip title={advanceActionTooltipTitle}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => {
                    armAdvanceCooldown();
                    cancelAutoLoop();
                    advanceToNext();
                  }}
                  sx={{
                    gap: 1,
                    minWidth: 240,
                    py: 1.5,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                    textTransform: 'none',
                  }}
                >
                  {continueOrFinishLabel}
                  <Icon name="arrow_forward" size={22} />
                </Button>
              </AdvanceActionTooltip>
              {!isFreeTempo && drillState !== 'completed' && (
                <Tooltip
                  describeChild
                  enterDelay={350}
                  leaveDelay={120}
                  placement="top"
                  slotProps={{
                    tooltip: {
                      sx: {
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        border: 1,
                        borderColor: 'divider',
                        boxShadow: 4,
                        p: 0,
                        maxWidth: 360,
                      },
                    },
                  }}
                  title={(
                    <Box sx={{ p: 1.75, textAlign: 'left' }}>
                      <Typography variant="subtitle2" component="p" sx={{ mt: 0, mb: 1, fontWeight: 700 }}>
                        How it works
                      </Typography>
                      <Typography
                        variant="body2"
                        component="p"
                        sx={{
                          color: "text.secondary",
                          m: 0,
                          lineHeight: 1.5
                        }}>
                        Repeats this stage in a tight loop until you play{' '}
                        {DRILL_TARGET_PERFECT_RUNS} perfect runs in a row (literal 100% each time).
                        Useful when you want to lock in an exercise before moving on.
                      </Typography>
                    </Box>
                  )}
                >
                  <span>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={startDrill}
                      aria-label="Practice until perfect. Hover for how it works."
                      sx={{
                        gap: 1,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                      }}
                    >
                      <Icon name="bolt" size={20} /> Practice until perfect
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>
        )}

        {/* Loop paused by user. full action bar so they can choose. */}
        {showFullResults && !boundary && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                setLoopPaused(false);
                if (isFreeTempo) handleKeepPracticing();
                else void startPlayback();
              }}
              sx={{
                gap: 1,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              }}
            >
              <Icon name="replay" size={20} /> Practice Again
            </Button>
            {showMoveOnFromPausedFullResults && (
              <AdvanceActionTooltip title={advanceActionTooltipTitle}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => {
                    armAdvanceCooldown();
                    cancelAutoLoop();
                    advanceToNext();
                  }}
                  sx={{ gap: 1, textTransform: 'none' }}
                >
                  <Icon name="skip_next" size={20} /> Move On
                </Button>
              </AdvanceActionTooltip>
            )}
          </Box>
        )}

        {/* Primary action: Start / Stop */}
        {!isPlaying && !freeTempoRunComplete && !lastExerciseResult && (
          <Button
            variant="contained"
            size="large"
            onClick={startPlayback}
            aria-label={
              isFreeTempo
                ? 'Start playing. Space, Enter, or double-tap the same key.'
                : timedMidiDryRunRequired && !timedDryRunReady
                  ? 'Start with metronome. Optional shape check first; double-tap the same key or click here to start anytime.'
                  : 'Start with metronome. Space, Enter, or double-tap the same key.'
            }
            title={
              isFreeTempo
                ? 'Space or Enter to start. Optional: play the shape cleanly in free time first, then a short cue and scoring. Double-tap the same key (press, release, press) to start anytime, same as Start Playing.'
                : timedMidiDryRunRequired && !timedDryRunReady
                  ? 'Click or double-tap the same key to start anytime. Optional: run the shape once first. Space and Enter stay off until you use this button or a double-tap so keys do not start by accident.'
                  : 'Space, Enter, or double-tap the same piano key (press, release, press within a moment) to start'
            }
            sx={{
              minWidth: 240,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 700,
              borderRadius: 3,
              gap: 1,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
            }}
          >
            <Icon name="play_arrow" size={28} />
            {isFreeTempo ? 'Start Playing' : 'Start with Metronome'}
          </Button>
        )}

        {isPlaying && !freeTempoRunComplete && (
          <Button
            variant="outlined"
            size="large"
            onClick={() => {
              // Stopping mid-run also breaks out of the auto-loop —
              // otherwise the partial result would re-trigger another
              // attempt as soon as it's recorded.
              pauseAutoLoop();
              stopPlayback();
            }}
            color="error"
            sx={{ minWidth: 200, py: 1, gap: 1 }}
          >
            <Icon name="stop" size={24} /> Stop
          </Button>
        )}

        {/* For free-tempo: allow moving on after stopping mid-way if at least one run was completed */}
        {isFreeTempo && !freeTempoRunComplete && !isPlaying && hasCompletedRun && !lastExerciseResult && (
          <Button
            variant="text"
            size="small"
            onClick={handleFinishAndNext}
            sx={{ gap: 0.5, textTransform: 'none', color: 'text.secondary' }}
          >
            Move on <Icon name="skip_next" size={18} />
          </Button>
        )}
      </Paper>
      {labsDebug && helpPreview === 'practice_tip' && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 96,
            left: 16,
            right: 16,
            zIndex: 2400,
            maxWidth: 560,
            mx: 'auto',
          }}
        >
          <Alert severity="info" variant="outlined" onClose={() => setHelpPreview(null)}>
            <AlertTitle sx={{ fontWeight: 700 }}>Practice tip (debug)</AlertTitle>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {practiceTip?.text ?? 'No tip for this stage (suppressed when the pre-start panel is dense, or pool empty).'}
            </Typography>
          </Alert>
        </Box>
      )}
      {labsDebug && helpPreview?.startsWith('shaky_') && currentStage && (() => {
        const mock =
          helpPreview === 'shaky_timing' ? DEBUG_SHAKY_MOCK_TIMING
            : helpPreview === 'shaky_pitch' ? DEBUG_SHAKY_MOCK_PITCH
              : DEBUG_SHAKY_MOCK_FEW_NOTES;
        const hint = pickShakyHint(mock, currentStage);
        return (
          <Box
            sx={{
              position: 'fixed',
              bottom: 96,
              left: 16,
              right: 16,
              zIndex: 2400,
              maxWidth: 560,
              mx: 'auto',
            }}
          >
            <Alert severity="warning" variant="outlined" onClose={() => setHelpPreview(null)}>
              <AlertTitle sx={{ fontWeight: 700 }}>
                Shaky-run hint (debug)
                {hint ? ` · ${hint.id}` : ''}
              </AlertTitle>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {hint?.text ?? 'This mock run plus stage did not produce a hint (e.g. tempo-off stage + timing branch).'}
              </Typography>
            </Alert>
          </Box>
        );
      })()}
      <Dialog
        open={labsDebug && helpPreview === 'drill_how_it_works'}
        onClose={() => setHelpPreview(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          How it works (Practice until perfect)
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            component="p"
            sx={{
              color: "text.secondary",
              m: 0,
              lineHeight: 1.5
            }}>
            Repeats this stage in a tight loop until you play
            {' '}
            {DRILL_TARGET_PERFECT_RUNS}
            {' '}
            perfect runs in a row (literal 100% each time). Useful when you want to lock in an exercise before moving on.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
