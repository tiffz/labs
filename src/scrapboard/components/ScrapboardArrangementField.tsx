import { useId, useRef, useState, type ReactElement } from 'react';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import {
  arrangementsForSpeakerCount,
  type CharacterArrangementId,
} from '../../shared/comic';

export type ScrapboardArrangementFieldProps = {
  speakerCount: number;
  value: CharacterArrangementId;
  onChange: (arrangement: CharacterArrangementId) => void;
};

export function ScrapboardArrangementField({
  speakerCount,
  value,
  onChange,
}: ScrapboardArrangementFieldProps): ReactElement {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const options = arrangementsForSpeakerCount(Math.max(1, speakerCount));
  const active = options.find((row) => row.id === value) ?? options[0];

  return (
    <div className="scrapboard-arrangement-field" data-testid="scrapboard-arrangement-field">
      <span className="scrapboard-arrangement-field__label" id={`${panelId}-label`}>
        Arrangement
      </span>
      <button
        ref={triggerRef}
        type="button"
        className={[
          'scrapboard-arrangement-field__trigger',
          open ? 'scrapboard-arrangement-field__trigger--open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-labelledby={`${panelId}-label`}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="scrapboard-arrangement-trigger"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <span className="scrapboard-arrangement-field__name">{active?.label ?? 'Arrange'}</span>
        <span className="scrapboard-arrangement-field__meta">{speakerCount} on panel</span>
        <span className="scrapboard-arrangement-field__chevron" aria-hidden>
          ▾
        </span>
      </button>

      <AnchoredPopover
        open={open}
        anchorEl={triggerRef.current}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        paperClassName="scrapboard-arrangement-field__menu"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={12}
        transitionDuration={0}
      >
        <div
          id={panelId}
          role="listbox"
          aria-label="Character arrangement"
          className="scrapboard-arrangement-field__menu-body"
          data-testid="scrapboard-arrangement-menu"
        >
          {options.map((row) => {
            const selected = row.id === (active?.id ?? value);
            return (
              <button
                key={row.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={[
                  'scrapboard-arrangement-field__option',
                  selected ? 'scrapboard-arrangement-field__option--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-testid={`scrapboard-arrangement-${row.id}`}
                onClick={() => {
                  onChange(row.id);
                  setOpen(false);
                }}
              >
                {row.label}
              </button>
            );
          })}
        </div>
      </AnchoredPopover>
    </div>
  );
}
