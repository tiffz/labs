import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/** Only these need the uploaded audio file; manual tempo, sections, and tap tempo still work on YouTube. */
const UPLOAD_UNLOCKED_FEATURES = [
  { label: 'Tempo detection', Icon: AutoFixHighOutlinedIcon },
  { label: 'Key detection', Icon: MusicNoteOutlinedIcon },
  { label: 'Key shifting', Icon: TuneOutlinedIcon },
] as const;

export type StanzaYoutubeLocalFeaturesNoticeProps = {
  /** True when this song already has a local file alongside YouTube. */
  hasUploadedFile?: boolean;
  /** Label for the uploaded practice source (matches Source switch). */
  localLabel?: string;
  /** Switch practice source to the uploaded file. Required when `hasUploadedFile`. */
  onSwitchToUploaded?: () => void;
};

/**
 * Practice-rail note for YouTube-linked songs.
 * Dual-source: quiet FYI at the rail top; whole row switches to the uploaded file.
 * YouTube-only: short explainer for why analysis tools need an upload.
 */
export default function StanzaYoutubeLocalFeaturesNotice({
  hasUploadedFile = false,
  localLabel = 'Uploaded file',
  onSwitchToUploaded,
}: StanzaYoutubeLocalFeaturesNoticeProps) {
  if (hasUploadedFile) {
    const label = `Switch to ${localLabel} for analysis tools`;
    return (
      <Box className="stanza-rail-section stanza-rail-section--youtube-local stanza-rail-section--youtube-local-fyi">
        <button
          type="button"
          className="stanza-youtube-local-fyi"
          onClick={onSwitchToUploaded}
          aria-label={label}
        >
          <InfoOutlinedIcon className="stanza-youtube-local-fyi-icon" aria-hidden />
          <span className="stanza-youtube-local-fyi-text">{label}.</span>
        </button>
      </Box>
    );
  }

  return (
    <Box className="stanza-rail-section stanza-rail-section--youtube-local">
      <Typography component="h3" className="stanza-rail-section-title">
        Upload for analysis
      </Typography>

      <Typography component="p" className="stanza-youtube-local-copy">
        YouTube links can&apos;t be analyzed here. Add the same recording for:
      </Typography>

      <Box
        className="stanza-youtube-local-features"
        role="list"
        aria-label="Analysis features that need an uploaded file"
      >
        {UPLOAD_UNLOCKED_FEATURES.map(({ label, Icon }) => (
          <Box key={label} className="stanza-youtube-local-feature" role="listitem">
            <Icon className="stanza-youtube-local-feature-icon" aria-hidden />
            <span className="stanza-youtube-local-feature-label">{label}</span>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
