import { useEffect, useRef, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
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
import { findStage, findExercise, isPentascaleKind } from '../curriculum/tiers';
import { formatStageSummary, formatOctaveLabel } from '../curriculum/stageSummary';
import { pickPracticeTip } from '../curriculum/practiceTips';
import { pickShakyHint } from './shakyHint';
import type { PracticeRecord } from '../progress/types';
import {
  getExerciseProgress,
  getAdvancementCriteria,
  getCleanRunStreak,
  runOutcomeTier,
  consecutiveRoughRunsOnStage,
  type RunOutcomeTier,
} from '../progress/store';
import type { SessionExercise } from '../curriculum/types';
import FreeTempoGrader from './FreeTempoGrader';
import PreStartFreeTempoProbe from './PreStartFreeTempoProbe';
import TimedGrader from './TimedGrader';
import ScalesInputSources from './InputSources';
import {
  useAutoLoopScheduler,
  DEFAULT_AUTO_LOOP_DWELL_MS as AUTO_LOOP_DWELL_MS,
} from './useAutoLoopScheduler';
import { isDebugEnabled, logDebugEvent } from '../utils/practiceDebugLog';
import {
  nextDrillStreak as computeNextDrillStreak,
  isDrillStuck as computeIsDrillStuck,
  isRegularStuckGated as computeIsRegularStuckGated,
  type DrillState,
} from './drillState';
import GuidanceCallout from './GuidanceCallout';
import { computeGuidance, isGuidancePayloadEmpty, resolveHandGuidance } from '../guidance/computeGuidance';

// Drill = voluntary polish loop. Strict 100% required to keep the streak,
// 3 perfect-in-a-row to complete. Stuck threshold is generous enough to
// not nag a learner who just needs another minute, but kicks in before
// fatigue-grooved errors set in.
const DRILL_TARGET_PERFECT_RUNS = 3;
const DRILL_STUCK_AT = 8;
const DRILL_SNOOZE_BY = 4;
// Regular auto-loop "Try going back?" — requires this many consecutive
// rough (red-tier) runs on the same stage; snooze bumps that bar.
const REGULAR_STUCK_AT = 6;
const REGULAR_SNOOZE_BY = 4;
/** How long the free-tempo "Nice — ready to start" overlay stays before scored playback. */
const FREE_TEMPO_WARMUP_UI_MS = 2200;

/** Cached last auto-loop verdict so the chip can stay visible through metronome count-in. */
type DwellBadgeSnapshot = {
  result: ExerciseResult;
  inDrill: boolean;
  drillStreak: number;
  cleanStreak: number;
  requiredRuns: number;
  lastWasClean: boolean;
  lastRunOutcomeTier: RunOutcomeTier;
  shakyHintText: string | null;
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {name}
    </span>
  );
}


// Short labels for the header chip cluster. The full "Right hand" /
// "Left hand" / "Both hands" strings are no longer needed: the header
// chip is the only place hand info renders.
const HAND_SHORT = { right: 'RH', left: 'LH', both: 'Both' } as const;

const NOTE_NAMES = ['C', 'C\u266F', 'D', 'D\u266F', 'E', 'F', 'F\u266F', 'G', 'G\u266F', 'A', 'A\u266F', 'B'];
function midiToNoteName(midi: number): string { return NOTE_NAMES[midi % 12]; }

