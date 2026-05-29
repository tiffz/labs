import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import type { ReactElement } from 'react';
import type { ChordNotationMode } from '../../../../shared/music/chordSymbolDisplay';

export type OriginalsChordPaletteNotationToggleProps = {
  notation: ChordNotationMode;
  onNotationChange: (notation: ChordNotationMode) => void;
};

export function OriginalsChordPaletteNotationToggle({
  notation,
  onNotationChange,
}: OriginalsChordPaletteNotationToggleProps): ReactElement {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={notation}
      onChange={(_, v: ChordNotationMode | null) => v && onNotationChange(v)}
      aria-label="Chord notation"
      className="encore-originals-chord-palette-notation"
    >
      <Tooltip title="Letter names (A, Bb, C…)">
        <ToggleButton value="letters" aria-label="Letter chord names">
          A–G
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Roman numerals (I, ii, V…)">
        <ToggleButton value="roman" aria-label="Roman numeral chords">
          I–V
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
