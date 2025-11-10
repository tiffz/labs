import React from 'react';
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
        <label className="input-label" htmlFor="rhythm-notation-input">
          Enter Rhythm Notation
        </label>
        <RhythmPresets onSelectPreset={onNotationChange} />
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
      <div className="input-help">
        Use <code>D</code> for Dum, <code>T</code> for Tak, <code>K</code> for Ka, <code>.</code> for rest.
        Add dashes (<code>-</code>) after a note to extend its duration.
        Each character represents a 16th note.
        <br />
        <strong>Dotted notes:</strong> Use specific lengths for dotted rhythms:
        <code>D--</code> (dotted 8th = 3 sixteenths),
        <code>D-----</code> (dotted quarter = 6 sixteenths),
        <code>D-----------</code> (dotted half = 12 sixteenths).
      </div>
      
      <div className="time-signature-controls">
        <div className="time-signature-group">
          <label>Time Signature:</label>
          <select
            className="time-signature-select"
            value={timeSignature.numerator}
            onChange={handleNumeratorChange}
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
          <span>/</span>
          <select
            className="time-signature-select"
            value={timeSignature.denominator}
            onChange={handleDenominatorChange}
          >
            <option value="4">4</option>
            <option value="8">8</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default RhythmInput;

