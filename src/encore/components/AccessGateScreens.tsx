import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export function AccessRestrictedScreen(props: { message: string | null; onRetry: () => void }): React.ReactElement {
  const { message, onRetry } = props;
  return (
    <Box className="encore-app-shell flex flex-col items-center justify-center p-6 min-h-screen min-h-[100dvh]">
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          p: { xs: 3, sm: 5 },
          width: 1,
          bgcolor: 'background.paper',
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

export function SignInLanding(props: { onSignIn: () => void; clientConfigured: boolean }): React.ReactElement {
  const { onSignIn, clientConfigured } = props;
  return (
    <Box className="encore-app-shell flex flex-col items-center justify-center p-6 min-h-screen min-h-[100dvh]">
      <Paper
        elevation={0}
        sx={{
          maxWidth: 460,
          width: 1,
          p: { xs: 3, sm: 5 },
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.14em' }}>
          Welcome
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 800, letterSpacing: '-0.03em', mt: 0.5, lineHeight: 1.12 }}
        >
          Encore
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3, lineHeight: 1.65 }}>
          Your personal repertoire companion: songs, practice journals, performance logs, and gentle stats. Everything
          stays in your browser first; Google Drive holds one JSON file you control.
        </Typography>
        {!clientConfigured && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable sign-in.
          </Typography>
        )}
        <Button variant="contained" size="large" fullWidth disabled={!clientConfigured} onClick={() => void onSignIn()}>
          Sign in with Google
        </Button>
      </Paper>
    </Box>
  );
}

