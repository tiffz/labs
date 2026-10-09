import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useEncoreAuth } from '../../context/EncoreAuthContext';

/**
 * "Sign in to do this" with the sign-in button attached, inside the performance editor.
 *
 * The notice used to be text only. The only sign-in button lived outside the dialog, so following
 * it meant closing the dialog and losing everything typed into it. Sign-in is a popup (ADR 0010),
 * so the dialog and its draft stay put while it runs. When the token arrives, the dialog's
 * link-resolution effect re-runs on its own, so a pasted link resolves without a second paste.
 * A failed or closed popup is reported here, inside the dialog, rather than tearing the app down.
 */
export function PerformanceSignInNotice(props: { message: string }): ReactElement {
  const { signInWithGoogle, googleSignInPending, googleSignInError } = useEncoreAuth();
  return (
    <Alert severity="info" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5, minWidth: 0 } }}>
      {props.message}
      {googleSignInError && !googleSignInPending ? (
        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
          Sign-in did not finish: {googleSignInError}
        </Typography>
      ) : null}
      {/* Under the text, not in Alert's `action` slot: at 390px the slot squeezed the message to one word per line. */}
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        disabled={googleSignInPending}
        onClick={() => void signInWithGoogle()}
        sx={{ mt: 0.75, display: 'flex' }}
      >
        {googleSignInPending ? 'Signing in…' : 'Sign in with Google'}
      </Button>
    </Alert>
  );
}
