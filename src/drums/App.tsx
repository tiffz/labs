import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import RhythmInput from './components/RhythmInput';
import RhythmDisplay from './components/RhythmDisplay';
import NotePalette from './components/NotePalette';
import PlaybackControls from './components/PlaybackControls';
import RhythmInfoCard from './components/RhythmInfoCard';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import RhythmSequencer from './components/RhythmSequencer';
import CollapsibleSection from './components/CollapsibleSection';
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
  const [showShareFeedback, setShowShareFeedback] = useState<boolean>(false);
  const [shareFeedbackPosition, setShareFeedbackPosition] = useState<{ top: number; left: number } | null>(null);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(DEFAULT_SETTINGS);
  const [downloadFormat, setDownloadFormat] = useState<'wav' | 'mp3'>('wav');
  const [downloadLoops, setDownloadLoops] = useState<number>(1);
  
  // Selection state for note selection in the display
  // anchorPosition tracks the original click position during drag-to-select
  const [selection, setSelectionState] = useState<{
    startCharPosition: number | null;
    endCharPosition: number | null;
    isSelecting: boolean;
    anchorPosition: number | null; // Original click position for drag-to-select
  }>({ startCharPosition: null, endCharPosition: null, isSelecting: false, anchorPosition: null });
  const [selectionDuration, setSelectionDuration] = useState<number>(0);
  
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
  
  // Handle selection change from VexFlowRenderer (final selection, not during drag)
  const handleSelectionChange = useCallback((
    start: number | null, 
    end: number | null, 
    duration: number
  ) => {
    setSelectionState({
      startCharPosition: start,
      endCharPosition: end,
      isSelecting: false,
      anchorPosition: null, // Clear anchor when selection is finalized
    });
    setSelectionDuration(duration);
  }, []);
  
  
  // Ref for note display container (for click-outside detection)
  const noteDisplayRef = useRef<HTMLDivElement>(null);
  
  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectionState({
      startCharPosition: null,
      endCharPosition: null,
      isSelecting: false,
      anchorPosition: null,
    });
    setSelectionDuration(0);
  }, []);
  
  // Global click handler to clear selection when clicking outside note display
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Only process if there's an active selection
      if (selection.startCharPosition === null) return;
      
      // Check if click is inside the note display container
      if (noteDisplayRef.current && noteDisplayRef.current.contains(e.target as Node)) {
        return; // Click is inside note display, don't clear
      }
      
      // Click is outside note display, clear the selection
      clearSelection();
    };
    
    // Use mousedown to catch clicks before they're processed by other handlers
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [selection.startCharPosition, clearSelection]);
  
  // Handle replacing selected notes with a pattern
  const handleReplaceSelection = useCallback((pattern: string) => {
    if (selection.startCharPosition === null || selection.endCharPosition === null) {
      return;
    }
    
    const cleanNotation = notation.replace(/[\s\n]/g, '');
    const patternDuration = getPatternDuration(pattern);
    
    addToHistory(notation);
    
    // Use replacePatternAtPosition with the selection start position
    const result = replacePatternAtPosition(
      cleanNotation,
      selection.startCharPosition,
      pattern,
      patternDuration,
      timeSignature
    );
    
    setNotationWithoutHistory(result.newNotation);
    
    // Clear selection after replacement
    clearSelection();
  }, [notation, selection, timeSignature, addToHistory, setNotationWithoutHistory, clearSelection]);
  
  // Handle deleting selected notes
  const handleDeleteSelection = useCallback(() => {
    if (selection.startCharPosition === null || selection.endCharPosition === null) {
      return;
    }
    
    const cleanNotation = notation.replace(/[\s\n]/g, '');
    
    addToHistory(notation);
    
    // Remove the selected portion
    const newNotation = 
      cleanNotation.slice(0, selection.startCharPosition) + 
      cleanNotation.slice(selection.endCharPosition);
    
    setNotationWithoutHistory(newNotation);
    
    // Clear selection after deletion
    clearSelection();
  }, [notation, selection, addToHistory, setNotationWithoutHistory, clearSelection]);
  
  // Handle moving selected notes to a new position
  const handleMoveSelection = useCallback((fromStart: number, fromEnd: number, toPosition: number) => {
    const cleanNotation = notation.replace(/[\s\n]/g, '');
    const selectionLength = fromEnd - fromStart;
    
    // Extract the selected pattern
    const selectedPattern = cleanNotation.slice(fromStart, fromEnd);
    
    addToHistory(notation);
    
    // Helper: "heal" orphaned dashes after removal
    // When we remove the start of a tied note (e.g., "T" from "T---"), 
    // the remaining dashes need to be converted to a proper note.
    const healOrphanedDashes = (notationAfterRemoval: string): string => {
      // The removal was at fromStart in the original notation
      // In notationAfterRemoval, position fromStart might now have orphaned dashes
      // Check if there are orphaned dashes at the removal point
      if (fromStart < notationAfterRemoval.length && notationAfterRemoval[fromStart] === '-') {
        // Find what sound was at the start of the removed selection
        // This tells us what sound the orphaned dashes belong to
        const removedStartChar = cleanNotation[fromStart];
        const soundCharMap: Record<string, string> = {
          'D': 'D', 'd': 'D', 'T': 'T', 't': 'T', 'K': 'K', 'k': 'K', 'S': 'S', 's': 'S'
        };
        const soundChar = soundCharMap[removedStartChar];
        
        if (soundChar) {
          // Replace the first orphaned dash with the sound character
          return notationAfterRemoval.slice(0, fromStart) + soundChar + notationAfterRemoval.slice(fromStart + 1);
        }
      }
      return notationAfterRemoval;
    };
    
    // Strategy: Remove the selection first, then use insertPatternAtPosition
    // which has proper note-breaking logic for inserting in the middle of tied notes.
    
    let newNotation: string;
    let finalInsertPosition: number;
    
    if (toPosition <= fromStart) {
      // Moving BACKWARD: insert at toPosition, then the content between, then after
      // First remove the selection
      let notationWithoutSelection = cleanNotation.slice(0, fromStart) + cleanNotation.slice(fromEnd);
      
      // Heal orphaned dashes if we cut in the middle of a tied note
      notationWithoutSelection = healOrphanedDashes(notationWithoutSelection);
      
      // Insert at the target position using proper note-breaking logic
      newNotation = insertPatternAtPosition(notationWithoutSelection, toPosition, selectedPattern);
      finalInsertPosition = toPosition;
    } else {
      // Moving FORWARD: target is after selection start
      // First, remove the selection
      let notationWithoutSelection = cleanNotation.slice(0, fromStart) + cleanNotation.slice(fromEnd);
      
      // Heal orphaned dashes if we cut in the middle of a tied note
      notationWithoutSelection = healOrphanedDashes(notationWithoutSelection);
      
      // The user clicked at toPosition in the ORIGINAL notation.
      // After removing the selection, positions >= fromEnd have shifted backward.
      // We need to adjust toPosition to account for this shift.
      //
      // If toPosition >= fromEnd: the target was after the selection,
      //   so subtract selectionLength to get the correct position in the intermediate notation.
      // If toPosition is between fromStart and fromEnd: this shouldn't happen (checked earlier),
      //   but if it does, use fromStart as the target.
      if (toPosition >= fromEnd) {
        finalInsertPosition = toPosition - selectionLength;
      } else {
        // toPosition is between fromStart and fromEnd - shouldn't happen
        finalInsertPosition = fromStart;
      }
      
      // Cap to valid range
      finalInsertPosition = Math.max(0, Math.min(finalInsertPosition, notationWithoutSelection.length));
      
      // Use insertPatternAtPosition for proper note-breaking logic
      // This will break any tied note at the insertion point
      newNotation = insertPatternAtPosition(notationWithoutSelection, finalInsertPosition, selectedPattern);
    }
    
    setNotationWithoutHistory(newNotation);
    
    // Update selection to reflect new position
    setSelectionState({
      startCharPosition: finalInsertPosition,
      endCharPosition: finalInsertPosition + selectionLength,
      isSelecting: false,
      anchorPosition: null,
    });
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

  const handleShare = useCallback(async (event?: React.MouseEvent<HTMLButtonElement>) => {
    // Get button position if event is provided
    let position: { top: number; left: number } | null = null;
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      const toastHeight = 60; // Approximate height of toast
      const spacing = 10; // Space between button and toast
      
      // Position toast below the button, centered horizontally
      let top = rect.bottom + spacing;
      
      // If not enough space below (too close to bottom of viewport), position above button instead
      if (top + toastHeight > window.innerHeight - 10) {
        top = rect.top - toastHeight - spacing;
      }
      
      position = {
        top,
        left: rect.left + rect.width / 2, // Center horizontally on button
      };
    }

    try {
      // Copy current URL to clipboard
      await navigator.clipboard.writeText(window.location.href);
      // Show feedback at button position
      if (position) {
        setShareFeedbackPosition(position);
      }
      setShowShareFeedback(true);
      setTimeout(() => {
        setShowShareFeedback(false);
        setShareFeedbackPosition(null);
      }, 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        // Show feedback on success
        if (position) {
          setShareFeedbackPosition(position);
        }
        setShowShareFeedback(true);
        setTimeout(() => {
          setShowShareFeedback(false);
          setShareFeedbackPosition(null);
        }, 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy URL:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }, []);

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
      
      // Delete selection: Delete or Backspace (when not typing)
      // Check for active selection first
      if ((e.key === 'Delete' || e.key === 'Backspace') && 
          selection.startCharPosition !== null && 
          selection.endCharPosition !== null) {
        e.preventDefault();
        handleDeleteSelection();
        return;
      }
      
      // Escape: Clear selection
      if (e.key === 'Escape' && selection.startCharPosition !== null) {
        e.preventDefault();
        clearSelection();
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
  }, [isPlaying, handlePlay, handleStop, undo, redo, handleRandomize, setShowKeyboardHelp, selection, handleDeleteSelection, clearSelection]);

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
            parsedRhythm={parsedRhythm}
            bpm={bpm}
            playbackSettings={playbackSettings}
            metronomeEnabled={metronomeEnabled}
            onClear={handleClear}
            onDeleteLast={handleDeleteLast}
            onUndo={undo}
            onRedo={redo}
            onRandomize={handleRandomize}
            onShare={handleShare}
            canUndo={canUndo}
            canRedo={canRedo}
            downloadFormat={downloadFormat}
            downloadLoops={downloadLoops}
            onDownloadFormatChange={setDownloadFormat}
            onDownloadLoopsChange={setDownloadLoops}
            selection={selection}
          />

          <RhythmDisplay 
            ref={noteDisplayRef}
            rhythm={parsedRhythm} 
            currentNote={currentNote}
            metronomeEnabled={metronomeEnabled}
            currentMetronomeBeat={currentMetronomeBeat}
            onDropPattern={handleDropPattern}
            dragDropMode={dragDropMode}
            notation={notation}
            timeSignature={timeSignature}
            selection={selection}
            onSelectionChange={handleSelectionChange}
            onMoveSelection={handleMoveSelection}
          />

          {/* Sequencer section */}
          <CollapsibleSection title="Sequencer" defaultExpanded={false}>
            <RhythmSequencer
              notation={notation}
              onNotationChange={(newNotation) => {
                addToHistory(notation);
                setNotationWithoutHistory(newNotation);
              }}
              timeSignature={timeSignature}
              parsedRhythm={parsedRhythm}
              currentNote={currentNote}
            />
          </CollapsibleSection>

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
          selection={selection}
          selectionDuration={selectionDuration}
          onReplaceSelection={handleReplaceSelection}
        />
      </aside>
      <KeyboardShortcutsHelp 
        isOpen={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />
      
      {/* Share feedback toast */}
      {showShareFeedback && shareFeedbackPosition && (
        <div
          className="share-feedback-toast"
          style={{
            position: 'fixed',
            top: `${shareFeedbackPosition.top}px`,
            left: `${shareFeedbackPosition.left}px`,
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--primary-purple)',
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeInOut 2s ease-in-out',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>check_circle</span>
          <span style={{ fontWeight: 500 }}>URL copied to clipboard!</span>
        </div>
      )}
    </div>
  );
};

export default App;

