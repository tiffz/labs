import Box from '@mui/material/Box';
import type { StanzaSong, StanzaStemTrack } from '../../db/stanzaDb';
import type { StanzaPracticeSource } from '../../utils/stanzaPracticeSource';
import StanzaAccountMenu from '../StanzaAccountMenu';
import StanzaAudioDownloadButton from '../StanzaAudioDownloadButton';
import StanzaRepeatMark from '../StanzaRepeatMark';
import StanzaSongTitleEditor from '../StanzaSongTitleEditor';
import { StanzaPracticeSourceSwitch } from '../StanzaPracticeSourceSwitch';

type StanzaViewerHeaderBarProps = {
  song: StanzaSong;
  practiceSource: StanzaPracticeSource | null;
  hasDualPracticeSources: boolean;
  playbackRate: number;
  transposeSemitones: number;
  durationSec: number | undefined;
  primaryGain: number;
  stems: StanzaStemTrack[];
  onCommitTitle: (title: string) => void;
  onBack: () => void;
  onChangePracticeSource: (source: StanzaPracticeSource) => void;
  onRemoveUpload: () => void;
};

/** Song viewer header: mark, editable title, back link, practice-source switch, download, account. */
export default function StanzaViewerHeaderBar({
  song,
  practiceSource,
  hasDualPracticeSources,
  playbackRate,
  transposeSemitones,
  durationSec,
  primaryGain,
  stems,
  onCommitTitle,
  onBack,
  onChangePracticeSource,
  onRemoveUpload,
}: StanzaViewerHeaderBarProps) {
  return (
    <Box
      className="stanza-viewer-header"
      sx={{
        pt: { xs: 1.25, sm: 1.5 },
        pb: 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <StanzaRepeatMark size={40} />
      <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
        <StanzaSongTitleEditor title={song.title} onCommit={onCommitTitle} />
        <button type="button" className="stanza-link-quiet stanza-viewer-back-link" onClick={onBack} aria-label="Back to library">
          ← Back to library
        </button>
        {hasDualPracticeSources && practiceSource ? (
          <StanzaPracticeSourceSwitch
            active={practiceSource}
            localLabel="Uploaded file"
            onChange={onChangePracticeSource}
            onRemoveUpload={onRemoveUpload}
          />
        ) : null}
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          ml: 'auto',
          alignSelf: 'flex-start',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {song.localAudioBlob && practiceSource === 'local' ? (
          <StanzaAudioDownloadButton
            song={song}
            playbackRate={playbackRate}
            transposeSemitones={transposeSemitones}
            durationSec={durationSec}
            primaryGain={primaryGain}
            stems={stems}
          />
        ) : null}
        <StanzaAccountMenu />
      </Box>
    </Box>
  );
}
