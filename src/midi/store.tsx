import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { getMidiInput } from '../shared/midi/midiInput';
import { MetronomeEngine } from '../shared/audio/metronome/MetronomeEngine';
import { LookAheadAudioScheduler } from '../shared/audio/platform/scheduling/LookAheadAudioScheduler';
import { toMetronomeEngineConfig } from '../shared/audio/platform/metronome/toMetronomeEngineConfig';
import { getMidiMetronomePreferences } from './metronomePreferencesBridge';
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
import { collectDueLoopNotes, type LoopScheduleCursor } from './loopScheduler';
import { midiMatchesRiffStep } from './guide/riffGuideEngine';
import { MidiContext, type MidiContextValue } from './midiContext';

function buildMetronomeConfig(transport: TransportConfig) {
  return toMetronomeEngineConfig(
    getMidiMetronomePreferences(),
    transport.bpm,
    transport.timeSignature,
  );
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
  const loopSchedulerRef = useRef<LookAheadAudioScheduler | null>(null);
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
    loopSchedulerRef.current?.stop();
    synthRef.current?.stopAll();
    dispatch({ type: 'SET_LOOP_PLAYING', playing: false });
  }, []);

  const scheduleLoopPlayback = useCallback(() => {
    stopLoopPlayback();
    const s = stateRef.current;
    const loop = s.capturedLoop;
    if (!loop) return;
    const notes = [...selectPerformanceNotes(s)].sort((a, b) => a.startMs - b.startMs);
    if (notes.length === 0) return;

    if (!synthRef.current) {
      synthRef.current = new MidiMonitor();
    }
    const synth = synthRef.current;
    const rate = s.transport.playbackRate;
    const loopDurationMs = msPerBar(s) * loop.barCount / rate;
    if (!(loopDurationMs > 0)) return;

    dispatch({ type: 'SET_LOOP_PLAYING', playing: true });

    if (!loopSchedulerRef.current) {
      loopSchedulerRef.current = new LookAheadAudioScheduler();
    }
    const epochPerfMs = performance.now() + 50;
    const cursor: LoopScheduleCursor = { iteration: 0, noteIndex: 0 };
    loopSchedulerRef.current.start((horizonSec) => {
      const due = collectDueLoopNotes(
        cursor,
        notes,
        epochPerfMs,
        loopDurationMs,
        rate,
        horizonSec * 1000,
      );
      for (const note of due) {
        synth.scheduleMidiNoteAt(note.midi, note.velocity, note.targetPerfMs, note.durationMs / 1000);
      }
    });
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

  const syncMetronomePreferences = useCallback(() => {
    const engine = metronomeRef.current;
    if (!engine || !stateRef.current.metronomePlaying) return;
    const transport = stateRef.current.transport;
    const cfg = toMetronomeEngineConfig(
      getMidiMetronomePreferences(),
      transport.bpm,
      transport.timeSignature,
    );
    engine.setTempo(cfg.bpm);
    engine.setTimeSignature(cfg.timeSignature);
    engine.setSubdivisionLevel(cfg.subdivisionLevel ?? subdivisionToLevel(transport.subdivision));
    engine.setVoiceMode(cfg.voiceMode ?? 'counting');
    if (cfg.voiceGain !== undefined) engine.setVoiceGain(cfg.voiceGain);
    if (cfg.clickGain !== undefined) engine.setClickGain(cfg.clickGain);
    if (cfg.drumGain !== undefined) engine.setDrumGain(cfg.drumGain);
    engine.setSubdivisionVolumes(cfg.volumes);
  }, []);

  useEffect(() => {
    if (!state.metronomePlaying || !metronomeRef.current) return;
    syncMetronomePreferences();
  }, [
    state.transport.bpm,
    state.transport.timeSignature,
    state.transport.subdivision,
    state.metronomePlaying,
    syncMetronomePreferences,
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
      metronomeRef.current?.dispose();
      metronomeRef.current = null;
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
      syncMetronomePreferences,
    }),
    [
      state,
      captureLastBars,
      toggleMetronome,
      toggleLoopPlayback,
      toggleMidiDevice,
      startGuide,
      stopGuide,
      syncMetronomePreferences,
    ],
  );

  return <MidiContext.Provider value={value}>{children}</MidiContext.Provider>;
}
