import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { getSyncMeta } from '../db/encoreDb';
import { driveFolderWebUrl } from '../drive/driveWebUrls';
import { ENCORE_ROOT_FOLDER } from '../drive/constants';
import { useEncore, type SyncUiState } from '../context/EncoreContext';
import { encoreHairline, encoreShadowLift } from '../theme/encoreUiTokens';
import { EncoreSpotifyConnectionChip } from '../ui/EncoreSpotifyConnectionChip';
import { EncoreStatusPill } from '../ui/EncoreStatusPill';
import { GoogleBrandIcon, SpotifyBrandIcon } from './EncoreBrandIcon';

function formatDriveInstant(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/** Privacy policy URL (separate static page; opens in a new tab). */
const PRIVACY_POLICY_URL = '/legal/privacy.html';

/** Section card used inside the account menu — title row + body content. */
function MenuSection(props: {
  icon: ReactNode;
  title: string;
  status?: ReactNode;
  children?: ReactNode;
}): ReactElement {
  const { icon, title, status, children } = props;
  return (
    <Box sx={{ px: 3, py: 2.5 }}>
      <Stack direction="row" alignItems="flex-start" spacing={1.25} sx={{ mb: 1.25 }}>
        <Box sx={{ color: 'text.secondary', display: 'inline-flex', mt: 0.125 }}>{icon}</Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            fontSize: '0.6875rem',
            lineHeight: 1.35,
            pt: 0.125,
          }}
        >
          {title}
        </Typography>
        {status ? (
          <Box sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', flexShrink: 0, mt: -0.25 }}>{status}</Box>
        ) : null}
      </Stack>
      {children ? <Box sx={{ pl: { xs: 0, sm: 0.25 } }}>{children}</Box> : null}
    </Box>
  );
}

