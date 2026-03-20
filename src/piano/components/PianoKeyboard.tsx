import React, { useCallback, useRef, useEffect } from 'react';
import { usePiano } from '../store';
import type { NoteDuration } from '../types';

const WHITE_KEYS = [
  { note: 'C', midi: 0 }, { note: 'D', midi: 2 }, { note: 'E', midi: 4 },
  { note: 'F', midi: 5 }, { note: 'G', midi: 7 }, { note: 'A', midi: 9 }, { note: 'B', midi: 11 },
];
const BLACK_KEYS = [
  { note: 'C#', midi: 1, left: 1 }, { note: 'D#', midi: 3, left: 2 },
  { note: 'F#', midi: 6, left: 4 }, { note: 'G#', midi: 8, left: 5 }, { note: 'A#', midi: 10, left: 6 },
];

const OCTAVES = [3, 4, 5];

const DURATION_OPTIONS: { value: NoteDuration | 'auto'; label: string; noteSymbol: string; restSymbol: string }[] = [
  { value: 'auto',      label: 'Auto-detect (hold keys to set length)', noteSymbol: 'Auto', restSymbol: '𝄽' },
  { value: 'whole',     label: 'Whole note',     noteSymbol: '𝅝',  restSymbol: '𝄻' },
  { value: 'half',      label: 'Half note',      noteSymbol: '𝅗𝅥',  restSymbol: '𝄼' },
  { value: 'quarter',   label: 'Quarter note',   noteSymbol: '𝅘𝅥',  restSymbol: '𝄽' },
  { value: 'eighth',    label: 'Eighth note',    noteSymbol: '𝅘𝅥𝅮',  restSymbol: '𝄾' },
  { value: 'sixteenth', label: 'Sixteenth note',  noteSymbol: '𝅘𝅥𝅯',  restSymbol: '𝄿' },
];

function holdToDuration(holdMs: number, tempo: number): NoteDuration {
  const beatMs = 60000 / tempo;
  const holdBeats = holdMs / beatMs;
  if (holdBeats >= 3) return 'whole';
  if (holdBeats >= 1.5) return 'half';
  if (holdBeats >= 0.75) return 'quarter';
  if (holdBeats >= 0.375) return 'eighth';
  return 'sixteenth';
}

function getRestSymbol(mode: 'auto' | NoteDuration): string {
  const opt = DURATION_OPTIONS.find(d => d.value === mode);
  return opt?.restSymbol ?? '𝄽';
}

