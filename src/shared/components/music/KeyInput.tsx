import React, { useMemo, useRef, useState } from 'react';
import Popover from '@mui/material/Popover';
import { DISPLAY_KEYS_12, type MusicKey } from '../../music/musicInputConstants';
import './keyInput.css';

const ENHARMONIC_TO_DISPLAY: Record<string, MusicKey> = {
  'C#': 'Db',
  'D#': 'Eb',
  'Gb': 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
};

const DISPLAY_STEP_ORDER: ReadonlyArray<MusicKey> = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

function normalizeToDisplayKey(key: MusicKey): MusicKey {
  return ENHARMONIC_TO_DISPLAY[key] ?? key;
}

/**
 * Menu contract for selecting one key from a normalized key set.
 */
export interface KeyInputMenuProps {
  value: MusicKey;
  onSelect: (next: MusicKey) => void;
  keys?: ReadonlyArray<MusicKey>;
  className?: string;
  itemClassName?: string;
}

/**
 * Reusable key-preset menu shown inside `KeyInput` popovers.
 */
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

interface KeyInputProps {
  value: MusicKey;
  onChange: (next: MusicKey) => void;
  className?: string;
  disabled?: boolean;
  showRandomize?: boolean;
  showStepButtons?: boolean;
  trailingActions?: React.ReactNode;
  menuKeys?: ReadonlyArray<MusicKey>;
  dropdownClassName?: string;
  dropdownOffsetPx?: number;
  menuClassName?: string;
  menuItemClassName?: string;
}

/**
 * Shared musical key input with optional semitone stepping and randomized selection.
 */
const KeyInput: React.FC<KeyInputProps> = ({
  value,
  onChange,
  className,
  disabled = false,
  showRandomize = false,
  showStepButtons = false,
  trailingActions,
  menuKeys = DISPLAY_KEYS_12,
  dropdownClassName,
  dropdownOffsetPx,
  menuClassName,
  menuItemClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const selectedDisplay = useMemo(() => normalizeToDisplayKey(value), [value]);

  const stepKey = (delta: number): void => {
    const index = DISPLAY_STEP_ORDER.indexOf(selectedDisplay);
    if (index === -1) return;
    const wrappedIndex =
      (index + delta + DISPLAY_STEP_ORDER.length) % DISPLAY_STEP_ORDER.length;
    onChange(DISPLAY_STEP_ORDER[wrappedIndex]);
  };

  return (
    <div className={className}>
      <div className="shared-key-dropdown-anchor" ref={anchorRef}>
        <div className="shared-key-shell">
          <button
            type="button"
            className="shared-key-value-btn"
            onClick={() => !disabled && setIsOpen((previous) => !previous)}
            aria-label="Change key"
            disabled={disabled}
          >
            <span className="shared-key-value">{selectedDisplay}</span>
            <span className="material-symbols-outlined">expand_more</span>
          </button>
        {showStepButtons && (
          <div className="shared-key-steps" role="group" aria-label="Adjust key by semitone">
            <button
              type="button"
              className="shared-key-step-btn"
              onClick={() => stepKey(-1)}
              aria-label="Lower key by semitone"
              disabled={disabled}
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button
              type="button"
              className="shared-key-step-btn"
              onClick={() => stepKey(1)}
              aria-label="Raise key by semitone"
              disabled={disabled}
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        )}
        {showRandomize && (
          <button
            type="button"
            className="shared-key-inline-action"
            onClick={() => {
              if (disabled) return;
              const randomKey = menuKeys[Math.floor(Math.random() * menuKeys.length)];
              onChange(randomKey);
            }}
            disabled={disabled}
          >
            Random
          </button>
        )}
        {trailingActions}
      </div>
      <Popover
        open={Boolean(isOpen && anchorRef.current && !disabled)}
        anchorEl={anchorRef.current}
        onClose={() => setIsOpen(false)}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            className: ['shared-key-dropdown', dropdownClassName].filter(Boolean).join(' '),
            style:
              dropdownOffsetPx !== undefined
                ? { marginTop: `${dropdownOffsetPx}px` }
                : undefined,
          },
        }}
      >
        <div className="shared-key-dropdown-list">
          <KeyInputMenu
            value={value}
            onSelect={(next) => {
              onChange(next);
              setIsOpen(false);
            }}
            keys={menuKeys}
            className={menuClassName}
            itemClassName={menuItemClassName}
          />
        </div>
      </Popover>
      </div>
    </div>
  );
};

export default KeyInput;
