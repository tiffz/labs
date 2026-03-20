import React, { useEffect, useCallback } from 'react';
import { usePiano } from '../store';

const NoteInput: React.FC = () => {
  const { state, dispatch } = usePiano();
  const isEditing = state.inputMode === 'step-input';
  const [abcExpanded, setAbcExpanded] = React.useState(false);

  const toggleEdit = () => {
    dispatch({ type: 'SET_INPUT_MODE', mode: isEditing ? 'select' : 'step-input' });
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
        <button
          className={`btn btn-small ${isEditing ? 'active' : ''}`}
          onClick={toggleEdit}
          title={isEditing ? 'Exit edit mode' : 'Edit notes'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
          {isEditing ? 'Done' : 'Edit'}
        </button>

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
            placeholder={'C D E F G A B c\nNotes: C-B (uppercase=low octave, lowercase=high)\nLengths: C2=half C4=whole C/2=eighth\nRests: z=quarter z2=half\nAccidentals: ^C=C# _B=Bb =C=natural'}
            rows={3}
          />
          <span className="abc-hint">
            <a href="https://abcnotation.com/wiki/abc:standard:v2.1" target="_blank" rel="noopener noreferrer">ABC notation</a> is
            a text format for music. Uppercase = middle octave, lowercase = octave above. Append 2/4/8 for duration, / for shorter. Use z for rests.
          </span>
        </div>
      )}
    </div>
  );
};

export default NoteInput;
