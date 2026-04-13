import { useEffect, useRef, useCallback, useState } from 'react';
import { Box, Button, Typography, Chip, IconButton, Paper } from '@mui/material';
import ScoreDisplay from '../../shared/notation/ScoreDisplay';
import { useScales } from '../store';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import { getScorePlaybackEngine } from '../../shared/playback/scorePlayback';
import type { ScorePlaybackEngine } from '../../shared/playback/scorePlayback';
import { findStage } from '../curriculum/tiers';

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;
}

const HAND_LABELS = { right: 'RH', left: 'LH', both: 'Both' } as const;

export default function SessionScreen() {
  const { state, dispatch } = useScales();
  const { activeExercise, sessionPlan, score, practiceResults, isPlaying } = state;
  const engineRef = useRef<ScorePlaybackEngine | null>(null);
  const [loaded, setLoaded] = useState(false);

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
    if (!activeExercise || !score) return;
    const results = Array.from(state.practiceResults.values());
    const totalNotes = score.parts.reduce(
      (sum, p) => sum + p.measures.reduce((ms, m) => ms + m.notes.filter(n => !n.rest).length, 0), 0);
    const correct = results.filter(r => r.pitchCorrect).length;
    const accuracy = totalNotes > 0 ? correct / totalNotes : 0;

    dispatch({
      type: 'FINISH_EXERCISE',
      record: {
        exerciseId: activeExercise.exerciseId,
        stageId: activeExercise.stageId,
        timestamp: Date.now(),
        accuracy,
        noteCount: totalNotes,
        correctCount: correct,
      },
    });
  }, [activeExercise, score, state.practiceResults, dispatch]);

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
    dispatch({ type: 'SET_PLAYING', isPlaying: false });
  }, [dispatch]);

  const handleNext = useCallback(() => {
    stopPlayback();
    finishExercise();
  }, [stopPlayback, finishExercise]);

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
          <Chip label={HAND_LABELS[activeExercise.hand]} size="small" variant="outlined" />
          {activeExercise.bpm > 0 && (
            <Chip label={`${activeExercise.bpm} BPM`} size="small" variant="outlined" />
          )}
          {isFreeTempo && <Chip label="Free" size="small" color="info" variant="outlined" />}
          {activeExercise.purpose === 'review' && (
            <Chip label="Review" size="small" color="warning" variant="outlined" />
          )}
        </Box>
      </Paper>

      <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {stageInfo?.stage.label ?? ''}
          {activeExercise.subdivision !== 'none' && ` — ${activeExercise.subdivision} subdivision`}
        </Typography>
      </Box>

      <Box className="main-content" sx={{ flex: 1, overflow: 'auto', py: 2, px: 1 }}>
        <ScoreDisplay
          score={score}
          currentMeasureIndex={isFreeTempo ? state.freeTempoMeasureIndex : state.currentMeasureIndex}
          currentNoteIndices={state.currentNoteIndices}
          activeMidiNotes={state.activeMidiNotes}
          practiceResultsByNoteId={practiceResults}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          px: 2, py: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
          borderTop: 1, borderColor: 'divider',
        }}
      >
        {!isPlaying ? (
          <Button
            variant="contained"
            onClick={startPlayback}
            sx={{ minWidth: 140, gap: 1 }}
          >
            <Icon name="play_arrow" /> {isFreeTempo ? 'Start' : 'Play'}
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={stopPlayback}
            color="error"
            sx={{ minWidth: 140, gap: 1 }}
          >
            <Icon name="stop" /> Stop
          </Button>
        )}
        <Button variant="text" onClick={handleNext} sx={{ gap: 0.5 }}>
          {exerciseNumber < totalExercises ? 'Next' : 'Finish'} <Icon name="skip_next" />
        </Button>
      </Paper>
    </Box>
  );
}
