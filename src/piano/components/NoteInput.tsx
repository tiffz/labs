import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { usePiano } from '../store';
import { scoreToAbc, abcToScore } from '../utils/abcNotation';

interface NoteInputProps {
  onImportClick?: () => void;
}

const NoteInput: React.FC<NoteInputProps> = ({ onImportClick }) => {
  const { state, dispatch } = usePiano();
  const isEditing = state.inputMode === 'step-input';
  const [abcExpanded, setAbcExpanded] = useState(false);
  const [abcText, setAbcText] = useState('');
  const [isUserEditing, setIsUserEditing] = useState(false);
  const userEditTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAbcFromScore = useMemo(() => {
    if (!state.score) return '';
    return scoreToAbc(state.score);
  }, [state.score]);

  // Sync score -> textbox whenever the score changes and the user isn't actively typing
  useEffect(() => {
    if (!isUserEditing) {
      setAbcText(currentAbcFromScore);
    }
  }, [currentAbcFromScore, isUserEditing]);

  // When ABC section is expanded, populate immediately
  useEffect(() => {
    if (abcExpanded) {
      setAbcText(currentAbcFromScore);
      setIsUserEditing(false);
    }
  }, [abcExpanded, currentAbcFromScore]);

  const handleAbcChange = useCallback((value: string) => {
    setAbcText(value);
    setIsUserEditing(true);

    if (userEditTimeoutRef.current) clearTimeout(userEditTimeoutRef.current);
    userEditTimeoutRef.current = setTimeout(() => {
      setIsUserEditing(false);
    }, 2000);

    if (!state.score) return;
    try {
      const newScore = abcToScore(value, state.score);
      dispatch({ type: 'SET_SCORE_FROM_ABC', score: newScore });
    } catch {
      // Don't update score on parse errors — user may be mid-edit
    }
  }, [state.score, dispatch]);

  useEffect(() => {
    return () => {
      if (userEditTimeoutRef.current) clearTimeout(userEditTimeoutRef.current);
    };
  }, []);

  const hasChanges = isEditing && state.editSnapshot && state.score &&
    JSON.stringify(state.score) !== JSON.stringify(state.editSnapshot);

  const handleEdit = () => {
    dispatch({ type: 'SET_INPUT_MODE', mode: 'step-input' });
  };
  const handleSave = () => {
    dispatch({ type: 'SET_INPUT_MODE', mode: 'select' });
  };
  const handleCancel = () => {
    if (hasChanges && !window.confirm('Discard unsaved changes?')) return;
    dispatch({ type: 'CANCEL_EDIT' });
  };

  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);

  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing, handleUndo, handleRedo]);

  return (
    <div className="note-input">
      <div className="input-toolbar">
        {!isEditing ? (
          <button
            className="btn btn-small"
            onClick={handleEdit}
            title="Edit notes"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
            Edit
          </button>
        ) : (
          <>
            <button className="btn btn-small btn-primary" onClick={handleSave} title="Save changes">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
              Save
            </button>
            <button className="btn btn-small" onClick={handleCancel} title="Discard changes">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              Cancel
            </button>
          </>
        )}

        {onImportClick && (
          <button
            className="btn btn-small"
            onClick={onImportClick}
            title="Import a music file (MusicXML, MIDI, MuseScore)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>
            Import
          </button>
        )}

        <div className="toolbar-spacer" />

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => dispatch({ type: 'SET_ZOOM', level: Math.round((state.zoomLevel - 0.1) * 10) / 10 })} title="Zoom out" disabled={state.zoomLevel <= 0.4}>
            <span className="material-symbols-outlined">remove</span>
          </button>
          <button
            className="zoom-level-btn"
            onClick={() => dispatch({ type: 'SET_ZOOM', level: 1.0 })}
            title="Reset to 100%"
            disabled={state.zoomLevel === 1.0}
          >
            {Math.round(state.zoomLevel * 100)}%
          </button>
          <button className="zoom-btn" onClick={() => dispatch({ type: 'SET_ZOOM', level: Math.round((state.zoomLevel + 0.1) * 10) / 10 })} title="Zoom in" disabled={state.zoomLevel >= 2.0}>
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        {isEditing && (
          <button
            className={`btn btn-small ${abcExpanded ? 'active' : ''}`}
            onClick={() => setAbcExpanded(v => !v)}
            title="Toggle ABC notation input"
          >
            ABC
          </button>
        )}

        {isEditing && !abcExpanded && (
          <span className="toolbar-hint">
            {state.durationMode === 'auto'
              ? 'Play keys to add notes — hold to set duration'
              : `Adding ${state.dotted ? 'dotted ' : ''}${state.durationMode} notes`
            }
          </span>
        )}
      </div>

      {isEditing && abcExpanded && (
        <div className="abc-input-section">
          <textarea
            className="abc-textarea"
            value={abcText}
            onChange={e => handleAbcChange(e.target.value)}
            onFocus={() => setIsUserEditing(true)}
            onBlur={() => {
              if (userEditTimeoutRef.current) clearTimeout(userEditTimeoutRef.current);
              setIsUserEditing(false);
              setAbcText(currentAbcFromScore);
            }}
            placeholder={'C D E F G A B c\nNotes: C-B (uppercase=low, lowercase=high octave)\nLengths: C2=half C4=whole C/2=eighth\nRests: z=quarter z2=half\nChords: [CEG]\nAccidentals: ^C=C# _B=Bb'}
            rows={4}
          />
          <span className="abc-hint">
            <a href="https://abcnotation.com/wiki/abc:standard:v2.1" target="_blank" rel="noopener noreferrer">ABC notation</a> —
            uppercase C–B = middle octave (C4–B4), lowercase c–b = octave above (C5–B5).
            Append <code>,</code> for lower octaves, <code>&apos;</code> for higher.
            Lengths: <code>C</code>=quarter, <code>C2</code>=half, <code>C4</code>=whole, <code>C/2</code>=eighth, <code>C/4</code>=16th.
            Dotted: <code>C3/2</code>=dotted quarter. Rests: <code>z</code>. Chords: <code>[CEG]</code>.
            Use <code>V:rh</code> / <code>V:lh</code> to separate treble and bass parts. Barlines: <code>|</code>.
          </span>
        </div>
      )}
    </div>
  );
};

export default NoteInput;