export default function SessionScreen() {
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
  /** Edge-detect MIDI note-ons for pre-start autostart (timed) / guidance dismiss. */
  const sessionMidiPrevDownRef = useRef(false);
  const loadedStageRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [wrongNoteDisplay, setWrongNoteDisplay] = useState<string | null>(null);
  const wrongNoteKeyRef = useRef(0);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);
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
  const cancelWarmupCountdown = useCallback(() => {
    if (warmupTimerRef.current != null) {
      window.clearTimeout(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
    setPerfectWarmupUi(false);
  }, []);

  useEffect(() => () => cancelWarmupCountdown(), [cancelWarmupCountdown]);

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
    const nextIdx = state.activeExerciseIndex + 1;
    if (sessionPlan && nextIdx < sessionPlan.exercises.length) {
      const nextExercise = sessionPlan.exercises[nextIdx];
      const nextScore = generateScoreForExercise(nextExercise);
      if (nextScore) {
        dispatch({ type: 'NEXT_EXERCISE', score: nextScore });
      } else {
        dispatch({ type: 'COMPLETE_SESSION' });
      }
    } else {
      dispatch({ type: 'COMPLETE_SESSION' });
    }
  }, [state.activeExerciseIndex, sessionPlan, dispatch]);

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

  /**
   * Tracks the most recent result we've already counted toward attempts /
   * drill streak. lastExerciseResult is referentially stable until the
   * next dispatch, so a ref + identity-equality check is enough to make
   * the counting effect run exactly once per attempt (re-renders from
   * unrelated state changes won't re-fire it).
   */
  const lastCountedResultRef = useRef<typeof lastExerciseResult>(null);
  const dwellBadgeSnapshotRef = useRef<DwellBadgeSnapshot | null>(null);

  const startPlayback = useCallback(async () => {
    cancelWarmupCountdown();
    if (!score || !activeExercise) return;
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
    engineRef.current = engine;
    engine.setTempo(activeExercise.bpm || 80);
    engine.setMetronome(activeExercise.useMetronome);

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

    // Count-in: 4 beats of metronome clicks before playback starts
    if (activeExercise.useMetronome) {
      dispatch({ type: 'SET_PLAYING', isPlaying: true });
      const msPerBeat = 60000 / (activeExercise.bpm || 80);
      const startDelay = 150;
      for (let i = 0; i < 4; i++) {
        const beat = i;
        setTimeout(() => setCountInBeat(beat + 1), startDelay + beat * msPerBeat);
      }
      await engine.playCountIn(activeExercise.bpm || 80);
      setCountInBeat(null);
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
    dispatch({ type: 'SET_PLAYING', isPlaying: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state.microphoneActive/midiConnected read at call-time for debug only
  }, [score, activeExercise, dispatch, finishExercise, drillState, cancelWarmupCountdown]);

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
    // Flag before stopping so the engine's finish callback (fired
    // synchronously from `stop()`) can tell this apart from natural
    // completion and skip the FINISH_EXERCISE dispatch.
    manuallyStoppedRef.current = true;
    engineRef.current?.stop();
    setCountInBeat(null);
    // STOP_PRACTICE_RUN (rather than just SET_PLAYING: false) wipes the
    // partial run state — per-note colors, playhead, free-tempo cursor —
    // so a manually-stopped exercise returns to a clean pre-run view
    // instead of leaving "ghost" grading on the score.
    if (activeExercise?.bpm) setTimedDryRunReady(false);
    dispatch({ type: 'STOP_PRACTICE_RUN' });
  }, [dispatch, activeExercise?.bpm]);

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
  // moving on or stepping back wipes them clean. `passedThisExercise`
  // only resets on exerciseId change (not stageId), because finishing
  // one stage of an exercise doesn't unmark the exercise as "passed in
  // this session"; only navigating to a different exercise should.
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
  }, [activeExercise?.exerciseId, activeExercise?.stageId]);

  useEffect(() => {
    setPassedThisExercise(false);
  }, [activeExercise?.exerciseId]);

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
    ? getAdvancementCriteria(_curStageSch, !!_isFinalStageSch)
    : { threshold: 0.9, runs: 3 };
  const _exerciseProgressSch = activeExercise && loaded
    ? getExerciseProgress(state.progress, activeExercise.exerciseId)
    : null;
  const _cleanStreakSch =
    _exerciseProgressSch && activeExercise
      ? getCleanRunStreak(_exerciseProgressSch, activeExercise.stageId)
      : 0;

  const _consecutiveRoughSch =
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

  const isRegularStuckGatedForScheduler =
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
          requiredRuns: _advCritSch.runs,
          hasFallbackStage: _hasFallbackStageForScheduler,
          snoozedUntil: regularSnoozedUntil,
          stageId: activeExercise.stageId,
          threshold: _advCritSch.threshold,
          history: _exerciseProgressSch.history,
        }),
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
  const guidanceModal = showGuidanceCallout ? (
    <GuidanceCallout payload={guidancePayload} onDismiss={dismissGuidance} />
  ) : null;

  // Simple session shortcuts (see AGENTS / WCAG: avoid single printable keys
  // for destructive actions; Enter/Space here mirror the primary Start path).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (target?.closest('.MuiDialog-root')) return;

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

      if (showGuidanceCallout) {
        e.preventDefault();
        dismissGuidance();
        return;
      }

      const { isPlaying, freeTempoRunComplete, lastExerciseResult } = state;
      if (isPlaying || freeTempoRunComplete || lastExerciseResult) return;
      if (!activeExercise || !loaded || !score) return;
      if (activeExercise.bpm && timedMidiDryRunRequired && !timedDryRunEffectiveReady) return;

      e.preventDefault();
      void startPlayback();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeExercise,
    loaded,
    score,
    state,
    showGuidanceCallout,
    dismissGuidance,
    startPlayback,
    stopPlayback,
    passedThisExercise,
    drillState,
    cancelAutoLoop,
    advanceToNext,
    timedMidiDryRunRequired,
    timedDryRunEffectiveReady,
  ]);

  const canHearUserInput =
    (state.inputMode === 'midi' && hasEnabledMidiDevice(state)) || state.microphoneActive;

  // Piano note-on mirrors Enter/Space for timed pre-start; free-tempo uses
  // PreStartFreeTempoProbe instead so a dry run does not jump straight into
  // the scored attempt.
  useEffect(() => {
    const size = state.activeMidiNotes.size;
    const wasDown = sessionMidiPrevDownRef.current;
    if (showGuidanceCallout) {
      if (size > 0 && !wasDown) dismissGuidance();
      sessionMidiPrevDownRef.current = size > 0;
      return;
    }
    sessionMidiPrevDownRef.current = size > 0;
    if (size === 0 || wasDown) return;
    if (document.querySelector('.MuiDialog-root')) return;

    if (!activeExercise || !loaded || !score) return;

    const hasResMidi = !!state.lastExerciseResult && !state.isPlaying;
    const boundaryMidi = hasResMidi
      && drillState !== 'active'
      && (
        Boolean(state.lastExerciseResult?.advanced)
        || passedThisExercise
        || drillState === 'completed'
      );
    if (boundaryMidi) {
      cancelAutoLoop();
      advanceToNext();
      return;
    }

    if (state.isPlaying || state.freeTempoRunComplete || state.lastExerciseResult) return;
    if (!canHearUserInput) return;

    const isFreeTempoExercise = !activeExercise.bpm;
    if (isFreeTempoExercise) return;
    void startPlayback();
  }, [
    activeExercise,
    loaded,
    score,
    state.activeMidiNotes,
    state.isPlaying,
    state.freeTempoRunComplete,
    state.lastExerciseResult,
    showGuidanceCallout,
    dismissGuidance,
    startPlayback,
    canHearUserInput,
    drillState,
    passedThisExercise,
    cancelAutoLoop,
    advanceToNext,
  ]);

  if (!activeExercise || !loaded || !score) {
    return (
      <>
        {guidanceModal}
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Loading exercise...</Typography>
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
  const { freeTempoRunComplete, hasCompletedRun } = state;
  // "Has the user practiced this exercise before?" — drives the
  // pre-start panel's compact mode (tighter padding, lighter font
  // weight on the stage description). Fingering + video stay in this
  // panel (not the modal) so they stay beside the score.
  const hasExerciseHistory = exerciseProgress.history.length > 0;

  const currentStage = stageInfo?.stage ?? null;
  const isFinalStage = currentStage ? currentStageIdx === allStages.length - 1 : false;
  const advancementCriteria = currentStage
    ? getAdvancementCriteria(currentStage, isFinalStage)
    : { threshold: 0.9, runs: 3 };
  const cleanStreak = currentStage
    ? getCleanRunStreak(exerciseProgress, currentStage.id)
    : 0;

  const scaleHowToText = stageInfo
    ? resolveHandGuidance(stageInfo.exercise, activeExercise.hand)
    : null;
  const scaleHowToTitle = scaleHowToText
    ? `How to play (${HAND_SHORT[activeExercise.hand]})`
    : '';

  const showSubdivisionChipPreStart = activeExercise.subdivision !== 'none';
  const showCleanStreakChipPreStart = !isFreeTempo
    && !!currentStage
    && cleanStreak > 0
    && cleanStreak < advancementCriteria.runs;
  const competingPreStartScore = (stageInfo?.stage.description?.trim() ? 1 : 0)
    + (scaleHowToText ? 1 : 0)
    + (stageInfo?.exercise.helpUrl ? 1 : 0)
    + (showSubdivisionChipPreStart ? 1 : 0)
    + (showCleanStreakChipPreStart ? 1 : 0);

  const practiceTip = stageInfo
    ? pickPracticeTip(stageInfo.stage, stageInfo.exercise.id, {
      competingContentScore: competingPreStartScore,
    })
    : null;
  const cleanThresholdPct = Math.round(advancementCriteria.threshold * 100);
  const lastRunPracticeRecord: PracticeRecord | null = lastExerciseResult && exerciseDef
    ? {
        exerciseId: activeExercise.exerciseId,
        stageId: activeExercise.stageId,
        timestamp: 0,
        accuracy: lastExerciseResult.accuracy,
        noteCount: lastExerciseResult.total,
        correctCount: lastExerciseResult.correct,
        breakdown: lastExerciseResult.breakdown,
      }
    : null;
  const lastRunOutcomeTier: RunOutcomeTier = lastRunPracticeRecord && currentStage && exerciseDef
    ? runOutcomeTier(lastRunPracticeRecord, exerciseDef.exercise.kind, currentStage, isFinalStage)
    : 'rough';
  const lastWasClean = Boolean(lastExerciseResult && lastRunOutcomeTier === 'clean');
  const pentascaleTempoStage = Boolean(
    currentStage?.useTempo
    && exerciseDef
    && isPentascaleKind(exerciseDef.exercise.kind),
  );

  // Adaptive coaching: when the most recent run scored sub-fluent and we
  // can't yet diagnose with stuck-detection, surface a one-line hint that
  // points at the dominant error (timing vs pitch vs few-notes). The
  // helper itself returns null on perfect/fluent runs and on empty
  // scores, so we only need to additionally suppress it during drill
  // mode (which has its own stuck path) and at the boundary panel
  // (which celebrates the pass).
  const shakyHint = lastExerciseResult && currentStage && drillState !== 'active'
    ? pickShakyHint(lastExerciseResult, currentStage)
    : null;

  // Stuck-detection prompts. Both predicates short-circuit when the
  // sticky `passedThisExercise` flag is set (regular case) or the drill
  // already completed — the user shouldn't see a "step back" suggestion
  // after they've cleared the stage. `hasFallbackStage` defends against
  // the very first stage of an exercise where there's nowhere to drop to.
  const hasFallbackStage = currentStageIdx > 0;
  const isDrillStuck = computeIsDrillStuck({
    drillState,
    drillAttempts,
    drillStreak,
    snoozedUntil: drillSnoozedUntil,
  });
  const consecutiveRoughOnStage = exerciseDef && currentStage
    ? consecutiveRoughRunsOnStage(
      exerciseProgress.history,
      activeExercise.stageId,
      exerciseDef.exercise.kind,
      currentStage,
      isFinalStage,
    )
    : 0;
  const regularStuckGated = computeIsRegularStuckGated({
    drillState,
    passedThisExercise,
    attemptsThisStage,
    consecutiveRoughOnStage,
    cleanStreak,
    requiredRuns: advancementCriteria.runs,
    hasFallbackStage,
    snoozedUntil: regularSnoozedUntil,
    stageId: activeExercise.stageId,
    threshold: advancementCriteria.threshold,
    history: exerciseProgress.history,
  });
  const stuckVisible = isDrillStuck || regularStuckGated;
  const stuckFallbackStage = currentStageIdx > 0 ? allStages[currentStageIdx - 1] : null;
  const stuckFallbackLabel = stuckFallbackStage
    ? `Level ${stuckFallbackStage.stageNumber}`
    : 'an earlier level';

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
    const snapHint = drillState !== 'active'
      ? pickShakyHint(lastExerciseResult, currentStage)
      : null;
    dwellBadgeSnapshotRef.current = {
      result: { ...lastExerciseResult },
      inDrill: drillState === 'active',
      drillStreak,
      cleanStreak,
      requiredRuns: advancementCriteria.runs,
      lastWasClean: snapTier === 'clean',
      lastRunOutcomeTier: snapTier,
      shakyHintText: snapHint?.text ?? null,
    };
  }

  const showDwellDuringCountIn =
    isPlaying
    && activeExercise.useMetronome
    && countInBeat !== null
    && dwellBadgeSnapshotRef.current !== null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header bar */}
      <Paper
        elevation={0}
        sx={{
          px: 2, py: 1,
          display: 'flex', alignItems: 'center', gap: 1,
          borderBottom: 1, borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
          <IconButton size="small" onClick={() => { stopPlayback(); dispatch({ type: 'SET_SCREEN', screen: 'home' }); }}>
            <Icon name="home" />
          </IconButton>
          <IconButton
            size="small"
            disabled={!canGoPrevStage}
            onClick={() => canGoPrevStage && goToStage(allStages[currentStageIdx - 1].id)}
            sx={{ p: 0.25 }}
          >
            <Icon name="chevron_left" size={18} />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 28, textAlign: 'center' }}>
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
            {isFreeTempo && <Chip label="Free tempo" size="small" color="info" variant="outlined" />}
            {activeExercise.purpose === 'review' && (
              <Chip label="Review" size="small" color="warning" variant="outlined" />
            )}
            {/* Advancement-rule chip. Shown only in the pre-start state so
                it doesn't compete with mid-run UI; this is the single
                source of truth for "what does it take to clear this
                level", replacing the inline free-tempo explainer
                paragraph that used to sit in the panel body. */}
            {!isPlaying && !freeTempoRunComplete && !lastExerciseResult && currentStage && (
              <Chip
                label={
                  isFreeTempo
                    ? `Clear ${advancementCriteria.runs} in a row to advance`
                    : `Clear ${advancementCriteria.runs} in a row at ${cleanThresholdPct}% to advance`
                }
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          <ScalesInputSources />
        </Box>
      </Paper>


      {/* Exercise result — shown only when the loop is paused or the
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
              color: lastRunOutcomeTier === 'clean' ? 'success.main'
                : lastRunOutcomeTier === 'near' || lastExerciseResult.accuracy >= 0.6 ? 'warning.main'
                : 'error.main',
              mb: 0.5,
            }}
          >
            {Math.round(lastExerciseResult.accuracy * 100)}%
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {lastExerciseResult.correct} of {lastExerciseResult.total} notes hit on time
          </Typography>
          {/*
            Breakdown matches the note colors in the score (perfect/early/
            late/wrong/missed) so the user can see where their score came
            from rather than just a single percentage. Only non-zero
            categories render to avoid noise.
          */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              columnGap: 2,
              rowGap: 0.5,
              mb: 1.5,
            }}
          >
            {([
              ['Perfect',  lastExerciseResult.breakdown.perfect,    '#10b981'],
              ['Early',    lastExerciseResult.breakdown.early,      '#3b82f6'],
              ['Late',     lastExerciseResult.breakdown.late,       '#f59e0b'],
              ['Wrong',    lastExerciseResult.breakdown.wrongPitch, '#ef4444'],
              ['Missed',   lastExerciseResult.breakdown.missed,     '#94a3b8'],
            ] as const)
              .filter(([, count]) => count > 0)
              .map(([label, count, color]) => (
                <Box
                  key={label}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {count} {label.toLowerCase()}
                  </Typography>
                </Box>
              ))}
          </Box>
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
                    : allStages[currentStageIdx]
                      ? `Level ${allStages[currentStageIdx].stageNumber} cleared`
                      : 'Level complete'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.25 }}>
                  {drillState === 'completed'
                    ? `${DRILL_TARGET_PERFECT_RUNS}/${DRILL_TARGET_PERFECT_RUNS} perfect runs`
                    : allStages[currentStageIdx]
                      ? `${formatStageSummary(allStages[currentStageIdx])} · next level unlocked`
                      : 'You unlocked the next level.'}
                </Typography>
              </Box>
            </Box>
          )}
          {/* Adaptive coaching hint — only when the loop is paused on a
              sub-fluent run. The helper hides itself on passing runs;
              we additionally hide while at the boundary celebration so
              "Level cleared" stays the loudest signal. */}
          {!boundary && shakyHint && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                maxWidth: 460,
                mx: 'auto',
                mt: 1,
                mb: 0.5,
                lineHeight: 1.4,
                fontStyle: 'italic',
              }}
            >
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
                bgcolor: theme => (lastRunOutcomeTier === 'clean'
                  ? `${theme.palette.success.main}0D`
                  : lastRunOutcomeTier === 'near'
                    ? `${theme.palette.warning.main}14`
                    : `${theme.palette.error.main}12`),
                border: 1,
                borderColor: theme => (lastRunOutcomeTier === 'clean'
                  ? `${theme.palette.success.main}40`
                  : lastRunOutcomeTier === 'near'
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
                  bgcolor: lastRunOutcomeTier === 'clean'
                    ? 'success.main'
                    : lastRunOutcomeTier === 'near'
                      ? 'warning.main'
                      : 'error.main',
                  color: lastRunOutcomeTier === 'clean'
                    ? 'success.contrastText'
                    : lastRunOutcomeTier === 'near'
                      ? 'warning.contrastText'
                      : 'error.contrastText',
                }}
              >
                <Icon
                  name={lastRunOutcomeTier === 'clean' ? 'check' : lastRunOutcomeTier === 'near' ? 'schedule' : 'replay'}
                  size={20}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2 }}>
                  {`Clean runs: ${cleanStreak}/${advancementCriteria.runs}`}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.25 }}>
                  {lastWasClean
                    ? (pentascaleTempoStage
                      ? `Need ${advancementCriteria.runs} clean runs in a row (right notes, at most one early or late).`
                      : `Need ${advancementCriteria.runs} in a row at ${cleanThresholdPct}% to advance.`)
                    : (pentascaleTempoStage
                      ? 'Streak reset. Right notes with at most one early or late counts as clean.'
                      : `Streak reset. Aim for ${cleanThresholdPct}% to count.`)}
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* "New for you" — modal when this stage introduces a new concept
          (also shown over the loading screen so tips are not skipped while
          the score generates). See guidance/computeGuidance.ts for triggers. */}
      {guidanceModal}

      {/* Instruction panel — visible before starting.
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
              color="text.primary"
              sx={{
                maxWidth: 520,
                mx: 'auto',
                fontWeight: hasExerciseHistory ? 400 : 500,
                lineHeight: 1.45,
              }}
            >
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
                color="text.secondary"
                sx={{ mt: 0.5, lineHeight: 1.45 }}
              >
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

          {activeExercise.subdivision !== 'none' && (
            <Chip
              label={
                activeExercise.subdivision === 'eighth'
                  ? 'Eighth note subdivision'
                  : activeExercise.subdivision === 'triplet'
                  ? 'Triplet subdivision'
                  : 'Sixteenth note subdivision'
              }
              size="small"
              variant="outlined"
              sx={{ mt: hasExerciseHistory ? 0.75 : 1 }}
            />
          )}

          {/* Cross-session streak carry-over. The advancement rule
              walks history newest-first regardless of when each record
              was made (see store.recordPractice's slice(0, runs)). When
              the user returns mid-streak we surface that explicitly so
              they don't think they're starting over. Only relevant on
              tempo stages with a real streak gate. */}
          {!isFreeTempo && currentStage && cleanStreak > 0 && cleanStreak < advancementCriteria.runs && (
            <Box sx={{ mt: hasExerciseHistory ? 0.75 : 1.5 }}>
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`${cleanStreak}/${advancementCriteria.runs} clean runs already · ${advancementCriteria.runs - cleanStreak} more to advance`}
              />
            </Box>
          )}

          {/* Rotating tip — omitted when the panel is already dense (see
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
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
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
        }}
      >
        <ScoreDisplay
          score={score}
          currentMeasureIndex={isFreeTempo ? state.freeTempoMeasureIndex : state.currentMeasureIndex}
          currentNoteIndices={state.currentNoteIndices}
          activeMidiNotes={state.activeMidiNotes}
          practiceResultsByNoteId={practiceResults}
          // Live "you played a matching note" green only when the user
          // isn't actively being graded — otherwise the live tint conflicts
          // with per-note timing colours and lights up upcoming notes.
          highlightActiveMatches={!isPlaying && !lastExerciseResult}
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
            ? (inDrill ? drillStreak : cleanStreak)
            : (inDrill ? snap!.drillStreak : snap!.cleanStreak);
          const streakDenominator = live
            ? (inDrill ? DRILL_TARGET_PERFECT_RUNS : advancementCriteria.runs)
            : (inDrill ? DRILL_TARGET_PERFECT_RUNS : snap!.requiredRuns);
          const wasClean = live ? lastWasClean : snap!.lastWasClean;
          const outcomeTier = live ? lastRunOutcomeTier : snap!.lastRunOutcomeTier;
          const hintText = live ? (shakyHint?.text ?? null) : snap!.shakyHintText;

          const isPerfect = result.accuracy >= 1;
          const statusOk = inDrill ? isPerfect : wasClean;
          const statusNear = !inDrill && outcomeTier === 'near';
          const statusBg = statusOk ? 'success.main' : statusNear ? 'warning.main' : 'error.main';
          const statusContrast = statusOk
            ? 'success.contrastText'
            : statusNear ? 'warning.contrastText' : 'error.contrastText';
          const statusHeadlineColor = statusOk
            ? 'success.main'
            : statusNear ? 'warning.main' : 'error.main';
          const dwellStatusIcon = statusOk ? 'check' : statusNear ? 'schedule' : 'close';
          const percent = Math.round(result.accuracy * 100);
          const headline = inDrill
            ? (isPerfect ? 'Perfect' : 'Reset')
            : (wasClean ? 'Clean' : statusNear ? 'Almost' : 'Again');
          const subline = streakDenominator > 0
            ? `${percent}% · ${streakNumerator}/${streakDenominator}`
            : `${percent}% · ${result.correct}/${result.total}`;
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
                zIndex: 5,
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
                  high contrast — both colors come from the palette's
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
                    color="text.secondary"
                    sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.25 }}
                  >
                    {subline}
                  </Typography>
                  {/* Adaptive coaching hint, dwell-toast variant. Same
                      shakyHint as the paused-results panel — surfacing
                      it inline gives the user a course-correction to
                      think about during the dwell rather than
                      reflexively repeating the same mistake. Drill
                      mode is excluded upstream because drill has its
                      own stuck path. */}
                  {!inDrill && hintText && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ lineHeight: 1.3, mt: 0.5, fontStyle: 'italic' }}
                    >
                      {hintText}
                    </Typography>
                  )}
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
          open={hasResult && stuckVisible}
          onClose={(_event, reason) => {
            if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') return;
            if (isDrillStuck) {
              setDrillState('inactive');
              setLoopPaused(true);
            } else {
              setRegularSnoozedUntil(consecutiveRoughOnStage + REGULAR_SNOOZE_BY);
            }
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
          <DialogContent sx={{ p: { xs: 5, sm: 6 } }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
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
                  mb: 3,
                }}
              >
                <Icon name={isDrillStuck ? 'self_improvement' : 'undo'} size={28} />
              </Box>
              <Typography
                id="stuck-prompt-title"
                component="h2"
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  lineHeight: '2rem',
                  color: 'text.primary',
                }}
              >
                {isDrillStuck ? 'Take a breather?' : 'Try going back?'}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'left', lineHeight: 1.5, mb: 1 }}
            >
              {isDrillStuck
                ? `${drillAttempts} drill rounds without a perfect score. A short rest does more for muscle memory than another rep right now.`
                : `${consecutiveRoughOnStage} rough runs in a row (${attemptsThisStage} attempts on this level). Going back to ${stuckFallbackLabel} for a round often unblocks this one faster than another try.`}
            </Typography>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
            {isDrillStuck ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: '100%' }}>
                <Button
                  variant="text"
                  onClick={() => setDrillSnoozedUntil(drillAttempts + DRILL_SNOOZE_BY)}
                  sx={{ textTransform: 'none', order: { sm: 1 } }}
                >
                  Keep drilling
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  onClick={() => {
                    setDrillState('inactive');
                    setLoopPaused(true);
                  }}
                  sx={{ textTransform: 'none', borderRadius: '999px', order: { sm: 2 } }}
                >
                  Move on
                </Button>
              </Stack>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: '100%' }}>
                <Button
                  variant="text"
                  onClick={() => setRegularSnoozedUntil(consecutiveRoughOnStage + REGULAR_SNOOZE_BY)}
                  sx={{ textTransform: 'none' }}
                >
                  Stay here
                </Button>
                {stuckFallbackStage && (
                  <Button
                    variant="contained"
                    disableElevation
                    onClick={() => goToStage(stuckFallbackStage.id)}
                    sx={{ textTransform: 'none', borderRadius: '999px' }}
                  >
                    {`Drop to ${stuckFallbackLabel}`}
                  </Button>
                )}
              </Stack>
            )}
          </DialogActions>
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
                  Nice — shape is clean
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, mt: 0.25 }}>
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
              <Button
                variant="contained"
                size="large"
                onClick={() => {
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
                {exerciseNumber < totalExercises ? 'Continue' : 'Finish session'}
                <Icon name="arrow_forward" size={22} />
              </Button>
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
                      <Typography variant="body2" color="text.secondary" component="p" sx={{ m: 0, lineHeight: 1.5 }}>
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

        {/* Loop paused by user — full action bar so they can choose. */}
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
            <Tooltip title="Skip ahead without clearing this stage.">
              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  cancelAutoLoop();
                  advanceToNext();
                }}
                sx={{ gap: 1, textTransform: 'none' }}
              >
                <Icon name="skip_next" size={20} /> Move On
              </Button>
            </Tooltip>
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
                ? 'Start playing'
                : timedMidiDryRunRequired && !timedDryRunReady
                  ? 'Start with metronome. Shape check optional; use this button so keys do not start by accident.'
                  : 'Start with metronome'
            }
            title={
              isFreeTempo
                ? 'Space or Enter to start. With MIDI, play the whole shape cleanly in free time to begin after a 1s cue.'
                : timedMidiDryRunRequired && !timedDryRunReady
                  ? 'Click to start anytime. Optional: play the shape cleanly in free time first — Space/Enter stay off until then so keys do not accidentally start a run.'
                  : 'Space, Enter, or play your first note to start'
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
    </Box>
  );
}
