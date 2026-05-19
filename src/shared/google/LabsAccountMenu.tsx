import { useCallback, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AddToDriveIcon from '@mui/icons-material/AddToDrive';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import AppTooltip from '../components/AppTooltip';
import LabsGoogleSignInButton from './LabsGoogleSignInButton';
import { ensureLabsGoogleAccessTokenForDrive } from './labsGoogleDriveAccess';
import {
  getLabsGoogleSessionConsumerIdFromPath,
  LABS_GOOGLE_SESSION_CONSUMERS,
  touchLabsGoogleSessionConsumer,
  useLabsGoogleSessionTouches,
  type LabsGoogleSessionConsumerId,
  type LabsGoogleSessionTouches,
} from './labsGoogleSessionConsumers';
import { formatLabsDriveInstant } from './formatLabsDriveInstant';

const PRIVACY_URL = 'https://labs.tiffzhang.com/privacy';

export type LabsAccountBackupSlotProps = {
  identity: { email: string } | null;
  testerResolved: boolean;
  testerOk: boolean;
  allowlistEmpty: boolean;
  busy: boolean;
  message: string | null;
  onBackup: () => void;
  lastBackupExportedAt?: string;
  /** Short scope line, e.g. "Markers & YouTube IDs · audio on device" */
  scopeSummary: string;
  /** Optional detail for the info icon beside the scope line. */
  scopeTooltip?: string;
};

export type LabsAccountMenuAppearance = {
  menuPaperClassName?: string;
  menuPaperSx?: SxProps<Theme>;
  iconButtonSx?: SxProps<Theme>;
  tooltipTitle?: string;
};

export type LabsAccountMenuProps = {
  appId: LabsGoogleSessionConsumerId;
  googleClientConfigured: boolean;
  backup: LabsAccountBackupSlotProps;
  /** Shown under the email line (e.g. explain remembered identity vs live Drive permission). */
  identityCaption?: string;
  appearance?: LabsAccountMenuAppearance;
  ids: { menu: string; button: string };
  renderBackupButton: (ctx: { disabled: boolean; busy: boolean; onBackup: () => void }) => ReactNode;
};

function formatSessionTouchDay(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function LabsAppsCompactRow(props: {
  touches: LabsGoogleSessionTouches;
  currentId: LabsGoogleSessionConsumerId | null;
  onNavigateApp: () => void;
}) {
  const { touches, currentId, onNavigateApp } = props;
  return (
    <AppTooltip title="Labs apps on this Google account. Hover a link for when you last opened it here.">
      <Stack
        direction="row"
        component="nav"
        aria-label="Labs apps on this Google account"
        flexWrap="wrap"
        alignItems="center"
        sx={{ columnGap: 0.75, rowGap: 0.25 }}
      >
        {LABS_GOOGLE_SESSION_CONSUMERS.map((app, i) => {
          const here = currentId === app.id;
          const openedAt = touches[app.id];
          const tip = [
            app.blurb,
            openedAt ? `Opened here ${formatSessionTouchDay(openedAt)}` : 'Not opened on this device yet',
          ].join(' · ');
          return (
            <Box key={app.id} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              {i > 0 ? (
                <Typography component="span" variant="caption" color="text.disabled" sx={{ userSelect: 'none' }}>
                  ·
                </Typography>
              ) : null}
              <Link
                href={app.href}
                title={tip}
                onClick={onNavigateApp}
                variant="body2"
                underline="hover"
                sx={{
                  fontWeight: here ? 700 : 500,
                  color: here ? 'text.primary' : 'primary.main',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {app.label}
              </Link>
            </Box>
          );
        })}
      </Stack>
    </AppTooltip>
  );
}

function backupMessageIsFailure(message: string): boolean {
  return /failed|error|403|401|timed out/i.test(message);
}

/**
 * When Google client id is configured but Encore-persisted identity is missing: offer GIS sign-in
 * so Drive backup UIs (Stanza / Scales) match “signed out → sign in” expectations.
 */
function LabsAccountSignInMenu(props: {
  ids: { menu: string; button: string };
  appearance: LabsAccountMenuAppearance;
  tooltipTitle?: string;
}): ReactElement {
  const { ids, appearance, tooltipTitle } = props;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setAnchorEl(null);
    setError(null);
  }, []);

  const onSignIn = useCallback(() => {
    setError(null);
    setBusy(true);
    void (async () => {
      try {
        await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        close();
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === 'string'
              ? e
              : 'Google sign-in did not finish. Try again and allow popups for this site.';
        setError(msg);
      } finally {
        setBusy(false);
      }
    })();
  }, [close]);

  return (
    <>
      <AppTooltip title={tooltipTitle ?? 'Sign in with Google'}>
        <IconButton
          id={ids.button}
          aria-controls={open ? ids.menu : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          size="medium"
          disabled={busy}
          aria-label="Open Google sign-in"
          sx={{
            color: 'text.secondary',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'primary.main',
              color: 'text.primary',
            },
            ...appearance.iconButtonSx,
          }}
        >
          {busy ? (
            <CircularProgress size={22} sx={{ color: 'primary.main' }} aria-label="Signing in" />
          ) : (
            <AccountCircleOutlinedIcon sx={{ fontSize: 26 }} />
          )}
        </IconButton>
      </AppTooltip>
      <Menu
        id={ids.menu}
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 0,
            className: appearance.menuPaperClassName,
            sx: {
              mt: 1,
              maxWidth: 'min(100vw - 24px, 320px)',
              overflow: 'hidden',
              ...appearance.menuPaperSx,
            },
          },
        }}
        keepMounted={false}
      >
        <Box sx={{ px: 2.5, py: 2, minWidth: 260 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, letterSpacing: '-0.02em', mb: 1 }}>
            Google account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.5 }}>
            Sign in to back up to Drive. Uses the same session as Encore on this browser.
          </Typography>
          {error ? (
            <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
              {error}
            </Alert>
          ) : null}
          <LabsGoogleSignInButton onClick={onSignIn} disabled={busy} label={busy ? 'Signing in…' : 'Sign in with Google'} />
        </Box>
      </Menu>
    </>
  );
}

