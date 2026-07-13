import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useState, type ReactElement } from 'react';

import type { PalettegenGalleryEntry } from '../hooks/usePalettegenGallery';

export type PalettegenBleedCanvasProps = {
  entry: PalettegenGalleryEntry | null;
  onCopied: (message: string) => void;
  onUseAsSeed?: (hex: string) => void;
};

function textColorForHex(hex: string): string {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#111827' : '#f8fafc';
}

export function PalettegenBleedCanvas({ entry, onCopied, onUseAsSeed }: PalettegenBleedCanvasProps): ReactElement {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!entry) {
    return (
      <div className="palettegen-bleed palettegen-bleed--empty" data-testid="palettegen-bleed">
        <div className="palettegen-bleed__empty-art" aria-hidden />
        <div className="palettegen-bleed__empty-copy">
          <p className="palettegen-bleed__empty-title">Your palette fills the room</p>
          <p className="palettegen-bleed__empty-hint">Regenerate palettes, drop photos anywhere, or open Style to tune the look.</p>
        </div>
      </div>
    );
  }

  const copyHex = async (hex: string): Promise<void> => {
    await navigator.clipboard.writeText(hex);
    onCopied(`Copied ${hex}`);
  };

  return (
    <section className="palettegen-bleed" data-testid="palettegen-bleed" aria-label={entry.label}>
      <div className="palettegen-bleed__stripes" data-testid="palettegen-swatches">
        {entry.palette.swatches.map((swatch) => {
          const ink = textColorForHex(swatch.hex);
          const active = hoveredId === swatch.id;
          return (
            <div
              key={swatch.id}
              className="palettegen-bleed__stripe"
              style={{ background: swatch.hex, color: ink }}
              role="button"
              tabIndex={0}
              onMouseEnter={() => setHoveredId(swatch.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(swatch.id)}
              onBlur={() => setHoveredId(null)}
              onClick={() => void copyHex(swatch.hex)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void copyHex(swatch.hex);
                }
              }}
              data-testid={`palettegen-stripe-${swatch.id}`}
            >
              <span className={['palettegen-bleed__hex', active ? 'palettegen-bleed__hex--visible' : ''].filter(Boolean).join(' ')}>
                {swatch.hex}
              </span>
              <div className="palettegen-bleed__stripe-actions">
                {onUseAsSeed ? (
                  <Tooltip title="Use as seed color">
                    <IconButton
                      size="small"
                      className="palettegen-bleed__seed"
                      aria-label={`Use ${swatch.hex} as seed color`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onUseAsSeed(swatch.hex);
                      }}
                      data-testid={`palettegen-stripe-seed-${swatch.id}`}
                      sx={{ color: ink }}
                    >
                      <PaletteOutlinedIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                ) : null}
                <Tooltip title="Copy hex">
                  <IconButton
                    size="small"
                    className="palettegen-bleed__copy"
                    aria-label={`Copy ${swatch.hex}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void copyHex(swatch.hex);
                    }}
                    data-testid={`palettegen-stripe-copy-${swatch.id}`}
                    sx={{ color: ink }}
                  >
                    <ContentCopyIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
      <div className="palettegen-bleed__meta">
        <h2 className="palettegen-bleed__title">{entry.label}</h2>
      </div>
    </section>
  );
}
