import CheckIcon from '@mui/icons-material/Check';
import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import type { PopoverActions } from '@mui/material/Popover';
import { PlaybackFieldSelectTrigger } from '../../shared/components/music/PlaybackFieldSelectTrigger';
import {
  playbackFieldSelectPopoverSlotProps,
  type PlaybackFieldSelectAppearance,
} from '../../shared/components/music/playbackFieldSelect';
import {
  popoverAnchorEl,
  usePopoverScrollAnchorSync,
} from '../../shared/hooks/usePopoverScrollAnchorSync';
import '../../shared/components/music/playbackFieldSelect.css';

export type MidiOptionSelectOption<T extends string | number> = {
  value: T;
  label: string;
};

export type MidiOptionSelectProps<T extends string | number> = {
  value: T;
  options: readonly MidiOptionSelectOption<T>[];
  onChange: (value: T) => void;
  'aria-label': string;
  label?: ReactNode;
  appearance?: PlaybackFieldSelectAppearance;
  disabled?: boolean;
  triggerClassName?: string;
};

export function MidiOptionSelect<T extends string | number>({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
  label,
  appearance = 'default',
  disabled = false,
  triggerClassName,
}: MidiOptionSelectProps<T>): ReactElement {
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverActionRef = useRef<PopoverActions>(null);
  const [open, setOpen] = useState(false);
  usePopoverScrollAnchorSync(open, anchorRef, popoverActionRef);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? String(value);

  return (
    <div className="midi-option-select">
      {label}
      <div className="shared-playback-field-select__anchor" ref={anchorRef}>
        <PlaybackFieldSelectTrigger
          appearance={appearance}
          aria-label={ariaLabel}
          aria-expanded={open}
          valueLabel={selectedLabel}
          triggerClassName={triggerClassName}
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
        />
      </div>
      <AnchoredPopover
        action={popoverActionRef}
        open={open && Boolean(anchorRef.current)}
        anchorEl={popoverAnchorEl(anchorRef)}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') setOpen(false);
        }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        disableScrollLock
        placement="bottom-start"
        marginThreshold={8}
        slotProps={{
          ...playbackFieldSelectPopoverSlotProps(appearance, {
            minWidth: anchorRef.current?.offsetWidth ?? 160,
            maxWidth: 'min(280px, calc(100vw - 24px))',
          }),
        }}
      >
        <div className="shared-playback-field-select__menu-list" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={active}
                className={[
                  'shared-playback-field-select__option',
                  active ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="shared-playback-field-select__option-label">{option.label}</span>
                {active ? (
                  <CheckIcon
                    className="shared-playback-field-select__option-trailing"
                    sx={{ fontSize: 16 }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </AnchoredPopover>
    </div>
  );
}
