import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { ReactElement } from 'react';
import { buildWordsAppDeepLink } from '../../../shared/music/wordsAppDeepLink';
import { formatTimeSignatureForWordsUrl } from '../../../shared/music/timeSignaturePresets';
import { originalSongTimeSignature, type EncoreOriginalSong } from '../types';

export type OriginalsOpenInWordsButtonProps = {
  song: EncoreOriginalSong;
};

export function OriginalsOpenInWordsButton({ song }: OriginalsOpenInWordsButtonProps): ReactElement {
  const href = buildWordsAppDeepLink(song.lyricsAndChords, song.key, {
    bpm: song.tempo,
    timeSignature: formatTimeSignatureForWordsUrl(originalSongTimeSignature(song)),
  });
  return (
    <Tooltip title="Open in Words in Rhythm">
      <IconButton
        size="small"
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open in Words in Rhythm"
      >
        <OpenInNewIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