export function EncoreAccountMenu(props: {
  syncState: SyncUiState;
  syncMessage: string | null;
}): ReactElement {
  const { syncState, syncMessage } = props;
  const {
    displayName,
    effectiveDisplayName,
    setOwnerDisplayName,
    googleAccessToken,
    signOut,
    signInWithGoogle,
    spotifyConnectError,
    spotifyConnectLoopbackUrl,
    clearSpotifyConnectError,
    reorganizeDriveUploads,
    retryDriveSync,
  } = useEncore();

  const [reorganizing, setReorganizing] = useState(false);
  const [driveRetryBusy, setDriveRetryBusy] = useState(false);
  const [reorganizeMsg, setReorganizeMsg] = useState<string | null>(null);
  const handleReorganize = useCallback(async () => {
    setReorganizing(true);
    setReorganizeMsg(null);
    try {
      const { performanceVideos: pv, attachments: at } = await reorganizeDriveUploads();
      const totalErrors = pv.errors + at.errors;
      const created = pv.shortcutsCreated;
      const attShortcuts = at.shortcutsCreated;
      if (
        pv.renamed === 0 &&
        totalErrors === 0 &&
        created === 0 &&
        attShortcuts === 0 &&
        at.renamed === 0 &&
        at.moved === 0
      ) {
        setReorganizeMsg('Already organized.');
      } else if (totalErrors > 0) {
        setReorganizeMsg(
          `Videos: renamed ${pv.renamed}, ${created} shortcut${created === 1 ? '' : 's'} (${pv.errors} errors). Attachments: renamed ${at.renamed}, moved ${at.moved}, ${attShortcuts} shortcut${attShortcuts === 1 ? '' : 's'} (${at.errors} errors).`,
        );
      } else {
        const parts = [
          pv.renamed > 0
            ? `renamed ${pv.renamed} performance video${pv.renamed === 1 ? '' : 's'}`
            : null,
          at.renamed > 0 ? `renamed ${at.renamed} chart/recording file${at.renamed === 1 ? '' : 's'}` : null,
          at.moved > 0 ? `moved ${at.moved} file${at.moved === 1 ? '' : 's'} into Encore folders` : null,
          created > 0 ? `created ${created} video shortcut${created === 1 ? '' : 's'}` : null,
          attShortcuts > 0
            ? `created ${attShortcuts} attachment shortcut${attShortcuts === 1 ? '' : 's'}`
            : null,
        ].filter(Boolean);
        setReorganizeMsg(`Drive is up to date — ${parts.join(', ') || 'nothing to do'}.`);
      }
    } catch (e) {
      setReorganizeMsg(`Could not reorganize: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setReorganizing(false);
    }
  }, [reorganizeDriveUploads]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setNameEditing(false);
    }
  }, [open]);

  const startNameEdit = useCallback(() => {
    setNameDraft(effectiveDisplayName ?? '');
    setNameEditing(true);
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }, [effectiveDisplayName]);

  const commitNameEdit = useCallback(async () => {
    if (nameSaving) return;
    setNameSaving(true);
    try {
      await setOwnerDisplayName(nameDraft);
      setNameEditing(false);
    } finally {
      setNameSaving(false);
    }
  }, [nameDraft, nameSaving, setOwnerDisplayName]);

  const cancelNameEdit = useCallback(() => setNameEditing(false), []);

  const onNameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void commitNameEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelNameEdit();
      }
    },
    [commitNameEdit, cancelNameEdit],
  );

  const [driveBanner, setDriveBanner] = useState<{
    rootFolderId: string | null;
    lastSuccessfulPushAt: string | null;
  }>({ rootFolderId: null, lastSuccessfulPushAt: null });

  useEffect(() => {
    if (!open || !googleAccessToken) {
      setDriveBanner({ rootFolderId: null, lastSuccessfulPushAt: null });
      return;
    }
    let cancelled = false;
    void getSyncMeta().then((m) => {
      if (!cancelled) {
        setDriveBanner({
          rootFolderId: m.rootFolderId?.trim() || null,
          lastSuccessfulPushAt: m.lastSuccessfulPushAt?.trim() || null,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, googleAccessToken, syncState]);

  const spotifyClientConfigured = useMemo(
    () => Boolean((import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim()),
    [],
  );

  const googleClientConfigured = useMemo(
    () => Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim()),
    [],
  );

  const close = () => setAnchorEl(null);

  // Status pill colors / labels
  const driveStatus = !googleAccessToken
    ? { tone: 'idle' as const, label: 'Not connected' }
    : syncState === 'syncing'
      ? { tone: 'info' as const, label: 'Syncing…' }
      : syncState === 'error'
        ? { tone: 'error' as const, label: 'Sync error' }
        : syncState === 'conflict'
          ? { tone: 'warning' as const, label: 'Conflict' }
          : driveBanner.lastSuccessfulPushAt
            ? { tone: 'ok' as const, label: 'Backed up' }
            : { tone: 'idle' as const, label: 'Setting up' };

  const driveStatusIcon = (() => {
    if (driveStatus.tone === 'ok') return <CheckCircleIcon sx={{ fontSize: 14 }} />;
    if (driveStatus.tone === 'error') return <ErrorOutlineIcon sx={{ fontSize: 14 }} />;
    return null;
  })();

  return (
    <>
      <Button
        size="small"
        color="inherit"
        id="encore-account-menu-button"
        aria-controls={open ? 'encore-account-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: 2,
          px: 1.75,
          py: 1.125,
          minHeight: 44,
          maxWidth: { xs: '100%', sm: 300 },
        }}
        endIcon={<ExpandMoreIcon sx={{ opacity: 0.75, fontSize: 20 }} />}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <AccountCircleIcon sx={{ opacity: 0.85, flexShrink: 0, fontSize: 24 }} />
          <Stack alignItems="flex-start" spacing={0.375} sx={{ minWidth: 0, textAlign: 'left' }}>
            {effectiveDisplayName ? (
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                Hi, {effectiveDisplayName}
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, fontWeight: 500 }}>
              Account
            </Typography>
          </Stack>
        </Stack>
      </Button>
      <Menu
        id="encore-account-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 400,
              maxWidth: 'calc(100vw - 24px)',
              mt: 1.25,
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${encoreHairline}`,
              boxShadow: encoreShadowLift,
            },
          },
        }}
        MenuListProps={{ 'aria-labelledby': 'encore-account-menu-button', sx: { p: 0 } }}
      >
        {/* Identity card */}
        <Box sx={{ px: 3, pt: 3, pb: 2 }}>
          {nameEditing ? (
            <TextField
              size="small"
              fullWidth
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={onNameKeyDown}
              inputRef={(el: HTMLInputElement | null) => {
                nameInputRef.current = el;
              }}
              placeholder={displayName ?? 'Your name'}
              disabled={nameSaving}
              label="Display name"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Save display name" onClick={() => void commitNameEdit()} disabled={nameSaving}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" aria-label="Cancel" onClick={cancelNameEdit} disabled={nameSaving}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText={
                displayName && nameDraft.trim() !== displayName
                  ? `Leave blank to use “${displayName}” from Google.`
                  : 'Used in the app header and on shared snapshots.'
              }
            />
          ) : (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <AccountCircleIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.4, fontWeight: 600, letterSpacing: '0.06em', mb: 0.5 }}
                >
                  Display name
                </Typography>
                <Typography
                  variant="h6"
                  component="p"
                  noWrap
                  sx={{
                    fontWeight: 700,
                    color: effectiveDisplayName ? 'text.primary' : 'text.secondary',
                    lineHeight: 1.35,
                    letterSpacing: '-0.02em',
                    m: 0,
                  }}
                >
                  {effectiveDisplayName ?? 'Not set'}
                </Typography>
              </Box>
              <Tooltip title="Edit display name">
                <IconButton size="small" aria-label="Edit display name" onClick={startNameEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>

        <Box sx={{ borderTop: 1, borderColor: encoreHairline }} />

        {/* Google card */}
        <MenuSection
          icon={<GoogleBrandIcon sx={{ fontSize: 18 }} />}
          title="Google"
          status={
            <EncoreStatusPill
              tone={driveStatus.tone}
              label={driveStatus.label}
              icon={driveStatusIcon ?? undefined}
            />
          }
        >
          {googleAccessToken ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, letterSpacing: '-0.01em' }}>
                Drive backup runs in the background. Your library lives in the{' '}
                <strong>{ENCORE_ROOT_FOLDER}</strong> folder.
                {driveBanner.lastSuccessfulPushAt ? (
                  <>
                    {' '}Last backup {formatDriveInstant(driveBanner.lastSuccessfulPushAt)}.
                  </>
                ) : null}
              </Typography>
              {syncState === 'error' && syncMessage ? (
                <Typography variant="caption" color="error" sx={{ lineHeight: 1.45 }}>
                  {syncMessage}
                </Typography>
              ) : null}
              <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mt: 0.5, pt: 0.25 }}>
                {driveBanner.rootFolderId ? (
                  <Tooltip title="Open Encore folder in Drive">
                    <IconButton
                      size="small"
                      component="a"
                      href={driveFolderWebUrl(driveBanner.rootFolderId)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={close}
                      aria-label="Open Encore folder in Drive"
                    >
                      <FolderIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
                <Tooltip
                  title={
                    reorganizing
                      ? 'Reorganizing…'
                      : 'Reorganize Drive uploads (performance videos, charts, recordings)'
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => void handleReorganize()}
                      disabled={reorganizing}
                      aria-label="Reorganize Drive uploads (videos, charts, recordings)"
                    >
                      {reorganizing ? <RefreshIcon className="spin" fontSize="small" /> : <AutoFixHighIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
                {syncState === 'error' ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    disabled={driveRetryBusy}
                    startIcon={driveRetryBusy ? <RefreshIcon className="spin" fontSize="small" /> : <RefreshIcon fontSize="small" />}
                    onClick={() => {
                      setDriveRetryBusy(true);
                      void retryDriveSync().finally(() => setDriveRetryBusy(false));
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Retry sync
                  </Button>
                ) : null}
                <Box sx={{ flex: 1 }} />
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    close();
                    void signInWithGoogle();
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Sign in again
                </Button>
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  startIcon={<LogoutIcon fontSize="small" />}
                  onClick={() => {
                    close();
                    signOut();
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Disconnect
                </Button>
              </Stack>
              {reorganizeMsg ? (
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block', pt: 0.25 }}>
                  {reorganizeMsg}
                </Typography>
              ) : null}
            </Stack>
          ) : googleClientConfigured ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, letterSpacing: '-0.01em' }}>
                Connect Google to back up your library to Drive and share read-only snapshots.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  close();
                  void signInWithGoogle();
                }}
                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
              >
                Sign in with Google
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Google sign-in is not configured for this site.
            </Typography>
          )}
        </MenuSection>

        <Box sx={{ borderTop: 1, borderColor: encoreHairline }} />

        {/* Spotify card */}
        <MenuSection
          icon={<SpotifyBrandIcon sx={{ fontSize: 18 }} />}
          title="Spotify"
          status={<EncoreSpotifyConnectionChip size="compact" onMenuAction={close} />}
        >
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, letterSpacing: '-0.01em' }}>
              Powers playlist import and song search. Skip if you don’t use Spotify.
            </Typography>
            {!spotifyClientConfigured ? (
              <Typography variant="caption" color="text.secondary">
                Spotify is not configured for this site.
              </Typography>
            ) : null}
          </Stack>
          {spotifyConnectError ? (
            <Alert
              severity="error"
              onClose={clearSpotifyConnectError}
              sx={{ mt: 1.5, '& .MuiAlert-message': { width: 1 } }}
            >
              <Typography variant="body2" component="span" display="block">
                {spotifyConnectError}
              </Typography>
              {spotifyConnectLoopbackUrl ? (
                <Link href={spotifyConnectLoopbackUrl} sx={{ mt: 0.75, display: 'inline-block' }}>
                  Open this app on 127.0.0.1
                </Link>
              ) : null}
            </Alert>
          ) : null}
        </MenuSection>

        <Box sx={{ borderTop: 1, borderColor: encoreHairline }} />

        {/* Privacy footer (one-liner with a link) */}
        <Box sx={{ px: 3, py: 2.25, bgcolor: (t) => alpha(t.palette.primary.main, 0.03) }}>
          <Stack direction="row" alignItems="flex-start" spacing={1.25}>
            <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.125 }} aria-hidden />
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65, letterSpacing: '-0.008em' }}>
              Your library stays in this browser; Encore doesn’t host it.{' '}
              <Link
                href={PRIVACY_POLICY_URL}
                target="_blank"
                rel="noreferrer"
                underline="hover"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontWeight: 600 }}
              >
                Privacy policy
                <OpenInNewIcon sx={{ fontSize: 12 }} />
              </Link>
              .
            </Typography>
          </Stack>
        </Box>
      </Menu>
    </>
  );
}
