import Button from '@mui/material/Button';
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

function EncoreWordmark({ size = 'lg' }: { size?: 'md' | 'lg' }): React.ReactElement {
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
          Invite only
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
          This Google account is not on the allowlist for this build of Encore.
        </Typography>
        {message ? (
          <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 2.5, lineHeight: 1.6 }}>
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
          <Button variant="contained" size="large" fullWidth disabled={!clientConfigured} onClick={() => void onSignIn()}>
            Sign in with Google
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
