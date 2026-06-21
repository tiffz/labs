import React, { useMemo, useRef, useState } from 'react';
import { DISPLAY_KEYS_12, type MusicKey } from '../../music/musicInputConstants';
import type { HarmonicMode } from '../../music/chordTheory';
import {
  formatSongKey,
  formatSongKeyButtonLabel,
  formatSongKeyDisplay,
  parseSongKey,
  randomSongKey,
} from '../../music/songKeyFormat';
import { KeyInputPicker } from './KeyInputPicker';
export { KeyInputMenu, KeyModeToggle } from './KeyInputMenuParts';
export type { KeyInputMenuProps, KeyModeToggleProps } from './KeyInputMenuParts';
import './keyInput.css';

const ENHARMONIC_TO_DISPLAY: Record<string, MusicKey> = {
  'C#': 'Db',
  'D#': 'Eb',
  Gb: 'F#',
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

interface KeyInputProps {
  value?: string;
  /** Shown when `value` is unset (e.g. "Unknown"). */
  placeholder?: string;
  onChange: (next: string) => void;
  className?: string;
  disabled?: boolean;
  showRandomize?: boolean;
  showStepButtons?: boolean;
  /** When true (default), picker includes major/minor quality. */
  showMode?: boolean;
  /** Output style for `onChange` when `showMode` is true. */
  modeFormat?: 'short' | 'long';
  trailingActions?: React.ReactNode;
  menuKeys?: ReadonlyArray<MusicKey>;
  dropdownClassName?: string;
  dropdownOffsetPx?: number;
  menuClassName?: string;
  menuItemClassName?: string;
  /** When true, show a clear control that emits an empty string. */
  clearable?: boolean;
}

/**
 * Shared musical key input with optional semitone stepping and randomized selection.
 */
const KeyInput: React.FC<KeyInputProps> = ({
  value,
  placeholder,
  onChange,
  className,
  disabled = false,
  showRandomize = false,
  showStepButtons = false,
  showMode = true,
  modeFormat = 'short',
  trailingActions,
  menuKeys = DISPLAY_KEYS_12,
  dropdownClassName,
  dropdownOffsetPx,
  menuClassName,
  menuItemClassName,
  clearable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const hasValue = value != null && value.trim().length > 0;
  const parsed = useMemo(
    () => (hasValue ? parseSongKey(value) : { root: 'C' as MusicKey, mode: 'major' as HarmonicMode }),
    [hasValue, value],
  );
  const selectedDisplay = useMemo(
    () => (hasValue ? normalizeToDisplayKey(parsed.root) : null),
    [hasValue, parsed.root],
  );
  const buttonLabel = useMemo(() => {
    if (!hasValue) return null;
    if (showMode && modeFormat === 'long') return formatSongKeyDisplay(value!);
    return showMode ? formatSongKeyButtonLabel(value!) : selectedDisplay;
  }, [hasValue, modeFormat, showMode, value, selectedDisplay]);

  const emitKey = (root: MusicKey, mode: HarmonicMode): void => {
    onChange(showMode ? formatSongKey(root, mode, modeFormat) : root);
  };

  const stepKey = (delta: number): void => {
    if (!hasValue) return;
    const index = DISPLAY_STEP_ORDER.indexOf(selectedDisplay!);
    if (index === -1) return;
    const wrappedIndex =
      (index + delta + DISPLAY_STEP_ORDER.length) % DISPLAY_STEP_ORDER.length;
    emitKey(DISPLAY_STEP_ORDER[wrappedIndex]!, parsed.mode);
  };

  return (
    <div className={className}>
      <div className="shared-key-dropdown-anchor" ref={anchorRef}>
        <div className="shared-key-shell">
          <button
            type="button"
            className="shared-key-value-btn"
            onClick={() => !disabled && setIsOpen((previous) => !previous)}
            aria-label={hasValue ? 'Change key' : placeholder ? `Set key (${placeholder})` : 'Set key'}
            disabled={disabled}
          >
            <span
              className={[
                'shared-key-value',
                !hasValue && placeholder ? 'shared-key-value--placeholder' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {buttonLabel ?? placeholder ?? '-'}
            </span>
            <span className="material-symbols-outlined">expand_more</span>
          </button>
        {clearable && hasValue ? (
          <button
            type="button"
            className="shared-key-clear-btn"
            onClick={() => {
              if (disabled) return;
              onChange('');
              setIsOpen(false);
            }}
            aria-label="Clear key"
            disabled={disabled}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        ) : null}
        {showStepButtons && (
          <div className="shared-key-steps" role="group" aria-label="Adjust key by semitone">
            <button
              type="button"
              className="shared-key-step-btn"
              onClick={() => stepKey(-1)}
              aria-label="Lower key by semitone"
              disabled={disabled || !hasValue}
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button
              type="button"
              className="shared-key-step-btn"
              onClick={() => stepKey(1)}
              aria-label="Raise key by semitone"
              disabled={disabled || !hasValue}
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
              if (showMode) {
                onChange(randomSongKey(modeFormat));
                return;
              }
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
      <KeyInputPicker
        open={Boolean(isOpen && anchorRef.current && !disabled)}
        anchorEl={anchorRef.current}
        onClose={() => setIsOpen(false)}
        value={value}
        onChange={onChange}
        showMode={showMode}
        modeFormat={modeFormat}
        menuKeys={menuKeys}
        dropdownClassName={dropdownClassName}
        dropdownOffsetPx={dropdownOffsetPx}
        menuClassName={menuClassName}
        menuItemClassName={menuItemClassName}
      />
      </div>
    </div>
  );
};

export default KeyInput;
