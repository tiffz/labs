import { useMemo, useRef, useState } from 'react';
import AnchoredPopover from '../AnchoredPopover';
import type { PopoverActions } from '@mui/material/Popover';
import type { TimeSignature } from '../../music/chordTypes';
import {
  getAvailableChordStyleTimeSignatures,
  CHORD_STYLING_STRATEGIES,
} from '../../music/chordStylingStrategies';
import { isStrategyCompatibleWithTimeSignature } from '../../music/chordStylingCompatibility';
import { PlaybackFieldSelectTrigger } from './PlaybackFieldSelectTrigger';
import {
  playbackFieldSelectPopoverSlotProps,
  resolvePlaybackFieldSelectAppearance,
} from './playbackFieldSelect';
import {
  popoverAnchorEl,
  usePopoverScrollAnchorSync,
} from '../../hooks/usePopoverScrollAnchorSync';
import './chordStyleInput.css';
import './playbackFieldSelect.css';

/**
 * Generic option contract consumed by `ChordStyleInput`.
 */
export interface ChordStyleOptionLike {
  id: string;
  label: string;
  description?: string;
}

function timeSignatureLabel(ts: TimeSignature): string {
  return `${ts.numerator}/${ts.denominator}`;
}

function timeSignaturesEqual(
  a: TimeSignature,
  b: TimeSignature | null | undefined
): boolean {
  if (!b) return false;
  return a.numerator === b.numerator && a.denominator === b.denominator;
}

function filterOptionsByTimeSignature<T extends ChordStyleOptionLike>(
  options: ReadonlyArray<T>,
  timeSignature: TimeSignature | null
): ReadonlyArray<T> {
  if (!timeSignature) return options;
  return options.filter((option) => {
    if (!(option.id in CHORD_STYLING_STRATEGIES)) return true;
    return isStrategyCompatibleWithTimeSignature(
      option.id as keyof typeof CHORD_STYLING_STRATEGIES,
      timeSignature
    );
  });
}

interface ChordStyleMenuProps<TStyle extends string> {
  value: TStyle;
  options: ReadonlyArray<ChordStyleOptionLike>;
  onSelect: (next: TStyle) => void;
  className?: string;
  itemClassName?: string;
  menuColumns?: 1 | 2 | 3 | 'auto';
}

/**
 * Reusable option menu used by `ChordStyleInput` in popover and inline layouts.
 */
