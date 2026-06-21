import React from 'react';
import { DISPLAY_KEYS_12, type MusicKey } from '../../music/musicInputConstants';
import type { HarmonicMode } from '../../music/chordTheory';

const ENHARMONIC_TO_DISPLAY: Record<string, MusicKey> = {
  'C#': 'Db',
  'D#': 'Eb',
  Gb: 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
};

function normalizeToDisplayKey(key: MusicKey): MusicKey {
  return ENHARMONIC_TO_DISPLAY[key] ?? key;
}

export interface KeyInputMenuProps {
  value: MusicKey;
  onSelect: (next: MusicKey) => void;
  keys?: ReadonlyArray<MusicKey>;
  className?: string;
  itemClassName?: string;
}

export const KeyInputMenu: React.FC<KeyInputMenuProps> = ({
  value,
  onSelect,
  keys = DISPLAY_KEYS_12,
  className,
  itemClassName,
}) => {
  const active = normalizeToDisplayKey(value);
  return (
    <div className={['shared-key-grid', className].filter(Boolean).join(' ')}>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className={[
            'shared-key-grid-item',
            itemClassName,
            normalizeToDisplayKey(key) === active ? 'active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(key)}
        >
          {key}
        </button>
      ))}
    </div>
  );
};

export interface KeyModeToggleProps {
  mode: HarmonicMode;
  onChange: (next: HarmonicMode) => void;
  className?: string;
}

export const KeyModeToggle: React.FC<KeyModeToggleProps> = ({ mode, onChange, className }) => (
  <div className={['shared-key-mode-toggle', className].filter(Boolean).join(' ')} role="group" aria-label="Key quality">
    {(['major', 'minor'] as const).map((option) => (
      <button
        key={option}
        type="button"
        className={['shared-key-mode-toggle-btn', mode === option ? 'active' : ''].filter(Boolean).join(' ')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onChange(option)}
      >
        {option}
      </button>
    ))}
  </div>
);
