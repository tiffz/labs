import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import RhythmInput from './components/RhythmInput';
import RhythmDisplay from './components/RhythmDisplay';
import NotePalette from './components/NotePalette';
import PlaybackControls from './components/PlaybackControls';
import RhythmInfoCard from './components/RhythmInfoCard';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { parseRhythm } from './utils/rhythmParser';
import { recognizeRhythm } from './utils/rhythmRecognition';
import { useUrlState } from './hooks/useUrlState';
import { useNotationHistory } from './hooks/useNotationHistory';
import { usePlayback } from './hooks/usePlayback';
import { getDefaultBeatGrouping, getSixteenthsPerMeasure, getBeatGroupingInSixteenths } from './utils/timeSignatureUtils';
import { calculateRemainingBeats } from './utils/notationUtils';
import {
  getPatternDuration,
  replacePatternAtPosition,
  insertPatternAtPosition,
} from './utils/dragAndDrop';
import type { TimeSignature } from './types';
import type { PlaybackSettings } from './types/settings';
import { DEFAULT_SETTINGS } from './types/settings';

const App: React.FC = () => {
  const { getInitialState, syncToUrl, setupPopStateListener } = useUrlState();
  
  // Initialize state from URL
  const initialState = useMemo(() => getInitialState(), [getInitialState]);
  
  // Initialize time signature with beat grouping from URL if present
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(() => {
    if (initialState.beatGrouping) {
      return { ...initialState.timeSignature, beatGrouping: initialState.beatGrouping };
    }
    return initialState.timeSignature;
  });
  
  const [bpm, setBpm] = useState<number>(initialState.bpm);
  const [debouncedBpm, setDebouncedBpm] = useState<number>(initialState.bpm);
  const debounceTimeoutRef = useRef<number | null>(null);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(initialState.metronomeEnabled || false);
  const [dragDropMode, setDragDropMode] = useState<'replace' | 'insert'>('replace');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(DEFAULT_SETTINGS);
  
  // Use notation history hook for consistent history management
  const {
    notation,
    setNotation,
    setNotationWithoutHistory,
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useNotationHistory(initialState.notation);

  const parsedRhythm = useMemo(() => {
    return parseRhythm(notation, timeSignature);
  }, [notation, timeSignature]);

  // Recognize rhythm pattern
  const recognizedRhythm = useMemo(() => {
    return recognizeRhythm(notation);
  }, [notation]);

  // Calculate remaining beats using utility function
  const remainingBeats = useMemo(() => {
    return calculateRemainingBeats(notation, timeSignature);
  }, [notation, timeSignature]);

  // Use playback hook for consistent playback state management
  const {
    isPlaying,
    currentNote,
    currentMetronomeBeat,
    handlePlay,
    handleStop,
    handleMetronomeToggle,
  } = usePlayback({
    parsedRhythm,
    bpm,
    debouncedBpm,
    metronomeEnabled,
    playbackSettings,
  });

  const handleInsertPattern = useCallback((pattern: string) => {
    // Append the pattern to the end of the current notation
    addToHistory(notation);
    setNotationWithoutHistory(prevNotation => prevNotation + pattern);
  }, [notation, addToHistory, setNotationWithoutHistory]);

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
      if (result.replacedLength > 0) {
        setNotationWithoutHistory(result.newNotation);
      } else {
        // Replacement failed - fall back to insert
        const newNotation = insertPatternAtPosition(cleanNotation, charPosition, pattern);
        setNotationWithoutHistory(newNotation);
      }
    } else {
      // Insert pattern at position
      const newNotation = insertPatternAtPosition(cleanNotation, charPosition, pattern);
      setNotationWithoutHistory(newNotation);
    }
  }, [notation, dragDropMode, addToHistory, timeSignature, setNotationWithoutHistory]);

  // Debounce BPM changes - only apply after user stops typing for 500ms
  useEffect(() => {
    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = window.setTimeout(() => {
      setDebouncedBpm(bpm);
    }, 500);
    
    return () => {
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [bpm]);

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
      setNotationWithoutHistory(newState.notation);
      setTimeSignature(newState.beatGrouping 
        ? { ...newState.timeSignature, beatGrouping: newState.beatGrouping }
        : newState.timeSignature
      );
      setBpm(newState.bpm);
      setMetronomeEnabled(newState.metronomeEnabled || false);
    });
  }, [setupPopStateListener, setNotationWithoutHistory]);

  const handleClear = useCallback(() => {
    setNotation('');
  }, [setNotation]);

  const handleDeleteLast = useCallback(() => {
    if (notation.length === 0) return;
    
    // Delete the entire last note, not just the last character
    // Find the last note by working backwards
    let i = notation.length - 1;
    
    // Skip trailing spaces
    while (i >= 0 && notation[i] === ' ') {
      i--;
    }
    
    if (i < 0) {
      setNotation('');
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
      setNotation(newNotation);
    }
  }, [notation, setNotation]);

  const handleRandomize = useCallback(() => {
    // Generate a random rhythm that respects beat groupings for musical coherence
    const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
    
    // Get beat grouping for this time signature
    const beatGrouping = getDefaultBeatGrouping(timeSignature);
    
    // Convert beat grouping to sixteenths
    const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, timeSignature);
    
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
    
    setNotation(newNotation);
  }, [timeSignature, setNotation]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect platform for modifier keys
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKeyPressed = isMac ? e.metaKey : e.ctrlKey;

      // Help menu - always available (check for Shift+/ which produces ?, or direct ? key)
      // Check this BEFORE checking if user is typing so it works even in input fields
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        return;
      }

      // Check if user is typing in an input field
      const isTyping = e.target instanceof HTMLInputElement || 
                       e.target instanceof HTMLTextAreaElement ||
                       (e.target instanceof HTMLElement && e.target.isContentEditable);

      // Don't trigger shortcuts when typing in inputs (except help, which is handled above)
      if (isTyping) {
        return;
      }

      // Undo: Ctrl+Z (Mac: Cmd+Z)
      if (modKeyPressed && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac)
      if ((!isMac && modKeyPressed && (e.key === 'y' || e.key === 'Y')) ||
          (isMac && modKeyPressed && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        redo();
        return;
      }

      // Randomize: R (but not when modifier keys are pressed to allow browser shortcuts)
      // Don't trigger on Cmd+R (Mac) or Ctrl+R (Windows/Linux) for browser refresh
      if ((e.key === 'r' || e.key === 'R') && !e.shiftKey && !modKeyPressed) {
        e.preventDefault();
        handleRandomize();
        return;
      }

      // Play/Stop: Spacebar
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          handleStop();
        } else {
          handlePlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handlePlay, handleStop, undo, redo, handleRandomize, setShowKeyboardHelp]);

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
          onMetronomeToggle={(enabled) => {
            setMetronomeEnabled(enabled);
            handleMetronomeToggle(enabled);
          }}
          onSettingsClick={() => setShowSettings(prev => !prev)}
          showSettings={showSettings}
          playbackSettings={playbackSettings}
          onSettingsChange={setPlaybackSettings}
          onSettingsClose={() => setShowSettings(false)}
        />

        <div className="main-workspace">
          <RhythmInput
            notation={notation}
            onNotationChange={(newNotation) => {
              addToHistory(notation);
              setNotationWithoutHistory(newNotation);
            }}
            timeSignature={timeSignature}
            onTimeSignatureChange={setTimeSignature}
            onClear={handleClear}
            onDeleteLast={handleDeleteLast}
            onUndo={undo}
            onRedo={redo}
            onRandomize={handleRandomize}
            canUndo={canUndo}
            canRedo={canRedo}
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
                setNotationWithoutHistory(newNotation);
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
      <KeyboardShortcutsHelp 
        isOpen={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />
    </div>
  );
};

export default App;

