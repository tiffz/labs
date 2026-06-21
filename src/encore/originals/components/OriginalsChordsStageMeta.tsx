import Stack from '@mui/material/Stack';
import type { ReactElement } from 'react';
import BpmInput from '../../../shared/components/music/BpmInput';
import { EncoreKeyChip } from '../../ui/EncoreKeyChip';
import type { EncoreOriginalSong } from '../types';

export type OriginalsChordsStageMetaProps = {
  song: EncoreOriginalSong;
  onChange: (patch: Partial<EncoreOriginalSong>) => void;
};

export function OriginalsChordsStageMeta({ song, onChange }: OriginalsChordsStageMetaProps): ReactElement {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      flexWrap="nowrap"
      useFlexGap
      className="encore-originals-chords-meta"
    >
      <EncoreKeyChip
        value={song.key}
        placeholder="Key"
        displayMode="compact"
        onChange={(next) => onChange({ key: next })}
        className="encore-originals-key-chip"
      />
      <BpmInput
        value={song.tempo}
        onChange={(next) => onChange({ tempo: Math.round(next) })}
        min={40}
        max={200}
        layout="inline"
        showRandomize={false}
        showRateActions={false}
        showPresetDropdown
        className="encore-originals-bpm-inline"
      />
    </Stack>
  );
}
