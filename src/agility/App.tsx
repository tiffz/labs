import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createAppAnalytics } from '../shared/utils/analytics';
import { measureRoundTripLatencyMs } from '../shared/audio/latencyCalibration';
import { buildClickSchedule, clampBpm, scheduleMetronomeClicks } from '../shared/audio/singInTimeClock';
import { applyLatencyCompensation, nearestGridTargetSec } from '../shared/audio/rhythmGuard';
import { computePrecisionScore, type PrecisionSample } from '../shared/audio/precisionScore';
import { playVocalWithSineGuide } from '../shared/audio/vocalDuetPlayback';
import { getCentsOff, type PitchInfo } from '../shared/music/pitch/pitchDetection';
import {
  MicrophonePitchInput,
  type MicrophoneDevice,
} from '../shared/music/pitch/microphonePitchInput';
import { PASS_THRESHOLD, SUBDIVISION_LADDER, getLevelByIndex } from './curriculum/levels';
import { transposePatternIntoRange } from './music/transposePattern';
import PitchInkTrace from './components/PitchInkTrace';
import TimingHeatMap, { type SlotTimingHit } from './components/TimingHeatMap';
import { SingPerformanceRecorder } from './audio/performanceRecorder';
import {
  readCalibrationDone,
  readComfortRange,
  readHeadphonesMode,
  readLatencyManualMs,
  readLatencyMs,
  readPathIndex,
  totalLatencyCompensationMs,
  writeCalibrationDone,
  writeComfortRange,
  writeHeadphonesMode,
  writeLatencyManualMs,
  writeLatencyMs,
  writePathIndex,
} from './storage';

const analytics = createAppAnalytics('agility');

const PREP_SEC = 2.4;
const TRAIL_THROTTLE_MS = 45;

type Phase = 'latency' | 'range' | 'home' | 'run' | 'summary';

