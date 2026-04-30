import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function AccessRestrictedScreen(props: { message: string | null; onRetry: () => void }): React.ReactElement {
  const { message, onRetry } = props;
  return (
    <Box className="encore-app-shell flex flex-col items-center justify-center p-6 min-h-screen min-h-[100dvh]">
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          width: 1,
          bgcolor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.14em' }}>
          Encore
        </Typography>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800, letterSpacing: '-0.02em', mt: 0.5 }}>
          Access restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 2 }}>
          Encore is invite-only. Your Google account is not on the published allowlist (SHA-256 hashes only, no
          emails in the repo).
        </Typography>
        {message && (
          <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 3, lineHeight: 1.55 }}>
            {message}
          </Typography>
        )}
        <Button variant="contained" size="large" fullWidth onClick={onRetry}>
          Try another account
        </Button>
      </Paper>
    </Box>
  );
}

export function SignInLanding(props: {
  onSignIn: () => void;
  clientConfigured: boolean;
  /** When set, user can open the library without Google (Drive sync and YouTube import stay gated until sign-in). */
  onContinueLocalOnly?: () => void;
}): React.ReactElement {
  const { onSignIn, clientConfigured, onContinueLocalOnly } = props;
  return (
    <Box className="encore-app-shell flex flex-col items-center justify-center p-6 min-h-screen min-h-[100dvh]">
      <Paper
        elevation={0}
        sx={{
          maxWidth: 460,
          width: 1,
          p: { xs: 3, sm: 4 },
          bgcolor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.14em' }}>
          Encore
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 800, letterSpacing: '-0.03em', mt: 0.5, lineHeight: 1.12 }}
        >
          Organize and track your repertoire
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3, lineHeight: 1.6 }}>
          Your repertoire lives in this browser first and works offline once it has loaded. Sign in to Google when you
          want Drive backup, sync, and YouTube playlist import from Library. You can also continue with a local-only
          library and add Google later from the Account menu. Spotify is optional there too.
        </Typography>
        {!clientConfigured && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in, or use this build without it (library only).
          </Typography>
        )}
        <Stack spacing={1.5}>
          <Button variant="contained" size="large" fullWidth disabled={!clientConfigured} onClick={() => void onSignIn()}>
            Sign in with Google
          </Button>
          {onContinueLocalOnly ? (
            <Button variant="outlined" size="large" fullWidth onClick={onContinueLocalOnly}>
              Continue without Google
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}

