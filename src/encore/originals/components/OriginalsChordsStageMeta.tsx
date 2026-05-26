import Stack from '@mui/material/Stack';
import type { ReactElement } from 'react';
import BpmInput from '../../../shared/components/music/BpmInput';
import KeyInput from '../../../shared/components/music/KeyInput';
import type { MusicKey } from '../../../shared/music/musicInputConstants';
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
      <KeyInput
        value={song.key as MusicKey}
        onChange={(next) => onChange({ key: next })}
        className="encore-originals-key-input"
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
