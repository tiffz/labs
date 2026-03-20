import { useEffect, useCallback, useMemo } from 'react';
import { PianoProvider, usePiano } from './store';
import { midiToNoteName } from './types';
import ScoreDisplay from './components/ScoreDisplay';
import PlaybackControls from './components/PlaybackControls';
import NoteInput from './components/NoteInput';
import PresetLibrary from './components/PresetLibrary';
import PracticeMode from './components/PracticeMode';
import PianoKeyboard from './components/PianoKeyboard';
import PracticeDashboard from './components/PracticeDashboard';

function PianoApp() {
  const { state, startMode, stopMode } = usePiano();
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

  const greyedOutHands = useMemo(() => {
    const set = new Set<string>();
    if (!state.practiceRightHand) set.add('right');
    if (!state.practiceLeftHand) set.add('left');
    return set.size > 0 ? set : undefined;
  }, [state.practiceRightHand, state.practiceLeftHand]);

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

  return (
    <div className="piano-app">
      <header className="piano-header">
        <h1>Piano Practice</h1>
        <div className="header-spacer" />
        <div className="header-midi">
          <span className={`midi-dot ${state.midiConnected ? 'connected' : ''}`} />
          <span className="midi-label">
            {state.midiConnected ? 'MIDI Connected' : 'No MIDI'}
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
          <NoteInput />

          <div className="score-container">
            {state.score ? (
              <ScoreDisplay
                score={state.score}
                currentMeasureIndex={state.currentMeasureIndex}
                currentNoteIndices={state.currentNoteIndices}
                activeMidiNotes={isEditing || isPracticing ? undefined : state.activeMidiNotes}
                practiceResultsByNoteId={viewingResults}
                greyedOutHands={greyedOutHands}
                ghostNotes={isEditing && state.durationMode === 'auto' ? state.ghostNotes : undefined}
              />
            ) : (
              <div className="empty-score">
                <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>music_note</span>
                <p>Select an exercise or edit notes to begin</p>
              </div>
            )}
          </div>

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