export const ChordStyleMenu = <TStyle extends string>({
  value,
  options,
  onSelect,
  className,
  itemClassName,
  menuColumns = 'auto',
}: ChordStyleMenuProps<TStyle>) => {
  return (
    <div
      className={[
        'shared-chord-style-menu',
        menuColumns === 1
          ? 'shared-chord-style-menu--cols-1'
          : menuColumns === 2
            ? 'shared-chord-style-menu--cols-2'
            : menuColumns === 3
              ? 'shared-chord-style-menu--cols-3'
              : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={[
            'shared-chord-style-item',
            itemClassName,
            option.id === value ? 'active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(option.id as TStyle)}
        >
          <span className="shared-chord-style-name">{option.label}</span>
          {option.description ? (
            <span className="shared-chord-style-description">{option.description}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
};

interface TimeSignatureFilterBarProps {
  value: TimeSignature | null;
  onChange: (next: TimeSignature | null) => void;
  timeSignatures: TimeSignature[];
}

/**
 * Small chip row used inside the popover/inline menu so the user can
 * narrow the styles to those compatible with a specific time signature.
 */
const TimeSignatureFilterBar = ({
  value,
  onChange,
  timeSignatures,
}: TimeSignatureFilterBarProps) => (
  <div
    className="shared-chord-style-ts-filter"
    role="toolbar"
    aria-label="Filter styles by time signature"
  >
    <button
      type="button"
      className={[
        'shared-chord-style-ts-chip',
        value === null ? 'active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onChange(null)}
    >
      All
    </button>
    {timeSignatures.map((ts) => (
      <button
        key={timeSignatureLabel(ts)}
        type="button"
        className={[
          'shared-chord-style-ts-chip',
          timeSignaturesEqual(ts, value) ? 'active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onChange(ts)}
      >
        {timeSignatureLabel(ts)}
      </button>
    ))}
  </div>
);

interface ChordStyleInputProps<TStyle extends string> {
  value: TStyle;
  options: ReadonlyArray<ChordStyleOptionLike>;
  onChange: (next: TStyle) => void;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  inlineMenuClassName?: string;
  menuClassName?: string;
  menuItemClassName?: string;
  appearance?: 'default' | 'piano' | 'words' | 'chords' | 'encore';
  menuColumns?: 1 | 2 | 3 | 'auto';
  menuMode?: 'popover' | 'inline';
  disabled?: boolean;
  /**
   * When provided, the options shown are filtered to styles that support
   * this time signature. The in-menu time signature filter is hidden in
   * this mode so the caller stays in full control.
   */
  timeSignature?: TimeSignature;
  /**
   * When true, renders a small time-signature chip row above the menu so
   * the user can narrow styles themselves. Ignored when `timeSignature`
   * is provided.
   */
  showTimeSignatureFilter?: boolean;
  /** Controlled open state for the popover menu (use with `onMenuOpenChange`). */
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
}

/**
 * Shared style picker for chord playback and arrangement strategies.
 */
const ChordStyleInput = <TStyle extends string>({
  value,
  options,
  onChange,
  className,
  triggerClassName,
  dropdownClassName,
  inlineMenuClassName,
  menuClassName,
  menuItemClassName,
  appearance = 'default',
  menuColumns = 'auto',
  menuMode = 'popover',
  disabled = false,
  timeSignature,
  showTimeSignatureFilter = false,
  menuOpen: menuOpenProp,
  onMenuOpenChange,
}: ChordStyleInputProps<TStyle>) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const menuOpenControlled = menuOpenProp !== undefined;
  const open = menuOpenControlled ? menuOpenProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (menuOpenControlled) onMenuOpenChange?.(next);
    else setInternalOpen(next);
  };
  const [internalTsFilter, setInternalTsFilter] = useState<TimeSignature | null>(
    null,
  );
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popoverActionRef = useRef<PopoverActions>(null);
  usePopoverScrollAnchorSync(open, anchorRef, popoverActionRef);
  const selected = useMemo(
    () => options.find((option) => option.id === value),
    [options, value],
  );
  const callerProvidedTs = timeSignature ?? null;
  const internalFilterEnabled =
    showTimeSignatureFilter && callerProvidedTs === null;
  const activeFilter = callerProvidedTs ?? (internalFilterEnabled ? internalTsFilter : null);
  const filteredOptions = useMemo(
    () => filterOptionsByTimeSignature(options, activeFilter),
    [options, activeFilter],
  );
  const availableTimeSignatures = useMemo(
    () => getAvailableChordStyleTimeSignatures(),
    [],
  );

  if (menuMode === 'inline') {
    return (
      <div
        className={[
          'shared-chord-style-input',
          `shared-chord-style-input--${appearance}`,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={[
            'shared-chord-style-inline-content',
            `shared-chord-style-inline-content--${appearance}`,
            inlineMenuClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="shared-chord-style-inline-list">
            {internalFilterEnabled ? (
              <TimeSignatureFilterBar
                value={internalTsFilter}
                onChange={setInternalTsFilter}
                timeSignatures={availableTimeSignatures}
              />
            ) : null}
            <ChordStyleMenu
              value={value}
              options={filteredOptions}
              onSelect={onChange}
              className={menuClassName}
              itemClassName={menuItemClassName}
              menuColumns={menuColumns}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'shared-chord-style-input',
        `shared-chord-style-input--${appearance}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="shared-chord-style-anchor shared-playback-field-select__anchor" ref={anchorRef}>
        <PlaybackFieldSelectTrigger
          appearance={resolvePlaybackFieldSelectAppearance(appearance)}
          triggerClassName={triggerClassName}
          disabled={disabled}
          aria-label="Choose chord style"
          aria-expanded={open}
          valueLabel={selected?.label ?? 'Style'}
          onClick={() => !disabled && setOpen(!open)}
        />
      </div>
      <AnchoredPopover
        action={popoverActionRef}
        open={Boolean(open && anchorRef.current && !disabled)}
        anchorEl={popoverAnchorEl(anchorRef)}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') setOpen(false);
        }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        disableScrollLock
        placement="bottom-start"
        slotProps={{
          ...playbackFieldSelectPopoverSlotProps(resolvePlaybackFieldSelectAppearance(appearance), {
            menuClassName: [
              'shared-chord-style-dropdown',
              `shared-chord-style-dropdown--${appearance}`,
              dropdownClassName,
            ]
              .filter(Boolean)
              .join(' '),
            rootClassName: dropdownClassName ? `${dropdownClassName}-root` : undefined,
            minWidth: 'var(--cs-dropdown-min-width)',
            maxWidth: 'var(--cs-dropdown-max-width)',
          }),
        }}
      >
        <div className="shared-chord-style-dropdown-list">
          {internalFilterEnabled ? (
            <TimeSignatureFilterBar
              value={internalTsFilter}
              onChange={setInternalTsFilter}
              timeSignatures={availableTimeSignatures}
            />
          ) : null}
          <ChordStyleMenu
            value={value}
            options={filteredOptions}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
            className={menuClassName}
            itemClassName={menuItemClassName}
            menuColumns={menuColumns}
          />
        </div>
      </AnchoredPopover>
    </div>
  );
};

export default ChordStyleInput;
