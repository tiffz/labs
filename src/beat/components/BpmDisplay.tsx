import React, { useState, useCallback, useEffect } from 'react';

interface BpmDisplayProps {
  bpm: number;
  confidence?: number;
  onBpmChange: (bpm: number) => void;
}

const BpmDisplay: React.FC<BpmDisplayProps> = ({ bpm, confidence, onBpmChange }) => {
  const [inputValue, setInputValue] = useState(String(Math.round(bpm)));
  const [isEditing, setIsEditing] = useState(false);

  // Update input when external bpm changes (and not editing)
  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(Math.round(bpm)));
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
    const newBpm = parseInt(inputValue, 10);
    if (!isNaN(newBpm) && newBpm >= 20 && newBpm <= 300) {
      onBpmChange(newBpm);
    } else {
      // Reset to current value if invalid
      setInputValue(String(Math.round(bpm)));
    }
  }, [inputValue, bpm, onBpmChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        setInputValue(String(Math.round(bpm)));
        setIsEditing(false);
      }
    },
    [bpm]
  );

  const adjustBpm = useCallback(
    (delta: number) => {
      const newBpm = Math.max(20, Math.min(300, Math.round(bpm) + delta));
      onBpmChange(newBpm);
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
          onClick={() => adjustBpm(-1)}
          title="Decrease BPM"
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
          aria-label="BPM"
          style={confidenceColor ? { borderColor: confidenceColor } : undefined}
        />

        <button
          className="transport-btn secondary"
          onClick={() => adjustBpm(1)}
          title="Increase BPM"
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
