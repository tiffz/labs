import type { ReactElement } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { EncoreAppShell } from '../ui/EncoreAppShell';
import {
  encorePageKickerSx,
  encoreRadius,
  encoreShadowLift,
} from '../theme/encoreUiTokens';

function accessDenialKind(
  message: string | null,
): 'allowlist' | 'timeout' | 'popup' | 'generic' {
  const m = (message ?? '').toLowerCase();
  if (m.includes('timed out')) return 'timeout';
  if (m.includes('not on the allowlist') || m.includes('vite_allowed_email_hashes')) return 'allowlist';
  if (m.includes('popup window') || m.includes('allow popups')) return 'popup';
  return 'generic';
}

function EncoreWordmark({ size = 'lg' }: { size?: 'md' | 'lg' }): ReactElement {
  const theme = useTheme();
  return (
    <Typography
      component="span"
      sx={{
        fontSize: size === 'lg' ? { xs: '2.75rem', sm: '3.25rem' } : { xs: '2rem', sm: '2.25rem' },
        fontWeight: 800,
        letterSpacing: '-0.045em',
        lineHeight: 1,
        background: `linear-gradient(120deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        display: 'inline-block',
      }}
    >
      Encore
    </Typography>
  );
}

export function AccessRestrictedScreen(props: {
  message: string | null;
  onRetry: () => void;
  /** When set, let the user open the library without Google after an allowlist/auth failure. */
  onContinueLocalOnly?: () => void;
}): ReactElement {
  const { message, onRetry, onContinueLocalOnly } = props;
  const kind = accessDenialKind(message);

  const title =
    kind === 'allowlist'
      ? 'Invite only'
      : kind === 'timeout'
        ? 'Sign-in timed out'
        : kind === 'popup'
          ? 'Pop-up blocked'
          : 'Could not sign in';

  const lead =
    kind === 'allowlist'
      ? 'This Google account is not on the allowlist for this build of Encore.'
      : kind === 'timeout'
        ? 'Google did not return a token before the time limit. That usually means a blocked popup, a closed sign-in window, or a slow network. not that your email failed an allowlist check.'
        : kind === 'popup'
          ? 'Your browser stopped the Google sign-in window. Allow popups for this site (or try again after unblocking), then use Try again below.'
          : 'Something went wrong while signing in with Google.';

  const retryLabel = kind === 'allowlist' ? 'Try another account' : 'Try again';

  return (
    <EncoreAppShell centered>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          width: 1,
          bgcolor: 'background.paper',
          borderRadius: encoreRadius,
          border: 1,
          borderColor: 'divider',
          boxShadow: encoreShadowLift,
        }}
      >
        <Typography variant="overline" color="primary" sx={encorePageKickerSx}>
          Encore
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '1.5rem', sm: '1.625rem' },
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            mb: 1.5,
          }}
        >
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: message ? 1.25 : 2.5, lineHeight: 1.6 }}>
          {lead}
        </Typography>
        {message ? (
          <Typography
            variant="body2"
            color="text.secondary"
            component="pre"
            sx={{
              mb: 2.5,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              wordBreak: 'break-word',
            }}
          >
            {message}
          </Typography>
        ) : null}
        <Button variant="contained" size="large" fullWidth onClick={onRetry}>
          {retryLabel}
        </Button>
        {onContinueLocalOnly ? (
          <Button variant="text" size="large" fullWidth sx={{ mt: 1 }} onClick={onContinueLocalOnly}>
            Continue without Google
          </Button>
        ) : null}
      </Paper>
    </EncoreAppShell>
  );
}

export function SignInLanding(props: {
  onSignIn: () => void;
  clientConfigured: boolean;
  /** When set, user can open the library without Google (Drive sync and YouTube import stay gated until sign-in). */
  onContinueLocalOnly?: () => void;
  /** True while GIS is showing the Google consent / account picker (avoid double launches). */
  signInPending?: boolean;
}): ReactElement {
  const { onSignIn, clientConfigured, onContinueLocalOnly, signInPending = false } = props;
  return (
    <EncoreAppShell centered>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: 1,
          p: { xs: 3.5, sm: 5 },
          bgcolor: 'background.paper',
          borderRadius: encoreRadius,
          border: 1,
          borderColor: 'divider',
          boxShadow: encoreShadowLift,
        }}
      >
        <EncoreWordmark />
        <Typography
          component="h1"
          sx={{
            mt: 2,
            fontSize: { xs: '1.5rem', sm: '1.75rem' },
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            mb: 1.25,
          }}
        >
          Repertoire tracker for singers
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.55 }}>
          Songs, performances, and milestones in one place. Saves locally first; sign in to back up to Google Drive
          and import from YouTube.
        </Typography>
        {!clientConfigured ? (
          <Typography color="error" variant="body2" sx={{ mb: 2, lineHeight: 1.55 }}>
            Google sign-in is not configured for this build. You can still use Encore locally below.
          </Typography>
        ) : null}
        <Stack spacing={1.25}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={!clientConfigured || signInPending}
            onClick={() => void onSignIn()}
            startIcon={signInPending ? <CircularProgress color="inherit" size={20} /> : undefined}
          >
            {signInPending ? 'Waiting for Google…' : 'Sign in with Google'}
          </Button>
          {onContinueLocalOnly ? (
            <Button variant="text" size="large" fullWidth onClick={onContinueLocalOnly}>
              Continue without Google
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </EncoreAppShell>
  );
}
