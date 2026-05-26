import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  chartLayoutToPlaybackSequence,
  chartPlaybackMeasureDurationMs,
  type ChartPlaybackStep,
} from '../../../shared/music/chordPro/chartPlaybackSequence';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import { parseChordSymbol } from '../../../shared/music/chordMatcher';
import { createManagedAudioContext, ensureAudioContextRunning } from '../../../shared/playback/audioContextLifecycle';

export type OriginalChordPlaybackProps = {
  layout: ChartLayout;
  tempo: number;
  compact?: boolean;
  onActiveStepChange?: (step: ChartPlaybackStep | null) => void;
};

function midiForPc(pc: number, octave = 4): number {
  return (octave + 1) * 12 + pc;
}

export function OriginalChordPlayback({
  layout,
  tempo,
  compact = false,
  onActiveStepChange,
}: OriginalChordPlaybackProps): ReactElement {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const managedRef = useRef<ReturnType<typeof createManagedAudioContext> | null>(null);
  const stepIndexRef = useRef(0);

  const steps = chartLayoutToPlaybackSequence(layout).filter((s) => parseChordSymbol(s.chordName));

  const playChord = useCallback(async (symbol: string) => {
    const parsed = parseChordSymbol(symbol);
    if (!parsed) return;
    const managed = managedRef.current ?? createManagedAudioContext();
    managedRef.current = managed;
    const ctx = managed.context;
    await ensureAudioContextRunning(ctx);
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    gain.connect(ctx.destination);
    let t = now;
    for (const pc of parsed.pitchClasses) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 440 * 2 ** ((midiForPc(pc) - 69) / 12);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.4);
      t += 0.02;
    }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    stepIndexRef.current = 0;
    setPlaying(false);
    onActiveStepChange?.(null);
  }, [onActiveStepChange]);

  const start = useCallback(() => {
    if (steps.length === 0) return;
    stop();
    setPlaying(true);
    stepIndexRef.current = 0;
    const measureMs = chartPlaybackMeasureDurationMs(tempo);
    const playStep = (idx: number) => {
      const step = steps[idx];
      if (!step) return;
      onActiveStepChange?.(step);
      void playChord(step.chordName);
    };
    playStep(0);
    stepIndexRef.current = 1;
    timerRef.current = setInterval(() => {
      const idx = stepIndexRef.current;
      if (idx >= steps.length) {
        stop();
        return;
      }
      playStep(idx);
      stepIndexRef.current += 1;
    }, measureMs);
  }, [onActiveStepChange, playChord, steps, stop, tempo]);

  useEffect(() => () => stop(), [stop]);

  if (steps.length === 0) return <></>;

  if (compact) {
    return (
      <Tooltip title={playing ? 'Stop chord playback' : 'Play chord chart'}>
        <IconButton
          size="small"
          aria-label={playing ? 'Stop chord playback' : 'Play chord chart'}
          onClick={playing ? stop : start}
          sx={{ p: 0.35 }}
        >
          {playing ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      size="small"
      variant="text"
      startIcon={playing ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      onClick={playing ? stop : start}
      sx={{ minWidth: 0, px: 1 }}
    >
      {playing ? 'Stop' : 'Play'}
    </Button>
  );
}
