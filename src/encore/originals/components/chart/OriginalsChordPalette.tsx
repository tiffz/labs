import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { type ReactElement } from 'react';
import { parseChordSymbol } from '../../../../shared/music/chordMatcher';
import { formatChordForDisplay, type ChordNotationMode } from '../../../../shared/music/chordSymbolDisplay';
import type { ChordInteractionTarget, WordInteractionTarget } from '../../chartInteractionTypes';
import { OriginalsChordPaletteCustomSegment } from './OriginalsChordPaletteCustomSegment';
import { OriginalsChordPaletteNotationToggle } from './OriginalsChordPaletteNotationToggle';
import { keyChordPaletteLayout } from './keyChordPalette';

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
  const layout = keyChordPaletteLayout(songKey);

  const pickChord = (chord: string) => {
    if (!parseChordSymbol(chord)) return;
    onArm(armedChord === chord && !selectedChord ? null : chord);
  };

  return (
    <Box className="encore-originals-chord-palette">
      <Box className="encore-originals-chord-palette-flow" role="toolbar" aria-label="Chord palette">
        <Box className="encore-originals-chord-palette-pick" role="group" aria-label="Pick a chord">
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
          <OriginalsChordPaletteCustomSegment
            songKey={songKey}
            armedChord={armedChord}
            notation={notation}
            selectedChord={selectedChord}
            selectedWord={selectedWord}
            onArm={onArm}
            onClearSelection={onClearSelection}
          />
        </Box>
        <Box className="encore-originals-chord-palette-display" role="group" aria-label="Chord display">
          <Box component="span" className="encore-originals-chord-palette-display-label">
            Show
          </Box>
          <OriginalsChordPaletteNotationToggle notation={notation} onNotationChange={onNotationChange} />
        </Box>
      </Box>
    </Box>
  );
}
