import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import SimpleVexFlowNote from './SimpleVexFlowNote';
import { parsePatternToNotes } from '../utils/notationHelpers';
import { audioPlayer } from '../utils/audioPlayer';
import { COMMON_PATTERNS } from '../data/commonPatterns';
import { getPatternDuration } from '../utils/dragAndDrop';
import type { TimeSignature } from '../types';

/** Selection state for notes */
interface SelectionState {
  startCharPosition: number | null;
  endCharPosition: number | null;
  isSelecting: boolean;
}

interface NotePaletteProps {
  onInsertPattern: (pattern: string) => void;
  remainingBeats: number;
  timeSignature: TimeSignature;
  dragDropMode?: 'replace' | 'insert';
  onDragDropModeChange?: (mode: 'replace' | 'insert') => void;
  /** Current selection state */
  selection?: SelectionState | null;
  /** Duration of current selection in sixteenths */
  selectionDuration?: number;
  /** Callback to replace selection with a pattern */
  onReplaceSelection?: (pattern: string) => void;
  /** Callback to return focus to the notation area (for Escape key) */
  onRequestNotationFocus?: () => void;
}

/** Handle exposed by NotePalette for imperative focus */
export interface NotePaletteHandle {
  focusFirstButton: () => void;
}

// Duration labels for screen readers
const DURATION_LABELS: Record<number, string> = {
  1: 'sixteenth',
  2: 'eighth',
  3: 'dotted eighth',
  4: 'quarter',
  6: 'dotted quarter',
};

// Global variable to store currently dragged pattern (accessible during dragover)
let currentDraggedPattern: string | null = null;

// Handle drag start for pattern buttons
const handleDragStart = (e: React.DragEvent, pattern: string) => {
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', pattern);
  e.dataTransfer.setData('application/darbuka-pattern', pattern);
  // Store pattern globally so it can be accessed during dragover
  currentDraggedPattern = pattern;
  // Add visual feedback
  if (e.currentTarget instanceof HTMLElement) {
    e.currentTarget.style.opacity = '0.5';
  }
};

const handleDragEnd = (e: React.DragEvent) => {
  // Clear global pattern
  currentDraggedPattern = null;
  // Restore opacity
  if (e.currentTarget instanceof HTMLElement) {
    e.currentTarget.style.opacity = '1';
  }
};

// Export function to get current dragged pattern
// eslint-disable-next-line react-refresh/only-export-components
export const getCurrentDraggedPattern = (): string | null => currentDraggedPattern;

// Single note patterns organized by duration (rows) and sound (columns)
// Using Noto Music font for proper rendering of music symbols
// Duration in sixteenths: 1=sixteenth, 2=eighth, 3=dotted eighth, 4=quarter, 6=dotted quarter
// Unicode rest symbols (U+1D100–U+1D1FF):
// U+1D13B (𝄻) = Whole rest, U+1D13C (𝄼) = Half rest, U+1D13D (𝄽) = Quarter rest
// U+1D13E (𝄾) = Eighth rest, U+1D13F (𝄿) = Sixteenth rest
const SINGLE_NOTE_TABLE = {
  rows: [
    { noteSymbol: '𝅘𝅥.', restSymbol: '𝄽.', duration: 6 },  // Dotted quarter note / dotted quarter rest (quarter rest + dot)
    { noteSymbol: '𝅘𝅥', restSymbol: '𝄽', duration: 4 },   // Quarter note / quarter rest (U+1D13D)
    { noteSymbol: '𝅘𝅥𝅮.', restSymbol: '𝄾.', duration: 3 },  // Dotted eighth note / dotted eighth rest
    { noteSymbol: '𝅘𝅥𝅮', restSymbol: '𝄾', duration: 2 },   // Eighth note / eighth rest (U+1D13E)
    { noteSymbol: '𝅘𝅥𝅯', restSymbol: '𝄿', duration: 1 },   // Sixteenth note / sixteenth rest (U+1D13F)
  ],
  columns: [
    { sound: 'D', label: 'Dum', isRest: false },
    { sound: 'T', label: 'Tak', isRest: false },
    { sound: 'K', label: 'Ka', isRest: false },
    { sound: 'S', label: 'Slap', isRest: false },
    { sound: '_', label: 'Rest', isRest: true },
  ],
};

