import CheckIcon from '@mui/icons-material/Check';
import CircularProgress from '@mui/material/CircularProgress';
import Popover from '@mui/material/Popover';
import type { PopoverActions } from '@mui/material/Popover';
import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import { PlaybackFieldSelectTrigger } from './PlaybackFieldSelectTrigger';
import {
  playbackFieldSelectPopoverSlotProps,
  PLAYBACK_FIELD_SELECT_WORDS_Z_INDEX,
  type PlaybackFieldSelectAppearance,
} from './playbackFieldSelect';
import {
  popoverAnchorEl,
  usePopoverScrollAnchorSync,
} from '../../hooks/usePopoverScrollAnchorSync';
import type { SampledPianoLoadState } from '../../music/sampledPianoLoadState';
import { SOUND_OPTIONS, type SoundType } from '../../music/soundOptions';
import './playbackFieldSelect.css';

export type { PlaybackFieldSelectAppearance } from './playbackFieldSelect';

export type PlaybackSoundSelectProps = {
  value: SoundType;
  onChange: (value: SoundType) => void;
  /** When set, sampled-piano loading UI is shown inline on the menu item and closed select. */
  sampledPianoLoad?: SampledPianoLoadState;
  appearance?: PlaybackFieldSelectAppearance;
  fullWidth?: boolean;
  id?: string;
  'aria-label'?: string;
  label?: ReactNode;
  /** Controlled open state for the popover menu (use with `onMenuOpenChange`). */
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Override portaled menu z-index (e.g. inside Words dropdowns at 2600). */
  menuZIndex?: number;
  /** Extra class on the closed trigger button (app-specific styling). */
  triggerClassName?: string;
};

function SampledPianoStatusIcon({ state }: { state: SampledPianoLoadState }): ReactElement | null {
  if (state.ready) {
    return (
      <CheckIcon
        aria-label="Sampled piano ready"
        className="shared-playback-field-select__option-trailing"
        style={{ fontSize: 15, color: '#16a34a' }}
      />
    );
  }
  if (state.loading || (state.total > 0 && !state.ready)) {
    return (
      <CircularProgress
        size={13}
        aria-label="Loading sampled piano"
        className="shared-playback-field-select__option-trailing"
      />
    );
  }
  return null;
}

export function PlaybackSoundSelect({
  value,
  onChange,
  sampledPianoLoad,
  appearance = 'default',
  fullWidth = true,
  id,
  'aria-label': ariaLabel = 'Playback sound',
  label,
  menuOpen: menuOpenProp,
  onMenuOpenChange,
  disabled = false,
  menuZIndex,
  triggerClassName,
}: PlaybackSoundSelectProps): ReactElement {
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverActionRef = useRef<PopoverActions>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const menuOpenControlled = menuOpenProp !== undefined;
  const open = menuOpenControlled ? menuOpenProp : internalOpen;
  usePopoverScrollAnchorSync(open, anchorRef, popoverActionRef);
  const setOpen = (next: boolean) => {
    if (menuOpenControlled) onMenuOpenChange?.(next);
    else setInternalOpen(next);
  };
  const menuId = id ? `${id}-menu` : undefined;
  const selectedLabel = SOUND_OPTIONS.find((option) => option.value === value)?.label ?? 'Sound';

  const close = () => setOpen(false);

  return (
    <div style={{ width: fullWidth ? '100%' : undefined, minWidth: 0 }}>
      {label}
      <div className="shared-playback-field-select__anchor" ref={anchorRef}>
        <PlaybackFieldSelectTrigger
          appearance={appearance}
          id={id}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={menuId}
          valueLabel={selectedLabel}
          triggerClassName={triggerClassName}
          trailing={
            value === 'piano-sampled' && sampledPianoLoad ? (
              <SampledPianoStatusIcon state={sampledPianoLoad} />
            ) : null
          }
          disabled={disabled}
          onClick={() => setOpen(!open)}
        />
      </div>
      <Popover
        id={menuId}
        action={popoverActionRef}
        open={open && Boolean(anchorRef.current)}
        anchorEl={popoverAnchorEl(anchorRef)}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') close();
        }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        marginThreshold={8}
        slotProps={{
          ...playbackFieldSelectPopoverSlotProps(appearance, {
            minWidth: anchorRef.current?.offsetWidth ?? 220,
            maxWidth: 'min(360px, calc(100vw - 24px))',
            zIndex:
              menuZIndex ??
              (appearance === 'words' ? PLAYBACK_FIELD_SELECT_WORDS_Z_INDEX : undefined),
          }),
        }}
      >
        <div
          className="shared-playback-field-select__menu-list"
          role="listbox"
          aria-label={ariaLabel}
        >
          {SOUND_OPTIONS.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={[
                  'shared-playback-field-select__option',
                  active ? 'active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
              >
                <span className="shared-playback-field-select__option-copy">
                  <span className="shared-playback-field-select__option-label">{option.label}</span>
                  {option.value === 'piano-sampled' && sampledPianoLoad?.ready ? null : (
                    <span className="shared-playback-field-select__option-description">
                      {option.description}
                    </span>
                  )}
                </span>
                {option.value === 'piano-sampled' && sampledPianoLoad ? (
                  <SampledPianoStatusIcon state={sampledPianoLoad} />
                ) : null}
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}
