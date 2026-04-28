import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MicrophonePitchInput, type MicrophoneDevice } from '../../shared/music/pitch/microphonePitchInput';
import { midiToNoteName } from '../../shared/music/scoreTypes';
import { pickMelodyPart } from '../../shared/music/melodiaPipeline/partUtils';
import { PerformanceRecorder, playGhostGuide, type GhostGuideHandle } from '../audio';
import {
  buildPitchedOnsets,
  expectedMidiAtSec,
} from '../music';
import MelodiaStaff, { type MelodiaStaffLayout } from '../components/MelodiaStaff';
import MelodiaInkTrace from '../components/MelodiaInkTrace';
import MelodiaMicBar from '../components/MelodiaMicBar';
import MelodiaPlayhead from '../components/MelodiaPlayhead';
import {
  readPreferredMicDeviceId,
  writePreferredMicDeviceId,
} from '../storage';
import type { MelodiaExercise, PitchTrailPoint } from '../types';

type SingMicUiState = 'starting' | 'live' | 'denied' | 'error';

export interface SingPhaseProps {
  exercise: MelodiaExercise;
  helpLevel: number;
  pitchTrail: PitchTrailPoint[];
  onPitchSample: (sample: { t: number; midi: number | null }) => void;
  onStop: (blob: Blob | null) => void;
}

const TRAIL_THROTTLE_MS = 50;

