import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PianoProvider, usePiano } from './store';
import { midiToNoteName } from './types';
import ScoreDisplay from './components/ScoreDisplay';
import PlaybackControls from './components/PlaybackControls';
import NoteInput from './components/NoteInput';
import PresetLibrary from './components/PresetLibrary';
import PracticeMode from './components/PracticeMode';
import PianoKeyboard from './components/PianoKeyboard';
import PracticeDashboard from './components/PracticeDashboard';
import ImportModal from './components/ImportModal';
import SectionSplitter from './components/SectionSplitter';

function PianoApp() {
  const { state, dispatch, startMode, stopMode, loadScore } = usePiano();
  const [showImportModal, setShowImportModal] = useState(false);
  const [dropFile, setDropFile] = useState<File | null>(null);
  const [showDropOverlay, setShowDropOverlay] = useState(false);
  const dragCounterRef = useRef(0);

  // Global drag-and-drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes('Files')) {
        setShowDropOverlay(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setShowDropOverlay(false);
      }
    };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setShowDropOverlay(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        setDropFile(file);
        setShowImportModal(true);
      }
    };
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && state.inputMode !== 'step-input') {
      e.preventDefault();
      if (state.activeMode !== 'none') {
        stopMode();
      } else {
        startMode(state.midiConnected ? 'practice' : 'play');
      }
    }
  }, [state.activeMode, state.inputMode, state.midiConnected, startMode, stopMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isEditing = state.inputMode === 'step-input';
  const isPracticing = state.activeMode === 'practice' || state.activeMode === 'free-practice';

  const handleZoomIn = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', level: Math.round((state.zoomLevel + 0.1) * 10) / 10 });
  }, [state.zoomLevel, dispatch]);

  const handleZoomOut = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', level: Math.round((state.zoomLevel - 0.1) * 10) / 10 });
  }, [state.zoomLevel, dispatch]);

  const handleMeasureClick = useCallback((measureIndex: number, shiftKey: boolean) => {
    if (isEditing) return;
    if (shiftKey) {
      dispatch({ type: 'SELECT_MEASURE_RANGE', index: measureIndex });
    } else {
      if (state.selectedMeasureRange &&
        state.selectedMeasureRange.start === measureIndex &&
        state.selectedMeasureRange.end === measureIndex) {
        dispatch({ type: 'CLEAR_MEASURE_SELECTION' });
      } else {
        dispatch({ type: 'SELECT_MEASURE', index: measureIndex });
      }
    }
  }, [isEditing, state.selectedMeasureRange, dispatch]);


  const hiddenHands = useMemo(() => {
    const set = new Set<string>();
    if (!state.showRightHand) set.add('right');
    if (!state.showLeftHand) set.add('left');
    return set.size > 0 ? set : undefined;
  }, [state.showRightHand, state.showLeftHand]);

  const greyedOutHands = useMemo(() => {
    const set = new Set<string>();
    if (state.showRightHand && !state.practiceRightHand) set.add('right');
    if (state.showLeftHand && !state.practiceLeftHand) set.add('left');
    if (state.showVocalPart && !state.practiceVoice) set.add('voice');
    return set.size > 0 ? set : undefined;
  }, [state.practiceRightHand, state.practiceLeftHand, state.practiceVoice, state.showVocalPart, state.showRightHand, state.showLeftHand]);

  const viewingResults = useMemo(() => {
    if (state.viewingRunIndex !== null && state.practiceSession) {
      const run = state.practiceSession.runs[state.viewingRunIndex];
      if (run) {
        const map = new Map<string, typeof run.results[0]>();
        run.results.forEach(r => map.set(r.noteId, r));
        return map;
      }
    }
    if (isPracticing && state.practiceResultsByNoteId.size > 0) {
      return state.practiceResultsByNoteId;
    }
    return undefined;
  }, [state.viewingRunIndex, state.practiceSession, isPracticing, state.practiceResultsByNoteId]);

  const handleImport = useCallback((score: import('./types').PianoScore, sections?: import('./utils/parseMusicXml').ParsedSections[]) => {
    loadScore(score);
    if (sections && sections.length > 0) {
      dispatch({ type: 'SET_SECTIONS', sections: sections.map(s => ({ name: s.name, startMeasure: s.startMeasure, endMeasure: s.endMeasure })) });
    }
    setDropFile(null);
  }, [loadScore, dispatch]);

  return (
    <div className="piano-app">
      {showDropOverlay && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">
            <span className="material-symbols-outlined">upload_file</span>
            <p>Drop music file to import</p>
          </div>
        </div>
      )}
      <ImportModal
        open={showImportModal}
        onClose={() => { setShowImportModal(false); setDropFile(null); }}
        onImport={handleImport}
        initialFile={dropFile}
      />
      <header className="piano-header">
        <h1>Piano Practice</h1>
        <div className="header-spacer" />
        <div className="header-midi">
          <span className={`midi-dot ${state.midiConnected ? 'connected' : ''}`} />
          <span className="midi-label">
            {state.midiConnected ? 'MIDI Connected' : 'No MIDI controller'}
          </span>
          <div className="midi-active-notes">
            {Array.from(state.activeMidiNotes).map(n => (
              <span key={n} className="midi-note-badge">{midiToNoteName(n)}</span>
            ))}
          </div>
        </div>
      </header>
      <div className="piano-layout">
        <div className="main-content">
          <div style={{ display: isEditing ? 'none' : undefined }}>
            <PresetLibrary />
          </div>
          <NoteInput onImportClick={() => setShowImportModal(true)} />

          <div className="score-container">
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={handleZoomOut} title="Zoom out" disabled={state.zoomLevel <= 0.4}>
                <span className="material-symbols-outlined">remove</span>
              </button>
              <span className="zoom-level">{Math.round(state.zoomLevel * 100)}%</span>
              <button className="zoom-btn" onClick={handleZoomIn} title="Zoom in" disabled={state.zoomLevel >= 2.0}>
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
            {state.score ? (
              <ScoreDisplay
                score={state.score}
                currentMeasureIndex={state.currentMeasureIndex}
                currentNoteIndices={state.currentNoteIndices}
                activeMidiNotes={isEditing || isPracticing ? undefined : state.activeMidiNotes}
                practiceResultsByNoteId={viewingResults}
                greyedOutHands={greyedOutHands}
                hiddenHands={hiddenHands}
                ghostNotes={isEditing && state.durationMode === 'auto' ? state.ghostNotes : undefined}
                zoomLevel={state.zoomLevel}
                selectedMeasureRange={state.selectedMeasureRange}
                onMeasureClick={handleMeasureClick}
                showVocalPart={state.showVocalPart}
              />
            ) : (
              <div className="empty-score">
                <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>music_note</span>
                <p>Select an exercise or edit notes to begin</p>
              </div>
            )}
          </div>

          {!isEditing && state.score && <SectionSplitter />}

          <PracticeMode />
          {isEditing && <PianoKeyboard />}
        </div>

        <aside className="sidebar">
          <PlaybackControls />
          <PracticeDashboard />
        </aside>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PianoProvider>
      <PianoApp />
    </PianoProvider>
  );
}
