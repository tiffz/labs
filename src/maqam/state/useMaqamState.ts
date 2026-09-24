import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getMidiInput } from '../../shared/midi/midiInput';
import type { MidiDevice } from '../../shared/music/scoreTypes';
import { throttledReplaceState } from '../../shared/utils/urlHistory';
import { MaqamSynth, detuneForMidiNote } from '../audio/maqamSynth';
import {
  findMaqamPreset,
  deriveDetuneMatrix,
  type DetuneMatrix,
  type MaqamPreset,
} from '../data/maqamPresets';
import {
  buildKeyTunings,
  matrixMatchesPreset,
  toggleDetuneSlot,
  type KeyTuning,
} from './maqamTuning';
import { readMaqamUrlState, writeMaqamUrlSearch } from './maqamUrlState';
import {
  DEFAULT_MELODY_ID,
  GENERATED_MELODY_ID,
  findMelodyDefinition,
  generateMelody,
  resolveMelody,
  type ResolvedMelodyNote,
} from '../melody/maqamMelody';
import { buildMelodyTimeline, noteIndexAt } from '../melody/melodyTimeline';

/** Written octave the melodies sit in — the one starting at middle C. */
const MELODY_OCTAVE = 4;
/** Unhurried enough to hear a quarter-tone land. */
export const MELODY_BPM = 76;
/** Lead-in before the first note, so the attack is never clipped by scheduling. */
const PLAYBACK_LEAD_SECONDS = 0.12;

export interface MaqamState {
  melodyId: string;
  melodySeed: number;
  melody: ResolvedMelodyNote[];
  isPlaying: boolean;
  /** Index into `melody` of the note sounding now, or null when silent. */
  playingIndex: number | null;
  selectMelody: (id: string) => void;
  shuffleMelody: () => void;
  togglePlayback: () => void;
  preset: MaqamPreset | undefined;
  presetId: string;
  matrix: DetuneMatrix;
  /** False once the user edits the matrix away from the preset. */
  isPresetTuning: boolean;
  keyTunings: KeyTuning[];
  activeNotes: Set<number>;
  midiDevices: MidiDevice[];
  midiSupported: boolean;
  audioState: AudioContextState | 'uninitialized';
  selectPreset: (id: string) => void;
  toggleSlot: (pitchClass: number) => void;
  resetTuning: () => void;
  noteOn: (midiNote: number) => void;
  noteOff: (midiNote: number) => void;
}

