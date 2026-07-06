import { useMemo, type RefObject } from 'react';
import AnchoredPopover from '../AnchoredPopover';
import { DISPLAY_KEYS_12, type MusicKey } from '../../music/musicInputConstants';
import type { HarmonicMode } from '../../music/chordTheory';
import { formatSongKey, parseSongKey } from '../../music/songKeyFormat';
import { KeyInputMenu, KeyModeToggle, KeyRelativeSwitch } from './KeyInputMenuParts';
import './keyInput.css';

export type KeyInputPickerProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  value?: string;
  onChange: (next: string) => void;
  showMode?: boolean;
  modeFormat?: 'short' | 'long';
  menuKeys?: ReadonlyArray<MusicKey>;
  dropdownClassName?: string;
  dropdownOffsetPx?: number;
  menuClassName?: string;
  menuItemClassName?: string;
  paperRef?: RefObject<HTMLDivElement | null>;
  /** When true, show a Clear action at the bottom of the menu (avoids a separate chip-adjacent button). */
  clearable?: boolean;
};

/** Shared major/minor key grid popover (used by full `KeyInput` and chip triggers). */
export function KeyInputPicker({
  open,
  anchorEl,
  onClose,
  value,
  onChange,
  showMode = true,
  modeFormat = 'short',
  menuKeys = DISPLAY_KEYS_12,
  dropdownClassName,
  dropdownOffsetPx,
  menuClassName,
  menuItemClassName,
  paperRef,
  clearable = false,
}: KeyInputPickerProps) {
  const hasValue = value != null && value.trim().length > 0;
  const parsed = useMemo(
    () => (hasValue ? parseSongKey(value) : { root: 'C' as MusicKey, mode: 'major' as HarmonicMode }),
    [hasValue, value]
  );

  const emitKey = (root: MusicKey, mode: HarmonicMode): void => {
    onChange(showMode ? formatSongKey(root, mode, modeFormat) : root);
  };

  return (
    <AnchoredPopover
      open={Boolean(open && anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="bottom-start"
      paperClassName={['shared-key-dropdown', dropdownClassName].filter(Boolean).join(' ')}
      slotProps={{
        paper: {
          ref: paperRef,
          style: dropdownOffsetPx !== undefined ? { marginTop: `${dropdownOffsetPx}px` } : undefined,
        },
      }}
    >
      <div className="shared-key-dropdown-list">
        <KeyInputMenu
          value={parsed.root}
          onSelect={(next) => {
            emitKey(next, parsed.mode);
            if (!showMode) onClose();
          }}
          keys={menuKeys}
          className={menuClassName}
          itemClassName={menuItemClassName}
        />
        {showMode ? (
          <>
            <KeyModeToggle
              mode={parsed.mode}
              onChange={(next) => {
                emitKey(parsed.root, next);
                onClose();
              }}
            />
            {hasValue ? (
              <KeyRelativeSwitch
                value={value!}
                modeFormat={modeFormat}
                onSelect={(next) => {
                  onChange(next);
                  onClose();
                }}
              />
            ) : null}
          </>
        ) : null}
        {clearable && hasValue ? (
          <button
            type="button"
            className="shared-key-dropdown-clear-btn"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange('');
              onClose();
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
    </AnchoredPopover>
  );
}
