import React, { useState, useCallback, useEffect } from 'react';

interface BpmDisplayProps {
  bpm: number;
  confidence?: number;
  onBpmChange: (bpm: number) => void;
}

// Format BPM for display (show 1 decimal if fractional, integer otherwise)
const formatBpm = (value: number): string => {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const BpmDisplay: React.FC<BpmDisplayProps> = ({ bpm, confidence, onBpmChange }) => {
  const [inputValue, setInputValue] = useState(formatBpm(bpm));
  const [isEditing, setIsEditing] = useState(false);

  // Update input when external bpm changes (and not editing)
  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatBpm(bpm));
    }
  }, [bpm, isEditing]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    const newBpm = parseFloat(inputValue);
    if (!isNaN(newBpm) && newBpm >= 20 && newBpm <= 300) {
      // Round to 2 decimal places to avoid floating point issues
      onBpmChange(Math.round(newBpm * 100) / 100);
    } else {
      // Reset to current value if invalid
      setInputValue(formatBpm(bpm));
    }
  }, [inputValue, bpm, onBpmChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        setInputValue(formatBpm(bpm));
        setIsEditing(false);
      }
    },
    [bpm]
  );

  const adjustBpm = useCallback(
    (delta: number) => {
      // Use 0.1 step for fine adjustments when holding shift, 1 otherwise
      const newBpm = Math.max(20, Math.min(300, bpm + delta));
      // Round to 2 decimal places
      onBpmChange(Math.round(newBpm * 100) / 100);
    },
    [bpm, onBpmChange]
  );

  // Show confidence indicator
  const confidenceColor =
    confidence === undefined
      ? undefined
      : confidence >= 0.8
        ? '#10b981'
        : confidence >= 0.6
          ? '#f59e0b'
          : '#ef4444';

  return (
    <div className="bpm-display">
      <div className="bpm-controls">
        <button
          className="transport-btn secondary"
          onClick={(e) => adjustBpm(e.shiftKey ? -1 : -0.1)}
          title="Decrease BPM (hold Shift for ±1)"
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
            remove
          </span>
        </button>

        <input
          type="number"
          className="bpm-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          min={20}
          max={300}
          step={0.1}
          aria-label="BPM"
          style={confidenceColor ? { borderColor: confidenceColor } : undefined}
        />

        <button
          className="transport-btn secondary"
          onClick={(e) => adjustBpm(e.shiftKey ? 1 : 0.1)}
          title="Increase BPM (hold Shift for ±1)"
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
            add
          </span>
        </button>
      </div>
      <span className="bpm-label">BPM</span>
    </div>
  );
};

export default BpmDisplay;
