import AudioFileOutlinedIcon from '@mui/icons-material/AudioFileOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import YouTubeIcon from '@mui/icons-material/YouTube';
import Box from '@mui/material/Box';
import type { StanzaSong } from '../db/stanzaDb';

export type StanzaLibrarySourceKind = 'youtube' | 'drive' | 'local';

export function stanzaLibrarySourceKind(song: Pick<StanzaSong, 'ytId' | 'driveSourceFileId'>): StanzaLibrarySourceKind {
  if (song.ytId?.trim()) return 'youtube';
  if (song.driveSourceFileId?.trim()) return 'drive';
  return 'local';
}

const SOURCE_META: Record<
  StanzaLibrarySourceKind,
  { label: string; Icon: typeof YouTubeIcon }
> = {
  youtube: { label: 'YouTube video', Icon: YouTubeIcon },
  drive: { label: 'Google Drive file', Icon: CloudOutlinedIcon },
  local: { label: 'Uploaded track', Icon: AudioFileOutlinedIcon },
};

export interface StanzaLibrarySourceBadgeProps {
  kind: StanzaLibrarySourceKind;
}

/** Small dense source indicator on library card thumbnails. */
export default function StanzaLibrarySourceBadge({ kind }: StanzaLibrarySourceBadgeProps) {
  const { label, Icon } = SOURCE_META[kind];
  return (
    <Box
      className="stanza-library-source-badge"
      component="span"
      aria-label={label}
      title={label}
    >
      <Icon sx={{ fontSize: 14 }} aria-hidden />
    </Box>
  );
}
