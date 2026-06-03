import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
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

/**
 * Practice-rail note for YouTube-linked songs: quiet explainer for why analysis tools are off.
 */
export default function StanzaYoutubeLocalFeaturesNotice() {
  return (
    <Box className="stanza-rail-section stanza-rail-section--youtube-local">
      <Typography component="h3" className="stanza-rail-section-title">
        Upload for full tools
      </Typography>

      <Typography component="p" className="stanza-youtube-local-copy">
        YouTube links can&apos;t be analyzed here.
      </Typography>

      <Typography component="p" className="stanza-youtube-local-copy stanza-youtube-local-copy--lead">
        Upload the same recording to unlock:
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