export default function App(): ReactElement {
  const [phase, setPhase] = useState<Phase>(() => (readCalibrationDone() ? 'home' : 'latency'));
  const [headphones, setHeadphones] = useState(readHeadphonesMode);
  const [latencyMeasure, setLatencyMeasure] = useState(readLatencyMs);
  const [manualMs, setManualMs] = useState(readLatencyManualMs);
  const [measuring, setMeasuring] = useState(false);
  const [comfort, setComfort] = useState(readComfortRange);
  const [pathIndex, setPathIndex] = useState(readPathIndex);
  const [devices, setDevices] = useState<MicrophoneDevice[]>([{ id: 'default', name: 'System default' }]);
  const [micId, setMicId] = useState('default');

  const [activeLevelIndex, setActiveLevelIndex] = useState(0);
  const [subPulse, setSubPulse] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [trail, setTrail] = useState<Array<{ t: number; midi: number | null }>>([]);
  const [summaryHits, setSummaryHits] = useState<SlotTimingHit[]>([]);
  const [precision, setPrecision] = useState<{
    score: number;
    rhythmScore: number;
    pitchScore: number;
  } | null>(null);
  const [recordBlob, setRecordBlob] = useState<Blob | null>(null);
  const [playingDuet, setPlayingDuet] = useState(false);
  const [heroTitleShake, setHeroTitleShake] = useState(false);

  const micRef = useRef<MicrophonePitchInput | null>(null);
  const recorderRef = useRef<SingPerformanceRecorder | null>(null);
  const lastPitchRef = useRef<PitchInfo | null>(null);
  const sessionStartPerfRef = useRef(0);
  const cancelClickRef = useRef<(() => void) | null>(null);
  const hitMapRef = useRef<Map<number, PrecisionSample & { slot: number }>>(new Map());
  const trailThrottleRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const sessionTrackStartRef = useRef(0);

  const refreshDevices = useCallback(async () => {
    const list = await MicrophonePitchInput.listDevices();
    setDevices(list);
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const level = getLevelByIndex(activeLevelIndex) ?? SUBDIVISION_LADDER[0]!;
  const expectedMidis = transposePatternIntoRange(level.baseMidis, comfort.low, comfort.high);
  const exerciseDurSec = level.measures * 4 * (60 / level.bpm);
  const sched = buildClickSchedule(level.grid, level.bpm, level.measures, subPulse);

  const saveHeadphones = useCallback((v: boolean) => {
    setHeadphones(v);
    writeHeadphonesMode(v);
  }, []);

  const runLatencyMeasurement = async (): Promise<void> => {
    if (measuring || headphones) return;
    setMeasuring(true);
    analytics.trackEvent('latency_measure_start');
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });

      try {
        const ms = await measureRoundTripLatencyMs(ctx, stream);
        if (ms !== null) {
          writeLatencyMs(ms);
          setLatencyMeasure(ms);
        }
      } finally {
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      /* */
    } finally {
      setMeasuring(false);
    }
  };

  const completeLatencyPhase = (): void => {
    writeLatencyMs(latencyMeasure);
    writeLatencyManualMs(manualMs);
    setPhase('range');
  };

  const completeRangePhase = (): void => {
    writeComfortRange(comfort);
    writeCalibrationDone();
    setPhase('home');
  };

  const cleanupExercise = useCallback(() => {
    cancelClickRef.current?.();
    cancelClickRef.current = null;
    void micRef.current?.stop();
    micRef.current = null;
    void recorderRef.current?.stop().then(setRecordBlob);
    recorderRef.current = null;
    setCountdown(null);
  }, []);

  const finishExerciseRun = useCallback(() => {
    cancelClickRef.current?.();
    cancelClickRef.current = null;
    void micRef.current?.stop();
    micRef.current = null;
    void recorderRef.current?.stop().then((b) => {
      setRecordBlob(b);
    });
    recorderRef.current = null;

    const rows: SlotTimingHit[] = [];
    const samples: PrecisionSample[] = [];

    hitMapRef.current.forEach((v, slotIdx) => {
      rows.push({ slotIndex: slotIdx, deltaMs: v.deltaMs });
      samples.push({ deltaMs: v.deltaMs, centsAbs: v.centsAbs });
    });

    hitMapRef.current.clear();
    const prec = computePrecisionScore(samples);
    setSummaryHits([...rows].sort((a, b) => a.slotIndex - b.slotIndex));
    setPrecision(prec);
    analytics.trackEvent('exercise_finish', {
      level: level.id,
      score: prec.score,
      samples: samples.length,
    });

    if (prec.score >= PASS_THRESHOLD && activeLevelIndex === pathIndex && pathIndex < SUBDIVISION_LADDER.length - 1) {
      const next = pathIndex + 1;
      writePathIndex(next);
      setPathIndex(next);
    }

    setPhase('summary');
    analytics.trackSessionEnd(sessionTrackStartRef.current);
  }, [activeLevelIndex, level.id, pathIndex]);

  const startExercise = useCallback(async (): Promise<void> => {
    hitMapRef.current.clear();
    setTrail([]);
    setSummaryHits([]);
    setPrecision(null);
    setRecordBlob(null);
    setPhase('run');
    sessionTrackStartRef.current = Date.now();
    analytics.trackEvent('exercise_start');

    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume();

    const prepMs = PREP_SEC * 1000;
    sessionStartPerfRef.current = performance.now() + prepMs;

    let c = Math.ceil(PREP_SEC);
    setCountdown(c);
    const cdId = window.setInterval(() => {
      c -= 1;
      if (c <= 0) {
        window.clearInterval(cdId);
        setCountdown(null);
      } else setCountdown(c);
    }, 1000);

    lastPitchRef.current = null;

    cancelClickRef.current = scheduleMetronomeClicks({
      ctx,
      bpm: clampBpm(level.bpm),
      grid: level.grid,
      measures: level.measures,
      subPulse,
      loopCount: 1,
      startAudioTime: ctx.currentTime + PREP_SEC,
    });

    const lvl = level;
    const exMidis = expectedMidis;
    const input = new MicrophonePitchInput(
      {
        onNoteOn(midi) {
          const latencyTotal = totalLatencyCompensationMs();
          const elapsed = Math.max(
            0,
            (performance.now() - sessionStartPerfRef.current) / 1000,
          );
          const hit = nearestGridTargetSec(elapsed, lvl.bpm, lvl.grid, lvl.measures);
          const deltaMs = applyLatencyCompensation(hit.deltaMsRaw, latencyTotal);
          const idx = Math.min(hit.slotIndexGlobal, exMidis.length - 1);
          const expected = exMidis[idx] ?? midi;
          const info = lastPitchRef.current;
          let centsAbs = Math.min(
            200,
            Math.abs(
              Math.round(
                info ? getCentsOff(info.frequency, Math.round(expected)) : (midi - expected) * 100,
              ),
            ),
          );
          if (!Number.isFinite(centsAbs)) centsAbs = 50;

          const prev = hitMapRef.current.get(idx);
          if (!prev || Math.abs(deltaMs) < Math.abs(prev.deltaMs)) {
            hitMapRef.current.set(idx, { deltaMs, centsAbs, slot: idx });
          }
        },
        onPitchDetected(_m, _c, pi) {
          if (pi) lastPitchRef.current = pi;
          const now = performance.now();
          if (now - trailThrottleRef.current < TRAIL_THROTTLE_MS) return;
          trailThrottleRef.current = now;
          const elapsed = Math.max(0, (now - sessionStartPerfRef.current) / 1000);
          setTrail((prev) => [...prev, { t: elapsed, midi: pi?.midi ?? null }]);
        },
      },
      { rmsThreshold: 0.006 },
    );
    micRef.current = input;
    await input.start(micId);
    const stream = input.getMediaStream();
    if (stream) {
      const rec = new SingPerformanceRecorder();
      recorderRef.current = rec;
      rec.start(stream);
    }

    window.setTimeout(() => {
      finishExerciseRun();
    }, exerciseDurSec * 1000 + prepMs + 380);
  }, [exerciseDurSec, expectedMidis, finishExerciseRun, level, micId, subPulse]);

  useEffect(
    () => () => {
      cleanupExercise();
    },
    [cleanupExercise],
  );

  const replayDuet = useCallback(async (): Promise<void> => {
    if (!recordBlob) return;
    setPlayingDuet(true);
    const tones = sched.map((ev, i) => ({
      midi: expectedMidis[Math.min(i, expectedMidis.length - 1)] ?? 60,
      startSec: ev.time,
      durSec: Math.min(0.42, exerciseDurSec / Math.max(1, sched.length)),
    }));
    const h = await playVocalWithSineGuide({ userBlob: recordBlob, tones });
    window.setTimeout(
      () => {
        h.stop();
        setPlayingDuet(false);
      },
      (exerciseDurSec + 1.2) * 1000,
    );
  }, [exerciseDurSec, expectedMidis, recordBlob, sched]);

  const shakeHeroTitle = useCallback((): void => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    setHeroTitleShake(false);
    window.setTimeout(() => setHeroTitleShake(true), 0);
  }, []);

  const svgW =
    typeof window !== 'undefined'
      ? Math.min(672, Math.max(280, Math.min(window.innerWidth, 720) - 48))
      : 640;

  return (
    <div className="agility-root">
      <div className="agility-shell">
        <Box
          component="header"
          className="agility-header agility-page"
          role="banner"
          sx={{ pt: { xs: 2, sm: 2.25 }, pb: 0.5 }}
        >
          <Typography component="h1" className="agility-hero-title">
            <span
              className={
                heroTitleShake
                  ? 'agility-hero-title-badge agility-hero-title-badge--motion agility-hero-title-badge--shake'
                  : 'agility-hero-title-badge agility-hero-title-badge--motion'
              }
              role="button"
              tabIndex={0}
              aria-label="Nudge the lab title"
              onClick={shakeHeroTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  shakeHeroTitle();
                }
              }}
              onAnimationEnd={() => setHeroTitleShake(false)}
            >
              Vocal Agility Trainer
            </span>
          </Typography>
          <Typography component="p" variant="body1" className="agility-hero-sub" sx={{ mt: { xs: 1.35, sm: 1.5 }, mb: 0 }}>
            Practice singing on time and in tune with a metronome.
          </Typography>
        </Box>

        <main id="main" className="agility-main agility-page">
        {phase === 'latency' && (
          <Stack spacing={2} className="agility-panel agility-panel-dense">
            <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Step 1: Timing calibration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              Short ping through speakers; we listen on the mic for delay. Headphones block that path—use manual ms.
            </Typography>
            <FormControlLabel
              sx={{ alignItems: 'flex-start', mr: 0 }}
              control={
                <Checkbox
                  checked={headphones}
                  onChange={(_, c) => saveHeadphones(c)}
                  inputProps={{ 'aria-label': 'I use headphones' }}
                  size="small"
                />
              }
              label="I use headphones (skip automatic measure)"
            />
            <Button
              variant="contained"
              color="secondary"
              size="medium"
              disabled={measuring || headphones}
              onClick={() => void runLatencyMeasurement()}
            >
              {measuring ? 'Measuring…' : 'Measure speaker → mic delay'}
            </Button>
            {measuring && <LinearProgress sx={{ height: 4, borderRadius: 1 }} />}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={0.5}
              justifyContent="space-between"
              alignItems={{ sm: 'baseline' }}
            >
              <Typography variant="body2">
                Base latency: <strong>{latencyMeasure} ms</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Manual trim (± ms)
              </Typography>
            </Stack>
            <Slider
              size="small"
              value={manualMs}
              min={-80}
              max={80}
              valueLabelDisplay="auto"
              onChange={(_, v) => setManualMs(v as number)}
              sx={{ my: 0.25 }}
            />
            <Typography variant="body2">
              Total compensation: <strong>{Math.round(latencyMeasure + manualMs)} ms</strong>
            </Typography>
            <Button variant="contained" size="medium" onClick={completeLatencyPhase}>
              Continue
            </Button>
          </Stack>
        )}

        {phase === 'range' && (
          <Stack spacing={2} className="agility-panel agility-panel-dense">
            <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Step 2: Comfortable range (MIDI)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              Transpose patterns into a safe pocket for your voice.
            </Typography>
            <Typography variant="body2">
              Low MIDI ({comfort.low})
            </Typography>
            <Slider
              size="small"
              value={comfort.low}
              min={48}
              max={Math.min(comfort.high - 6, 78)}
              onChange={(_, v) =>
                setComfort((c) => ({
                  ...c,
                  low: Math.min(v as number, c.high - 6),
                }))
              }
              sx={{ my: 0.25 }}
            />
            <Typography variant="body2">
              High MIDI ({comfort.high})
            </Typography>
            <Slider
              size="small"
              value={comfort.high}
              min={Math.max(comfort.low + 6, 55)}
              max={92}
              onChange={(_, v) =>
                setComfort((c) => ({
                  ...c,
                  high: Math.max(v as number, c.low + 6),
                }))
              }
              sx={{ my: 0.25 }}
            />
            <Button variant="contained" size="medium" onClick={completeRangePhase}>
              Save and start
            </Button>
          </Stack>
        )}

        {phase === 'home' && (
          <Stack spacing={3.5}>
            <Stack spacing={2} className="agility-panel">
              <Typography className="agility-section-label">Progress</Typography>
              <Typography variant="body1">
                Unlocked levels: <strong>{pathIndex + 1}</strong> / {SUBDIVISION_LADDER.length}
              </Typography>
              <FormControlLabel
                control={<Checkbox checked={subPulse} onChange={(_, c) => setSubPulse(c)} />}
                label="Subdivision pulse (quieter subdivisions)"
              />
            </Stack>

            <Stack spacing={1.75}>
              <Typography className="agility-section-label">Curriculum</Typography>
              {SUBDIVISION_LADDER.map((lv, i) => {
                const locked = i > pathIndex;
                return (
                  <Box key={lv.id} className="agility-panel">
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {lv.title}
                          {locked ? ' · locked' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {lv.description}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant={i === activeLevelIndex ? 'contained' : 'outlined'}
                        color={i === activeLevelIndex ? 'primary' : 'secondary'}
                        disabled={locked}
                        onClick={() => setActiveLevelIndex(i)}
                        sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}
                      >
                        Select
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>

            <Stack spacing={1.5} className="agility-panel">
              <Typography className="agility-section-label">Input</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Typography variant="body2" sx={{ minWidth: { sm: 88 } }}>
                  Microphone
                </Typography>
                <select
                  className="agility-field-select"
                  aria-label="Microphone device"
                  value={micId}
                  onChange={(e) => setMicId(e.target.value)}
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <Button size="small" color="secondary" variant="outlined" onClick={() => void refreshDevices()}>
                  Refresh
                </Button>
              </Stack>
            </Stack>

            <Button variant="contained" size="large" fullWidth onClick={() => void startExercise()}>
              Begin level
            </Button>
          </Stack>
        )}

        {phase === 'run' && (
          <Stack spacing={2.5} alignItems="stretch">
            <Stack spacing={0.5} alignItems="center" textAlign="center">
              {countdown !== null && (
                <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.04em' }}>
                  {countdown}
                </Typography>
              )}
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                In progress · {level.title}
              </Typography>
            </Stack>
            <Box className="agility-svg-staff-border" sx={{ alignSelf: 'center', maxWidth: '100%', overflow: 'auto' }}>
              <PitchInkTrace
                samples={trail}
                durationSec={exerciseDurSec}
                lowMidi={comfort.low - 2}
                highMidi={comfort.high + 2}
                width={svgW}
                height={176}
              />
            </Box>
          </Stack>
        )}

        {phase === 'summary' && (
          <Stack spacing={3}>
            <Stack spacing={2} className="agility-panel">
              <Typography component="h2" variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Precision summary
              </Typography>
              {precision && (
                <Typography variant="body1">
                  Combined: <strong>{precision.score}</strong> (rhythm {precision.rhythmScore}, tuning{' '}
                  {precision.pitchScore})
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Pass at score ≥ {PASS_THRESHOLD} unlocks the next level.
              </Typography>
            </Stack>
            {summaryHits.length > 0 ? (
              <Box className="agility-svg-staff-border" sx={{ p: 1.5, overflow: 'auto' }}>
                <TimingHeatMap slots={summaryHits.slice(0, 96)} width={Math.min(640, svgW)} />
              </Box>
            ) : (
              <Typography color="text.secondary">No note onsets captured.</Typography>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="contained" disabled={!recordBlob || playingDuet} onClick={() => void replayDuet()}>
                Aural mirror (vocals left, guide right)
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  cleanupExercise();
                  setPhase('home');
                  setTrail([]);
                }}
              >
                Back
              </Button>
            </Stack>
          </Stack>
        )}
      </main>
      </div>
    </div>
  );
}
