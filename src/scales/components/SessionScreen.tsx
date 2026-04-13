import { useEffect, useRef, useCallback, useState } from 'react';
import { Box, Button, Typography, Chip, IconButton, Paper, Link } from '@mui/material';
import ScoreDisplay from '../../shared/notation/ScoreDisplay';
import { useScales } from '../store';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import { getScorePlaybackEngine } from '../../shared/playback/scorePlayback';
import type { ScorePlaybackEngine } from '../../shared/playback/scorePlayback';
import { findStage } from '../curriculum/tiers';
import FreeTempoGrader from './FreeTempoGrader';
import TimedGrader from './TimedGrader';

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;
}

const HAND_LABELS = { right: 'Right hand', left: 'Left hand', both: 'Both hands' } as const;
const HAND_SHORT = { right: 'RH', left: 'LH', both: 'Both' } as const;

const NOTE_NAMES = ['C', 'C\u266F', 'D', 'D\u266F', 'E', 'F', 'F\u266F', 'G', 'G\u266F', 'A', 'A\u266F', 'B'];
function midiToNoteName(midi: number): string { return NOTE_NAMES[midi % 12]; }

export default function SessionScreen() {
  const { state, dispatch } = useScales();
  const { activeExercise, sessionPlan, score, practiceResults, isPlaying, lastExerciseResult } = state;
  const engineRef = useRef<ScorePlaybackEngine | null>(null);
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
    const generated = generateScoreForExercise(activeExercise);
    if (generated) {
      dispatch({ type: 'SET_ACTIVE_EXERCISE', index: state.activeExerciseIndex, score: generated });
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only regenerate when exercise identity changes; dispatch is stable
  }, [activeExercise?.exerciseId, activeExercise?.stageId]);

  const finishExercise = useCallback(() => {
    if (!activeExercise) return;
    dispatch({
      type: 'FINISH_EXERCISE',
      exerciseId: activeExercise.exerciseId,
      stageId: activeExercise.stageId,
    });
  }, [activeExercise, dispatch]);

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

  const startPlayback = useCallback(async () => {
    if (!score || !activeExercise) return;
    const engine = getScorePlaybackEngine();
    engineRef.current = engine;
    engine.setTempo(activeExercise.bpm || 80);
    engine.setMetronome(activeExercise.useMetronome);

    if (activeExercise.mutePlayback) {
      score.parts.forEach(p => engine.setTrackMuted(p.id, true));
    }

    dispatch({ type: 'START_PRACTICE_RUN' });

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
          finishExercise();
        }
      },
      () => {
        dispatch({ type: 'SET_PLAYING', isPlaying: false });
        finishExercise();
      },
    );
    dispatch({ type: 'SET_PLAYING', isPlaying: true });
  }, [score, activeExercise, dispatch, finishExercise]);

  const stopPlayback = useCallback(() => {
    engineRef.current?.stop();
    setCountInBeat(null);
    dispatch({ type: 'SET_PLAYING', isPlaying: false });
  }, [dispatch]);

  const handleFinishAndNext = useCallback(() => {
    stopPlayback();
    finishExercise();
  }, [stopPlayback, finishExercise]);

  const handleKeepPracticing = useCallback(() => {
    dispatch({ type: 'RESTART_FREE_TEMPO' });
  }, [dispatch]);

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
  const { freeTempoRunComplete, hasCompletedRun } = state;
  const guidanceRaw = stageInfo?.exercise.guidance;
  const exerciseGuidance = typeof guidanceRaw === 'string'
    ? guidanceRaw
    : guidanceRaw?.[activeExercise.hand];
  const exerciseHelpUrl = stageInfo?.exercise.helpUrl;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header bar */}
      <Paper
        elevation={0}
        sx={{
          px: 2, py: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: 1, borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => { stopPlayback(); dispatch({ type: 'SET_SCREEN', screen: 'home' }); }}>
            <Icon name="home" />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {exerciseNumber}/{totalExercises}
          </Typography>
        </Box>
        <Typography variant="h3" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          {stageInfo?.exercise.label ?? 'Exercise'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip label={HAND_SHORT[activeExercise.hand]} size="small" variant="outlined" />
          {activeExercise.bpm > 0 && (
            <Chip label={`${activeExercise.bpm} BPM`} size="small" variant="outlined" />
          )}
          {isFreeTempo && <Chip label="Free tempo" size="small" color="info" variant="outlined" />}
          {activeExercise.purpose === 'review' && (
            <Chip label="Review" size="small" color="warning" variant="outlined" />
          )}
        </Box>
      </Paper>

      {/* Exercise result — shown after completing the exercise */}
      {lastExerciseResult && !isPlaying && (
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {lastExerciseResult.correct} of {lastExerciseResult.total} notes correct
          </Typography>
          {lastExerciseResult.advanced && (
            <Chip
              icon={<Icon name="trending_up" />}
              label="Stage complete! Moving to the next stage."
              color="success"
            />
          )}
          {lastExerciseResult.accuracy >= 0.85 && !lastExerciseResult.advanced && (
            <Chip
              icon={<Icon name="check_circle" />}
              label="Great work! One more at this level to advance."
              color="success"
              variant="outlined"
            />
          )}
          {lastExerciseResult.accuracy < 0.85 && lastExerciseResult.accuracy >= 0.6 && (
            <Typography variant="body2" color="text.secondary">
              Almost there! A bit more practice and you&apos;ll advance.
            </Typography>
          )}
          {lastExerciseResult.accuracy < 0.6 && (
            <Typography variant="body2" color="text.secondary">
              Take it slow — focus on getting the right notes first.
            </Typography>
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
          activeMidiNotes={isPlaying ? undefined : state.activeMidiNotes}
          practiceResultsByNoteId={practiceResults}
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
        {lastExerciseResult && !isPlaying && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={isFreeTempo ? handleKeepPracticing : startPlayback}
              sx={{ gap: 1, textTransform: 'none' }}
            >
              <Icon name="replay" size={20} /> Practice Again
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={advanceToNext}
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
            onClick={stopPlayback}
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
