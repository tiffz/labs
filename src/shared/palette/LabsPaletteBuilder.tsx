import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';

import {
  PALETTE_MOOD_PRESETS,
  colorStateToHex,
  dedupePaletteProposals,
  generatePaletteFromSeedHex,
  generateRandomPalettes,
  normalizeHex,
  proposePalettesFromImageFiles,
  resolvePaletteProfile,
  type PaletteGenerationProfile,
  type PaletteMoodPreset,
  type PaletteProposal,
} from '../color';
import { createPaletteFromHexes } from './types';
import type { ComicPalette } from './types';
import './labsPaletteBuilder.css';

export type LabsPaletteBuilderVariant = 'sketchy' | 'lyrefly' | 'neutral';

export interface LabsPaletteBuilderProps {
  className?: string;
  variant?: LabsPaletteBuilderVariant;
  /** Currently active palette, shown as an "Active" strip below the gallery. */
  value?: ComicPalette | null;
  onApply: (palette: ComicPalette) => void;
  swatchCount?: number;
  /** When false, omit the “Palette builder” heading (e.g. inside {@link LabsPaletteField}). */
  showHeading?: boolean;
  /** When false, omit the Active strip (parent already shows the value). */
  showActiveStrip?: boolean;
}

const DEFAULT_SEED_HEX = '#7c3aed';

function initialProposals(swatchCount: number): PaletteProposal[] {
  return dedupePaletteProposals(
    generateRandomPalettes(PALETTE_MOOD_PRESETS.mixed, { seed: Date.now(), swatches: swatchCount }),
  );
}

/**
 * Dropdown/popover-friendly panel for generating and applying comic color palettes: mood presets,
 * fully random "surprise me", seed-from-color, and seed-from-image. Shared across comic apps.
 */
