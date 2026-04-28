import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { midiToNoteName } from '../../shared/music/scoreTypes';
import { pickMelodyPart } from '../../shared/music/melodiaPipeline/partUtils';
import { playAudiationCadence, playTonicPreviewHertz } from '../audio';
import { buildPitchedOnsets, melodyAnchorReferenceMidi, tonicAnchorMidiForLesson, tonicDroneFrequencyForLesson } from '../music';
import MelodiaStaff, {
  type MelodiaStaffLayout,
} from '../components/MelodiaStaff';
import MelodiaPlayhead from '../components/MelodiaPlayhead';
import type { MelodiaExercise } from '../types';

export interface AudiationPhaseProps {
  exercise: MelodiaExercise;
  pathIndex: number;
  transposeSemitones: number;
  helpLevel: number;
  onDone: () => void;
  onContinue: () => void;
  audiationDone: boolean;
}

/**
 * Solfège lyrics fade out across the first 11 lessons. helpLevel ≥ 3 forces full opacity.
 */
function solfegeOpacityForProgress(pathIndex: number, helpLevel: number): number {
  if (helpLevel >= 3) return 1;
  return Math.max(0.15, 1 - pathIndex / 10);
}

export default function AudiationPhase({
  exercise,
  pathIndex,
  transposeSemitones,
  helpLevel,
  onDone,
  onContinue,
  audiationDone,
}: AudiationPhaseProps): ReactElement {
  const [layout, setLayout] = useState<MelodiaStaffLayout | null>(null);
  const [progress, setProgress] = useState(0);
  const [soundBlocked, setSoundBlocked] = useState(false);
  /** User explicitly started this audiation trial (gates audio until then). */
  const [listeningStarted, setListeningStarted] = useState(false);
  const audioRef = useRef<{
    ctx: AudioContext;
    drone: OscillatorNode;
    started: boolean;
  } | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const kickListeningRef = useRef<((signal?: AbortSignal) => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    setListeningStarted(false);
    setProgress(0);
    setSoundBlocked(false);
  }, [exercise.id]);

  useEffect(() => {
    const score = exercise.score;
    const part = pickMelodyPart(score);
    const onsets = buildPitchedOnsets(score, part, 0);
    const total =
      onsets.length === 0
        ? 2
        : onsets[onsets.length - 1]!.tSec + onsets[onsets.length - 1]!.durSec + 0.5;

    let raf = 0;

    const cleanupDrone = () => {
      cancelAnimationFrame(raf);
      const a = audioRef.current;
      audioRef.current = null;
      if (!a) return;
      try {
        a.drone.stop();
      } catch {
        /* */
      }
      void a.ctx.close();
    };

    const ac = new AbortController();

    let droneStarted = false;

    const startDroneAndProgress = () => {
      if (droneStarted) return;
      droneStarted = true;
      const ctx = new AudioContext();
      const drone = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = helpLevel >= 1 ? 0.2 : 0.13;
      drone.type = 'sine';
      drone.frequency.value = tonicDroneFrequencyForLesson(score, transposeSemitones);
      drone.connect(gain).connect(ctx.destination);
      const bundle = { ctx, drone, started: false };
      audioRef.current = bundle;

      const tryStart = () => {
        if (bundle.started || ctx.state !== 'running') return;
        try {
          drone.start();
          bundle.started = true;
        } catch {
          /* */
        }
      };
      void ctx.resume().then(() => {
        if (ac.signal.aborted) return;
        if (ctx.state === 'running') {
          tryStart();
          setSoundBlocked(false);
        } else {
          setSoundBlocked(true);
        }
      });

      const start = performance.now();
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        const ratio = Math.min(1, elapsed / total);
        setProgress(ratio);
        if (elapsed < total) {
          raf = requestAnimationFrame(tick);
        } else {
          onDoneRef.current();
          try {
            drone.stop();
          } catch {
            /* */
          }
          void ctx.close();
          audioRef.current = null;
        }
      };
      raf = requestAnimationFrame(tick);
    };

    kickListeningRef.current = async (incomingSignal?: AbortSignal) => {
      const merged = incomingSignal ?? ac.signal;
      const refMidi = melodyAnchorReferenceMidi(score);
      const tonicRoot = tonicAnchorMidiForLesson(score.key, transposeSemitones, refMidi);
      const okPre = await playAudiationCadence({
        tonicRootMidi: tonicRoot,
        signal: merged,
      });
      if (merged.aborted) return;
      if (!okPre) {
        setSoundBlocked(true);
        return;
      }
      startDroneAndProgress();
    };

    if (listeningStarted) {
      void kickListeningRef.current(ac.signal);
    }

    return () => {
      ac.abort();
      cleanupDrone();
    };
  }, [exercise, helpLevel, listeningStarted, transposeSemitones]);

  const unlockAfterBlock = useCallback(async () => {
    const bundle = audioRef.current;
    if (bundle) {
      await bundle.ctx.resume();
      if (bundle.ctx.state === 'running' && !bundle.started) {
        try {
          bundle.drone.start();
          bundle.started = true;
        } catch {
          /* */
        }
      }
      if (bundle.ctx.state === 'running') setSoundBlocked(false);
      return;
    }
    await kickListeningRef.current?.();
  }, []);

  const playTonic = useCallback(() => {
    void playTonicPreviewHertz(tonicDroneFrequencyForLesson(exercise.score, transposeSemitones));
  }, [exercise, transposeSemitones]);

  const opacity = solfegeOpacityForProgress(pathIndex, helpLevel);
  const firstPitched = layout?.noteFrames[0];

  return (
    <Stack spacing={3} sx={{ pt: 0.5 }}>
      <Box sx={{ px: { xs: 0, sm: 0.5 } }}>
        <MelodiaStaff
          score={exercise.score}
          showSolfege
          solfegeOpacity={opacity}
          onLayout={setLayout}
        >
          {layout && <MelodiaPlayhead layout={layout} progress={listeningStarted ? progress : 0} />}
        </MelodiaStaff>
      </Box>

      <Stack spacing={2} sx={{ width: '100%' }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, m: 0 }}>
          Audiation — sing this silently
        </Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.65, mb: 0 }}>
          {!listeningStarted ? (
            <>
              When you tap <strong>Begin audiation</strong>, brief <strong>V7→tonic</strong> chords
              play first, then a steady <strong>drone</strong> on the tonic. Follow the playhead —
              imagine each tone and stay anchored to home pitch on the staff.
            </>
          ) : (
            <>
              Follow the playhead silently; chords and drone are playing. Stay anchored to{' '}
              <strong>home pitch</strong> on the staff.
            </>
          )}
          {firstPitched ? (
            <>
              {' '}
              First note: <strong>{midiToNoteName(firstPitched.midi)}</strong>.
            </>
          ) : null}
        </Typography>
        {!listeningStarted ? (
          <Button
            type="button"
            variant="contained"
            color="secondary"
            size="medium"
            onClick={() => {
              setListeningStarted(true);
            }}
            sx={{ alignSelf: 'flex-start', mt: 0.5 }}
          >
            Begin audiation
          </Button>
        ) : null}

        {listeningStarted && soundBlocked && (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              Browser blocked audio — tap once to unlock sound (plays the tonal framing chords and drone).
            </Typography>
            <Button type="button" variant="outlined" size="small" onClick={unlockAfterBlock}>
              Enable sound
            </Button>
          </Stack>
        )}
      </Stack>

      <Box sx={{ pt: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Button type="button" variant="outlined" size="small" onClick={playTonic}>
          Hear tonic
        </Button>
      </Box>

      <Box
        sx={{
          height: 10,
          bgcolor: 'divider',
          borderRadius: 999,
          overflow: 'hidden',
        }}
        aria-hidden
      >
        <Box
          sx={{
            width: `${progress * 100}%`,
            height: '100%',
            bgcolor: 'secondary.main',
            transition: 'width 80ms linear',
          }}
        />
      </Box>

      <Box sx={{ pt: 1 }}>
        <Button
          variant="contained"
          color="secondary"
          size="medium"
          fullWidth
          disabled={!audiationDone}
          onClick={onContinue}
          sx={{ py: 1.25 }}
        >
          Sing it out loud
        </Button>
      </Box>
    </Stack>
  );
}