function LabsAccountBackupBlock(props: {
  backup: LabsAccountBackupSlotProps;
  alertSurfaceSx: SxProps<Theme>;
  renderBackupButton: LabsAccountMenuProps['renderBackupButton'];
}) {
  const { backup, alertSurfaceSx, renderBackupButton } = props;
  const msgFail = typeof backup.message === 'string' && backupMessageIsFailure(backup.message);

  if (!backup.testerResolved) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
        <CircularProgress size={24} sx={{ color: 'primary.main' }} aria-label="Checking access" />
      </Box>
    );
  }

  if (!backup.testerOk) {
    return (
      <Alert severity="info" sx={{ ...alertSurfaceSx, py: 0.5, '& .MuiAlert-message': { py: 0.5 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
          {backup.allowlistEmpty
            ? 'Google Drive backup is off in this build. No tester hashes are configured (set VITE_LABS_DRIVE_TESTER_HASHES or VITE_ALLOWED_EMAIL_HASHES in the deployment).'
            : 'This account is not on the Google Drive backup tester list for this deployment.'}
        </Typography>
      </Alert>
    );
  }

  const scopeTooltip =
    backup.scopeTooltip ??
    'Creates and updates files in a folder this app owns on your Google Drive (drive.file scope).';

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="flex-start" spacing={0.5} useFlexGap>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, flex: 1, minWidth: 0 }}>
          {backup.scopeSummary}
        </Typography>
        <AppTooltip title={scopeTooltip}>
          <IconButton
            size="small"
            aria-label="What Drive backup includes"
            sx={{ mt: -0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </AppTooltip>
      </Stack>
      {backup.lastBackupExportedAt ? (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: -0.5 }}>
          Last backup {formatLabsDriveInstant(backup.lastBackupExportedAt)}
        </Typography>
      ) : null}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {renderBackupButton({
          disabled: backup.busy,
          busy: backup.busy,
          onBackup: backup.onBackup,
        })}
      </Box>
      {backup.message ? (
        <Alert
          severity={msgFail ? 'error' : 'success'}
          sx={{
            py: 0.5,
            ...alertSurfaceSx,
            ...(msgFail
              ? {
                  borderColor: 'rgba(211, 47, 47, 0.28)',
                  bgcolor: 'rgba(255, 248, 247, 0.96)',
                  '& .MuiAlert-icon': { color: 'error.main' },
                }
              : {
                  borderColor: 'rgba(46, 125, 50, 0.22)',
                  bgcolor: 'rgba(246, 252, 246, 0.92)',
                  '& .MuiAlert-icon': { color: 'success.main' },
                }),
          }}
        >
          {backup.message}
        </Alert>
      ) : null}
    </Stack>
  );
}