export default function SingPhase({
  exercise,
  helpLevel,
  pitchTrail,
  onPitchSample,
  onStop,
}: SingPhaseProps): ReactElement {
  const [layout, setLayout] = useState<MelodiaStaffLayout | null>(null);
  const [micUi, setMicUi] = useState<SingMicUiState>('starting');
  const [micLabel, setMicLabel] = useState<string | null>(null);
  const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    () => readPreferredMicDeviceId() ?? 'default',
  );
  const [pitchTrackingEnabled, setPitchTrackingEnabled] = useState(true);
  const [micRetryNonce, setMicRetryNonce] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [ghostOn, setGhostOn] = useState(helpLevel >= 2);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const micRef = useRef<MicrophonePitchInput | null>(null);
  const recorderRef = useRef<PerformanceRecorder | null>(null);
  const ghostRef = useRef<GhostGuideHandle | null>(null);
  const startRef = useRef(performance.now());
  const trailThrottleRef = useRef(0);
  const pitchTrackingEnabledRef = useRef(true);
  const onPitchSampleRef = useRef(onPitchSample);
  onPitchSampleRef.current = onPitchSample;
  pitchTrackingEnabledRef.current = pitchTrackingEnabled;

  const pitchedOnsets = useMemo(() => {
    const part = pickMelodyPart(exercise.score);
    return buildPitchedOnsets(exercise.score, part, 0);
  }, [exercise]);

  useEffect(() => {
    setHighlightIndex(null);
    if (pitchTrail.length === 0) return;
    const last = pitchTrail[pitchTrail.length - 1]!;
    if (last.midi === null) return;
    const expected = expectedMidiAtSec(pitchedOnsets, last.t);
    if (expected === null) return;
    if (Math.abs(last.midi - expected) > 0.5) return;
    const idx = pitchedOnsets.findIndex(
      (o) => last.t >= o.tSec && last.t < o.tSec + o.durSec,
    );
    if (idx !== -1) setHighlightIndex(idx);
  }, [pitchTrail, pitchedOnsets]);

  const handleMicDeviceChange = useCallback((deviceId: string) => {
    writePreferredMicDeviceId(deviceId);
    setSelectedDeviceId(deviceId);
  }, []);

  useEffect(() => {
    setMicUi('starting');
    setMicLabel(null);
    startRef.current = performance.now();
    trailThrottleRef.current = 0;
    const input = new MicrophonePitchInput({
      onPitchDetected: (midi, _conf, info) => {
        const now = performance.now();
        if (now - trailThrottleRef.current < TRAIL_THROTTLE_MS) return;
        trailThrottleRef.current = now;
        const mRaw = info?.midi ?? midi ?? null;
        const traced = pitchTrackingEnabledRef.current ? mRaw : null;
        const t = (now - startRef.current) / 1000;
        setElapsedSec(t);
        onPitchSampleRef.current({ t, midi: traced });
      },
    });
    micRef.current = input;
    const rec = new PerformanceRecorder();
    recorderRef.current = rec;
    void (async () => {
      try {
        await input.start(selectedDeviceId);
        setMicUi('live');
        setMicLabel(input.getActiveInputLabel());
        try {
          const list = await MicrophonePitchInput.listDevices();
          setDevices(list);
        } catch {
          /* keep previous list */
        }
        const stream = input.getMediaStream();
        if (stream) rec.start(stream);
      } catch (e) {
        const denied =
          e instanceof DOMException &&
          (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError');
        setMicUi(denied ? 'denied' : 'error');
      }
    })();
    return () => {
      void rec.stop();
      input.stop();
      micRef.current = null;
      recorderRef.current = null;
    };
  }, [exercise, selectedDeviceId, micRetryNonce]);

  useEffect(() => {
    if (!ghostOn) {
      ghostRef.current?.stop();
      ghostRef.current = null;
      return;
    }
    let cancelled = false;
    void (async () => {
      const handle = await playGhostGuide({
        score: exercise.score,
        part: pickMelodyPart(exercise.score),
        transposeSemitones: 0,
        velocity: 0.32,
      });
      if (cancelled) {
        handle.stop();
        return;
      }
      ghostRef.current = handle;
    })();
    return () => {
      cancelled = true;
      ghostRef.current?.stop();
      ghostRef.current = null;
    };
  }, [exercise, ghostOn]);

  const handleStop = useCallback(async () => {
    let blob: Blob | null = null;
    if (recorderRef.current) blob = await recorderRef.current.stop();
    micRef.current?.stop();
    ghostRef.current?.stop();
    micRef.current = null;
    recorderRef.current = null;
    ghostRef.current = null;
    onStop(blob);
  }, [onStop]);

  const totalDur = layout?.totalDurSec ?? 0;
  const playheadProgress = totalDur > 0 ? Math.min(1, elapsedSec / totalDur) : 0;
  const lastSample = pitchTrail.length > 0 ? pitchTrail[pitchTrail.length - 1]! : null;
  const expectedNow =
    lastSample && lastSample.midi !== null ? expectedMidiAtSec(pitchedOnsets, lastSample.t) : null;
  const delta =
    lastSample && lastSample.midi !== null && expectedNow !== null
      ? Math.round(lastSample.midi - expectedNow)
      : null;

  return (
    <Stack spacing={1.25}>
      <MelodiaStaff
        score={exercise.score}
        showSolfege={helpLevel >= 3}
        solfegeOpacity={1}
        highlightIndex={highlightIndex}
        onLayout={setLayout}
      >
        {layout && <MelodiaPlayhead layout={layout} progress={playheadProgress} />}
        {layout && <MelodiaInkTrace layout={layout} pitchTrail={pitchTrail} elapsedSec={elapsedSec} />}
      </MelodiaStaff>

      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, m: 0 }}>
        Sing — out loud
      </Typography>
      <Typography variant="body2" className="melodia-ink-pink" sx={{ lineHeight: 1.5 }}>
        Sing the staff. We sketch your pitch in pink as you go.
      </Typography>

      <MelodiaMicBar
        status={micUi}
        activeInputLabel={micLabel}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={handleMicDeviceChange}
        pitchTrackingEnabled={pitchTrackingEnabled}
        onPitchTrackingChange={setPitchTrackingEnabled}
        onRetryCapture={() => setMicRetryNonce((n) => n + 1)}
      />

      {pitchTrackingEnabled && lastSample && lastSample.midi !== null && expectedNow !== null && (
        <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
          Heard <strong>{midiToNoteName(lastSample.midi)}</strong> · written{' '}
          <strong>{midiToNoteName(expectedNow)}</strong> ·{' '}
          {delta === 0
            ? 'on pitch'
            : delta !== null && delta > 0
              ? `${delta} st high`
              : `${Math.abs(delta ?? 0)} st low`}
        </Typography>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        {helpLevel >= 2 && (
          <Button
            variant={ghostOn ? 'contained' : 'outlined'}
            color="secondary"
            size="small"
            onClick={() => setGhostOn((v) => !v)}
          >
            Ghost tones {ghostOn ? 'on' : 'off'}
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" color="secondary" size="small" onClick={() => void handleStop()}>
          End &amp; review
        </Button>
      </Stack>
    </Stack>
  );
}
