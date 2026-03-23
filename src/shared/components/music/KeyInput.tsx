import React from 'react';
import { Select } from '@mui/material';
import { ALL_KEYS, type MusicKey } from '../../music/musicInputConstants';

interface KeyInputProps {
  value: MusicKey;
  onChange: (next: MusicKey) => void;
  className?: string;
  showRandomize?: boolean;
  showStepButtons?: boolean;
  trailingActions?: React.ReactNode;
}

const KeyInput: React.FC<KeyInputProps> = ({
  value,
  onChange,
  className,
  showRandomize = false,
  showStepButtons = false,
  trailingActions,
}) => {
  const stepKey = (delta: number): void => {
    const index = ALL_KEYS.indexOf(value);
    if (index === -1) return;
    const wrappedIndex = (index + delta + ALL_KEYS.length) % ALL_KEYS.length;
    onChange(ALL_KEYS[wrappedIndex]);
  };

  return (
    <div className={className}>
      <div className="shared-key-shell">
        <Select
          className="shared-key-select"
          value={value}
          onChange={(event) => onChange(event.target.value as MusicKey)}
          native
          variant="standard"
          disableUnderline
        >
          {ALL_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </Select>
        {showStepButtons && (
          <div className="shared-key-steps" role="group" aria-label="Adjust key by semitone">
            <button type="button" className="shared-key-step-btn" onClick={() => stepKey(-1)} aria-label="Lower key by semitone">
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button type="button" className="shared-key-step-btn" onClick={() => stepKey(1)} aria-label="Raise key by semitone">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        )}
        {showRandomize && (
          <button
            type="button"
            className="shared-key-inline-action"
            onClick={() => {
              const randomKey = ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)];
              onChange(randomKey);
            }}
          >
            Random
          </button>
        )}
        {trailingActions}
      </div>
    </div>
  );
};

export default KeyInput;
