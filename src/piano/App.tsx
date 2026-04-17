import { useState, useEffect, useCallback, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import Popover from '@mui/material/Popover';
import { PianoProvider, usePiano } from './store';
import ScoreDisplay from './components/ScoreDisplay';
import PlaybackControls from './components/PlaybackControls';
import NoteInput from './components/NoteInput';
import PracticeMode from './components/PracticeMode';
import PianoKeyboard from './components/PianoKeyboard';
import PracticeDashboard from './components/PracticeDashboard';
import ImportModal from './components/ImportModal';
import Analytics from './components/Analytics';
import CurrentlyPracticing from './components/CurrentlyPracticing';
import ExercisePicker from './components/ExercisePicker';
import InputSources from './components/InputSources';
import VideoPlayer from './components/VideoPlayer';
import { saveScoreToLibrary } from './utils/libraryStorage';
import { enableDebug } from './utils/practiceDebugLog';
import DebugPanel from './components/DebugPanel';
import { getImportFileKind } from './utils/importFileType';
import { createAppAnalytics } from '../shared/utils/analytics';

const analytics = createAppAnalytics('piano');

const debugMode = new URLSearchParams(window.location.search).has('debug');
if (debugMode) enableDebug();

function PianoApp() {
  const { state, dispatch, startMode, stopMode, loadScore } = usePiano();
  const [showImportModal, setShowImportModal] = useState(false);
  const [dropFile, setDropFile] = useState<File | null>(null);
  const [showDropOverlay, setShowDropOverlay] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exercisePickerInitialSection, setExercisePickerInitialSection] = useState<'scales' | 'progressions' | 'songs'>('scales');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [exerciseAnchorEl, setExerciseAnchorEl] = useState<HTMLElement | null>(null);
  const [songAnchorEl, setSongAnchorEl] = useState<HTMLElement | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const apply = () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      setIsMobileViewport(mediaQuery.matches || viewportWidth <= 768);
    };
    apply();
    mediaQuery.addEventListener('change', apply);
    window.visualViewport?.addEventListener('resize', apply);
    return () => {
      mediaQuery.removeEventListener('change', apply);
      window.visualViewport?.removeEventListener('resize', apply);
    };
  }, []);

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
      if (!file) return;
      const kind = getImportFileKind(file);
      if (kind === 'media') {
        const lowerName = file.name.toLowerCase();
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/') || lowerName.endsWith('.mp4') || lowerName.endsWith('.webm');
        dispatch({ type: 'SET_MEDIA_FILE', file: { name: file.name, url, type: isVideo ? 'video' : 'audio' } });
      } else if (kind === 'music') {
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

  const hasInputSource =
    (state.midiConnected && state.midiInputEnabled) || state.microphoneActive;

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

  const pianoPracticeStartRef = useRef<number>(0);
  useEffect(() => {
    if (isPracticing) {
      pianoPracticeStartRef.current = Date.now();
      analytics.trackEvent('practice_start', { exercise_name: state.score?.title });
    } else if (pianoPracticeStartRef.current > 0) {
      analytics.trackSessionEnd(pianoPracticeStartRef.current);
      pianoPracticeStartRef.current = 0;
    }
  }, [isPracticing]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const jumpToSelectedMeasures = useCallback(() => {
    const range = state.selectedMeasureRange;
    if (!range) return;
    const scoreContainer = document.querySelector('.score-container') as HTMLElement | null;
    if (!scoreContainer) return;
    const target = scoreContainer.querySelector(
      `[data-measure-idx="${range.start}"]`,
    ) as SVGGraphicsElement | null;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    const mainContent = document.querySelector('.main-content') as HTMLElement | null;
    if (mainContent) {
      window.setTimeout(() => {
        mainContent.scrollBy({ top: -96, behavior: 'smooth' });
      }, 20);
    }
  }, [state.selectedMeasureRange]);


  const hiddenHands = useMemo(() => {
    const set = new Set<string>();
    if (!state.showRightHand) set.add('right');
    if (!state.showLeftHand) set.add('left');
    return set.size > 0 ? set : undefined;
  }, [state.showRightHand, state.showLeftHand]);

  const defaultExerciseSection = useMemo<'scales' | 'progressions'>(() => {
    if (state.isExerciseScore && state.score?.exerciseConfig?.kind === 'chord-progression') {
      return 'progressions';
    }
    return 'scales';
  }, [state.isExerciseScore, state.score?.exerciseConfig?.kind]);

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
    analytics.trackEvent('import_score', { title: score.title });
  }, [loadScore, dispatch]);

  const closeDesktopLoadMenus = useCallback(() => {
    setExerciseAnchorEl(null);
    setSongAnchorEl(null);
  }, []);

  const openExerciseFlow = useCallback((event?: ReactMouseEvent<HTMLElement>) => {
    if (isMobileViewport) {
      setExercisePickerInitialSection(defaultExerciseSection);
      setShowExercisePicker(true);
      return;
    }
    setSongAnchorEl(null);
    if (event?.currentTarget) {
      setExerciseAnchorEl(event.currentTarget);
    }
  }, [defaultExerciseSection, isMobileViewport]);

  const openSongFlow = useCallback((event?: ReactMouseEvent<HTMLElement>) => {
    if (isMobileViewport) {
      setExercisePickerInitialSection('songs');
      setShowExercisePicker(true);
      return;
    }
    setExerciseAnchorEl(null);
    if (event?.currentTarget) {
      setSongAnchorEl(event.currentTarget);
    }
  }, [isMobileViewport]);

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
        initialSection={exercisePickerInitialSection}
      />
      <header className="piano-header">
        <h1>Piano Practice</h1>
        <div className="header-spacer" />
        <InputSources />
      </header>
      <Popover
        open={Boolean(exerciseAnchorEl)}
        anchorEl={exerciseAnchorEl}
        onClose={() => setExerciseAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { className: 'piano-load-popover' } }}
      >
        <ExercisePicker
          mode="inline"
          onClose={() => setExerciseAnchorEl(null)}
          allowedSections={['scales', 'progressions']}
          initialSection={defaultExerciseSection}
          title="Load Exercise"
        />
      </Popover>
      <Popover
        open={Boolean(songAnchorEl)}
        anchorEl={songAnchorEl}
        onClose={() => setSongAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { className: 'piano-load-popover' } }}
      >
        <ExercisePicker
          mode="inline"
          onClose={() => setSongAnchorEl(null)}
          onImportClick={() => {
            closeDesktopLoadMenus();
            setShowImportModal(true);
          }}
          allowedSections={['songs']}
          initialSection="songs"
          title="Load Song"
        />
      </Popover>
      <div className="piano-layout">
        <div className="main-content">
          <CurrentlyPracticing
            onLoadExercise={(event) => openExerciseFlow(event)}
            onLoadSong={(event) => openSongFlow(event)}
          />
          <NoteInput
            onImportClick={() => setShowImportModal(true)}
            onJumpToSelection={jumpToSelectedMeasures}
          />

          <div className="score-container">
            {state.score ? (
              <ScoreDisplay
                score={state.score}
                currentMeasureIndex={state.currentMeasureIndex}
                currentNoteIndices={state.currentNoteIndices}
                activeMidiNotes={isEditing ? undefined : state.activeMidiNotes}
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
                <button className="np-switch-btn" onClick={() => openExerciseFlow()} style={{ marginTop: 12 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>library_music</span>
                  Choose Exercise
                </button>
              </div>
            )}
          </div>

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
        <div
          className="analytics-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAnalytics(false);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowAnalytics(false);
            }
          }}
          aria-label="Close analytics modal"
        >
          <div className="analytics-modal">
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
