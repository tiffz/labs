import React, { useState } from 'react';
import type { TimeSignature } from '../types';
import RhythmPresets from './RhythmPresets';

interface RhythmInputProps {
  notation: string;
  onNotationChange: (notation: string) => void;
  timeSignature: TimeSignature;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
}

const RhythmInput: React.FC<RhythmInputProps> = ({
  notation,
  onNotationChange,
  timeSignature,
  onTimeSignatureChange,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleNumeratorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTimeSignatureChange({
      ...timeSignature,
      numerator: parseInt(e.target.value, 10),
    });
  };

  const handleDenominatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTimeSignatureChange({
      ...timeSignature,
      denominator: parseInt(e.target.value, 10),
    });
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
                <strong>Basic Sounds:</strong>
                <div className="tooltip-row"><code>D</code> = Dum (bass)</div>
                <div className="tooltip-row"><code>T</code> = Tak (high)</div>
                <div className="tooltip-row"><code>K</code> = Ka (high)</div>
                <div className="tooltip-row"><code>.</code> = Rest (silence)</div>
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
                Based on <a href="https://en.wikipedia.org/wiki/Dumbek_rhythms#Notation" target="_blank" rel="noopener noreferrer">Dumbek rhythms notation</a>
              </div>
            </div>
          )}
        </div>
        <div className="controls-group">
          <RhythmPresets
            onSelectPreset={(notation, ts) => {
              onNotationChange(notation);
              onTimeSignatureChange(ts);
            }}
          />
          <div className="time-signature-inline">
            <select
              className="time-signature-select"
              value={timeSignature.numerator}
              onChange={handleNumeratorChange}
              aria-label="Time signature numerator"
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="9">9</option>
              <option value="12">12</option>
            </select>
            <span className="time-sig-slash">/</span>
            <select
              className="time-signature-select"
              value={timeSignature.denominator}
              onChange={handleDenominatorChange}
              aria-label="Time signature denominator"
            >
              <option value="4">4</option>
              <option value="8">8</option>
            </select>
          </div>
        </div>
      </div>
      <input
        id="rhythm-notation-input"
        type="text"
        className="input-field"
        value={notation}
        onChange={(e) => onNotationChange(e.target.value)}
        placeholder="D---T-K-D-D-T---"
        spellCheck={false}
      />
    </div>
  );
};

export default RhythmInput;