const PianoKeyboard: React.FC = () => {
  const { state, dispatch, engine } = usePiano();
  const holdTimers = useRef<Map<number, number>>(new Map());
  const chordBuffer = useRef<{ notes: number[]; timer: number | null }>({ notes: [], timer: null });
  const releaseBuffer = useRef<{ notes: { midi: number; startTime: number }[]; timer: number | null }>({ notes: [], timer: null });

  const handleNoteOn = useCallback((midi: number) => {
    dispatch({ type: 'ADD_MIDI_NOTE', note: midi });
    engine.playNote(midi);

    if (state.inputMode === 'step-input') {
      if (state.durationMode === 'auto') {
        holdTimers.current.set(midi, Date.now());
      } else {
        chordBuffer.current.notes.push(midi);
        if (chordBuffer.current.timer !== null) clearTimeout(chordBuffer.current.timer);
        chordBuffer.current.timer = window.setTimeout(() => {
          const notes = chordBuffer.current.notes;
          chordBuffer.current.notes = [];
          chordBuffer.current.timer = null;
          if (notes.length === 1) {
            dispatch({ type: 'STEP_INPUT_NOTE', midi: notes[0] });
          } else if (notes.length > 1) {
            dispatch({ type: 'STEP_INPUT_CHORD', midis: notes });
          }
        }, 80);
      }
    }
  }, [dispatch, engine, state.inputMode, state.durationMode]);

  const handleNoteOff = useCallback((midi: number) => {
    dispatch({ type: 'REMOVE_MIDI_NOTE', note: midi });

    if (state.inputMode === 'step-input' && state.durationMode === 'auto') {
      const startTime = holdTimers.current.get(midi);
      holdTimers.current.delete(midi);
      if (startTime !== undefined) {
        releaseBuffer.current.notes.push({ midi, startTime });
        if (releaseBuffer.current.timer !== null) clearTimeout(releaseBuffer.current.timer);
        releaseBuffer.current.timer = window.setTimeout(() => {
          const buffered = releaseBuffer.current.notes;
          releaseBuffer.current.notes = [];
          releaseBuffer.current.timer = null;
          const earliestStart = Math.min(...buffered.map(n => n.startTime));
          const holdMs = Date.now() - earliestStart;
          const duration = holdToDuration(holdMs, state.tempo);
          if (buffered.length === 1) {
            dispatch({ type: 'STEP_INPUT_NOTE', midi: buffered[0].midi, duration });
          } else if (buffered.length > 1) {
            dispatch({ type: 'STEP_INPUT_CHORD', midis: buffered.map(n => n.midi), duration });
          }
        }, 80);
      }
    }
  }, [dispatch, state.inputMode, state.durationMode, state.tempo]);

  useEffect(() => {
    if (state.inputMode !== 'step-input' || state.durationMode !== 'auto') {
      dispatch({ type: 'SET_GHOST_NOTES', notes: [] });
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(holdTimers.current.entries());
      if (entries.length === 0) {
        dispatch({ type: 'SET_GHOST_NOTES', notes: [] });
        return;
      }
      dispatch({
        type: 'SET_GHOST_NOTES',
        notes: entries.map(([midi, startTime]) => ({
          midi,
          duration: holdToDuration(now - startTime, state.tempo),
        })),
      });
    }, 200);
    return () => {
      clearInterval(interval);
      dispatch({ type: 'SET_GHOST_NOTES', notes: [] });
    };
  }, [state.inputMode, state.durationMode, state.tempo, dispatch]);

  const handleRestClick = useCallback(() => {
    dispatch({ type: 'STEP_INPUT_REST' });
  }, [dispatch]);

  const handleDurationChange = useCallback((dur: NoteDuration | 'auto') => {
    dispatch({ type: 'SET_DURATION_MODE', mode: dur });
    if (dur !== 'auto') {
      dispatch({ type: 'SET_SELECTED_DURATION', duration: dur });
    }
  }, [dispatch]);

  const handleDottedToggle = useCallback(() => {
    dispatch({ type: 'SET_DOTTED', dotted: !state.dotted });
  }, [dispatch, state.dotted]);

  return (
    <div className="piano-keyboard">
      <div className="keyboard-toolbar">
        <div className="duration-selector">
          {DURATION_OPTIONS.map(d => (
            <button
              key={d.value}
              className={`dur-btn ${state.durationMode === d.value ? 'active' : ''}`}
              onClick={() => handleDurationChange(d.value)}
              title={d.label}
            >
              {d.value === 'auto' ? d.noteSymbol : <span className="note-symbol">{d.noteSymbol}</span>}
            </button>
          ))}
          <button
            className={`dur-btn dotted-btn ${state.dotted ? 'active' : ''}`}
            onClick={handleDottedToggle}
            title="Dotted note (1.5× duration)"
            disabled={state.durationMode === 'auto'}
          >
            <span className="dot-indicator">.</span>
          </button>
        </div>

        <button
          className="btn btn-small rest-btn"
          onClick={handleRestClick}
          title="Insert rest"
        >
          <span className="note-symbol" style={{ fontSize: '1.1rem' }}>{getRestSymbol(state.durationMode)}</span>
          Rest
        </button>

        <div className="edit-actions">
          <button className="btn btn-small" onClick={() => dispatch({ type: 'UNDO' })} title="Undo (Ctrl+Z)">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>undo</span>
          </button>
          <button className="btn btn-small" onClick={() => dispatch({ type: 'REDO' })} title="Redo (Ctrl+Shift+Z)">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>redo</span>
          </button>
          <button className="btn btn-small" onClick={() => dispatch({ type: 'DELETE_LAST_NOTE' })} title="Delete last note">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>backspace</span>
          </button>
          <button className="btn btn-small" onClick={() => dispatch({ type: 'CLEAR_ALL_NOTES' })} title="Clear all notes">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_sweep</span>
          </button>
        </div>
      </div>

      <span className="keyboard-hint">
        Notes below C4 → bass clef · C4 and above → treble clef
        {state.durationMode === 'auto' && ' · Hold keys to set duration'}
      </span>

      <div className="keyboard-container">
        {OCTAVES.map(octave => (
          <div key={octave} className="octave-group">
            {WHITE_KEYS.map(k => {
              const midi = (octave + 1) * 12 + k.midi;
              const active = state.activeMidiNotes.has(midi);
              const isBass = midi < 60;
              return (
                <button
                  key={midi}
                  className={`white-key ${active ? 'active' : ''} ${isBass ? 'bass-range' : ''}`}
                  onMouseDown={() => handleNoteOn(midi)}
                  onMouseUp={() => handleNoteOff(midi)}
                  onMouseLeave={() => handleNoteOff(midi)}
                >
                  <span className="key-label">{k.note}{octave}</span>
                </button>
              );
            })}
            {BLACK_KEYS.map(k => {
              const midi = (octave + 1) * 12 + k.midi;
              const active = state.activeMidiNotes.has(midi);
              const leftPct = ((k.left - 0.5) / 7) * 100;
              return (
                <button
                  key={midi}
                  className={`black-key ${active ? 'active' : ''}`}
                  style={{ left: `${leftPct}%` }}
                  onMouseDown={() => handleNoteOn(midi)}
                  onMouseUp={() => handleNoteOff(midi)}
                  onMouseLeave={() => handleNoteOff(midi)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PianoKeyboard;