/**
 * Minimal account + Labs app strip + Google Drive backup (test) block. Apps pass theme-specific `appearance`
 * and `renderBackupButton` for Encore / Stanza / Scales styling.
 *
 * When Google is configured but there is no **persisted Labs Google identity** yet, renders a sign-in
 * entry point (same Encore `localStorage` keys) instead of hiding entirely.
 */
export function LabsAccountMenu(props: LabsAccountMenuProps) {
  const { appId, googleClientConfigured, backup, identityCaption, appearance = {}, ids, renderBackupButton } = props;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const sessionTouches = useLabsGoogleSessionTouches();

  const currentConsumerId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getLabsGoogleSessionConsumerIdFromPath(window.location.pathname);
  }, []);

  useEffect(() => {
    touchLabsGoogleSessionConsumer(appId);
  }, [appId]);

  if (!googleClientConfigured) return null;
  const accountEmail = backup.identity?.email?.trim();
  if (!accountEmail) {
    return (
      <LabsAccountSignInMenu
        ids={ids}
        appearance={appearance}
        tooltipTitle={appearance.tooltipTitle ?? 'Sign in with Google'}
      />
    );
  }

  const close = () => setAnchorEl(null);

  const alertSurfaceSx: SxProps<Theme> = {
    bgcolor: 'action.hover',
    border: '1px solid',
    borderColor: 'divider',
    color: 'text.secondary',
    '& .MuiAlert-icon': { color: 'text.secondary' },
    '& .MuiAlert-message': { width: '100%' },
  };

  return (
    <>
      <AppTooltip title={appearance.tooltipTitle ?? 'Account'}>
        <IconButton
          id={ids.button}
          aria-controls={open ? ids.menu : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          size="medium"
          aria-label="Open account menu"
          sx={{
            color: 'text.secondary',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'primary.main',
              color: 'text.primary',
            },
            ...appearance.iconButtonSx,
          }}
        >
          <AccountCircleOutlinedIcon sx={{ fontSize: 26 }} />
        </IconButton>
      </AppTooltip>
      <Menu
        id={ids.menu}
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 0,
            className: appearance.menuPaperClassName,
            sx: {
              mt: 1,
              maxWidth: 'min(100vw - 24px, 320px)',
              overflow: 'hidden',
              ...appearance.menuPaperSx,
            },
          },
        }}
        keepMounted={false}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
          <Box sx={{ px: 2.5, pt: 2, pb: 2, minWidth: 260 }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, letterSpacing: '-0.02em', mb: 1.5 }}>
              Account
            </Typography>

            {identityCaption ? (
              <AppTooltip title={identityCaption}>
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    display: 'block',
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 1.25,
                    cursor: 'default',
                  }}
                >
                  {accountEmail}
                </Typography>
              </AppTooltip>
            ) : (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 1.25,
                }}
              >
                {accountEmail}
              </Typography>
            )}

            <LabsAppsCompactRow touches={sessionTouches} currentId={currentConsumerId} onNavigateApp={close} />

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
              <AddToDriveIcon sx={{ fontSize: 22, color: 'primary.main', flexShrink: 0 }} aria-hidden />
              <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3, color: 'text.primary' }}>
                Google Drive backup
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.75, fontWeight: 600, letterSpacing: '0.02em' }}
                >
                  (test)
                </Typography>
              </Typography>
            </Stack>

            <LabsAccountBackupBlock
              backup={backup}
              alertSurfaceSx={alertSurfaceSx}
              renderBackupButton={renderBackupButton}
            />
          </Box>
          <Box
            component="footer"
            sx={(theme) => ({
              px: 2.5,
              pt: 1.5,
              pb: 1.75,
              borderTop: '1px solid',
              borderColor: alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.22 : 0.35),
            })}
          >
            <Typography
              variant="overline"
              component="p"
              sx={{
                m: 0,
                mb: 0.75,
                color: 'text.disabled',
                letterSpacing: '0.12em',
                fontSize: '0.65rem',
                lineHeight: 1.2,
              }}
            >
              Labs site
            </Typography>
            <Link
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Privacy policy (opens in new tab)"
              underline="none"
              sx={(theme) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                typography: 'body2',
                fontWeight: 600,
                color: 'text.secondary',
                textDecoration: 'none',
                borderRadius: 1,
                mx: -0.75,
                px: 0.75,
                py: 0.75,
                transition: theme.transitions.create(['background-color', 'color'], {
                  duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'primary.main',
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              })}
            >
              Privacy policy
              <OpenInNewIcon sx={{ fontSize: 16, opacity: 0.72 }} aria-hidden />
            </Link>
          </Box>
        </Box>
      </Menu>
    </>
  );
}
