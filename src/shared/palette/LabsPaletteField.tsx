import TextField from '@mui/material/TextField';
import { useId, useRef, useState, type ReactElement } from 'react';

import AnchoredPopover from '../components/AnchoredPopover';
import { LabsPaletteBuilder, type LabsPaletteBuilderVariant } from './LabsPaletteBuilder';
import { createPaletteFromHexes } from './types';
import type { ComicPalette } from './types';
import { parsePalettePaste } from './parseCoolorsUrl';
import './labsPaletteField.css';

export type LabsPaletteFieldProps = {
  className?: string;
  variant?: LabsPaletteBuilderVariant;
  value?: ComicPalette | null;
  onApply: (palette: ComicPalette) => void;
  /** Visible field label (closed row). */
  label?: string;
  swatchCount?: number;
  /** Show hex / Coolors / palette-link paste inside the menu. */
  showPaste?: boolean;
};

const EMPTY_SWATCH_SLOTS = 5;

/**
 * Dense palette control: closed state is a swatch strip; click opens an `AnchoredPopover`
 * with {@link LabsPaletteBuilder} (moods, surprise, seed, image) and optional paste.
 */
export function LabsPaletteField({
  className,
  variant = 'neutral',
  value = null,
  onApply,
  label = 'Palette',
  swatchCount = 5,
  showPaste = false,
}: LabsPaletteFieldProps): ReactElement {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState('');
  const panelId = useId();

  const close = (): void => {
    setOpen(false);
    setPasteOpen(false);
  };

  const handleApply = (palette: ComicPalette): void => {
    onApply(palette);
    close();
  };

  const onApplyPaste = (): void => {
    const hexes = parsePalettePaste(paste);
    if (!hexes) return;
    handleApply(createPaletteFromHexes(hexes, 'Board palette', 'import'));
    setPaste('');
  };

  const swatches = value?.swatches ?? [];
  const emptySlots = value ? 0 : EMPTY_SWATCH_SLOTS;
  const triggerLabel = value
    ? `${label}: ${value.name}. Edit palette.`
    : `${label}: none. Choose a palette.`;

  const rootClassName = [
    'labs-palette-field',
    variant !== 'neutral' ? `labs-palette-field--${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} data-testid="labs-palette-field" data-variant={variant}>
      <span className="labs-palette-field__label" id={`${panelId}-label`}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className={[
          'labs-palette-field__trigger',
          open ? 'labs-palette-field__trigger--open' : '',
          value ? '' : 'labs-palette-field__trigger--empty',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-labelledby={`${panelId}-label`}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-testid="labs-palette-field-trigger"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <span className="labs-palette-field__swatches" aria-hidden>
          {swatches.map((swatch) => (
            <span
              key={swatch.id}
              className="labs-palette-field__swatch"
              style={{ background: swatch.hex }}
            />
          ))}
          {Array.from({ length: emptySlots }, (_, index) => (
            <span
              key={`empty-${index}`}
              className="labs-palette-field__swatch labs-palette-field__swatch--empty"
            />
          ))}
        </span>
        <span className="labs-palette-field__chevron" aria-hidden>
          ▾
        </span>
      </button>

      <AnchoredPopover
        open={open}
        anchorEl={triggerRef.current}
        onClose={close}
        placement="bottom-start"
        paperClassName="labs-palette-field__menu"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={12}
        transitionDuration={0}
      >
        <div
          id={panelId}
          role="dialog"
          aria-label={`${label} editor`}
          className="labs-palette-field__menu-body"
          data-testid="labs-palette-field-menu"
        >
          <LabsPaletteBuilder
            variant={variant}
            value={value}
            onApply={handleApply}
            swatchCount={swatchCount}
            showHeading={false}
            showActiveStrip={false}
          />
          {showPaste ? (
            <div className="labs-palette-field__paste">
              <button
                type="button"
                className="labs-palette-field__paste-toggle"
                aria-expanded={pasteOpen}
                onClick={() => setPasteOpen((wasOpen) => !wasOpen)}
                data-testid="labs-palette-field-paste-toggle"
              >
                Paste hex or Coolors link
              </button>
              {pasteOpen ? (
                <div className="labs-palette-field__paste-body">
                  <TextField
                    size="small"
                    fullWidth
                    label="Palette source"
                    placeholder="Hex row, Coolors, or /palette/ link"
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    data-testid="labs-palette-field-paste-input"
                  />
                  <button
                    type="button"
                    className="labs-palette-field__paste-apply"
                    onClick={onApplyPaste}
                    data-testid="labs-palette-field-paste-apply"
                  >
                    Apply paste
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </AnchoredPopover>
    </div>
  );
}
