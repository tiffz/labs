import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ReactElement } from 'react';

import {
  colorStateToHex,
  hexToColorState,
  proposePalettesFromColors,
  type PaletteProposal,
} from '../../shared/color';
import { createPaletteFromHexes, parsePalettePaste, type ComicPalette } from '../../shared/palette';

export type LyreflyPaletteImportProps = {
  palette?: ComicPalette | null;
  onPaletteChange: (palette: ComicPalette | undefined) => void;
};

export function LyreflyPaletteImport({ palette, onPaletteChange }: LyreflyPaletteImportProps): ReactElement {
  const [paste, setPaste] = useState('');
  const [seedHex, setSeedHex] = useState('#ff44a1');

  const harmonyProposals = useMemo((): PaletteProposal[] => {
    const state = hexToColorState(seedHex);
    if (!state) return [];
    return proposePalettesFromColors([state], 5);
  }, [seedHex]);

  const onApplyPaste = (): void => {
    const hexes = parsePalettePaste(paste);
    if (!hexes) return;
    onPaletteChange(
      createPaletteFromHexes(hexes, 'Project palette', paste.includes('coolors') ? 'coolors' : 'import'),
    );
  };

  const onApplyProposal = (proposal: PaletteProposal): void => {
    const hexes = proposal.colors.map(colorStateToHex);
    onPaletteChange(createPaletteFromHexes(hexes, proposal.label, 'manual'));
  };

  return (
    <div className="lyrefly-palette-import" data-testid="lyrefly-palette-import">
      <Typography component="h3" variant="subtitle2" className="lyrefly-palette-import__heading">
        Color palette
      </Typography>

      <div className="lyrefly-palette-import__seed-row">
        <label className="lyrefly-palette-import__seed-label" htmlFor="lyrefly-palette-seed">
          Seed color
        </label>
        <input
          id="lyrefly-palette-seed"
          type="color"
          className="lyrefly-palette-import__seed-swatch"
          value={seedHex}
          onChange={(e) => setSeedHex(e.target.value)}
          data-testid="lyrefly-palette-seed"
        />
        <TextField
          size="small"
          value={seedHex}
          onChange={(e) => setSeedHex(e.target.value)}
          slotProps={{ htmlInput: { 'aria-label': 'Seed color hex' } }}
          sx={{ flex: 1, minWidth: 0 }}
        />
      </div>

      {harmonyProposals.length > 0 ? (
        <div className="lyrefly-palette-import__proposals" role="list" aria-label="Palette suggestions">
          {harmonyProposals.map((proposal) => (
            <button
              key={proposal.id}
              type="button"
              className="lyrefly-palette-import__proposal"
              onClick={() => onApplyProposal(proposal)}
              data-testid={`lyrefly-palette-proposal-${proposal.id}`}
            >
              <span className="lyrefly-palette-import__proposal-label">{proposal.label}</span>
              <span className="lyrefly-palette-import__proposal-swatches" aria-hidden>
                {proposal.colors.map((color, index) => (
                  <span
                    key={`${proposal.id}-${index}`}
                    className="lyrefly-palette-import__swatch"
                    style={{ background: colorStateToHex(color) }}
                  />
                ))}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <TextField
        size="small"
        fullWidth
        label="Import from link or hex list"
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder="Coolors URL or #hex, #hex…"
        sx={{ mt: 1 }}
      />
      <Button size="small" sx={{ mt: 0.75 }} onClick={onApplyPaste}>
        Apply import
      </Button>

      {palette ? (
        <div className="lyrefly-palette-import__active" aria-label="Active project palette">
          <span className="lyrefly-palette-import__active-label">Active</span>
          <div className="lyrefly-palette-import__swatches">
            {palette.swatches.map((s) => (
              <span key={s.id} className="lyrefly-palette-import__swatch" style={{ background: s.hex }} title={s.hex} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
