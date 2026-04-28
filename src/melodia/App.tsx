import { useCallback, useEffect, useReducer, useState, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SkipToMain from '../shared/components/SkipToMain';
import LabsDebugDock from '../shared/components/LabsDebugDock';
import { readLabsDebugFromLocation } from '../shared/debug/readLabsDebugParams';
import { createAppAnalytics } from '../shared/utils/analytics';
import {
  calibrationTransposeSemitones,
  computeTransposeToFitRange,
  scoreMidiRange,
  transposeScore,
} from './music';
import { inferTierFromTrail } from './analysis';
import { recordAttemptForHelp, getHelpLevel } from './helpLevel';
import { pickMelodyPart } from '../shared/music/melodiaPipeline/partUtils';
import { buildPitchedOnsets } from './music';
import {
  recordAttempt,
  readCalibrationDone,
  readCalibrationMidi,
  readComfortRange,
  readPathIndex,
  writePathIndex,
  writeLastExerciseId,
  type ComfortRange,
} from './storage';
import { initialMelodiaState, melodiaReducer, type MelodiaPhase } from './store';
import { getMelodiaCatalog, getMelodiaExerciseById } from './curriculum/catalog';
import {
  getLinearCurriculumExerciseId,
  linearCurriculumLength,
} from './curriculum/linearPath';
import { curriculumEntryToExercise } from './curriculum/mapExercise';
import CalibrationPhase from './phases/CalibrationPhase';
import AudiationPhase from './phases/AudiationPhase';
import SingPhase from './phases/SingPhase';
import ReviewPhase from './phases/ReviewPhase';
import type { MelodiaExercise } from './types';
import type { PianoScore } from '../shared/music/scoreTypes';

const analytics = createAppAnalytics('melodia');

interface ChosenTranspose {
  semitones: number;
  warning: string | null;
}

function chooseTranspose(
  score: PianoScore,
  calibrationMidi: number | null,
  comfort: ComfortRange,
): ChosenTranspose {
  if (calibrationMidi !== null) {
    const r = calibrationTransposeSemitones(score, calibrationMidi);
    return { semitones: r.semitones, warning: r.warning };
  }
  const range = scoreMidiRange(score);
  if (!range) return { semitones: 0, warning: null };
  const r = computeTransposeToFitRange(range.min, range.max, comfort.low, comfort.high);
  return { semitones: r.semitones, warning: r.warning ?? null };
}

function loadCatalogExercise(
  id: string,
  calibrationMidi: number | null,
  comfort: ComfortRange,
): { exercise: MelodiaExercise; transposeSemitones: number; transposeWarning: string | null } | null {
  const entry = getMelodiaExerciseById(id);
  if (!entry) return null;
  const { semitones, warning } = chooseTranspose(entry.score, calibrationMidi, comfort);
  const score = semitones === 0 ? entry.score : transposeScore(entry.score, semitones);
  const base = curriculumEntryToExercise(entry);
  const exercise: MelodiaExercise = { ...base, score };
  return { exercise, transposeSemitones: semitones, transposeWarning: warning };
}

export default function App(): ReactElement {
  const debugMode = readLabsDebugFromLocation().debug;
  const [state, dispatch] = useReducer(melodiaReducer, initialMelodiaState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const calibrationDone = readCalibrationDone();
    const phase: MelodiaPhase = debugMode
      ? 'debug'
      : calibrationDone
        ? 'audiation'
        : 'calibration';
    dispatch({
      type: 'INIT',
      phase,
      pathIndex: readPathIndex(),
      pathLength: linearCurriculumLength(),
      comfort: readComfortRange(),
      calibrationMidi: readCalibrationMidi(),
      debugMode,
    });
    setHydrated(true);
  }, [debugMode]);

  useEffect(() => {
    if (!hydrated) return;
    if (state.debugMode) return;
    if (state.phase !== 'audiation') return;
    if (state.exercise) return;
    const id = getLinearCurriculumExerciseId(state.pathIndex);
    if (!id) return;
    const loaded = loadCatalogExercise(id, state.calibrationMidi, state.comfort);
    if (!loaded) return;
    writeLastExerciseId(id);
    const helpLevel = getHelpLevel(loaded.exercise.id);
    dispatch({
      type: 'LOAD_EXERCISE',
      exercise: loaded.exercise,
      transposeSemitones: loaded.transposeSemitones,
      transposeWarning: loaded.transposeWarning,
      pathIndex: state.pathIndex,
      helpLevel,
    });
    analytics.trackEvent('lesson_load', {
      id,
      transpose: loaded.transposeSemitones,
    });
  }, [
    hydrated,
    state.debugMode,
    state.phase,
    state.exercise,
    state.pathIndex,
    state.calibrationMidi,
    state.comfort,
  ]);

  const onCalibrationComplete = useCallback(
    (result: { calibrationMidi: number | null; comfort: ComfortRange }) => {
      dispatch({
        type: 'CALIBRATION_DONE',
        calibrationMidi: result.calibrationMidi,
        comfort: result.comfort,
      });
      analytics.trackEvent('calibration_done', {
        captured: result.calibrationMidi !== null,
      });
    },
    [],
  );

  const onAudiationDone = useCallback(() => {
    dispatch({ type: 'AUDIATION_DONE' });
  }, []);

  const onAudiationContinue = useCallback(() => {
    dispatch({ type: 'GO_SING' });
  }, []);

  const onPitchSample = useCallback((sample: { t: number; midi: number | null }) => {
    dispatch({ type: 'RECORD_PITCH_SAMPLE', t: sample.t, midi: sample.midi });
  }, []);

  const onSingStop = useCallback(
    (blob: Blob | null) => {
      dispatch({ type: 'SING_STOP', performanceBlob: blob });
      dispatch({ type: 'GO_REVIEW' });
      const ex = state.exercise;
      if (!ex) return;
      const part = pickMelodyPart(ex.score);
      const pitched = buildPitchedOnsets(ex.score, part, 0);
      const tier = inferTierFromTrail(state.pitchTrail.concat([]), pitched);
      recordAttempt(ex.id, tier);
      const outcome = recordAttemptForHelp(ex.id, tier);
      if (outcome.bumped) {
        dispatch({ type: 'SET_HELP_LEVEL', level: outcome.helpLevel });
        analytics.trackEvent('help_level_bump', {
          id: ex.id,
          level: outcome.helpLevel,
        });
      }
    },
    [state.exercise, state.pitchTrail],
  );

  const onPracticeAgain = useCallback(() => {
    dispatch({ type: 'PRACTICE_AGAIN' });
    if (state.exercise) {
      const fresh = getHelpLevel(state.exercise.id);
      dispatch({ type: 'SET_HELP_LEVEL', level: fresh });
    }
  }, [state.exercise]);

  const onNextLesson = useCallback(() => {
    const next = state.pathIndex + 1;
    writePathIndex(next);
    dispatch({ type: 'NEXT_LESSON_PENDING' });
    dispatch({ type: 'INIT', phase: 'audiation', pathIndex: next, pathLength: state.pathLength, comfort: state.comfort, calibrationMidi: state.calibrationMidi, debugMode: state.debugMode });
  }, [state.calibrationMidi, state.comfort, state.debugMode, state.pathIndex, state.pathLength]);

  const isPathLastLesson = state.pathIndex + 1 >= state.pathLength;
  const showSessionShell = state.phase !== 'calibration' && state.phase !== 'debug';

  return (
    <div className="melodia-app">
      <SkipToMain />
      <main id="main" className="melodia-main">
        {state.phase === 'calibration' && (
          <CalibrationPhase onComplete={onCalibrationComplete} />
        )}

        {state.phase === 'debug' && <DebugCatalog />}

        {showSessionShell && state.exercise && (
          <Box className="melodia-journal-card" sx={{ mb: 2.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={0.5}
              justifyContent="space-between"
              alignItems={{ sm: 'flex-start' }}
            >
              <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, lineHeight: 1.2, m: 0 }}>
                {state.exercise.score.title || 'Exercise'}
              </Typography>
              <Stack direction="row" spacing={1.25} className="melodia-ink-pink">
                <Typography variant="caption">
                  Lesson {state.pathIndex + 1}
                  {state.pathLength > 0 ? ` / ${state.pathLength}` : ''}
                </Typography>
                {state.helpLevel > 0 && (
                  <Typography variant="caption">Help L{state.helpLevel}</Typography>
                )}
              </Stack>
            </Stack>
            {state.transposeWarning && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                {state.transposeWarning}
              </Typography>
            )}
          </Box>
        )}

        {state.phase === 'audiation' && state.exercise && (
          <AudiationPhase
            exercise={state.exercise}
            pathIndex={state.pathIndex}
            transposeSemitones={state.transposeSemitones}
            helpLevel={state.helpLevel}
            audiationDone={state.audiationDone}
            onDone={onAudiationDone}
            onContinue={onAudiationContinue}
          />
        )}

        {state.phase === 'audiation' && !state.exercise && !state.debugMode && (
          <Typography variant="body2" color="text.secondary">
            Loading your lesson…
          </Typography>
        )}

        {state.phase === 'sing' && state.exercise && (
          <SingPhase
            exercise={state.exercise}
            helpLevel={state.helpLevel}
            pitchTrail={state.pitchTrail}
            onPitchSample={onPitchSample}
            onStop={onSingStop}
          />
        )}

        {state.phase === 'review' && state.exercise && (
          <ReviewPhase
            exercise={state.exercise}
            pitchTrail={state.pitchTrail}
            performanceBlob={state.performanceBlob}
            isPathLastLesson={isPathLastLesson}
            onPracticeAgain={onPracticeAgain}
            onNextLesson={onNextLesson}
          />
        )}
      </main>

      {debugMode && (
        <LabsDebugDock appId="melodia" accentColor="#e91e8c" title="Melodia" defaultCollapsed>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0, p: 1 }}>
            {JSON.stringify(
              {
                phase: state.phase,
                pathIndex: state.pathIndex,
                helpLevel: state.helpLevel,
                calibrationMidi: state.calibrationMidi,
                comfort: state.comfort,
                exerciseId: state.exercise?.id,
                trailLen: state.pitchTrail.length,
              },
              null,
              2,
            )}
          </Typography>
        </LabsDebugDock>
      )}
    </div>
  );
}

function catalogExerciseHref(entryId: string): string {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  params.set('exercise', entryId);
  const q = params.toString();
  return `${typeof window !== 'undefined' ? window.location.pathname : '/'}${q ? `?${q}` : ''}`;
}

function DebugCatalog(): ReactElement {
  return (
    <Stack spacing={2}>
      <Typography variant="h2">Catalog (debug)</Typography>
      <Typography variant="body2" color="text.secondary">
        Calibration is bypassed in debug mode. Pick any exercise to inspect the pipeline.
      </Typography>
      <Stack component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }} spacing={1}>
        {getMelodiaCatalog().map((entry) => (
          <Box component="li" key={entry.id}>
            <Button
              variant="outlined"
              fullWidth
              sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
              href={catalogExerciseHref(entry.id)}
            >
              Book {entry.book} · No. {entry.number} — {entry.title ?? entry.id}
            </Button>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