export function LabsPaletteBuilder({
  className,
  variant = 'neutral',
  value,
  onApply,
  swatchCount = 5,
  showHeading = true,
  showActiveStrip = true,
}: LabsPaletteBuilderProps): ReactElement {
  const [mood, setMood] = useState<PaletteMoodPreset>('mixed');
  const [proposals, setProposals] = useState<PaletteProposal[]>(() => initialProposals(swatchCount));
  const [proposalSource, setProposalSource] = useState<ComicPalette['source']>('manual');
  const [seedHex, setSeedHex] = useState(DEFAULT_SEED_HEX);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const runRandomGenerate = (profile: PaletteGenerationProfile, seed: number): void => {
    setError('');
    setProposalSource('manual');
    setProposals(dedupePaletteProposals(generateRandomPalettes(profile, { seed, swatches: swatchCount })));
  };

  const onMoodChange = (nextMood: PaletteMoodPreset): void => {
    setMood(nextMood);
    runRandomGenerate(resolvePaletteProfile(nextMood), Date.now());
  };

  const onRegenerate = (): void => {
    runRandomGenerate(resolvePaletteProfile(mood), Date.now());
  };

  const onSurpriseMe = (): void => {
    setMood('mixed');
    runRandomGenerate(PALETTE_MOOD_PRESETS.mixed, Date.now());
  };

  const onGenerateFromSeed = (): void => {
    const next = generatePaletteFromSeedHex(seedHex, resolvePaletteProfile(mood), swatchCount);
    if (next.length === 0) {
      setError('Enter a valid hex color, like #7c3aed.');
      return;
    }
    setError('');
    setProposalSource('manual');
    setProposals(next);
  };

  const onFilesSelected = async (fileList: FileList | null): Promise<void> => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const files = Array.from(fileList);
      const next = await proposePalettesFromImageFiles(files, {
        maxSwatches: swatchCount,
        profile: resolvePaletteProfile(mood),
      });
      if (next.length === 0) {
        setError('Could not read colors from that image.');
        return;
      }
      setProposalSource('image');
      setProposals(next);
    } catch {
      setError('Could not read that image.');
    } finally {
      setBusy(false);
    }
  };

  const onPick = (proposal: PaletteProposal): void => {
    const hexes = proposal.colors.map(colorStateToHex);
    onApply(createPaletteFromHexes(hexes, proposal.label, proposalSource));
  };

  const seedInputValue = normalizeHex(seedHex) ?? '#808080';

  const rootClassName = [
    'labs-palette-builder',
    variant !== 'neutral' ? `labs-palette-builder--${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} data-variant={variant} data-testid="labs-palette-builder">
      {showHeading ? (
        <Typography component="h3" variant="subtitle2" className="labs-palette-builder__heading">
          Palette builder
        </Typography>
      ) : null}
      <div className="labs-palette-builder__mood-row">
        <FormControl size="small" fullWidth>
          <InputLabel id="labs-palette-builder-mood-label">Mood</InputLabel>
          <Select
            labelId="labs-palette-builder-mood-label"
            label="Mood"
            value={mood}
            onChange={(e) => onMoodChange(e.target.value as PaletteMoodPreset)}
            data-testid="labs-palette-builder-mood"
            MenuProps={
              variant === 'sketchy'
                ? {
                    slotProps: {
                      paper: {
                        className: 'scrapboard-popover labs-palette-builder__mood-menu',
                      },
                    },
                  }
                : undefined
            }
          >
            {Object.values(PALETTE_MOOD_PRESETS).map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" onClick={onRegenerate} data-testid="labs-palette-builder-regenerate">
          Regenerate
        </Button>
      </div>
      <Button
        size="small"
        variant="outlined"
        fullWidth
        className="labs-palette-builder__random-btn"
        onClick={onSurpriseMe}
        data-testid="labs-palette-builder-surprise"
      >
        Surprise me
      </Button>
      <div className="labs-palette-builder__seed-row">
        <label className="labs-palette-builder__seed-label" htmlFor="labs-palette-builder-seed">
          Seed color
        </label>
        <input
          id="labs-palette-builder-seed"
          type="color"
          className="labs-palette-builder__seed-swatch"
          value={seedInputValue}
          onChange={(e) => setSeedHex(e.target.value)}
        />
        <TextField
          size="small"
          value={seedHex}
          onChange={(e) => setSeedHex(e.target.value)}
          slotProps={{ htmlInput: { 'aria-label': 'Seed color hex' } }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <Button size="small" onClick={onGenerateFromSeed} data-testid="labs-palette-builder-from-seed">
          Use seed
        </Button>
      </div>
      <label className="labs-palette-builder__upload">
        <input
          type="file"
          accept="image/*"
          multiple
          className="labs-palette-builder__upload-input"
          onChange={(e) => void onFilesSelected(e.target.files)}
          data-testid="labs-palette-builder-upload"
        />
        <span>{busy ? 'Reading image…' : 'Upload image'}</span>
      </label>
      {error ? (
        <Typography
          variant="caption"
          className="labs-palette-builder__error"
          sx={{
            color: "text.secondary",
            display: "block"
          }}>
          {error}
        </Typography>
      ) : null}
      {proposals.length > 0 ? (
        <div className="labs-palette-builder__proposals" role="list" aria-label="Palette suggestions">
          {proposals.map((proposal) => (
            <button
              key={proposal.id}
              type="button"
              className="labs-palette-builder__proposal"
              onClick={() => onPick(proposal)}
              data-testid={`labs-palette-builder-proposal-${proposal.id}`}
            >
              <span className="labs-palette-builder__proposal-label">{proposal.label}</span>
              <span className="labs-palette-builder__proposal-swatches" aria-hidden>
                {proposal.colors.map((color, index) => (
                  <span
                    key={`${proposal.id}-${index}`}
                    className="labs-palette-builder__swatch"
                    style={{ background: colorStateToHex(color) }}
                  />
                ))}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {showActiveStrip && value ? (
        <div className="labs-palette-builder__active" aria-label="Active palette">
          <span className="labs-palette-builder__active-label">Active</span>
          <div className="labs-palette-builder__swatches">
            {value.swatches.map((swatch) => (
              <span
                key={swatch.id}
                className="labs-palette-builder__swatch"
                style={{ background: swatch.hex }}
                title={swatch.hex}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
