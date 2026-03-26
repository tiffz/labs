import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { usePiano } from '../store';
import { scoreToAbc, abcToScore } from '../utils/abcNotation';

interface NoteInputProps {
  onImportClick?: () => void;
  onJumpToSelection?: () => void;
}

const NoteInput: React.FC<NoteInputProps> = ({ onImportClick, onJumpToSelection }) => {
  const { state, dispatch } = usePiano();
  const isEditing = state.inputMode === 'step-input';
  const [abcExpanded, setAbcExpanded] = useState(false);
  const [abcText, setAbcText] = useState('');
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [sectionsMenuOpen, setSectionsMenuOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<'saved' | 'exists' | null>(null);
  const [saveToastStyle, setSaveToastStyle] = useState<React.CSSProperties | undefined>(undefined);
  const userEditTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsMenuRef = useRef<HTMLDivElement | null>(null);
  const saveSectionButtonRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    if (!sectionsMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!sectionsMenuRef.current) return;
      const target = event.target as Node | null;
      if (target && sectionsMenuRef.current.contains(target)) return;
      setSectionsMenuOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [sectionsMenuOpen]);

  useEffect(() => {
    if (!saveFeedback) return;
    const timeout = window.setTimeout(() => setSaveFeedback(null), 1700);
    return () => window.clearTimeout(timeout);
  }, [saveFeedback]);

  const updateSaveToastPosition = useCallback(() => {
    const button = saveSectionButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const toastWidth = 170;
    const left = Math.max(12, Math.min(window.innerWidth - toastWidth - 12, rect.left - 18));
    const top = rect.bottom + 8;
    setSaveToastStyle({ left, top, right: 'auto' });
  }, []);

  useEffect(() => {
    if (!saveFeedback) return;
    updateSaveToastPosition();
    const onReposition = () => updateSaveToastPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [saveFeedback, updateSaveToastPosition]);

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
  const activeSection = state.activeSectionIndex !== null
    ? state.sections[state.activeSectionIndex] ?? null
    : null;

  const saveSelectionAsSection = useCallback(() => {
    if (!state.selectedMeasureRange) return;
    const { start, end } = state.selectedMeasureRange;
    const existing = state.sections.find((sec) => sec.startMeasure === start && sec.endMeasure === end);
    if (existing) {
      setSaveFeedback('exists');
      return;
    }
    const name = `Measures ${start + 1}-${end + 1}`;
    const next = [...state.sections, { name, startMeasure: start, endMeasure: end }]
      .sort((a, b) => a.startMeasure - b.startMeasure);
    dispatch({ type: 'SET_SECTIONS', sections: next });
    setSaveFeedback('saved');
  }, [dispatch, state.selectedMeasureRange, state.sections]);

  const loadSection = useCallback((index: number) => {
    dispatch({ type: 'LOAD_SECTION', index });
    setSectionsMenuOpen(false);
  }, [dispatch]);

  const loadFullScore = useCallback(() => {
    dispatch({ type: 'CLEAR_SECTIONS' });
    setSectionsMenuOpen(false);
  }, [dispatch]);

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

        <div className="np-sections-menu-wrap" ref={sectionsMenuRef}>
          <button
            className={`btn btn-small ${sectionsMenuOpen ? 'active' : ''}`}
            onClick={() => setSectionsMenuOpen((prev) => !prev)}
            title="Open saved sections"
            aria-haspopup="menu"
            aria-expanded={sectionsMenuOpen}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bookmarks</span>
            Sections
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_drop_down</span>
          </button>
          {sectionsMenuOpen ? (
            <div className="np-sections-menu" role="menu">
              {state.sections.length === 0 ? (
                <div className="np-sections-empty">
                  Select a measure range and click the save icon on the selection chip to create a practice section.
                </div>
              ) : (
                <>
                  {state.sections.map((section, idx) => (
                    <button
                      key={`${section.startMeasure}-${section.endMeasure}-${idx}`}
                      className={`np-sections-item ${state.activeSectionIndex === idx ? 'active' : ''}`}
                      onClick={() => loadSection(idx)}
                      role="menuitem"
                    >
                      <span className="np-sections-item-name">{section.name}</span>
                      <span className="np-sections-item-range">
                        m. {section.startMeasure + 1}-{section.endMeasure + 1}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="toolbar-spacer np-toolbar-center">
          {activeSection ? (
            <div className="np-active-section-banner" role="status" aria-live="polite">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>flag</span>
              <span>
                Practicing section: <strong>{activeSection.name}</strong>
              </span>
              <button className="np-full-score-btn" onClick={loadFullScore}>
                Full score
              </button>
            </div>
          ) : null}
        </div>

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
          {state.selectedMeasureRange ? (
            <div
              className="selection-info zoom-selection-info"
              role="status"
              aria-live="polite"
              title="Playback will loop only the currently selected measure range."
            >
              <span>
                {state.selectedMeasureRange.start === state.selectedMeasureRange.end
                  ? `Currently selected: Measure ${state.selectedMeasureRange.start + 1}`
                  : `Currently selected: Measures ${state.selectedMeasureRange.start + 1}-${state.selectedMeasureRange.end + 1}`}
              </span>
              <button
                className="selection-jump-btn"
                onClick={() => onJumpToSelection?.()}
                aria-label="Jump to selected measures"
                title="Jump to selected measures"
              >
                <span className="material-symbols-outlined">center_focus_strong</span>
              </button>
              <button
                className="selection-jump-btn"
                onClick={saveSelectionAsSection}
                aria-label="Save selected measures as practice section"
                title="Save selected measures as practice section"
                ref={saveSectionButtonRef}
              >
                <span className="material-symbols-outlined">bookmark_add</span>
              </button>
              <button
                className="clear-selection-btn"
                onClick={() => dispatch({ type: 'CLEAR_MEASURE_SELECTION' })}
                aria-label="Clear selected measures"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          ) : null}
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

      {saveFeedback ? (
        <div className={`np-save-toast ${saveFeedback}`} role="status" aria-live="polite" style={saveToastStyle}>
          {saveFeedback === 'saved' ? 'Section saved' : 'Section already saved'}
        </div>
      ) : null}

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
