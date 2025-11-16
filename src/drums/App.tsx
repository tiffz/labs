import React, { useState, useMemo, useEffect, useCallback } from 'react';
import RhythmInput from './components/RhythmInput';
import RhythmDisplay from './components/RhythmDisplay';
import NotePalette from './components/NotePalette';
import PlaybackControls from './components/PlaybackControls';
import RhythmInfoCard from './components/RhythmInfoCard';
import { parseRhythm } from './utils/rhythmParser';
import { rhythmPlayer } from './utils/rhythmPlayer';
import { recognizeRhythm } from './utils/rhythmRecognition';
import { useUrlState } from './hooks/useUrlState';
import type { TimeSignature } from './types';

const App: React.FC = () => {
  const { getInitialState, syncToUrl, setupPopStateListener } = useUrlState();
  
  // Initialize state from URL
  const initialState = useMemo(() => getInitialState(), [getInitialState]);
  
  const [notation, setNotation] = useState<string>(initialState.notation);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(initialState.timeSignature);
  const [bpm, setBpm] = useState<number>(initialState.bpm);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentNote, setCurrentNote] = useState<{ measureIndex: number; noteIndex: number } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  
  // Helper to add to history
  const addToHistory = (currentNotation: string) => {
    setHistory(prev => [...prev, currentNotation]);
    // Clear redo stack when new action is taken
    setRedoStack([]);
  };
  
  // Wrapper for setNotation that adds to history
  const updateNotation = (newNotation: string) => {
    addToHistory(notation);
    setNotation(newNotation);
  };

  const parsedRhythm = useMemo(() => {
    return parseRhythm(notation, timeSignature);
  }, [notation, timeSignature]);

  // Recognize rhythm pattern
  const recognizedRhythm = useMemo(() => {
    return recognizeRhythm(notation);
  }, [notation]);

  // Calculate remaining beats in current measure (in sixteenths)
  const remainingBeats = useMemo(() => {
    // Calculate sixteenths per measure
    // For 4/4: 4 beats * (16 sixteenths / 4 quarter notes) = 16 sixteenths
    // For 3/4: 3 beats * (16 sixteenths / 4 quarter notes) = 12 sixteenths
    // For 6/8: 6 beats * (16 sixteenths / 8 eighth notes) = 12 sixteenths
    const beatsPerMeasure = timeSignature.denominator === 8
      ? timeSignature.numerator * 2  // eighth notes -> sixteenths
      : timeSignature.numerator * 4; // quarter notes -> sixteenths
    
    if (parsedRhythm.measures.length === 0) {
      return beatsPerMeasure; // Empty, so full measure available
    }
    
    const lastMeasure = parsedRhythm.measures[parsedRhythm.measures.length - 1];
    const remaining = beatsPerMeasure - lastMeasure.totalDuration;
    
    // If measure is complete (0 remaining), return full measure for next measure
    return remaining === 0 ? beatsPerMeasure : remaining;
  }, [parsedRhythm, timeSignature]);

  const handleInsertPattern = (pattern: string) => {
    // Append the pattern to the end of the current notation
    addToHistory(notation);
    setNotation(prevNotation => prevNotation + pattern);
  };

  const handlePlay = useCallback(() => {
    if (!parsedRhythm.isValid || parsedRhythm.measures.length === 0) {
      return;
    }

    setIsPlaying(true);
    setCurrentNote(null);

    rhythmPlayer.play(
      parsedRhythm,
      bpm,
      (measureIndex, noteIndex) => {
        setCurrentNote({ measureIndex, noteIndex });
      },
      () => {
        setIsPlaying(false);
        setCurrentNote(null);
      }
    );
  }, [parsedRhythm, bpm]);

  const handleStop = useCallback(() => {
    rhythmPlayer.stop();
    setIsPlaying(false);
    setCurrentNote(null);
  }, []);

  // Centralized logic: Stop playback whenever notation changes
  // This handles all cases: note palette, loading rhythms, variations, manual edits, etc.
  useEffect(() => {
    if (isPlaying) {
      handleStop();
    }
    // Only watch notation changes, not isPlaying
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notation]);

  // Sync state to URL whenever notation, timeSignature, or bpm changes
  useEffect(() => {
    syncToUrl({ notation, timeSignature, bpm });
  }, [notation, timeSignature, bpm, syncToUrl]);

  // Handle browser back/forward navigation
  useEffect(() => {
    return setupPopStateListener((newState) => {
      setNotation(newState.notation);
      setTimeSignature(newState.timeSignature);
      setBpm(newState.bpm);
    });
  }, [setupPopStateListener]);

  const handleClear = () => {
    updateNotation('');
  };

  const handleDeleteLast = () => {
    if (notation.length === 0) return;
    
    // Delete the entire last note, not just the last character
    // Find the last note by working backwards
    let i = notation.length - 1;
    
    // Skip trailing spaces
    while (i >= 0 && notation[i] === ' ') {
      i--;
    }
    
    if (i < 0) {
      updateNotation('');
      return;
    }
    
    // If we're on a dash, skip all dashes to find the note
    if (notation[i] === '-') {
      while (i >= 0 && notation[i] === '-') {
        i--;
      }
    }
    
    // Now we should be on the actual note character (D, T, K, or .)
    // Delete this character and all its dashes
    if (i >= 0) {
      const newNotation = notation.slice(0, i);
      updateNotation(newNotation);
    }
  };
  
  const handleUndo = () => {
    if (history.length === 0) return;
    
    const previousNotation = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, notation]); // Add current to redo stack
    setNotation(previousNotation);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const nextNotation = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setHistory(prev => [...prev, notation]); // Add current to history
    setNotation(nextNotation);
  };

  const handleRandomize = () => {
    // Generate a random rhythm for one measure
    const sixteenthsPerMeasure = timeSignature.denominator === 8
      ? timeSignature.numerator * 2
      : timeSignature.numerator * 4;
    
    const sounds = ['D', 'T', 'K', '_'];
    const durations = [1, 2, 3, 4]; // 16th, 8th, dotted 8th, quarter
    
    let newNotation = '';
    let currentDuration = 0;
    
    while (currentDuration < sixteenthsPerMeasure) {
      const remainingDuration = sixteenthsPerMeasure - currentDuration;
      
      // Pick a random duration that fits
      const validDurations = durations.filter(d => d <= remainingDuration);
      const duration = validDurations[Math.floor(Math.random() * validDurations.length)];
      
      // Pick a random sound
      const sound = sounds[Math.floor(Math.random() * sounds.length)];
      
      // Add the note
      if (sound === '_') {
        // For rests, use underscores
        newNotation += '_'.repeat(duration);
      } else {
        // For notes, use the sound + dashes
        newNotation += sound;
        if (duration > 1) {
          newNotation += '-'.repeat(duration - 1);
        }
      }
      
      currentDuration += duration;
    }
    
    updateNotation(newNotation);
  };

  // Spacebar keyboard shortcut for play/stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        if (isPlaying) {
          handleStop();
        } else {
          handlePlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, parsedRhythm, bpm, handlePlay, handleStop]);

  return (
    <div className="app-layout">
      {/* Main content area */}
      <div className="main-content">
        <header className="header-inline">
          <h1>Darbuka Rhythm Trainer</h1>
        </header>

        {/* Playback Controls Bar */}
        <PlaybackControls
          bpm={bpm}
          onBpmChange={setBpm}
          timeSignature={timeSignature}
          onTimeSignatureChange={setTimeSignature}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onStop={handleStop}
        />

        <div className="main-workspace">
          <RhythmInput
            notation={notation}
            onNotationChange={(newNotation) => {
              addToHistory(notation);
              setNotation(newNotation);
            }}
            timeSignature={timeSignature}
            onTimeSignatureChange={setTimeSignature}
            onClear={handleClear}
            onDeleteLast={handleDeleteLast}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onRandomize={handleRandomize}
            canUndo={history.length > 0}
            canRedo={redoStack.length > 0}
          />

          <RhythmDisplay 
            rhythm={parsedRhythm} 
            currentNote={currentNote}
          />

          {/* Show rhythm info card if a rhythm is recognized */}
          {recognizedRhythm && (
            <RhythmInfoCard
              rhythm={recognizedRhythm.rhythm}
              currentNotation={notation}
              onSelectVariation={(newNotation, newTimeSignature) => {
                addToHistory(notation);
                setNotation(newNotation);
                setTimeSignature(newTimeSignature);
              }}
            />
          )}
        </div>
      </div>

      {/* Right sidebar: Note Palette (full height) */}
      <aside className="palette-sidebar">
        <NotePalette 
          onInsertPattern={handleInsertPattern} 
          remainingBeats={remainingBeats}
          timeSignature={timeSignature}
        />
      </aside>
    </div>
  );
};

export default App;

