import type { RefObject } from 'react';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import AppTooltip from '../../shared/components/AppTooltip';
import { RANDOMIZE_MODE_OPTIONS, type RandomizeMode } from '../utils/randomizeModes';

type WordsRandomizeMenuPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (mode: RandomizeMode) => void;
  activeMode?: RandomizeMode;
  paperRef?: RefObject<HTMLDivElement | null>;
};

/** Randomization mode picker shared by global and per-section menus. */
export default function WordsRandomizeMenuPopover({
  open,
  anchorEl,
  onClose,
  onSelect,
  activeMode,
  paperRef,
}: WordsRandomizeMenuPopoverProps) {
  return (
    <AnchoredPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="bottom-end"
      paperClassName="words-randomize-menu"
      slotProps={{
        paper: paperRef ? { ref: paperRef } : undefined,
      }}
    >
      <div className="words-randomize-menu-list">
        {RANDOMIZE_MODE_OPTIONS.map((option) => (
          <AppTooltip key={option.mode} title={option.tooltip}>
            <button
              type="button"
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
