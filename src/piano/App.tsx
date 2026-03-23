import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PianoProvider, usePiano } from './store';
import ScoreDisplay from './components/ScoreDisplay';
import PlaybackControls from './components/PlaybackControls';
import NoteInput from './components/NoteInput';
import PracticeMode from './components/PracticeMode';
import PianoKeyboard from './components/PianoKeyboard';
import PracticeDashboard from './components/PracticeDashboard';
import ImportModal from './components/ImportModal';
import SectionSplitter from './components/SectionSplitter';
import Analytics from './components/Analytics';
import CurrentlyPracticing from './components/CurrentlyPracticing';
import ExercisePicker from './components/ExercisePicker';
import InputSources from './components/InputSources';
import VideoPlayer from './components/VideoPlayer';
import { saveScoreToLibrary } from './utils/libraryStorage';
import { enableDebug } from './utils/practiceDebugLog';
import DebugPanel from './components/DebugPanel';

const debugMode = new URLSearchParams(window.location.search).has('debug');
if (debugMode) enableDebug();

function PianoApp() {
  const { state, dispatch, startMode, stopMode, loadScore } = usePiano();
  const [showImportModal, setShowImportModal] = useState(false);
  const [dropFile, setDropFile] = useState<File | null>(null);
  const [showDropOverlay, setShowDropOverlay] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
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
    const MEDIA_EXTS = ['.mp3', '.mp4', '.wav', '.ogg', '.webm', '.m4a', '.aac', '.flac', '.aiff'];
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setShowDropOverlay(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      const ext = file.name.toLowerCase().replace(/^.*(\.[^.]+)$/, '$1');
      const isMedia = file.type.startsWith('audio/') || file.type.startsWith('video/') || MEDIA_EXTS.includes(ext);

      if (isMedia) {
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/') || ['.mp4', '.webm'].includes(ext);
        dispatch({ type: 'SET_MEDIA_FILE', file: { name: file.name, url, type: isVideo ? 'video' : 'audio' } });
      } else {
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
  }, [dispatch]);

  const hasInputSource = state.midiConnected || state.microphoneActive;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Escape' && showAnalytics) {
      setShowAnalytics(false);
      return;
    }
    if (e.code === 'Escape' && showExercisePicker) {
      setShowExercisePicker(false);
      return;
    }
    if (e.code === 'Space' && state.inputMode !== 'step-input') {
      e.preventDefault();
      if (state.activeMode !== 'none') {
        stopMode();
      } else {
        startMode(hasInputSource ? 'practice' : 'play');
      }
    }
  }, [state.activeMode, state.inputMode, hasInputSource, startMode, stopMode, showAnalytics, showExercisePicker]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isEditing = state.inputMode === 'step-input';
  const isPracticing = state.activeMode === 'practice' || state.activeMode === 'free-practice';

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

  const handleImport = useCallback((score: import('./types').PianoScore, sections?: import('./utils/parseMusicXml').ParsedSections[], mediaFile?: { name: string; url: string; type: 'audio' | 'video' } | null) => {
    loadScore(score);
    if (sections && sections.length > 0) {
      dispatch({ type: 'SET_SECTIONS', sections: sections.map(s => ({ name: s.name, startMeasure: s.startMeasure, endMeasure: s.endMeasure })) });
    }
    if (mediaFile) {
      dispatch({ type: 'SET_MEDIA_FILE', file: mediaFile });
    }
    saveScoreToLibrary(score, 'import');
    setDropFile(null);
  }, [loadScore, dispatch]);

  return (
    <div className="piano-app">
      {showDropOverlay && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">
            <span className="material-symbols-outlined">upload_file</span>
            <p>Drop to import</p>
            <span className="drop-overlay-hint">Music files (MusicXML, MIDI, MuseScore) or audio/video (MP3, MP4, WAV)</span>
          </div>
        </div>
      )}
      <ImportModal
        open={showImportModal}
        onClose={() => { setShowImportModal(false); setDropFile(null); }}
        onImport={handleImport}
        onMediaFile={(mf) => dispatch({ type: 'SET_MEDIA_FILE', file: mf })}
        initialFile={dropFile}
      />
      <ExercisePicker
        open={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onImportClick={() => { setShowExercisePicker(false); setShowImportModal(true); }}
      />
      <header className="piano-header">
        <h1>Piano Practice</h1>
        <div className="header-spacer" />
        <InputSources />
      </header>
      <div className="piano-layout">
        <div className="main-content">
          <CurrentlyPracticing onSwitchExercise={() => setShowExercisePicker(true)} />
          <NoteInput onImportClick={() => setShowImportModal(true)} />

          <div className="score-container">
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
                showChords={state.showChords}
              />
            ) : (
              <div className="empty-score">
                <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>music_note</span>
                <p>Select an exercise or edit notes to begin</p>
                <button className="np-switch-btn" onClick={() => setShowExercisePicker(true)} style={{ marginTop: 12 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>library_music</span>
                  Choose Exercise
                </button>
              </div>
            )}
          </div>

          {!isEditing && state.score && <SectionSplitter />}

          <PracticeMode />
          {isEditing && <PianoKeyboard />}
        </div>

        <aside className="sidebar">
          <PlaybackControls />
          <VideoPlayer />
          <PracticeDashboard />
          <button className="analytics-sidebar-link" onClick={() => setShowAnalytics(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>insights</span>
            Practice Analytics
          </button>
        </aside>
      </div>
      {showAnalytics && (
        <div className="analytics-modal-overlay" onClick={() => setShowAnalytics(false)}>
          <div className="analytics-modal" onClick={e => e.stopPropagation()}>
            <div className="analytics-modal-header">
              <h2>Practice Analytics</h2>
              <button className="analytics-modal-close" onClick={() => setShowAnalytics(false)} title="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="analytics-modal-body">
              <Analytics />
            </div>
          </div>
        </div>
      )}
      {debugMode && <DebugPanel />}
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
