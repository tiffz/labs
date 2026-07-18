import { useId, useRef, useState, type ReactElement } from 'react';

import AnchoredPopover from '../components/AnchoredPopover';
import {
  LabsWikimediaImageSearch,
  type LabsWikimediaImageResult,
  type LabsWikimediaImageSearchVariant,
} from './LabsWikimediaImageSearch';
import './labsWikimediaImageField.css';

export type LabsWikimediaImageFieldValue = {
  title: string;
  url: string;
  thumbUrl?: string;
  license?: string;
};

export type LabsWikimediaImageFieldProps = {
  className?: string;
  variant?: LabsWikimediaImageSearchVariant;
  label?: string;
  value?: LabsWikimediaImageFieldValue | null;
  onSelectImage: (result: LabsWikimediaImageResult) => void;
  onClear?: () => void;
  /** Hint under the closed field. */
  hint?: string;
};

/**
 * Dense Wikimedia picker: closed state shows a thumbnail (or empty slot); click opens
 * an `AnchoredPopover` with {@link LabsWikimediaImageSearch}.
 */
export function LabsWikimediaImageField({
  className,
  variant = 'default',
  label = 'Background photo',
  value = null,
  onSelectImage,
  onClear,
  hint,
}: LabsWikimediaImageFieldProps): ReactElement {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const close = (): void => setOpen(false);

  const handleSelect = (result: LabsWikimediaImageResult): void => {
    onSelectImage(result);
    close();
  };

  const thumbSrc = value?.thumbUrl || value?.url || null;
  const triggerLabel = value
    ? `${label}: ${value.title}. Change photo.`
    : `${label}: none. Search Wikimedia Commons.`;

  const rootClassName = [
    'labs-wikimedia-field',
    variant !== 'default' ? `labs-wikimedia-field--${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} data-testid="labs-wikimedia-field" data-variant={variant}>
      <span className="labs-wikimedia-field__label" id={`${panelId}-label`}>
        {label}
      </span>
      <div className="labs-wikimedia-field__row">
        <button
          ref={triggerRef}
          type="button"
          className={[
            'labs-wikimedia-field__trigger',
            open ? 'labs-wikimedia-field__trigger--open' : '',
            value ? '' : 'labs-wikimedia-field__trigger--empty',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-labelledby={`${panelId}-label`}
          aria-label={triggerLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          data-testid="labs-wikimedia-field-trigger"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          <span className="labs-wikimedia-field__preview" aria-hidden>
            {thumbSrc ? (
              <img
                src={thumbSrc}
                alt=""
                className="labs-wikimedia-field__thumb"
                data-testid="labs-wikimedia-field-thumb"
              />
            ) : (
              <span className="labs-wikimedia-field__placeholder">Search photos</span>
            )}
          </span>
          <span className="labs-wikimedia-field__meta" aria-hidden>
            {value ? (
              <>
                <span className="labs-wikimedia-field__title">{value.title}</span>
                {value.license ? (
                  <span className="labs-wikimedia-field__license">{value.license}</span>
                ) : null}
              </>
            ) : (
              <span className="labs-wikimedia-field__empty-copy">Wikimedia Commons</span>
            )}
          </span>
          <span className="labs-wikimedia-field__chevron" aria-hidden>
            ▾
          </span>
        </button>
        {value && onClear ? (
          <button
            type="button"
            className="labs-wikimedia-field__clear"
            onClick={onClear}
            data-testid="labs-wikimedia-field-clear"
          >
            Remove
          </button>
        ) : null}
      </div>
      {hint ? <p className="labs-wikimedia-field__hint">{hint}</p> : null}

      <AnchoredPopover
        open={open}
        anchorEl={triggerRef.current}
        onClose={close}
        placement="bottom-start"
        paperClassName="labs-wikimedia-field__menu"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={12}
        transitionDuration={0}
      >
        <div
          id={panelId}
          role="dialog"
          aria-label={`${label} search`}
          className="labs-wikimedia-field__menu-body"
          data-testid="labs-wikimedia-field-menu"
        >
          <LabsWikimediaImageSearch
            variant={variant}
            showHeading={false}
            onSelectImage={handleSelect}
          />
        </div>
      </AnchoredPopover>
    </div>
  );
}
