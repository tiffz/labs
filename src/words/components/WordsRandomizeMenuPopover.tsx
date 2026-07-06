import type { RefObject } from 'react';
import { useCallback, useRef } from 'react';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import AppTooltip from '../../shared/components/AppTooltip';
import { getFocusableElements, handleMenuListKeyDown } from '../../shared/a11y/focusable';
import { RANDOMIZE_MODE_OPTIONS, type RandomizeMode } from '../utils/randomizeModes';

type WordsRandomizeMenuPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (mode: RandomizeMode) => void;
  activeMode?: RandomizeMode;
  paperRef?: RefObject<HTMLDivElement | null>;
  menuId?: string;
};

/** Randomization mode picker shared by global and per-section menus. */
export default function WordsRandomizeMenuPopover({
  open,
  anchorEl,
  onClose,
  onSelect,
  activeMode,
  paperRef,
  menuId = 'words-randomize-mode-menu',
}: WordsRandomizeMenuPopoverProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!listRef.current) return;
      handleMenuListKeyDown(event, getFocusableElements(listRef.current), { onEscape: onClose });
    },
    [onClose],
  );

  return (
    <AnchoredPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="bottom-end"
      paperClassName="words-randomize-menu"
      slotProps={{
        paper: paperRef ? { ref: paperRef, id: menuId } : { id: menuId },
      }}
    >
      <div
        ref={listRef}
        className="words-randomize-menu-list"
        role="menu"
        tabIndex={-1}
        aria-label="Randomization mode"
        onKeyDown={handleListKeyDown}
      >
        {RANDOMIZE_MODE_OPTIONS.map((option) => (
          <AppTooltip key={option.mode} title={option.tooltip}>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={option.mode === activeMode}
              className={`words-button words-randomize-option${
                option.mode === activeMode ? ' active' : ''
              }`}
              onClick={() => onSelect(option.mode)}
            >
              {option.label}
            </button>
          </AppTooltip>
        ))}
      </div>
    </AnchoredPopover>
  );
}