export function useMaqamState(): MaqamState {
  const initial = useMemo(
    () => readMaqamUrlState(typeof window === 'undefined' ? '' : window.location.search),
    [],
  );

  const [presetId, setPresetId] = useState(initial.presetId);
  const [matrix, setMatrix] = useState<DetuneMatrix>(initial.matrix);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(() => new Set());
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);
  const [midiSupported, setMidiSupported] = useState(false);
  const [audioState, setAudioState] = useState<AudioContextState | 'uninitialized'>(
    'uninitialized',
  );
  const [melodyId, setMelodyId] = useState(initial.melodyId);
  const [melodySeed, setMelodySeed] = useState(initial.melodySeed);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const preset = useMemo(() => findMaqamPreset(presetId), [presetId]);
  const synthRef = useRef<MaqamSynth | null>(null);

  /**
   * Built on demand, never in the render body.
   *
   * StrictMode runs an effect's cleanup once immediately after mount, so a
   * synth created during render and disposed by that cleanup is gone before the
   * first keypress — and nothing re-renders to rebuild it, because a ref is not
   * state. Every note was silently inaudible. Creating it lazily here means the
   * StrictMode teardown is harmless: the next note rebuilds it.
   */
  const getSynth = useCallback((): MaqamSynth => {
    if (!synthRef.current) synthRef.current = new MaqamSynth();
    return synthRef.current;
  }, []);

  /**
   * The matrix is read inside `noteOn`, which Web MIDI calls from outside
   * React. A ref keeps that callback identity-stable, so the MIDI subscription
   * is installed once rather than re-installed on every retuning.
   *
   * Synced in an effect, not during render: writing a ref while rendering is
   * what `react-hooks/refs` forbids, and under concurrent rendering a render
   * that React throws away would still have mutated it.
   */
  const matrixRef = useRef(matrix);
  useEffect(() => {
    matrixRef.current = matrix;
  }, [matrix]);

  /** Animation frame that moves the playback highlight. */
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      synthRef.current?.dispose();
      synthRef.current = null;
    },
    [],
  );

  const noteOn = useCallback(
    (midiNote: number) => {
      const cents = detuneForMidiNote(midiNote, matrixRef.current);

      // Visual state first, and unconditionally. A blocked or exhausted
      // AudioContext must not also cost the user the keyboard highlight and the
      // staff — the app still teaches the notation when the sound is gone.
      setActiveNotes((prev) => {
        if (prev.has(midiNote)) return prev;
        const next = new Set(prev);
        next.add(midiNote);
        return next;
      });
      const synth = getSynth();
      void synth.resume().then(() => setAudioState(synth.getState()));
      synth.noteOn(midiNote, cents);
      setAudioState(synth.getState());
    },
    [getSynth],
  );

  const stopPlayback = useCallback(() => {
    synthRef.current?.cancelScheduled();
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setIsPlaying(false);
    setPlayingIndex(null);
  }, []);

  const noteOff = useCallback((midiNote: number) => {
    synthRef.current?.noteOff(midiNote);
    setActiveNotes((prev) => {
      if (!prev.has(midiNote)) return prev;
      const next = new Set(prev);
      next.delete(midiNote);
      return next;
    });
  }, []);

  // Web MIDI. Installed once; the note callback reads the live matrix by ref.
  useEffect(() => {
    let cancelled = false;
    const input = getMidiInput();
    void input.init().then((ok) => {
      if (cancelled) return;
      setMidiSupported(ok);
      if (!ok) return;
      input.onNote((type, note) => {
        if (type === 'noteon') noteOn(note);
        else noteOff(note);
      });
      input.onConnection((_connected, devices) => {
        if (!cancelled) setMidiDevices(devices);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [noteOn, noteOff]);

  const selectPreset = useCallback(
    (id: string) => {
      const next = findMaqamPreset(id);
      if (!next) return;
      // Retuning mid-note would leave a voice sounding at its old pitch with no
      // key held down, and a phrase mid-flight would keep playing the previous
      // maqam's tuning under the new maqam's staff. Both stop here, in the
      // handler — reacting to `presetId` in an effect instead is the
      // `set-state-in-effect` pattern, and it sets the same state a frame late.
      stopPlayback();
      synthRef.current?.allNotesOff();
      setActiveNotes(new Set());
      setPresetId(next.id);
      setMatrix(deriveDetuneMatrix(next.scaleDegrees).matrix);
    },
    [stopPlayback],
  );

  const toggleSlot = useCallback((pitchClass: number) => {
    synthRef.current?.allNotesOff();
    setActiveNotes(new Set());
    setMatrix((prev) => toggleDetuneSlot(prev, pitchClass));
  }, []);

  const resetTuning = useCallback(() => {
    synthRef.current?.allNotesOff();
    setActiveNotes(new Set());
    setMatrix(() => {
      const current = findMaqamPreset(presetId);
      return current ? deriveDetuneMatrix(current.scaleDegrees).matrix : [];
    });
  }, [presetId]);

  const melody = useMemo<ResolvedMelodyNote[]>(() => {
    if (!preset) return [];
    const notes =
      melodyId === GENERATED_MELODY_ID
        ? generateMelody(preset, melodySeed)
        : (findMelodyDefinition(melodyId) ?? findMelodyDefinition(DEFAULT_MELODY_ID))?.build(
            preset,
          ) ?? [];
    return resolveMelody(preset, notes, MELODY_OCTAVE);
  }, [preset, melodyId, melodySeed]);

  /**
   * Play the phrase.
   *
   * The whole melody is scheduled on the audio clock up front — it is a known,
   * finite sequence of a couple of dozen notes, so there is nothing to gain from
   * a look-ahead scheduler and nothing to lose to a blocked main thread. The
   * animation frame below only *reads* that timeline to move the highlight; it
   * never decides when a note sounds, so the staff cannot drift from the ear.
   */
  const startPlayback = useCallback(() => {
    const synth = getSynth();
    if (melody.length === 0) return;

    void synth.resume().then((running) => {
      setAudioState(synth.getState());
      const now = synth.currentTime();
      if (!running || now === null) return;

      const timeline = buildMelodyTimeline(melody, MELODY_BPM);
      const startAt = now + PLAYBACK_LEAD_SECONDS;
      melody.forEach((note, index) => {
        const entry = timeline.entries[index];
        synth.scheduleNote(
          note.midiNote,
          note.cents,
          startAt + entry.startSeconds,
          entry.holdSeconds,
        );
      });

      setIsPlaying(true);
      const tick = () => {
        const clock = synth.currentTime();
        if (clock === null) {
          stopPlayback();
          return;
        }
        const elapsed = clock - startAt;
        if (elapsed >= timeline.totalSeconds) {
          stopPlayback();
          return;
        }
        setPlayingIndex(noteIndexAt(timeline, elapsed));
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    });
  }, [getSynth, melody, stopPlayback]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  }, [isPlaying, startPlayback, stopPlayback]);

  const selectMelody = useCallback(
    (id: string) => {
      stopPlayback();
      setMelodyId(id);
    },
    [stopPlayback],
  );

  const shuffleMelody = useCallback(() => {
    stopPlayback();
    setMelodyId(GENERATED_MELODY_ID);
    // A fresh seed, kept in the URL so a phrase you like survives a reload.
    setMelodySeed(Math.floor(Math.random() * 1_000_000) + 1);
  }, [stopPlayback]);

  // Unmount only. Returning the function schedules it as cleanup rather than
  // calling it during the effect.
  useEffect(() => stopPlayback, [stopPlayback]);

  // Keep the URL shareable. Replace, never push: retuning a key is not a
  // navigation, and a back button that steps through every toggle is a trap.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = writeMaqamUrlSearch(
      { presetId, matrix, melodyId, melodySeed },
      window.location.search,
    );
    throttledReplaceState(`${window.location.pathname}${search}${window.location.hash}`);
  }, [presetId, matrix, melodyId, melodySeed]);

  const keyTunings = useMemo(() => buildKeyTunings(preset, matrix), [preset, matrix]);
  const isPresetTuning = useMemo(
    () => (preset ? matrixMatchesPreset(matrix, preset) : false),
    [matrix, preset],
  );

  return {
    preset,
    presetId,
    matrix,
    isPresetTuning,
    keyTunings,
    activeNotes,
    midiDevices,
    midiSupported,
    audioState,
    selectPreset,
    toggleSlot,
    resetTuning,
    noteOn,
    noteOff,
    melodyId,
    melodySeed,
    melody,
    isPlaying,
    playingIndex,
    selectMelody,
    shuffleMelody,
    togglePlayback,
  };
}
