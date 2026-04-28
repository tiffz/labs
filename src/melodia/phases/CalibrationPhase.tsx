import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MicrophonePitchInput } from '../../shared/music/pitch/microphonePitchInput';
import { midiToNoteName } from '../../shared/music/scoreTypes';
import {
  type ComfortRange,
  rangePreset,
  readPreferredMicDeviceId,
  writeCalibrationDone,
  writeCalibrationMidi,
  writeComfortRange,
} from '../storage';

const CAPTURE_MS = 2000;
const MIN_STABLE_SAMPLES = 8;
const MIN_STABLE_WINDOW_MS = 800;

export interface CalibrationResult {
  calibrationMidi: number | null;
  comfort: ComfortRange;
}

export interface CalibrationPhaseProps {
  onComplete: (result: CalibrationResult) => void;
}

interface Sample {
  t: number;
  midi: number;
}

/**
 * Find the longest contiguous run of samples within ±1 semitone of each
 * other and return the median MIDI of that run, plus its time span. Returns
 * `null` when no sufficient run exists.
 */
function pickStableMedian(samples: Sample[]): { midi: number; spanMs: number } | null {
  if (samples.length < MIN_STABLE_SAMPLES) return null;
  let best: Sample[] = [];
  let current: Sample[] = [];
  for (const sample of samples) {
    if (current.length === 0) {
      current.push(sample);
      continue;
    }
    const refMidi = current[0]!.midi;
    if (Math.abs(sample.midi - refMidi) <= 1) {
      current.push(sample);
    } else {
      if (current.length > best.length) best = current;
      current = [sample];
    }
  }
  if (current.length > best.length) best = current;
  if (best.length < MIN_STABLE_SAMPLES) return null;
  const spanMs = (best[best.length - 1]!.t - best[0]!.t) * 1000;
  if (spanMs < MIN_STABLE_WINDOW_MS) return null;
  const sorted = [...best].sort((a, b) => a.midi - b.midi);
  const midi = sorted[Math.floor(sorted.length / 2)]!.midi;
  return { midi, spanMs };
}

type CaptureState = 'idle' | 'listening' | 'success' | 'error' | 'denied';

export default function CalibrationPhase({
  onComplete,
}: CalibrationPhaseProps): ReactElement {
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [progress, setProgress] = useState(0);
  const [liveMidi, setLiveMidi] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const inputRef = useRef<MicrophonePitchInput | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const startRef = useRef(0);

  const cleanup = useCallback(() => {
    inputRef.current?.stop();
    inputRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const finishWithSkip = useCallback(
    (preset: 'low' | 'mid' | 'high') => {
      const comfort = rangePreset(preset);
      writeComfortRange(comfort);
      writeCalibrationDone();
      onComplete({ calibrationMidi: null, comfort });
    },
    [onComplete],
  );

  const startSingDo = useCallback(async () => {
    if (captureState === 'listening') return;
    setErrorText(null);
    setLiveMidi(null);
    samplesRef.current = [];
    setProgress(0);
    setCaptureState('listening');
    const input = new MicrophonePitchInput({
      onPitchDetected: (midi) => {
        if (midi === null) return;
        const t = (performance.now() - startRef.current) / 1000;
        samplesRef.current.push({ t, midi });
        setLiveMidi(midi);
      },
    });
    inputRef.current = input;
    try {
      await input.start(readPreferredMicDeviceId() ?? 'default');
    } catch (e) {
      const denied =
        e instanceof DOMException &&
        (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError');
      setCaptureState(denied ? 'denied' : 'error');
      setErrorText(denied ? 'Mic permission denied' : 'Mic unavailable');
      cleanup();
      return;
    }
    startRef.current = performance.now();
    const tickHandle = window.setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      setProgress(Math.min(1, elapsed / CAPTURE_MS));
      if (elapsed >= CAPTURE_MS) {
        window.clearInterval(tickHandle);
        const result = pickStableMedian(samplesRef.current);
        cleanup();
        if (!result) {
          setCaptureState('error');
          setErrorText("Couldn't lock a steady pitch — try again or skip.");
          return;
        }
        const midi = result.midi;
        const comfort: ComfortRange = { low: midi - 5, high: midi + 7 };
        writeComfortRange(comfort);
        writeCalibrationMidi(midi);
        writeCalibrationDone();
        setCaptureState('success');
        setLiveMidi(midi);
        onComplete({ calibrationMidi: midi, comfort });
      }
    }, 60);
  }, [captureState, cleanup, onComplete]);

  return (
    <Stack
      component="section"
      spacing={2}
      aria-labelledby="melodia-calibration-title"
      sx={{ maxWidth: '38rem', mx: 'auto', mt: 1 }}
    >
      <Box>
        <Typography
          id="melodia-calibration-title"
          variant="h1"
          component="h1"
          sx={{ mb: 1 }}
        >
          Melodia Online
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          Sing one comfortable note. We&apos;ll treat that as your <strong>Do</strong> for the
          first lesson — movable do, no perfect pitch required.
        </Typography>
      </Box>

      <Stack
        component="section"
        aria-labelledby="melodia-calibration-sing-title"
        spacing={1.25}
        sx={{
          border: '1px solid rgba(28, 40, 64, 0.12)',
          borderRadius: 2,
          p: 1.5,
          background: '#fffef9',
        }}
      >
        <Typography
          id="melodia-calibration-sing-title"
          variant="subtitle1"
          sx={{ fontWeight: 700, m: 0 }}
        >
          Sing your Do
        </Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
          Hold any comfortable pitch on &quot;ah&quot; for two seconds. We pick the steadiest
          part as your home tone.
        </Typography>
        {captureState === 'listening' && (
          <Box>
            <LinearProgress variant="determinate" value={progress * 100} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.5 }}
            >
              {liveMidi !== null
                ? `Hearing ${midiToNoteName(liveMidi)}`
                : 'Listening…'}
            </Typography>
          </Box>
        )}
        {captureState === 'success' && liveMidi !== null && (
          <Typography variant="body2" className="melodia-ink-pink">
            Locked on <strong>{midiToNoteName(liveMidi)}</strong> — starting your first lesson.
          </Typography>
        )}
        {(captureState === 'error' || captureState === 'denied') && errorText && (
          <Typography variant="body2" color="error" role="alert">
            {errorText}
          </Typography>
        )}
        <Button
          variant="contained"
          color="secondary"
          size="medium"
          onClick={() => void startSingDo()}
          disabled={captureState === 'listening'}
        >
          {captureState === 'listening' ? 'Listening…' : 'Sing your Do'}
        </Button>
      </Stack>

      <Stack
        component="section"
        aria-labelledby="melodia-calibration-skip-title"
        spacing={1.25}
        sx={{
          border: '1px solid rgba(28, 40, 64, 0.08)',
          borderRadius: 2,
          p: 1.5,
        }}
      >
        <Typography
          id="melodia-calibration-skip-title"
          variant="subtitle1"
          sx={{ fontWeight: 700, m: 0 }}
        >
          Skip — pick a range
        </Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
          Don&apos;t want to sing yet? Tap a comfortable range and we&apos;ll center the lesson
          there. We&apos;ll ask for the mic when you start the sing phase.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" size="small" onClick={() => finishWithSkip('low')}>
            Low voice (G3–G4)
          </Button>
          <Button variant="outlined" size="small" onClick={() => finishWithSkip('mid')}>
            Mid voice (C4–C5)
          </Button>
          <Button variant="outlined" size="small" onClick={() => finishWithSkip('high')}>
            High voice (E4–E5)
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
