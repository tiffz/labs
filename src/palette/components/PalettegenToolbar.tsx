import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import { useRef, useState, type ChangeEvent, type MouseEvent, type ReactElement } from 'react';

import AppSlider from '../../shared/components/AppSlider';
import {
  exportPaletteAsCssVars,
  exportPaletteAsHexRow,
  exportPaletteAsJson,
} from '../../shared/palette';
import type { PalettegenSourceImage, usePalettegenGallery } from '../hooks/usePalettegenGallery';
import { PalettegenImageLightbox } from './PalettegenImageLightbox';
import { PalettegenLogo } from './PalettegenLogo';
import { PalettegenStylePanel } from './PalettegenStylePanel';
import { PalettegenTitle } from './PalettegenTitle';

type Gallery = ReturnType<typeof usePalettegenGallery>;

export type PalettegenToolbarProps = {
  gallery: Gallery;
  onCopied: (message: string) => void;
};

function normalizeSeedHex(value: string): string {
  const trimmed = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    const expanded = trimmed
      .split('')
      .map((char) => char + char)
      .join('');
    return `#${expanded.toLowerCase()}`;
  }
  return value;
}

export function PalettegenToolbar({ gallery, onCopied }: PalettegenToolbarProps): ReactElement {
  const fileRef = useRef<HTMLInputElement>(null);
  const [styleAnchor, setStyleAnchor] = useState<HTMLElement | null>(null);
  const [copyAnchor, setCopyAnchor] = useState<HTMLElement | null>(null);
  const [viewingImage, setViewingImage] = useState<PalettegenSourceImage | null>(null);
  const {
    mode,
    setMode,
    swatchCount,
    setSwatchCount,
    seedHex,
    setSeedHex,
    busy,
    sourceImages,
    generateFromImages,
    generateFromSeed,
    regenerate,
    activeEntry,
  } = gallery;

  const onFiles = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = '';
    void generateFromImages(files);
  };

  const copyExport = async (text: string, label: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    onCopied(`Copied ${label}.`);
    setCopyAnchor(null);
  };

  const openStyle = (event: MouseEvent<HTMLButtonElement>): void => setStyleAnchor(event.currentTarget);
  const openCopy = (event: MouseEvent<HTMLButtonElement>): void => setCopyAnchor(event.currentTarget);

  const onSeedHexInput = (value: string): void => {
    const next = value.startsWith('#') ? value : `#${value}`;
    setSeedHex(next);
  };

  return (
    <>
      <header className="palettegen-chrome" data-testid="palettegen-toolbar">
        <div className="palettegen-chrome__brand">
          <PalettegenLogo size={30} />
          <PalettegenTitle compact />
        </div>

        <div className="palettegen-chrome__controls">
          <div className="palettegen-chrome__group">
            <Tooltip title="Regenerate palettes (Space)">
              <span>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AutorenewOutlinedIcon />}
                  disabled={busy}
                  onClick={regenerate}
                  data-testid="palettegen-regenerate"
                >
                  Regenerate
                </Button>
              </span>
            </Tooltip>
          </div>

          <span className="palettegen-chrome__divider" aria-hidden />

          <div className="palettegen-chrome__group palettegen-toolbar__modes">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={mode}
              onChange={(_, next) => {
                if (!next) return;
                setMode(next);
                if (next === 'seed') generateFromSeed();
              }}
              aria-label="Palette source"
            >
              <ToggleButton value="random" data-testid="palettegen-mode-random">
                Random
              </ToggleButton>
              <ToggleButton value="image" data-testid="palettegen-mode-image">
                Images
              </ToggleButton>
              <ToggleButton value="seed" data-testid="palettegen-mode-seed">
                Seed
              </ToggleButton>
            </ToggleButtonGroup>

            {mode === 'image' ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={onFiles}
                  data-testid="palettegen-file-input"
                />
                <Tooltip title="Upload images">
                  <IconButton
                    size="small"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    aria-label="Upload images"
                    data-testid="palettegen-upload-btn"
                  >
                    <UploadFileOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {sourceImages.length > 0 ? (
                  <div className="palettegen-toolbar__sources" data-testid="palettegen-source-images">
                    {sourceImages.map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        className="palettegen-toolbar__source-thumb"
                        onClick={() => setViewingImage(image)}
                        aria-label={`View source image ${image.name}`}
                        data-testid={`palettegen-source-thumb-${image.id}`}
                      >
                        <img src={image.url} alt="" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            {mode === 'seed' ? (
              <div className="palettegen-toolbar__seed" data-testid="palettegen-seed-control">
                <label className="palettegen-toolbar__seed-swatch-wrap">
                  <input
                    type="color"
                    className="palettegen-toolbar__seed-swatch"
                    value={seedHex}
                    onChange={(event) => {
                      setSeedHex(event.target.value);
                      generateFromSeed();
                    }}
                    aria-label="Seed color"
                    data-testid="palettegen-seed-color"
                  />
                </label>
                <input
                  type="text"
                  className="palettegen-toolbar__seed-hex"
                  value={seedHex.replace(/^#/, '')}
                  onChange={(event) => onSeedHexInput(event.target.value)}
                  onBlur={() => {
                    const normalized = normalizeSeedHex(seedHex);
                    setSeedHex(normalized);
                    generateFromSeed();
                  }}
                  spellCheck={false}
                  aria-label="Seed hex"
                  data-testid="palettegen-seed-hex"
                />
              </div>
            ) : null}
          </div>

          <span className="palettegen-chrome__divider" aria-hidden />

          <label className="palettegen-chrome__group palettegen-toolbar__count" aria-label="Colors per palette">
            <span className="palettegen-toolbar__count-label">Colors</span>
            <span className="palettegen-toolbar__count-value">{swatchCount}</span>
            <AppSlider
              size="small"
              value={swatchCount}
              min={3}
              max={8}
              step={1}
              valueLabelDisplay="auto"
              onChange={(event) => setSwatchCount(Number(event.target.value))}
              aria-label="Colors per palette"
              data-testid="palettegen-swatch-count"
            />
          </label>

          <span className="palettegen-chrome__spacer" aria-hidden />

          <div className="palettegen-chrome__group palettegen-toolbar__actions">
            <Tooltip title="Palette settings">
              <IconButton
                size="small"
                onClick={openStyle}
                aria-label="Palette settings"
                aria-haspopup="dialog"
                data-testid="palettegen-style-menu"
              >
                <PaletteOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <PalettegenStylePanel gallery={gallery} anchorEl={styleAnchor} onClose={() => setStyleAnchor(null)} />

            <Tooltip title="Copy palette">
              <span>
                <IconButton
                  size="small"
                  disabled={!activeEntry}
                  onClick={openCopy}
                  aria-label="Copy palette"
                  data-testid="palettegen-copy-menu"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Menu anchorEl={copyAnchor} open={Boolean(copyAnchor)} onClose={() => setCopyAnchor(null)}>
              <MenuItem
                disabled={!activeEntry}
                onClick={() => activeEntry && void copyExport(exportPaletteAsHexRow(activeEntry.palette), 'hex row')}
              >
                Hex row
              </MenuItem>
              <MenuItem
                disabled={!activeEntry}
                onClick={() => activeEntry && void copyExport(exportPaletteAsCssVars(activeEntry.palette), 'CSS variables')}
              >
                CSS variables
              </MenuItem>
              <MenuItem
                disabled={!activeEntry}
                onClick={() => activeEntry && void copyExport(exportPaletteAsJson(activeEntry.palette), 'JSON')}
              >
                JSON
              </MenuItem>
            </Menu>
          </div>
        </div>
      </header>

      <PalettegenImageLightbox image={viewingImage} onClose={() => setViewingImage(null)} />
    </>
  );
}
