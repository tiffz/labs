import React, { useState, useRef, useEffect } from 'react';
import type { TimeSignature, ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import { getSixteenthsPerMeasure } from '../utils/timeSignatureUtils';
import RhythmPresets from './RhythmPresets';
import DownloadDropdown from './DownloadDropdown';
import DrumTabImportModal from './DrumTabImportModal';
import { isDrumTab } from '../utils/drumTabParser';

/** Selection state for syncing with display */
interface SelectionState {
  startCharPosition: number | null;
  endCharPosition: number | null;
  isSelecting: boolean;
}

interface RhythmInputProps {
  notation: string;
  onNotationChange: (notation: string) => void;
  timeSignature: TimeSignature;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  parsedRhythm: ParsedRhythm;
  bpm: number;
  playbackSettings: PlaybackSettings;
  metronomeEnabled: boolean;
  onClear: () => void;
  onDeleteLast: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRandomize: () => void;
  onShare: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  canUndo: boolean;
  canRedo: boolean;
  downloadFormat: 'wav' | 'mp3';
  downloadLoops: number;
  onDownloadFormatChange: (format: 'wav' | 'mp3') => void;
  onDownloadLoopsChange: (loops: number) => void;
  /** Current selection state from display */
  selection?: SelectionState | null;
}

const RhythmInput: React.FC<RhythmInputProps> = ({
  notation,
  onNotationChange,
  timeSignature,
  onTimeSignatureChange,
  parsedRhythm,
  bpm,
  playbackSettings,
  metronomeEnabled,
  onClear,
  onDeleteLast,
  onUndo,
  onRedo,
  onRandomize,
  onShare,
  canUndo,
  canRedo,
  downloadFormat,
  downloadLoops,
  onDownloadFormatChange,
  onDownloadLoopsChange,
  selection,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showDrumTabModal, setShowDrumTabModal] = useState(false);
  const [pastedDrumTab, setPastedDrumTab] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  
  // Sync selection from display to textarea
  useEffect(() => {
    if (!inputRef.current) return;
    
    // Handle clearing selection
    if (!selection || selection.startCharPosition === null || selection.endCharPosition === null) {
      // Don't clear textarea selection - let user manage their own textarea selection
      return;
    }
    
    // Map clean notation position to textarea position (accounting for whitespace)
    const cleanToTextareaPosition = (cleanPos: number): number => {
      let cleanIndex = 0;
      let textareaIndex = 0;
      
      while (cleanIndex < cleanPos && textareaIndex < notation.length) {
        const char = notation[textareaIndex];
        if (char !== ' ' && char !== '\n') {
          cleanIndex++;
        }
        textareaIndex++;
      }
      
      return textareaIndex;
    };
    
    const textareaStart = cleanToTextareaPosition(selection.startCharPosition);
    const textareaEnd = cleanToTextareaPosition(selection.endCharPosition);
    
    // Focus the textarea before setting selection range so it's visible
    // But only if we're not currently selecting (to avoid stealing focus during drag)
    if (!selection.isSelecting && document.activeElement !== inputRef.current) {
      // Don't focus - just update the selection if it has focus already
      // This avoids jarring focus changes
    }
    
    // Always update the selection range (the browser will show it when focused)
    inputRef.current.setSelectionRange(textareaStart, textareaEnd);
  }, [selection, notation]);

  // Validate and filter input to only allow valid notation characters
  const handleNotationChange = (value: string) => {
    // Only allow: D, d, T, t, K, k, S, s (slap), _ (rest), - (extend), space, and newline
    const validChars = /^[DdTtKkSs_\-\s\n]*$/;
    if (validChars.test(value)) {
      onNotationChange(value);
    }
    // If invalid characters are present, ignore the change
  };

  // Handle paste events to detect drum tab format
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Check if the pasted content looks like a drum tab
    if (isDrumTab(pastedText)) {
      e.preventDefault(); // Don't paste the raw text
      setPastedDrumTab(pastedText);
      setShowDrumTabModal(true);
    }
    // Otherwise, let the normal paste handling occur
  };

  // Handle drum tab import confirmation
  const handleDrumTabImport = (convertedNotation: string) => {
    onNotationChange(convertedNotation);
    setShowDrumTabModal(false);
    setPastedDrumTab('');
  };

  // Handle drum tab import cancellation
  const handleDrumTabCancel = () => {
    setShowDrumTabModal(false);
    setPastedDrumTab('');
  };

  // Auto-resize textarea on mount and when notation changes
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      // Only resize if focused
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (inputRef.current && document.activeElement === inputRef.current) {
            inputRef.current.style.height = 'auto';
            const scrollHeight = inputRef.current.scrollHeight;
            inputRef.current.style.height = `${Math.max(scrollHeight, 2.5 * 16)}px`;
          }
        });
      });
    }
  }, [notation]);

  // Auto-format notation to put 2 measures per line (matching VexFlow display)
  const handleBlur = () => {
    if (!notation) return;

    const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);

    let formatted = '';
    let positionInMeasure = 0;
    let measureCount = 0;
    let i = 0;

    // Remove all existing spaces and newlines first
    const cleanedNotation = notation.replace(/[\s\n]/g, '');

    while (i < cleanedNotation.length) {
      const char = cleanedNotation[i];

      // Check if it's a note character (D, T, K, S, _)
      if (char === 'D' || char === 'd' || char === 'T' || char === 't' || 
          char === 'K' || char === 'k' || char === 'S' || char === 's' || char === '_') {
        
        // Calculate duration of this note
        let duration = 1;
        let j = i + 1;
        
        if (char === '_') {
          // Count consecutive underscores for rests
          while (j < cleanedNotation.length && cleanedNotation[j] === '_') {
            duration++;
            j++;
          }
        } else {
          // Count consecutive dashes for notes
          while (j < cleanedNotation.length && cleanedNotation[j] === '-') {
            duration++;
            j++;
          }
        }

        // Check if adding this note would exceed the measure
        if (positionInMeasure + duration > sixteenthsPerMeasure) {
          // Complete current measure with space
          if (formatted.length > 0 && !formatted.endsWith(' ') && !formatted.endsWith('\n')) {
            formatted += ' ';
          }
          measureCount++;
          
          // Add newline after every 2 measures
          if (measureCount % 2 === 0) {
            formatted = formatted.trimEnd() + '\n';
          }
          
          positionInMeasure = 0;
        }

        // Add this note and its dashes
        for (let k = i; k < j; k++) {
          formatted += cleanedNotation[k];
        }

        positionInMeasure += duration;

        // Add space after completing a measure (but newline every 2 measures)
        if (positionInMeasure === sixteenthsPerMeasure) {
          measureCount++;
          
          if (measureCount % 2 === 0) {
            // After 2nd, 4th, 6th measure, etc: add newline
            formatted += '\n';
          } else {
            // After 1st, 3rd, 5th measure, etc: add space
            formatted += ' ';
          }
          
          positionInMeasure = 0;
        }

        i = j;
      } else {
        // Unknown character (shouldn't happen with validation)
        formatted += char;
        i++;
      }
    }

    // Trim trailing whitespace
    formatted = formatted.replace(/[\s\n]+$/, '');

    // Only update if formatting changed something
    if (formatted !== notation) {
      onNotationChange(formatted);
    }
  };


  return (
    <div className="input-section">
      <div className="input-section-content">
        <div className="input-header">
          <div className="input-label-group">
            <label className="input-label" htmlFor="rhythm-notation-input">
              Rhythm Notation
            </label>
          <button
            className="help-button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            type="button"
            aria-label="Show notation help"
          >
            ?
          </button>
          {showTooltip && (
            <div 
              className="tooltip"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="tooltip-title">Notation Guide</div>
              
              <div className="tooltip-section">
                <strong>Drum Sounds:</strong>
                <div className="tooltip-symbols">
                  <div className="tooltip-symbol-item">
                    <svg width="20" height="26" viewBox="-2 -10 16 30">
                      <path 
                        d="M 6 -7 Q -2 -7, -2 0 Q -2 7, 6 7 L 6 13" 
                        stroke="black" 
                        strokeWidth="2" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span><code>D</code> = Dum (bass)</span>
                  </div>
                  <div className="tooltip-symbol-item">
                    <svg width="16" height="16" viewBox="-8 -8 16 16">
                      <path 
                        d="M -6 6 L 0 -6 L 6 6" 
                        stroke="black" 
                        strokeWidth="2" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="miter"
                      />
                    </svg>
                    <span><code>T</code> = Tak (high)</span>
                  </div>
                  <div className="tooltip-symbol-item">
                    <svg width="16" height="16" viewBox="-8 -8 16 16">
                      <path 
                        d="M -6 -6 L 0 6 L 6 -6" 
                        stroke="black" 
                        strokeWidth="2" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="miter"
                      />
                    </svg>
                    <span><code>K</code> = Ka (high)</span>
                  </div>
                  <div className="tooltip-symbol-item">
                    <svg width="16" height="16" viewBox="-8 -8 16 16">
                      <circle 
                        cx="0" 
                        cy="0" 
                        r="7" 
                        fill="black" 
                        stroke="none"
                      />
                    </svg>
                    <span><code>S</code> = Slap (accented)</span>
                  </div>
                  <div className="tooltip-symbol-item">
                    <span><code>_</code> = Rest (silence)</span>
                  </div>
                </div>
              </div>
              
              <div className="tooltip-section">
                <strong>Duration:</strong>
                <div className="tooltip-row">Add dashes (<code>-</code>) to extend duration</div>
                <div className="tooltip-row">Each character = 16th note</div>
              </div>
              <div className="tooltip-section">
                <strong>Dotted Notes:</strong>
                <div className="tooltip-row"><code>D--</code> = dotted 8th (3 sixteenths)</div>
                <div className="tooltip-row"><code>D-----</code> = dotted quarter (6 sixteenths)</div>
              </div>
              <div className="tooltip-attribution">
                Notation from <a href="http://www.khafif.com/rhy/" target="_blank" rel="noopener noreferrer">Khafif Middle Eastern Rhythms</a>, <a href="https://www.amirschoolofmusic.com/store/p/pdf-mastering-darbuka-1" target="_blank" rel="noopener noreferrer">Mastering Darbuka</a>, and <a href="https://en.wikipedia.org/wiki/Dumbek_rhythms#Notation" target="_blank" rel="noopener noreferrer">Dumbek rhythms</a>
              </div>
            </div>
          )}
        </div>
        
        {/* Edit Controls */}
        <div className="rhythm-edit-controls">
          <RhythmPresets
            onSelectPreset={(notation, ts) => {
              onNotationChange(notation);
              onTimeSignatureChange(ts);
            }}
            onImportDrumTab={() => {
              setPastedDrumTab('');
              setShowDrumTabModal(true);
            }}
          />
          <div className="icon-button-group">
            <button
              className="icon-button"
              onClick={(e) => onShare(e)}
              type="button"
              aria-label="Share rhythm"
              data-tooltip="Share"
            >
              <span className="material-symbols-outlined">share</span>
            </button>
            <div style={{ position: 'relative' }}>
              <button
                ref={downloadButtonRef}
                className="icon-button"
                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                type="button"
                aria-label="Download rhythm"
                data-tooltip="Download"
              >
                <span className="material-symbols-outlined">download</span>
              </button>
              {showDownloadDropdown && (
                <DownloadDropdown
                  rhythm={parsedRhythm}
                  notation={notation}
                  bpm={bpm}
                  playbackSettings={playbackSettings}
                  metronomeEnabled={metronomeEnabled}
                  isOpen={showDownloadDropdown}
                  onClose={() => setShowDownloadDropdown(false)}
                  buttonRef={downloadButtonRef}
                  format={downloadFormat}
                  loops={downloadLoops}
                  onFormatChange={onDownloadFormatChange}
                  onLoopsChange={onDownloadLoopsChange}
                />
              )}
            </div>
            <button
              className="icon-button"
              onClick={onRandomize}
              type="button"
              aria-label="Randomize rhythm"
              data-tooltip="Randomize"
            >
              <span className="material-symbols-outlined">shuffle</span>
            </button>
            <button
              className="icon-button"
              onClick={onUndo}
              type="button"
              disabled={!canUndo}
              aria-label="Undo"
              data-tooltip="Undo"
            >
              <span className="material-symbols-outlined">undo</span>
            </button>
            <button
              className="icon-button"
              onClick={onRedo}
              type="button"
              disabled={!canRedo}
              aria-label="Redo"
              data-tooltip="Redo"
            >
              <span className="material-symbols-outlined">redo</span>
            </button>
            <button
              className="icon-button"
              onClick={onDeleteLast}
              type="button"
              disabled={notation.length === 0}
              aria-label="Delete last note"
              data-tooltip="Delete Last Note"
            >
              <span className="material-symbols-outlined">backspace</span>
            </button>
            <button
              className="icon-button icon-button-danger"
              onClick={onClear}
              type="button"
              disabled={notation.length === 0}
              aria-label="Clear rhythm"
              data-tooltip="Clear"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Input field */}
      <div className="rhythm-input-container">
        <textarea
          ref={inputRef}
          id="rhythm-notation-input"
          className="input-field input-field-expandable"
          value={notation}
          onPaste={handlePaste}
          onChange={(e) => {
            handleNotationChange(e.target.value);
            // Auto-resize textarea if focused
            if (inputRef.current && document.activeElement === inputRef.current) {
              requestAnimationFrame(() => {
                if (inputRef.current && document.activeElement === inputRef.current) {
                  inputRef.current.style.height = 'auto';
                  const scrollHeight = inputRef.current.scrollHeight;
                  inputRef.current.style.height = `${Math.max(scrollHeight, 2.5 * 16)}px`;
                }
              });
            }
          }}
          onBlur={() => {
            handleBlur();
            // Collapse to single line on blur
            if (inputRef.current) {
              inputRef.current.style.height = '2.5rem';
            }
          }}
          onFocus={() => {
            // Expand on focus to 4 lines tall
            if (inputRef.current) {
              inputRef.current.style.height = '6rem'; // ~4 lines (1.5rem per line)
            }
          }}
          placeholder="D-T-__T-D---T---"
          spellCheck={false}
          rows={1}
        />
        {/* Visual feedback is handled by the canvas preview - no separate UI here */}
      </div>
      </div>

      {/* Drum Tab Import Modal */}
      {showDrumTabModal && (
        <DrumTabImportModal
          rawTabText={pastedDrumTab}
          onImport={handleDrumTabImport}
          onCancel={handleDrumTabCancel}
        />
      )}
    </div>
  );
};

export default RhythmInput;


