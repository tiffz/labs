import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { getMidiInput } from '../shared/midi/midiInput';
import { MetronomeEngine } from '../shared/audio/metronome/MetronomeEngine';
import type { SubdivisionVolumes } from '../shared/audio/metronome/types';
import { MidiMonitor } from './monitor/midiMonitor';
import { RollingMidiBuffer } from './buffer/rollingMidiBuffer';
import {
  readPersistedCaptureBars,
  readPersistedMode,
  readPersistedStrictness,
  readPersistedTransport,
  writePersistedCaptureBars,
  writePersistedMode,
  writePersistedStrictness,
  writePersistedTransport,
} from './storage';
import { buildInitialState, midiReducer, subdivisionToLevel } from './storeTypes';
import type { CapturedLoop, TransportConfig } from './types';
import { msPerBar, selectPerformanceNotes } from './selectors';
import { midiMatchesRiffStep } from './guide/riffGuideEngine';
import { MidiContext, type MidiContextValue } from './midiContext';

const DEFAULT_VOLUMES: SubdivisionVolumes = {
  accent: 1,
  quarter: 0.85,
  eighth: 0.5,
  sixteenth: 0,
};

function buildMetronomeConfig(transport: TransportConfig) {
  return {
    bpm: transport.bpm,
    timeSignature: transport.timeSignature,
    volumes: DEFAULT_VOLUMES,
    subdivisionLevel: subdivisionToLevel(transport.subdivision),
    voiceGain: 0,
    clickGain: 0.6,
    drumGain: 0,
  };
}

