import { useEffect, useRef, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import ScoreDisplay from '../../shared/notation/ScoreDisplay';
import { useScales } from '../store';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import { getScorePlaybackEngine } from '../../shared/playback/scorePlayback';
import type { ScorePlaybackEngine } from '../../shared/playback/scorePlayback';
import { findStage, findExercise } from '../curriculum/tiers';
import { formatStageSummary } from '../curriculum/stageSummary';
import { getExerciseProgress } from '../progress/store';
import type { SessionExercise } from '../curriculum/types';
import FreeTempoGrader from './FreeTempoGrader';
import TimedGrader from './TimedGrader';
import ScalesInputSources from './InputSources';
import { isDebugEnabled, logDebugEvent } from '../utils/practiceDebugLog';

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

const PASS_THRESHOLD = 0.85;
const AUTO_RETRY_DELAY_MS = 3000;
// Dwell time between "practice until perfect" attempts. Long enough for
// the player to read a pass/fail verdict and percentage (~2 seconds),
// then the next count-in kicks in and provides the audible lead-in.
const PERFECT_LOOP_DELAY_MS = 2000;

const HAND_LABELS = { right: 'Right hand', left: 'Left hand', both: 'Both hands' } as const;
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
  const loadedStageRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [wrongNoteDisplay, setWrongNoteDisplay] = useState<string | null>(null);
  const wrongNoteKeyRef = useRef(0);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);

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

  const finishExercise = useCallback(() => {
    if (!activeExercise) return;
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

  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passed = lastExerciseResult ? lastExerciseResult.accuracy >= PASS_THRESHOLD : false;
  // Declared up front so the failure auto-retry effect below can suppress
  // itself while the perfect-loop is active. The rest of the perfect-loop
  // wiring (callbacks, scheduler effect) is set up further down where its
  // dependencies (`startPlayback`, `handleKeepPracticing`) are available.
  const [practiceUntilPerfect, setPracticeUntilPerfect] = useState(false);
  const [perfectLoopCountdown, setPerfectLoopCountdown] = useState<number | null>(null);
  const perfectLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-retry when the exercise wasn't passed. Suppressed while the
  // "practice until perfect" loop owns the retry cadence.
  useEffect(() => {
    if (!lastExerciseResult || passed || isPlaying || practiceUntilPerfect) {
      setRetryCountdown(null);
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      return;
    }

    const steps = Math.ceil(AUTO_RETRY_DELAY_MS / 1000);
    setRetryCountdown(steps);

    const interval = setInterval(() => {
      setRetryCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : prev));
    }, 1000);

    retryTimerRef.current = setTimeout(() => {
      setRetryCountdown(null);
      if (isFreeTempo) {
        dispatch({ type: 'RESTART_FREE_TEMPO' });
      } else {
        startPlayback();
      }
    }, AUTO_RETRY_DELAY_MS);

    return () => {
      clearInterval(interval);
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: restart timer only when result/mode changes
  }, [lastExerciseResult, passed, practiceUntilPerfect]);

  const cancelAutoRetry = useCallback(() => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    setRetryCountdown(null);
  }, []);

  const startPlayback = useCallback(async () => {
    if (!score || !activeExercise) return;
    // Reset the manual-stop flag on every fresh start so the engine's
    // finish callback behaves normally unless the user explicitly stops.
    manuallyStoppedRef.current = false;
    const engine = getScorePlaybackEngine();
    engineRef.current = engine;
    engine.setTempo(activeExercise.bpm || 80);
    engine.setMetronome(activeExercise.useMetronome);

    if (activeExercise.mutePlayback) {
      score.parts.forEach(p => engine.setTrackMuted(p.id, true));
    }

    dispatch({ type: 'START_PRACTICE_RUN' });
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
    }

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
          if (!manuallyStoppedRef.current) finishExercise();
        }
      },
      () => {
        dispatch({ type: 'SET_PLAYING', isPlaying: false });
        if (!manuallyStoppedRef.current) finishExercise();
      },
    );
    dispatch({ type: 'SET_PLAYING', isPlaying: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state.microphoneActive/midiConnected read at call-time for debug only
  }, [score, activeExercise, dispatch, finishExercise]);

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
    dispatch({ type: 'STOP_PRACTICE_RUN' });
  }, [dispatch]);

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

  const handleKeepPracticing = useCallback(() => {
    dispatch({ type: 'RESTART_FREE_TEMPO' });
  }, [dispatch]);

  // "Practice until perfect": auto-loop the exercise until the user lands a
  // 100% run. Each completion that's < 100% schedules another attempt; the
  // mode auto-clears once perfect is achieved or the user opts out. State
  // for this is declared up top so the failure auto-retry effect can read it.
  const stopPracticeUntilPerfect = useCallback(() => {
    setPracticeUntilPerfect(false);
    setPerfectLoopCountdown(null);
    if (perfectLoopTimerRef.current) {
      clearTimeout(perfectLoopTimerRef.current);
      perfectLoopTimerRef.current = null;
    }
  }, []);

  // Reset the loop whenever the user changes exercise/stage so a stale loop
  // doesn't restart on a different exercise.
  useEffect(() => {
    stopPracticeUntilPerfect();
  }, [activeExercise?.exerciseId, activeExercise?.stageId, stopPracticeUntilPerfect]);

  const startPracticeUntilPerfect = useCallback(() => {
    if (!activeExercise) return;
    setPracticeUntilPerfect(true);
    if (!activeExercise.bpm) {
      dispatch({ type: 'RESTART_FREE_TEMPO' });
    } else {
      void startPlayback();
    }
  }, [activeExercise, dispatch, startPlayback]);

  // Auto-loop driver: when the mode is on and the latest result wasn't a
  // perfect run, schedule the next attempt. We deliberately skip the
  // existing failure auto-retry effect while this is active so the two
  // timers don't fight.
  useEffect(() => {
    if (!practiceUntilPerfect || !lastExerciseResult || isPlaying) return;
    if (lastExerciseResult.accuracy >= 1) {
      setPracticeUntilPerfect(false);
      setPerfectLoopCountdown(null);
      return;
    }

    const steps = Math.ceil(PERFECT_LOOP_DELAY_MS / 1000);
    setPerfectLoopCountdown(steps);
    const interval = setInterval(() => {
      setPerfectLoopCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : prev));
    }, 1000);

    perfectLoopTimerRef.current = setTimeout(() => {
      setPerfectLoopCountdown(null);
      perfectLoopTimerRef.current = null;
      if (!activeExercise?.bpm) {
        dispatch({ type: 'RESTART_FREE_TEMPO' });
      } else {
        void startPlayback();
      }
    }, PERFECT_LOOP_DELAY_MS);

    return () => {
      clearInterval(interval);
      if (perfectLoopTimerRef.current) {
        clearTimeout(perfectLoopTimerRef.current);
        perfectLoopTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: schedule only when result/mode changes, not on every startPlayback identity churn
  }, [lastExerciseResult, practiceUntilPerfect, isPlaying]);

  const stageInfo = activeExercise
    ? findStage(activeExercise.exerciseId, activeExercise.stageId)
    : null;

  if (!activeExercise || !loaded || !score) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading exercise...</Typography>
      </Box>
    );
  }

  const exerciseNumber = state.activeExerciseIndex + 1;
  const totalExercises = sessionPlan?.exercises.length ?? 0;
  const isFreeTempo = !activeExercise.bpm;
  /**
   * True in the tiny window between a sub-100% attempt finishing and the
   * next perfect-loop attempt starting. In this state we deliberately
   * suppress the full results Paper and the post-exercise action bar —
   * showing them would read as an "intermediate screen" between rounds.
   * Instead, a compact toast overlays the score so the user can glance
   * at their last attempt's breakdown while the count-in begins.
   */
  const isPerfectLoopFlash =
    practiceUntilPerfect &&
    !!lastExerciseResult &&
    !isPlaying &&
    lastExerciseResult.accuracy < 1;

  // Stage navigation: allow revisiting earlier stages of the current exercise
  const exerciseDef = findExercise(activeExercise.exerciseId);
  const exerciseProgress = getExerciseProgress(state.progress, activeExercise.exerciseId);
  const allStages = exerciseDef?.exercise.stages ?? [];
  const currentStageIdx = allStages.findIndex(s => s.id === activeExercise.stageId);
  // Stages the user can navigate to: all up to and including the progress-tracked current stage
  const progressStageIdx = allStages.findIndex(s => s.id === exerciseProgress.currentStageId);
  const maxAccessibleStageIdx = Math.max(currentStageIdx, progressStageIdx);
  const canGoPrevStage = currentStageIdx > 0;
  const canGoNextStage = currentStageIdx < maxAccessibleStageIdx;
  const { freeTempoRunComplete, hasCompletedRun } = state;
  const guidanceRaw = stageInfo?.exercise.guidance;
  const exerciseGuidance = typeof guidanceRaw === 'string'
    ? guidanceRaw
    : guidanceRaw?.[activeExercise.hand];
  const exerciseHelpUrl = stageInfo?.exercise.helpUrl;

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
            {activeExercise.bpm > 0 && (
              <Chip label={`${activeExercise.bpm} BPM`} size="small" variant="outlined" />
            )}
            {isFreeTempo && <Chip label="Free tempo" size="small" color="info" variant="outlined" />}
            {activeExercise.purpose === 'review' && (
              <Chip label="Review" size="small" color="warning" variant="outlined" />
            )}
          </Box>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          <ScalesInputSources />
        </Box>
      </Paper>


      {/* Exercise result — shown after completing the exercise */}
      {lastExerciseResult && !isPlaying && !isPerfectLoopFlash && (
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
              color: lastExerciseResult.accuracy >= 0.85 ? 'success.main'
                : lastExerciseResult.accuracy >= 0.6 ? 'warning.main'
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
          {lastExerciseResult.advanced && (
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
                  {allStages[currentStageIdx]
                    ? `Level ${allStages[currentStageIdx].stageNumber} cleared`
                    : 'Level complete'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.25 }}>
                  {allStages[currentStageIdx]
                    ? `${formatStageSummary(allStages[currentStageIdx])} · next level unlocked`
                    : 'You unlocked the next level.'}
                </Typography>
              </Box>
            </Box>
          )}
          {passed && !lastExerciseResult.advanced && (
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
                bgcolor: theme => `${theme.palette.success.main}0D`,
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
                  bgcolor: theme => `${theme.palette.success.main}1F`,
                  color: 'success.main',
                }}
              >
                <Icon name="check_circle" size={20} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'success.dark', lineHeight: 1.2 }}>
                  Great work
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.25 }}>
                  {allStages[currentStageIdx]
                    ? `${formatStageSummary(allStages[currentStageIdx])} · need 3 clean runs to advance`
                    : 'A few more clean runs at this level to advance.'}
                </Typography>
              </Box>
            </Box>
          )}
          {!passed && lastExerciseResult.accuracy >= 0.6 && (
            <Typography variant="body2" color="text.secondary">
              Almost there — need {Math.round(PASS_THRESHOLD * 100)}% to pass. Let&apos;s try again!
            </Typography>
          )}
          {!passed && lastExerciseResult.accuracy < 0.6 && (
            <Typography variant="body2" color="text.secondary">
              Take it slow — focus on the right notes. Need {Math.round(PASS_THRESHOLD * 100)}% to pass.
            </Typography>
          )}
          {!passed && retryCountdown !== null && (
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              Restarting in {retryCountdown}…
            </Typography>
          )}
          {practiceUntilPerfect && lastExerciseResult.accuracy < 1 && (
            <Box
              sx={{
                mt: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                bgcolor: passed ? 'success.main' : 'primary.main',
                color: passed ? 'success.contrastText' : 'primary.contrastText',
              }}
            >
              <Icon name="autorenew" size={16} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {passed ? 'Chasing 100%' : 'Going for 100%'}
                {perfectLoopCountdown !== null ? ` — restarting in ${perfectLoopCountdown}…` : '…'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Instruction panel — visible before starting */}
      {!isPlaying && !freeTempoRunComplete && !lastExerciseResult && (
        <Paper
          elevation={0}
          sx={{
            mx: 2, mt: 2, p: 2.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
            {HAND_LABELS[activeExercise.hand]}{isFreeTempo ? ' — free tempo' : ` — ${activeExercise.bpm} BPM`}
          </Typography>

          {exerciseGuidance ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
                {exerciseGuidance}
              </Typography>
              {exerciseHelpUrl && (
                <Link
                  href={exerciseHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1 }}
                >
                  <Icon name="play_circle" size={16} />
                  Watch a video tutorial
                </Link>
              )}
              {!isFreeTempo && stageInfo?.stage.description && (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5, maxWidth: 480, mx: 'auto' }}>
                  {stageInfo.stage.description}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
              {stageInfo?.stage.description ?? stageInfo?.stage.label ?? ''}
            </Typography>
          )}

          {activeExercise.subdivision !== 'none' && (
            <Chip
              label={`${activeExercise.subdivision === 'eighth' ? 'Eighth note' : 'Sixteenth note'} subdivision`}
              size="small"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </Paper>
      )}

      {/* Score display */}
      <Box className="main-content" sx={{ flex: 1, overflow: 'auto', py: 2, px: 1, position: 'relative' }}>
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
        {isPerfectLoopFlash && lastExerciseResult && (() => {
          // Three-state verdict for the perfect-loop flash:
          //   - 'fail'   : below pass threshold, still learning the exercise
          //   - 'passed' : already cleared the level this round, now chasing 100%
          //   - 'perfect': 100% (loop has already exited, so never reaches here)
          const didPass = lastExerciseResult.accuracy >= PASS_THRESHOLD;
          const statusColor = didPass ? 'success.main' : 'error.main';
          const statusBg = didPass ? 'success.light' : 'error.light';
          const percent = Math.round(lastExerciseResult.accuracy * 100);
          const headline = didPass ? 'Level cleared' : 'Keep going';
          const subline = didPass
            ? `Chasing 100% · currently ${percent}%`
            : `${percent}% · ${lastExerciseResult.correct}/${lastExerciseResult.total}`;
          // `perfectLoopCountdown` counts down from ceil(delay/1000) to 1
          // and then the timer fires. Show the live value so the player
          // knows how many seconds they still have to read the verdict.
          const secondsLeft = perfectLoopCountdown ?? Math.ceil(PERFECT_LOOP_DELAY_MS / 1000);
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
                  '@keyframes perfectFlashIn': {
                    '0%': { opacity: 0, transform: 'translateY(-6px) scale(0.98)' },
                    '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
                  },
                  animation: 'perfectFlashIn 0.22s ease-out',
                }}
              >
                {/*
                  Pass/fail badge. A filled color-coded circle with a
                  large icon is the strongest single visual cue and is
                  the first thing the eye should hit on this pill.
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
                    color: statusColor,
                  }}
                >
                  <Icon name={didPass ? 'check_circle' : 'cancel'} size={28} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      lineHeight: 1.15,
                      color: statusColor,
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
                </Box>
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
                    Next round in {secondsLeft}s
                  </Typography>
                </Box>
                <Tooltip title="Stop the auto-loop">
                  <IconButton
                    size="small"
                    onClick={stopPracticeUntilPerfect}
                    aria-label="Stop practice-until-perfect loop"
                  >
                    <Icon name="stop_circle" size={20} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          );
        })()}
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
      </Box>

      {/* Grading engines (no visual output) */}
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
        {/* Post-exercise result actions */}
        {lastExerciseResult && !isPlaying && passed && !isPerfectLoopFlash && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                stopPracticeUntilPerfect();
                if (isFreeTempo) handleKeepPracticing();
                else void startPlayback();
              }}
              sx={{ gap: 1, textTransform: 'none' }}
            >
              <Icon name="replay" size={20} /> Practice Again
            </Button>
            {lastExerciseResult.accuracy < 1 && (
              practiceUntilPerfect ? (
                <Tooltip title="Stop the auto-loop and keep your current result.">
                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    onClick={stopPracticeUntilPerfect}
                    sx={{ gap: 1, textTransform: 'none' }}
                  >
                    <Icon name="stop_circle" size={20} /> Stop Loop
                  </Button>
                </Tooltip>
              ) : (
                <Tooltip
                  title="Repeats this exercise automatically after each attempt until you land a 100% run. Stop any time."
                  enterDelay={300}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    onClick={startPracticeUntilPerfect}
                    sx={{ gap: 1, textTransform: 'none' }}
                  >
                    <Icon name="autorenew" size={20} /> Practice Until Perfect
                  </Button>
                </Tooltip>
              )
            )}
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                stopPracticeUntilPerfect();
                advanceToNext();
              }}
              sx={{
                gap: 1,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              }}
            >
              {exerciseNumber < totalExercises ? 'Next Exercise' : 'Finish'} <Icon name="arrow_forward" size={20} />
            </Button>
          </Box>
        )}
        {lastExerciseResult && !isPlaying && !passed && !isPerfectLoopFlash && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                cancelAutoRetry();
                stopPracticeUntilPerfect();
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
              <Icon name="replay" size={20} /> Try Again
            </Button>
            {practiceUntilPerfect ? (
              <Tooltip title="Stop the auto-loop and keep your current result.">
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={stopPracticeUntilPerfect}
                  sx={{ gap: 1, textTransform: 'none' }}
                >
                  <Icon name="stop_circle" size={20} /> Stop Loop
                </Button>
              </Tooltip>
            ) : (
              <Tooltip
                title="Repeats this exercise automatically after each attempt until you land a 100% run. Stop any time."
                enterDelay={300}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={startPracticeUntilPerfect}
                  sx={{ gap: 1, textTransform: 'none' }}
                >
                  <Icon name="autorenew" size={20} /> Practice Until Perfect
                </Button>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Primary action: Start / Stop */}
        {!isPlaying && !freeTempoRunComplete && !lastExerciseResult && (
          <Button
            variant="contained"
            size="large"
            onClick={startPlayback}
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
              // Manually stopping mid-run should also exit the
              // practice-until-perfect loop; otherwise the partial
              // result would auto-trigger another attempt.
              stopPracticeUntilPerfect();
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
