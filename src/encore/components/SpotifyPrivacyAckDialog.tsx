import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { encoreDialogActionsSx, encoreDialogContentSx, encoreDialogTitleSx } from '../theme/encoreUiTokens';
import { useEffect, useState, type ReactElement } from 'react';

export function SpotifyPrivacyAckDialog(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}): ReactElement {
  const { open, onClose, onConfirm } = props;
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (open) setChecked(false);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="spotify-privacy-title">
      <DialogTitle id="spotify-privacy-title" sx={encoreDialogTitleSx}>
        Connect Spotify
      </DialogTitle>
      <DialogContent sx={encoreDialogContentSx}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
          Spotify is optional. Encore only uses it for features you start (playlist import, track search). Spotify
          processes data under its own terms.
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} color="primary" />}
          label={
            <Typography variant="body2" component="span">
              I agree to the{' '}
              <Link href="/legal/privacy.html" target="_blank" rel="noreferrer">
                Labs Privacy Policy
              </Link>{' '}
              and understand third-party services (including Spotify) have their own policies.
            </Typography>
          }
        />
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!checked} onClick={onConfirm}>
          Continue to Spotify
        </Button>
      </DialogActions>
    </Dialog>
  );
}