export function MidiProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(midiReducer, undefined, () => ({
    ...buildInitialState(),
    transport: readPersistedTransport(),
    notationStrictness: readPersistedStrictness(),
    captureBarCount: readPersistedCaptureBars(),
    mode: readPersistedMode(),
  }));

  const stateRef = useRef(state);
  stateRef.current = state;
  const disabledDeviceIdsRef = useRef(state.disabledMidiDeviceIds);
  disabledDeviceIdsRef.current = state.disabledMidiDeviceIds;

  const bufferRef = useRef(new RollingMidiBuffer());
  const metronomeRef = useRef<MetronomeEngine | null>(null);
  const synthRef = useRef<MidiMonitor | null>(null);
  const loopTimersRef = useRef<number[]>([]);
  const guideBeatCounterRef = useRef(0);
  const guideExpectedMsRef = useRef<number | null>(null);

  useEffect(() => {
    writePersistedTransport(state.transport);
  }, [state.transport]);

  useEffect(() => {
    writePersistedStrictness(state.notationStrictness);
  }, [state.notationStrictness]);

  useEffect(() => {
    writePersistedCaptureBars(state.captureBarCount);
  }, [state.captureBarCount]);

  useEffect(() => {
    writePersistedMode(state.mode);
  }, [state.mode]);

  const stopLoopPlayback = useCallback(() => {
    loopTimersRef.current.forEach((id) => window.clearTimeout(id));
    loopTimersRef.current = [];
    synthRef.current?.stopAll();
    dispatch({ type: 'SET_LOOP_PLAYING', playing: false });
  }, []);

  const scheduleLoopPlayback = useCallback(() => {
    stopLoopPlayback();
    const s = stateRef.current;
    const loop = s.capturedLoop;
    if (!loop) return;
    const notes = selectPerformanceNotes(s);
    if (notes.length === 0) return;

    if (!synthRef.current) {
      synthRef.current = new MidiMonitor();
    }
    const synth = synthRef.current;
    const rate = s.transport.playbackRate;
    const loopDurationMs =
      msPerBar(s) * loop.barCount / rate;

    dispatch({ type: 'SET_LOOP_PLAYING', playing: true });

    const playOnce = () => {
      const now = performance.now();
      for (const note of notes) {
        const startMs = note.startMs / rate;
        const durMs = note.durationMs / rate;
        const delay = startMs;
        const timerId = window.setTimeout(() => {
          synth.playMidiNote(note.midi, note.velocity);
          window.setTimeout(() => synth.stopMidiNote(), durMs);
        }, delay);
        loopTimersRef.current.push(timerId);
      }
      const loopTimer = window.setTimeout(() => {
        if (stateRef.current.loopPlaying) playOnce();
      }, loopDurationMs);
      loopTimersRef.current.push(loopTimer);
      void now;
    };
    playOnce();
  }, [stopLoopPlayback]);

  const toggleLoopPlayback = useCallback(() => {
    if (stateRef.current.loopPlaying) {
      stopLoopPlayback();
    } else {
      scheduleLoopPlayback();
    }
  }, [scheduleLoopPlayback, stopLoopPlayback]);

  const startMetronome = useCallback(async () => {
    if (!metronomeRef.current) {
      metronomeRef.current = new MetronomeEngine();
    }
    const engine = metronomeRef.current;
    engine.onBeat((evt) => {
      if (evt.isGroupStart || evt.subdivision === 'accent' || evt.subdivision === 'quarter') {
        dispatch({ type: 'SET_CURRENT_BEAT', beat: evt.measureBeat + 1 });
      }

      const s = stateRef.current;
      if (s.mode === 'guide' && s.guideRunning && s.activeRiff) {
        guideBeatCounterRef.current += 1;
        const beatsPerStep = Math.max(1, s.activeRiff.beatsPerStep);
        if (guideBeatCounterRef.current % beatsPerStep === 1) {
          const stepIdx = s.guideStepIndex ?? 0;
          dispatch({ type: 'SET_GUIDE_STEP_INDEX', index: stepIdx });
          guideExpectedMsRef.current = performance.now();
          const step = s.activeRiff.steps[stepIdx];
          if (step && synthRef.current) {
            for (const midi of step.pitches) {
              synthRef.current.playMidiNote(midi, 0.35);
              window.setTimeout(() => synthRef.current?.stopMidiNote(), 120);
            }
          }
        }
      }
    });

    await engine.start(buildMetronomeConfig(stateRef.current.transport));
    dispatch({ type: 'SET_METRONOME_PLAYING', playing: true });
  }, []);

  const stopMetronome = useCallback(() => {
    metronomeRef.current?.stop();
    dispatch({ type: 'SET_METRONOME_PLAYING', playing: false });
  }, []);

  const toggleMetronome = useCallback(async () => {
    if (stateRef.current.metronomePlaying) {
      stopMetronome();
    } else {
      await startMetronome();
    }
  }, [startMetronome, stopMetronome]);

  const captureLastBars = useCallback(() => {
    const s = stateRef.current;
    const perfMs = performance.now();
    const barMs = msPerBar(s);
    const events = bufferRef.current.sliceLastBars(perfMs, s.captureBarCount, barMs);
    const loop: CapturedLoop = {
      id: crypto.randomUUID(),
      capturedAt: perfMs,
      barCount: s.captureBarCount,
      transportSnapshot: { ...s.transport },
      loopStartPerfMs: perfMs - s.captureBarCount * barMs,
      loopEndPerfMs: perfMs,
      events,
    };
    dispatch({ type: 'CAPTURE_LAST_BARS', loop });
  }, []);

  const startGuide = useCallback(async () => {
    guideBeatCounterRef.current = 0;
    dispatch({ type: 'SET_GUIDE_RUNNING', running: true });
    if (!stateRef.current.metronomePlaying) {
      await startMetronome();
    }
  }, [startMetronome]);

  const stopGuide = useCallback(() => {
    dispatch({ type: 'SET_GUIDE_RUNNING', running: false });
    guideExpectedMsRef.current = null;
  }, []);

  const toggleMidiDevice = useCallback((deviceId: string) => {
    dispatch({ type: 'TOGGLE_MIDI_DEVICE', deviceId });
  }, []);

  useEffect(() => {
    if (!state.metronomePlaying || !metronomeRef.current) return;
    const engine = metronomeRef.current;
    engine.setTempo(state.transport.bpm);
    engine.setTimeSignature(state.transport.timeSignature);
    engine.setSubdivisionLevel(subdivisionToLevel(state.transport.subdivision));
  }, [
    state.transport.bpm,
    state.transport.timeSignature,
    state.transport.subdivision,
    state.metronomePlaying,
  ]);

  useEffect(() => {
    const midi = getMidiInput();

    midi.onNote((type, note, velocity, _timestamp, deviceId) => {
      if (disabledDeviceIdsRef.current.has(deviceId)) return;
      const perfMs = performance.now();
      const s = stateRef.current;
      if (type === 'noteon') {
        bufferRef.current.append('noteon', note, velocity, perfMs, deviceId);
        dispatch({ type: 'MIDI_NOTE_ON', midi: note });

        if (s.monitorSoundEnabled) {
          if (!synthRef.current) synthRef.current = new MidiMonitor();
          synthRef.current.playMidiNote(note, velocity);
        }

        if (
          s.mode === 'guide'
          && s.guideRunning
          && s.activeRiff
          && s.guideStepIndex !== null
          && guideExpectedMsRef.current !== null
        ) {
          const step = s.activeRiff.steps[s.guideStepIndex];
          if (
            midiMatchesRiffStep(note, step, perfMs, guideExpectedMsRef.current)
          ) {
            const next = (s.guideStepIndex + 1) % s.activeRiff.steps.length;
            dispatch({ type: 'GUIDE_STEP_MATCHED', nextIndex: next });
            guideExpectedMsRef.current = null;
          }
        }
      } else {
        bufferRef.current.append('noteoff', note, 0, perfMs, deviceId);
        dispatch({ type: 'MIDI_NOTE_OFF', midi: note });
        synthRef.current?.stopMidiNote();
      }
    });

    midi.onConnection((_connected, devices) => {
      dispatch({ type: 'SET_MIDI_DEVICES', devices });
    });

    void midi.init();

    return () => {
      stopLoopPlayback();
      stopMetronome();
    };
  }, [stopLoopPlayback, stopMetronome]);

  const value = useMemo(
    (): MidiContextValue => ({
      state,
      dispatch,
      captureLastBars,
      toggleMetronome,
      toggleLoopPlayback,
      toggleMidiDevice,
      startGuide,
      stopGuide,
    }),
    [
      state,
      captureLastBars,
      toggleMetronome,
      toggleLoopPlayback,
      toggleMidiDevice,
      startGuide,
      stopGuide,
    ],
  );

  return <MidiContext.Provider value={value}>{children}</MidiContext.Provider>;
}
