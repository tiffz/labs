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
import { getDefaultBeatGrouping } from './utils/timeSignatureUtils';
import {
  getPatternDuration,
  replacePatternAtPosition,
  insertPatternAtPosition,
} from './utils/dragAndDrop';
import { parsePatternToNotes } from './utils/notationHelpers';
import type { TimeSignature } from './types';

const App: React.FC = () => {
  const { getInitialState, syncToUrl, setupPopStateListener } = useUrlState();
  
  // Initialize state from URL
  const initialState = useMemo(() => getInitialState(), [getInitialState]);
  
  const [notation, setNotation] = useState<string>(initialState.notation);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(() => {
    // If beat grouping is in URL, use it; otherwise use initial time signature
    if (initialState.beatGrouping) {
      return { ...initialState.timeSignature, beatGrouping: initialState.beatGrouping };
    }
    return initialState.timeSignature;
  });
  const [bpm, setBpm] = useState<number>(initialState.bpm);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentNote, setCurrentNote] = useState<{ measureIndex: number; noteIndex: number } | null>(null);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(initialState.metronomeEnabled || false);
  const [currentMetronomeBeat, setCurrentMetronomeBeat] = useState<{ measureIndex: number; positionInSixteenths: number; isDownbeat: boolean } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [dragDropMode, setDragDropMode] = useState<'replace' | 'insert'>('replace');
  
  // Helper to add to history
  const addToHistory = useCallback((currentNotation: string) => {
    setHistory(prev => [...prev, currentNotation]);
    // Clear redo stack when new action is taken
    setRedoStack([]);
  }, []);
  
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
  // IMPORTANT: Calculate from raw notation, not parsed rhythm, because parseRhythm
  // auto-fills incomplete measures with rests, which would make remainingBeats always return
  // full measure. We need to know the ACTUAL remaining space before auto-fill.
  const remainingBeats = useMemo(() => {
    // Calculate sixteenths per measure
    const beatsPerMeasure = timeSignature.denominator === 8
      ? timeSignature.numerator * 2  // eighth notes -> sixteenths
      : timeSignature.numerator * 4; // quarter notes -> sixteenths
    
    if (!notation || notation.trim().length === 0) {
      return beatsPerMeasure; // Empty, so full measure available
    }
    
    // Parse notation to get actual note durations (without auto-fill)
    const cleanNotation = notation.replace(/[\s\n]/g, '');
    if (cleanNotation.length === 0) {
      return beatsPerMeasure;
    }
    
    // Calculate total duration in sixteenths from raw notation
    const notes = parsePatternToNotes(cleanNotation);
    const totalDuration = notes.reduce((sum, note) => sum + note.duration, 0);
    
    // Calculate which measure we're in and how much space remains
    const positionInMeasure = totalDuration % beatsPerMeasure;
    const remaining = beatsPerMeasure - positionInMeasure;
    
    // If we're exactly at a measure boundary, return full measure for next measure
    return remaining === beatsPerMeasure ? beatsPerMeasure : remaining;
  }, [notation, timeSignature]);

  const handleInsertPattern = (pattern: string) => {
    // Append the pattern to the end of the current notation
    addToHistory(notation);
    setNotation(prevNotation => prevNotation + pattern);
  };

  // Handle drop from canvas or text input
  const handleDropPattern = useCallback((pattern: string, charPosition: number) => {
    const cleanNotation = notation.replace(/[\s\n]/g, '');
    const patternDuration = getPatternDuration(pattern);
    
    addToHistory(notation);
    
    if (dragDropMode === 'replace') {
      // Always try replacement - replacePatternAtPosition handles edge cases and measure boundaries
      // If replacement fails (replacedLength === 0), fall back to insert
      const result = replacePatternAtPosition(
        cleanNotation,
        charPosition,
        pattern,
        patternDuration,
        timeSignature
      );
      
      // If replacement succeeded (replacedLength > 0), use the new notation
      // Note: Even if newNotation === cleanNotation (same pattern), we still call setNotation
      // to ensure React processes the update (though it may not re-render if identical)
      if (result.replacedLength > 0) {
        setNotation(result.newNotation);
      } else {
        // Replacement failed - fall back to insert
        const newNotation = insertPatternAtPosition(cleanNotation, charPosition, pattern);
        setNotation(newNotation);
      }
    } else {
      // Insert pattern at position
      const newNotation = insertPatternAtPosition(cleanNotation, charPosition, pattern);
      setNotation(newNotation);
    }
  }, [notation, dragDropMode, addToHistory, timeSignature]);

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
        setCurrentMetronomeBeat(null);
      },
      metronomeEnabled,
      (measureIndex, positionInSixteenths, isDownbeat) => {
        setCurrentMetronomeBeat({ measureIndex, positionInSixteenths, isDownbeat });
      }
    );
  }, [parsedRhythm, bpm, metronomeEnabled]);

  const handleStop = useCallback(() => {
    rhythmPlayer.stop();
    setIsPlaying(false);
    setCurrentNote(null);
    setCurrentMetronomeBeat(null);
  }, []);

  const handleMetronomeToggle = useCallback((enabled: boolean) => {
    setMetronomeEnabled(enabled);
    // Update the player's metronome state if currently playing
    rhythmPlayer.setMetronomeEnabled(enabled);
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

  // Sync state to URL whenever notation, timeSignature, bpm, or metronome changes
  useEffect(() => {
    syncToUrl({ 
      notation, 
      timeSignature, 
      bpm,
      beatGrouping: timeSignature.beatGrouping,
      metronomeEnabled,
    });
  }, [notation, timeSignature, bpm, metronomeEnabled, syncToUrl]);

  // Handle browser back/forward navigation
  useEffect(() => {
    return setupPopStateListener((newState) => {
      setNotation(newState.notation);
      setTimeSignature(newState.beatGrouping 
        ? { ...newState.timeSignature, beatGrouping: newState.beatGrouping }
        : newState.timeSignature
      );
      setBpm(newState.bpm);
      setMetronomeEnabled(newState.metronomeEnabled || false);
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
    // Generate a random rhythm that respects beat groupings for musical coherence
    const sixteenthsPerMeasure = timeSignature.denominator === 8
      ? timeSignature.numerator * 2
      : timeSignature.numerator * 4;
    
    // Get beat grouping for this time signature
    const beatGrouping = getDefaultBeatGrouping(timeSignature);
    
    // Convert beat grouping to sixteenths
    const beatGroupingInSixteenths = timeSignature.denominator === 8
      ? beatGrouping.map(g => g * 2)  // Convert eighth notes to sixteenths
      : beatGrouping;  // Already in sixteenths
    
    const durations = [1, 2, 3, 4]; // 16th, 8th, dotted 8th, quarter
    
    let newNotation = '';
    let totalDuration = 0; // Track total duration to prevent overfilling
    
    // Generate patterns for each beat group
    for (const groupSize of beatGroupingInSixteenths) {
      // Stop if we've already filled the measure
      if (totalDuration >= sixteenthsPerMeasure) break;
      
      let currentDuration = 0;
      
      // 80% chance to keep pattern within this beat group (musically coherent)
      // 20% chance to allow pattern to cross beat boundaries
      const respectBoundary = Math.random() < 0.8;
      
      while (currentDuration < groupSize && totalDuration < sixteenthsPerMeasure) {
        const remainingInGroup = groupSize - currentDuration;
        const remainingInMeasure = sixteenthsPerMeasure - totalDuration;
        
        // Always respect measure boundaries, optionally respect group boundaries
        const maxDuration = respectBoundary 
          ? Math.min(remainingInGroup, remainingInMeasure)
          : remainingInMeasure;
        
        // Pick a random duration that fits
        const validDurations = durations.filter(d => d <= maxDuration);
        if (validDurations.length === 0) break;
        
        const duration = validDurations[Math.floor(Math.random() * validDurations.length)];
        
        // Pick a random sound
        // Bias towards actual drum sounds (70% D/T/K, 30% rest)
        const soundWeights = [
          { sound: 'D', weight: 0.25 },
          { sound: 'T', weight: 0.25 },
          { sound: 'K', weight: 0.20 },
          { sound: '_', weight: 0.30 }
        ];
        
        const rand = Math.random();
        let cumulative = 0;
        let sound = 'D';
        
        for (const { sound: s, weight } of soundWeights) {
          cumulative += weight;
          if (rand < cumulative) {
            sound = s;
            break;
          }
        }
        
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
        totalDuration += duration;
        
        // If we've filled this group and we're respecting boundaries, move to next group
        if (respectBoundary && currentDuration >= groupSize) {
          break;
        }
      }
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
          metronomeEnabled={metronomeEnabled}
          onMetronomeToggle={handleMetronomeToggle}
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
            metronomeEnabled={metronomeEnabled}
            currentMetronomeBeat={currentMetronomeBeat}
            onDropPattern={handleDropPattern}
            dragDropMode={dragDropMode}
            notation={notation}
            timeSignature={timeSignature}
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
          dragDropMode={dragDropMode}
          onDragDropModeChange={setDragDropMode}
        />
      </aside>
    </div>
  );
};

export default App;

