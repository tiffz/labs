import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EncoreAppShell } from '../ui/EncoreAppShell';
import { EncorePageHeader } from '../ui/EncorePageHeader';

export function AccessRestrictedScreen(props: { message: string | null; onRetry: () => void }): React.ReactElement {
  const { message, onRetry } = props;
  return (
    <EncoreAppShell centered>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          width: 1,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <EncorePageHeader
          sx={{ mb: 2 }}
          kicker="Encore"
          title="Access restricted"
          titleComponent="h1"
          titleVariant="h4"
          description="Invite only. This Google account is not on the allowlist (hashed in config, not stored as email here)."
        />
        {message ? (
          <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 2.5, lineHeight: 1.55 }}>
            {message}
          </Typography>
        ) : null}
        <Button variant="contained" size="large" fullWidth onClick={onRetry}>
          Try another account
        </Button>
      </Paper>
    </EncoreAppShell>
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
    <EncoreAppShell centered>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: 1,
          p: { xs: 3, sm: 4 },
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <EncorePageHeader
          sx={{ mb: 2 }}
          kicker="Encore"
          title="Organize and track your repertoire"
          titleComponent="h1"
          titleVariant="h3"
          description="Your library loads in this browser and works offline. Sign in to Google for Drive backup, sync, and YouTube playlist import. You can stay local-only and add Google later from Account. Spotify is optional there too."
        />
        {!clientConfigured ? (
          <Typography color="error" variant="body2" sx={{ mb: 2, lineHeight: 1.5 }}>
            Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in, or use this build without it (library only).
          </Typography>
        ) : null}
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
    </EncoreAppShell>
  );
}
