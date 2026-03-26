import React, { useMemo, useRef, useState } from 'react';
import Popover from '@mui/material/Popover';
import './chordStyleInput.css';

export interface ChordStyleOptionLike {
  id: string;
  label: string;
  description?: string;
}

interface ChordStyleMenuProps<TStyle extends string> {
  value: TStyle;
  options: ReadonlyArray<ChordStyleOptionLike>;
  onSelect: (next: TStyle) => void;
  className?: string;
  itemClassName?: string;
  menuColumns?: 1 | 2 | 3 | 'auto';
}

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
  appearance?: 'default' | 'piano' | 'words' | 'chords';
  menuColumns?: 1 | 2 | 3 | 'auto';
  menuMode?: 'popover' | 'inline';
  disabled?: boolean;
}

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
}: ChordStyleInputProps<TStyle>) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.id === value),
    [options, value],
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
            <ChordStyleMenu
              value={value}
              options={options}
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
      <div className="shared-chord-style-anchor" ref={anchorRef}>
        <button
          type="button"
          className={['shared-chord-style-trigger', triggerClassName].filter(Boolean).join(' ')}
          onClick={() => !disabled && setOpen((previous) => !previous)}
          disabled={disabled}
          aria-label="Choose chord style"
        >
          <span className="shared-chord-style-trigger-label">
            {selected?.label ?? 'Style'}
          </span>
          <span className="material-symbols-outlined">expand_more</span>
        </button>
      </div>
      <Popover
        open={Boolean(open && anchorRef.current && !disabled)}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          root: {
            className: dropdownClassName ? `${dropdownClassName}-root` : undefined,
          },
          paper: {
            className: [
              'shared-chord-style-dropdown',
              `shared-chord-style-dropdown--${appearance}`,
              dropdownClassName,
            ]
              .filter(Boolean)
              .join(' '),
          },
        }}
      >
        <div className="shared-chord-style-dropdown-list">
          <ChordStyleMenu
            value={value}
            options={options}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
            className={menuClassName}
            itemClassName={menuItemClassName}
            menuColumns={menuColumns}
          />
        </div>
      </Popover>
    </div>
  );
};

export default ChordStyleInput;
