import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import type { SpotifyPlaylistTrackRow } from '../spotify/spotifyApi';
import type { EncorePlaylistImportSuggestRow } from '../spotify/encoreSpotifyPlaylistSync';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
} from '../theme/encoreUiTokens';

export type EncoreSpotifyPlaylistImportReviewDialogProps = {
  open: boolean;
  onClose: () => void;
  reviewKind: 'practice' | 'repertoire';
  importSuggestions: EncorePlaylistImportSuggestRow[] | null;
  importCandidates: SpotifyPlaylistTrackRow[] | null;
  onMergeSuggestion: (item: EncorePlaylistImportSuggestRow) => void;
  onImportSuggestionAsNew: (item: EncorePlaylistImportSuggestRow) => void;
  onConfirmImportNew: () => void;
  pullBusy: boolean;
};

export function EncoreSpotifyPlaylistImportReviewDialog(props: EncoreSpotifyPlaylistImportReviewDialogProps): ReactElement {
  const {
    open,
    onClose,
    reviewKind,
    importSuggestions,
    importCandidates,
    onMergeSuggestion,
    onImportSuggestionAsNew,
    onConfirmImportNew,
    pullBusy,
  } = props;

  const hasSuggestions = (importSuggestions?.length ?? 0) > 0;
  const hasNewCandidates = (importCandidates?.length ?? 0) > 0;
  const isPractice = reviewKind === 'practice';

  const intro = isPractice ? (
    <>
      Exact matches were merged automatically. Use possible matches when a playlist track might already exist in your
      library under a different title. Import new tracks to add them as separate songs (marked{' '}
      <strong>currently practicing</strong>). When the dialog is clear, tap <strong>Sync</strong> on the practice page
      again to update Spotify.
    </>
  ) : (
    <>
      Exact matches were merged automatically. Use possible matches when a playlist track might already exist in your
      library under a different title. Import new tracks to add them as separate songs. When the dialog is clear, tap{' '}
      <strong>Sync</strong> on the repertoire page again to update Spotify.
    </>
  );

  const newTracksCaption = isPractice
    ? 'These were not matched closely enough to an existing song. Import adds them all as practicing songs.'
    : 'These were not matched closely enough to an existing song. Import adds them all as new library songs.';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="encore-playlist-import-review-title"
    >
      <DialogTitle id="encore-playlist-import-review-title" sx={encoreDialogTitleSx}>
        Review playlist import
      </DialogTitle>
      <DialogContent sx={encoreDialogContentSx}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.55 }}>
          {intro}
        </Typography>

        {hasSuggestions ? (
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Possible library matches
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -1 }}>
              Merge adds this Spotify track id to the library song. Add as new keeps a separate song row.
            </Typography>
            {importSuggestions?.map((item) => (
              <Stack key={item.row.trackId} spacing={0.75}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.row.title} · {item.row.artist}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Likely match: {item.match.title} · {item.match.artist} (score {(item.score * 100).toFixed(0)}%)
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="contained" onClick={() => onMergeSuggestion(item)}>
                    Merge into library song
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => onImportSuggestionAsNew(item)}>
                    Add as new song
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {hasSuggestions && hasNewCandidates ? <Divider sx={{ my: 3 }} /> : null}

        {hasNewCandidates ? (
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              New tracks (not in your library)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -0.75 }}>
              {newTracksCaption}
            </Typography>
            <Stack spacing={0.75}>
              {importCandidates?.map((r) => (
                <Typography key={r.trackId} variant="body2">
                  {r.title} · {r.artist}
                </Typography>
              ))}
            </Stack>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose}>Close</Button>
        {hasNewCandidates ? (
          <Button variant="contained" onClick={onConfirmImportNew} disabled={pullBusy}>
            {pullBusy ? 'Importing…' : `Import ${importCandidates?.length ?? 0} new`}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
