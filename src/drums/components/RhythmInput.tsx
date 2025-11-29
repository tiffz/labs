import React, { useState, useRef } from 'react';
import type { TimeSignature } from '../types';
import RhythmPresets from './RhythmPresets';

interface RhythmInputProps {
  notation: string;
  onNotationChange: (notation: string) => void;
  timeSignature: TimeSignature;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  onClear: () => void;
  onDeleteLast: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRandomize: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const RhythmInput: React.FC<RhythmInputProps> = ({
  notation,
  onNotationChange,
  timeSignature,
  onTimeSignatureChange,
  onClear,
  onDeleteLast,
  onUndo,
  onRedo,
  onRandomize,
  canUndo,
  canRedo,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Validate and filter input to only allow valid notation characters
  const handleNotationChange = (value: string) => {
    // Only allow: D, d, T, t, K, k, _ (rest), - (extend), space, and newline
    const validChars = /^[DdTtKk_\-\s\n]*$/;
    if (validChars.test(value)) {
      onNotationChange(value);
    }
    // If invalid characters are present, ignore the change
  };

  // Auto-format notation to put 2 measures per line (matching VexFlow display)
  const handleBlur = () => {
    if (!notation) return;

    const sixteenthsPerMeasure = timeSignature.denominator === 8
      ? timeSignature.numerator * 2
      : timeSignature.numerator * 4;

    let formatted = '';
    let positionInMeasure = 0;
    let measureCount = 0;
    let i = 0;

    // Remove all existing spaces and newlines first
    const cleanedNotation = notation.replace(/[\s\n]/g, '');

    while (i < cleanedNotation.length) {
      const char = cleanedNotation[i];

      // Check if it's a note character (D, T, K, _)
      if (char === 'D' || char === 'd' || char === 'T' || char === 't' || 
          char === 'K' || char === 'k' || char === '_') {
        
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
          />
          <div className="icon-button-group">
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
              className="input-field"
              value={notation}
              onChange={(e) => handleNotationChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="D-T-__T-D---T---"
              spellCheck={false}
              rows={3}
            />
            {/* Visual feedback is handled by the canvas preview - no separate UI here */}
          </div>
    </div>
  );
};

export default RhythmInput;


