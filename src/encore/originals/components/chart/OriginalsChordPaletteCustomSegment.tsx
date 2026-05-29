import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useMemo, useState, type ReactElement } from 'react';
import { parseChordSymbol } from '../../../../shared/music/chordMatcher';
import { formatChordForDisplay, type ChordNotationMode } from '../../../../shared/music/chordSymbolDisplay';
import type { ChordInteractionTarget, WordInteractionTarget } from '../../chartInteractionTypes';
import { chordSymbolSuggestions } from './keyChordPalette';

export type OriginalsChordPaletteCustomSegmentProps = {
  songKey: string;
  armedChord: string | null;
  notation: ChordNotationMode;
  selectedChord: ChordInteractionTarget | null;
  selectedWord: WordInteractionTarget | null;
  onArm: (chord: string | null) => void;
  onClearSelection: () => void;
};

export function OriginalsChordPaletteCustomSegment({
  songKey,
  armedChord,
  notation,
  selectedChord,
  selectedWord,
  onArm,
  onClearSelection,
}: OriginalsChordPaletteCustomSegmentProps): ReactElement {
  const [customDraft, setCustomDraft] = useState('');
  const suggestions = useMemo(
    () => chordSymbolSuggestions(songKey, customDraft),
    [customDraft, songKey],
  );

  const armCustom = (value: string) => {
    const sym = value.trim();
    if (!sym || !parseChordSymbol(sym)) return;
    onArm(sym);
    setCustomDraft('');
  };

  const statusHint = selectedWord
    ? 'Pick chord'
    : armedChord
      ? `${formatChordForDisplay(armedChord, songKey, notation)} → word`
      : null;
  const showClear = Boolean(armedChord || selectedChord || selectedWord);

  return (
    <>
      {statusHint ? <span className="encore-originals-chord-palette-status">{statusHint}</span> : null}
      <Box className="encore-originals-chord-palette-segment encore-originals-chord-palette-segment--custom">
        <Box component="span" className="encore-originals-chord-palette-segment-label" id="palette-custom">
          Custom
        </Box>
        <Autocomplete
          id="encore-originals-custom-chord"
          freeSolo
          size="small"
          className="encore-originals-chord-palette-custom"
          options={suggestions}
          inputValue={customDraft}
          onInputChange={(_, value) => setCustomDraft(value)}
          onChange={(_, value) => {
            if (typeof value === 'string') armCustom(value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              armCustom(customDraft);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Type chord"
              size="small"
              inputProps={{
                ...params.inputProps,
                'aria-label': 'Custom chord',
                'aria-labelledby': 'palette-custom',
              }}
            />
          )}
          slotProps={{
            paper: { className: 'encore-originals-chord-palette-custom-menu' },
          }}
        />
      </Box>
      {showClear ? (
        <button
          type="button"
          className="encore-originals-chord-palette-clear"
          onClick={() => {
            onArm(null);
            onClearSelection();
          }}
        >
          Clear
        </button>
      ) : null}
    </>
  );
}