// Common drum patterns are now imported from data/commonPatterns.ts

const NotePalette = forwardRef<NotePaletteHandle, NotePaletteProps>(({ 
  onInsertPattern, 
  remainingBeats,
  dragDropMode = 'replace',
  onDragDropModeChange,
  selection,
  selectionDuration = 0,
  onReplaceSelection,
  onRequestNotationFocus,
}, ref) => {
  const [soundPreviewEnabled, setSoundPreviewEnabled] = useState(false);
  
  // Keyboard navigation state for single notes grid (row, col)
  const [gridFocus, setGridFocus] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  // Keyboard navigation state for common patterns
  const [patternFocus, setPatternFocus] = useState<number>(0);
  // Which section is currently focused: 'grid' | 'patterns' | null
  const [activeSection, setActiveSection] = useState<'grid' | 'patterns' | null>(null);
  
  // Refs for buttons
  const gridButtonRefs = useRef<(HTMLButtonElement | null)[][]>([]);
  const patternButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize grid refs
  if (gridButtonRefs.current.length === 0) {
    gridButtonRefs.current = SINGLE_NOTE_TABLE.rows.map(() => 
      new Array(SINGLE_NOTE_TABLE.columns.length).fill(null)
    );
  }
  
  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focusFirstButton: () => {
      // Find the first non-disabled button in the grid
      for (let rowIdx = 0; rowIdx < gridButtonRefs.current.length; rowIdx++) {
        const row = gridButtonRefs.current[rowIdx];
        if (!row) continue;
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const button = row[colIdx];
          if (button && !button.disabled) {
            setActiveSection('grid');
            setGridFocus({ row: rowIdx, col: colIdx });
            button.focus();
            return;
          }
        }
      }
      
      // Fallback: query for first non-disabled button in grid container
      if (gridContainerRef.current) {
        const button = gridContainerRef.current.querySelector('button:not([disabled])') as HTMLButtonElement;
        if (button) {
          setActiveSection('grid');
          setGridFocus({ row: 0, col: 0 });
          button.focus();
        }
      }
    }
  }), []);
  
  // Check if there's an active selection
  const hasSelection = selection && 
    selection.startCharPosition !== null && 
    selection.endCharPosition !== null &&
    selection.startCharPosition !== selection.endCharPosition;
  
  // Announce to screen readers
  const announce = useCallback((message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, []);

  // Helper to create pattern string
  const createPattern = useCallback((sound: string, duration: number): string => {
    if (duration === 1) return sound;
    if (sound === '_') {
      return '_'.repeat(duration);
    }
    return sound + '-'.repeat(duration - 1);
  }, []);

  // Check if pattern can be added (either to end, or fits in selection)
  const canAddPattern = useCallback((patternDuration: number): boolean => {
    if (hasSelection) {
      // With selection: pattern must fit within the selection duration
      return patternDuration <= selectionDuration;
    }
    // Without selection: check if pattern fits in remaining beats
    return patternDuration <= remainingBeats;
  }, [hasSelection, selectionDuration, remainingBeats]);
  
  // Check if pattern is an exact match for selection duration
  const isExactFit = (patternDuration: number): boolean => {
    return hasSelection && patternDuration === selectionDuration;
  };

  // Play preview of pattern sounds
  const playPatternPreview = (pattern: string) => {
    if (!soundPreviewEnabled) return;

    const notes = parsePatternToNotes(pattern);
    let delay = 0;
    const msPerSixteenth = 150; // Fast preview tempo

    notes.forEach(note => {
      setTimeout(() => {
        // Play with default volume (1.0) for preview
        audioPlayer.play(note.sound, 1.0);
      }, delay);
      delay += note.duration * msPerSixteenth;
    });
  };

  const handleInsertPattern = (pattern: string) => {
    playPatternPreview(pattern);
    
    // If there's a selection and a replace handler, use replace mode
    if (hasSelection && onReplaceSelection) {
      onReplaceSelection(pattern);
      // Return focus to notation after replacement
      if (onRequestNotationFocus) {
        onRequestNotationFocus();
      }
    } else {
      // Otherwise, insert at end
      onInsertPattern(pattern);
    }
  };

  // Get description of a pattern for screen readers
  const getPatternDescription = useCallback((pattern: string, duration: number): string => {
    const durationLabel = DURATION_LABELS[duration] || `${duration} sixteenths`;
    const isDisabled = !canAddPattern(duration);
    const action = hasSelection ? 'replace selection' : 'insert';
    
    if (isDisabled) {
      return `${pattern}, ${durationLabel}, disabled - pattern too long`;
    }
    return `${pattern}, ${durationLabel}. Press Enter to ${action}.`;
  }, [hasSelection, canAddPattern]);

  // Keyboard handler for the single notes grid
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { key } = e;
    
    const numRows = SINGLE_NOTE_TABLE.rows.length;
    const numCols = SINGLE_NOTE_TABLE.columns.length;
    
    let newRow = gridFocus.row;
    let newCol = gridFocus.col;
    
    switch (key) {
      case 'ArrowUp':
        e.preventDefault();
        newRow = (gridFocus.row - 1 + numRows) % numRows;
        break;
      case 'ArrowDown':
        e.preventDefault();
        newRow = (gridFocus.row + 1) % numRows;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newCol = (gridFocus.col - 1 + numCols) % numCols;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newCol = (gridFocus.col + 1) % numCols;
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const btn = gridButtonRefs.current[gridFocus.row]?.[gridFocus.col];
        if (btn && !btn.disabled) {
          btn.click();
        }
        return;
      }
      case 'Tab':
        if (!e.shiftKey) {
          // Tab to patterns section - focus first pattern button (even if disabled)
          e.preventDefault();
          setActiveSection('patterns');
          setPatternFocus(0);
          patternButtonRefs.current[0]?.focus();
        }
        return;
      case 'Escape':
        e.preventDefault();
        // Return focus to notation area
        setActiveSection(null);
        if (onRequestNotationFocus) {
          onRequestNotationFocus();
        } else {
          (e.currentTarget as HTMLElement).blur();
        }
        return;
      default:
        return;
    }
    
    if (newRow !== gridFocus.row || newCol !== gridFocus.col) {
      setGridFocus({ row: newRow, col: newCol });
      gridButtonRefs.current[newRow]?.[newCol]?.focus();
      
      // Announce the new position
      const row = SINGLE_NOTE_TABLE.rows[newRow];
      const col = SINGLE_NOTE_TABLE.columns[newCol];
      const pattern = createPattern(col.sound, row.duration);
      announce(getPatternDescription(pattern, row.duration));
    }
  }, [gridFocus, announce, getPatternDescription, createPattern, onRequestNotationFocus]);

  // Keyboard handler for the common patterns section
  const handlePatternsKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { key } = e;
    const numPatterns = COMMON_PATTERNS.length;
    
    let newIndex = patternFocus;
    
    switch (key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = (patternFocus - 1 + numPatterns) % numPatterns;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = (patternFocus + 1) % numPatterns;
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const btn = patternButtonRefs.current[patternFocus];
        if (btn && !btn.disabled) {
          btn.click();
        }
        return;
      }
      case 'Tab':
        if (e.shiftKey) {
          // Shift+Tab back to grid section - find a non-disabled button
          e.preventDefault();
          setActiveSection('grid');
          // Try to focus the last focused grid position, or find first non-disabled
          const currentBtn = gridButtonRefs.current[gridFocus.row]?.[gridFocus.col];
          if (currentBtn && !currentBtn.disabled) {
            currentBtn.focus();
          } else {
            // Find first non-disabled button in grid
            for (let r = 0; r < gridButtonRefs.current.length; r++) {
              const row = gridButtonRefs.current[r];
              if (!row) continue;
              for (let c = 0; c < row.length; c++) {
                const innerBtn = row[c];
                if (innerBtn && !innerBtn.disabled) {
                  setGridFocus({ row: r, col: c });
                  innerBtn.focus();
                  return;
                }
              }
            }
          }
        }
        return;
      case 'Escape':
        e.preventDefault();
        // Return focus to notation area
        setActiveSection(null);
        if (onRequestNotationFocus) {
          onRequestNotationFocus();
        } else {
          (e.currentTarget as HTMLElement).blur();
        }
        return;
      default:
        return;
    }
    
    if (newIndex !== patternFocus) {
      setPatternFocus(newIndex);
      patternButtonRefs.current[newIndex]?.focus();
      
      // Announce the new pattern
      const pattern = COMMON_PATTERNS[newIndex];
      const duration = getPatternDuration(pattern);
      announce(getPatternDescription(pattern, duration));
    }
  }, [patternFocus, gridFocus, announce, getPatternDescription, onRequestNotationFocus]);

  // Handle focus entering the grid section
  const handleGridFocus = useCallback(() => {
    setActiveSection('grid');
    if (hasSelection) {
      announce(`Single notes grid. Selection is ${selectionDuration} sixteenths. Use arrow keys to navigate, Enter to replace.`);
    }
  }, [hasSelection, selectionDuration, announce]);

  // Handle focus entering the patterns section
  const handlePatternsFocus = useCallback(() => {
    setActiveSection('patterns');
    if (hasSelection) {
      announce(`Common patterns. Selection is ${selectionDuration} sixteenths. Use arrow keys to navigate, Enter to replace.`);
    }
  }, [hasSelection, selectionDuration, announce]);

  return (
    <div className={`note-palette ${hasSelection ? 'has-selection' : ''}`}>
      {/* ARIA live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
      
      <div className="palette-header">
        <div className="palette-title-group">
          <h3>Note Palette</h3>
          <p className="palette-subtitle">
            {hasSelection 
              ? `Click to replace selection (${selectionDuration} sixteenths)`
              : 'Click or drag and drop to insert patterns'}
          </p>
        </div>
        <div className="palette-controls">
          <div className="palette-controls-group">
            <label className="sound-preview-toggle">
              <input
                type="checkbox"
                checked={soundPreviewEnabled}
                onChange={(e) => setSoundPreviewEnabled(e.target.checked)}
              />
              <span>Sound preview</span>
            </label>
            {onDragDropModeChange && (
              <button
                type="button"
                className="drag-drop-mode-toggle"
                onClick={() => onDragDropModeChange(dragDropMode === 'replace' ? 'insert' : 'replace')}
                data-tooltip={dragDropMode === 'replace' ? 'Replace mode' : 'Insert mode'}
                aria-label={`${dragDropMode === 'replace' ? 'Replace' : 'Insert'} mode - Click to toggle`}
              >
                <span className="material-symbols-outlined">
                  {dragDropMode === 'replace' ? 'swap_horiz' : 'add_circle'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="palette-section single-notes-section">
        <h4 className="palette-section-title" id="single-notes-label">Single Notes</h4>
        <div 
          ref={gridContainerRef}
          className="note-table"
          role="grid"
          aria-labelledby="single-notes-label"
          onFocus={handleGridFocus}
        >
        <table role="presentation">
          <thead>
            <tr>
              {SINGLE_NOTE_TABLE.columns.map((col, idx) => (
                <th key={idx} className="symbol-header">
                  {col.sound === 'D' && (
                    <svg width="16" height="24" viewBox="-2 -10 16 30">
                      <path 
                        d="M 6 -7 Q -2 -7, -2 0 Q -2 7, 6 7 L 6 13" 
                        stroke="black" 
                        strokeWidth="1.8" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {col.sound === 'T' && (
                    <svg width="16" height="16" viewBox="-8 -8 16 16">
                      <path 
                        d="M -6 6 L 0 -6 L 6 6" 
                        stroke="black" 
                        strokeWidth="1.8" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="miter"
                      />
                    </svg>
                  )}
                  {col.sound === 'K' && (
                    <svg width="16" height="16" viewBox="-8 -8 16 16">
                      <path 
                        d="M -6 -6 L 0 6 L 6 -6" 
                        stroke="black" 
                        strokeWidth="1.8" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="miter"
                      />
                    </svg>
                  )}
                  {col.sound === 'S' && (
                    <svg width="16" height="16" viewBox="-8 -8 16 16">
                      <circle 
                        cx="0" 
                        cy="0" 
                        r="7" 
                        fill="black" 
                        stroke="none"
                      />
                    </svg>
                  )}
                  {col.sound === '.' && <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>Rest</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SINGLE_NOTE_TABLE.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {SINGLE_NOTE_TABLE.columns.map((col, colIdx) => {
                  const pattern = createPattern(col.sound, row.duration);
                  const isDisabled = !canAddPattern(row.duration);
                  
                  // Use rest symbol for rest column, note symbol for others
                  const displaySymbol = col.isRest ? row.restSymbol : row.noteSymbol;
                  
                  const exactFit = isExactFit(row.duration);
                  const titleText = hasSelection 
                    ? (isDisabled 
                        ? 'Pattern too long for selection' 
                        : exactFit 
                          ? `Replace selection with ${col.label}` 
                          : `Replace part of selection with ${col.label}`)
                    : (isDisabled 
                        ? 'Click disabled (would exceed measure length), but drag and drop still works' 
                        : `Insert ${displaySymbol} ${col.label}`);
                  
                  const isFocused = activeSection === 'grid' && gridFocus.row === rowIdx && gridFocus.col === colIdx;
                  const durationLabel = DURATION_LABELS[row.duration] || `${row.duration} sixteenths`;
                  const ariaLabel = `${col.label} ${durationLabel}${isDisabled ? ', disabled' : ''}`;
                  
                  return (
                    <td key={colIdx} role="gridcell">
                        <button
                          ref={(el) => {
                            if (!gridButtonRefs.current[rowIdx]) {
                              gridButtonRefs.current[rowIdx] = [];
                            }
                            gridButtonRefs.current[rowIdx][colIdx] = el;
                          }}
                          className={`palette-button-simple notation-button ${hasSelection ? 'selection-mode' : ''} ${exactFit ? 'exact-fit' : ''}`}
                          onClick={() => !isDisabled && handleInsertPattern(pattern)}
                          onKeyDown={handleGridKeyDown}
                          onDragStart={(e) => {
                            // Always allow drag and drop, even if clicking is disabled
                            // Drag and drop can replace notes or insert in the middle, not just at the end
                            handleDragStart(e, pattern);
                          }}
                          onDragEnd={handleDragEnd}
                          draggable={true}
                          disabled={isDisabled}
                          title={titleText}
                          tabIndex={isFocused ? 0 : -1}
                          aria-label={ariaLabel}
                        >
                        <span className="note-symbol">{displaySymbol}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="palette-section common-patterns-section">
        <h4 className="palette-section-title" id="common-patterns-label">Common Patterns</h4>
      <div 
        className="palette-grid common-patterns"
        role="toolbar"
        aria-labelledby="common-patterns-label"
        onFocus={handlePatternsFocus}
      >
        {COMMON_PATTERNS.map((pattern, index) => {
          const duration = getPatternDuration(pattern);
          const isDisabled = !canAddPattern(duration);
          const exactFit = isExactFit(duration);
          const isFocused = activeSection === 'patterns' && patternFocus === index;
          const durationLabel = DURATION_LABELS[duration] || `${duration} sixteenths`;
          const titleText = hasSelection
            ? (isDisabled
                ? 'Pattern too long for selection'
                : exactFit
                  ? `Replace selection with ${pattern}`
                  : `Replace part of selection with ${pattern}`)
            : (isDisabled
                ? 'Click disabled (would exceed measure length), but drag and drop still works'
                : `Insert ${pattern}`);
          
          return (
            <button
              key={index}
              ref={(el) => { patternButtonRefs.current[index] = el; }}
              className={`palette-button notation-button ${hasSelection ? 'selection-mode' : ''} ${exactFit ? 'exact-fit' : ''}`}
              onClick={() => !isDisabled && handleInsertPattern(pattern)}
              onKeyDown={handlePatternsKeyDown}
              onDragStart={(e) => {
                // Always allow drag and drop, even if clicking is disabled
                // Drag and drop can replace notes or insert in the middle, not just at the end
                handleDragStart(e, pattern);
              }}
              onDragEnd={handleDragEnd}
              draggable={true}
              disabled={isDisabled}
              title={titleText}
              tabIndex={isFocused ? 0 : -1}
              aria-label={`Pattern ${pattern}, ${durationLabel}${isDisabled ? ', disabled' : ''}`}
            >
              <SimpleVexFlowNote pattern={pattern} width={85} height={60} />
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
});

NotePalette.displayName = 'NotePalette';

export default NotePalette;

