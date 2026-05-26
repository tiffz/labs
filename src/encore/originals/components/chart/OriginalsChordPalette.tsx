import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMemo, useState, type ReactElement } from 'react';
import { parseChordSymbol } from '../../../../shared/music/chordMatcher';
import { formatChordForDisplay, type ChordNotationMode } from '../../../../shared/music/chordSymbolDisplay';
import type { ChordInteractionTarget, WordInteractionTarget } from '../../chartInteractionTypes';
import { chordSymbolSuggestions, keyChordPaletteLayout } from './keyChordPalette';

export type OriginalsChordPaletteProps = {
  songKey: string;
  armedChord: string | null;
  notation: ChordNotationMode;
  selectedChord: ChordInteractionTarget | null;
  selectedWord: WordInteractionTarget | null;
  onArm: (chord: string | null) => void;
  onNotationChange: (notation: ChordNotationMode) => void;
  onClearSelection: () => void;
};

function PaletteSegment({
  label,
  chords,
  songKey,
  notation,
  armedChord,
  onPick,
}: {
  label: string;
  chords: string[];
  songKey: string;
  notation: ChordNotationMode;
  armedChord: string | null;
  onPick: (chord: string) => void;
}): ReactElement | null {
  if (chords.length === 0) return null;
  return (
    <Box className="encore-originals-chord-palette-segment">
      <Box component="span" className="encore-originals-chord-palette-segment-label" id={`palette-${label}`}>
        {label}
      </Box>
      <Box
        className="encore-originals-chord-palette-segment-chips"
        role="group"
        aria-labelledby={`palette-${label}`}
      >
        {chords.map((chord) => (
          <Chip
            key={`${label}-${chord}`}
            label={formatChordForDisplay(chord, songKey, notation)}
            size="small"
            clickable
            color={armedChord === chord ? 'primary' : 'default'}
            variant={armedChord === chord ? 'filled' : 'outlined'}
            className={armedChord === chord ? 'encore-originals-chord-active' : undefined}
            onClick={() => onPick(chord)}
          />
        ))}
      </Box>
    </Box>
  );
}

export function OriginalsChordPalette({
  songKey,
  armedChord,
  notation,
  selectedChord,
  selectedWord,
  onArm,
  onNotationChange,
  onClearSelection,
}: OriginalsChordPaletteProps): ReactElement {
  const [customDraft, setCustomDraft] = useState('');
  const layout = keyChordPaletteLayout(songKey);
  const suggestions = useMemo(
    () => chordSymbolSuggestions(songKey, customDraft),
    [customDraft, songKey],
  );

  const pickChord = (chord: string) => {
    if (!parseChordSymbol(chord)) return;
    onArm(armedChord === chord && !selectedChord ? null : chord);
  };

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
    <Box className="encore-originals-chord-palette">
      <Box className="encore-originals-chord-palette-flow" role="toolbar" aria-label="Chord palette">
        <Box className="encore-originals-chord-palette-chips">
          <PaletteSegment
            label="Triads"
            chords={layout.triads}
            songKey={songKey}
            notation={notation}
            armedChord={armedChord}
            onPick={pickChord}
          />
          <PaletteSegment
            label="7ths"
            chords={layout.sevenths}
            songKey={songKey}
            notation={notation}
            armedChord={armedChord}
            onPick={pickChord}
          />
          <PaletteSegment
            label="Maj7"
            chords={layout.maj7s}
            songKey={songKey}
            notation={notation}
            armedChord={armedChord}
            onPick={pickChord}
          />
          <PaletteSegment
            label="Sus"
            chords={layout.sus}
            songKey={songKey}
            notation={notation}
            armedChord={armedChord}
            onPick={pickChord}
          />
        </Box>
        <Box className="encore-originals-chord-palette-tools">
          {statusHint ? <span className="encore-originals-chord-palette-status">{statusHint}</span> : null}
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
                placeholder="Custom"
                size="small"
                inputProps={{ ...params.inputProps, 'aria-label': 'Custom chord' }}
              />
            )}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={notation}
            onChange={(_, v: ChordNotationMode | null) => v && onNotationChange(v)}
            aria-label="Chord notation"
            className="encore-originals-chord-palette-notation"
          >
            <ToggleButton value="letters">A–G</ToggleButton>
            <ToggleButton value="roman">I–V</ToggleButton>
          </ToggleButtonGroup>
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
        </Box>
      </Box>
    </Box>
  );
}
