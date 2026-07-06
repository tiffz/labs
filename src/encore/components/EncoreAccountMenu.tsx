import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { LABS_DRIVE_SIGN_IN_TO_SYNC_LABEL } from '../../shared/drive/labsDriveSyncMessages';
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
import { type SyncUiState, useEncoreLibraryExtras } from '../context/EncoreContext';
import { useEncoreAuth } from '../context/EncoreAuthContext';
import { useEncoreActions } from '../context/useEncoreActions';
import { useEncoreSync } from '../context/useEncoreSync';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { fetchSpotifyCurrentUserSummary, type SpotifyCurrentUserSummary } from '../spotify/spotifyApi';
import { encoreHairline } from '../theme/encoreUiTokens';
import type { ReorganizeDriveUploadsResult } from '../drive/driveReorganize';
import type { DriveDuplicateGroup } from '../drive/driveDuplicateDetection';
import { DriveDuplicateReviewDialog } from './DriveDuplicateReviewDialog';
import { EncoreRecoverDataDialog } from './EncoreRecoverDataDialog';
import { EncoreStatusPill } from '../ui/EncoreStatusPill';
import { GoogleBrandIcon, SpotifyBrandIcon } from './EncoreBrandIcon';

/** Short relative day phrasing for the "Last sync" caption (today / yesterday / Mon DD). */
function formatRelativeSyncInstant(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const time = d.toLocaleTimeString(undefined, { timeStyle: 'short' });
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dayDelta = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
    if (dayDelta === 0) return `today, ${time}`;
    if (dayDelta === 1) return `yesterday, ${time}`;
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
  } catch {
    return iso;
  }
}

/** Privacy policy URL (separate static page; opens in a new tab). */
const PRIVACY_POLICY_URL = '/legal/privacy.html';

/**
 * Parallel card layout used by the Google and Spotify integration sections in the account menu.
 *
 * Both connections have the same conceptual primitives (status, identity, description, sub-actions,
 * primary "sign in again", secondary "disconnect"). Rendering them through one component keeps the
 * visual rhythm consistent so users can scan from one integration to the next without remapping.
 *
 * See `src/encore/COPY_STYLE.md` § _Account integrations_ for the copy contract.
 */
type IntegrationActionConfig =
  | {
      label: string;
      onClick: () => void;
      disabled?: boolean;
      loading?: boolean;
      icon?: ReactNode;
    }
  | undefined;

type IntegrationUtilityAction = {
  /** Tooltip text + accessible name. */
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
};

function IntegrationCard(props: {
  brandIcon: ReactNode;
  title: string;
  status: { tone: 'ok' | 'error' | 'warning' | 'info' | 'idle'; label: string; icon?: ReactNode };
  /**
   * "Signed in as" label + value (and an optional identity-linked open link, e.g. the user's
   * Spotify profile). The link sits adjacent to the value because it's bound to *that* identity;
   * non-identity workspace utilities (open Drive folder, reorganize) belong in `utilityActions`.
   */
  identity?: {
    label: string;
    value: ReactNode;
    link?: { href: string; label: string };
  };
  /** One short sentence describing what this connection does (or how to enable it). */
  description: ReactNode;
  /** Optional caption under the description (e.g. "Last sync today, 9:10 AM"). */
  meta?: ReactNode;
  /** Small icon-only buttons for workspace utilities (open Drive folder, reorganize, etc.). */
  utilityActions?: IntegrationUtilityAction[];
  /** Primary button (Sign in / Sign in again / Reconnect). */
  primary: IntegrationActionConfig;
  /** Optional inline secondary action for error states (e.g. Retry sync). */
  inlineSecondary?: IntegrationActionConfig;
  /** Tertiary text button (Disconnect). Omit when not connected. */
  disconnect?: IntegrationActionConfig;
  /** Inline alert (error / warning) for connection failures. */
  alert?: ReactNode;
  /** Optional caption under the action row (e.g. reorganize result). */
  footnote?: ReactNode;
}): ReactElement {
  const {
    brandIcon,
    title,
    status,
    identity,
    description,
    meta,
    utilityActions,
    primary,
    inlineSecondary,
    disconnect,
    alert,
    footnote,
  } = props;
  return (
    <Box sx={{ px: 3, py: 2.5 }}>
      <Stack spacing={1.5}>
        {/* Section header: brand mark + title + status */}
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box sx={{ color: 'text.secondary', display: 'inline-flex' }}>{brandIcon}</Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              fontSize: '0.6875rem',
              lineHeight: 1.35,
            }}
          >
            {title}
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <EncoreStatusPill tone={status.tone} label={status.label} icon={status.icon} />
          </Box>
        </Stack>

        {/* Identity (only when connected). Identity-linked open is rendered inline with the
            value so the user reads "I'm signed in as X. open X's profile" as one unit. */}
        {identity ? (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.35, fontWeight: 700, letterSpacing: '0.06em', mb: 0.35 }}
            >
              {identity.label}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.25 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, lineHeight: 1.45, wordBreak: 'break-word', minWidth: 0 }}
              >
                {identity.value}
              </Typography>
              {identity.link ? (
                <Tooltip title={identity.link.label}>
                  <IconButton
                    size="small"
                    aria-label={identity.link.label}
                    component="a"
                    href={identity.link.href}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ p: 0.25, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          </Box>
        ) : null}

        {/* Description + optional meta caption */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, letterSpacing: '-0.01em' }}>
            {description}
          </Typography>
          {meta ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}
            >
              {meta}
            </Typography>
          ) : null}
        </Box>

        {/* Utility icon row (open external, reorganize, etc.) */}
        {utilityActions && utilityActions.length > 0 ? (
          <Stack direction="row" spacing={0.25} alignItems="center">
            {utilityActions.map((u) => (
              <Tooltip key={u.label} title={u.label}>
                <span>
                  <IconButton
                    size="small"
                    aria-label={u.label}
                    component={u.href ? 'a' : 'button'}
                    href={u.href}
                    target={u.href ? '_blank' : undefined}
                    rel={u.href ? 'noreferrer' : undefined}
                    onClick={u.onClick}
                    disabled={!u.href && !u.onClick}
                  >
                    {u.icon}
                  </IconButton>
                </span>
              </Tooltip>
            ))}
          </Stack>
        ) : null}

        {/* Inline alert (error / warning) */}
        {alert ? <Box>{alert}</Box> : null}

        {/*
         * Action row.
         *
         * Recovery actions ("Sign in again", "Disconnect") are *low-key* when the connection is
         * healthy — these are paths the user only walks down if something is wrong, so they
         * shouldn't visually compete with the rest of the menu. When status is `warning` /
         * `error` / `idle`, the primary button promotes back to outlined so the user can find
         * the call-to-action while skimming.
         *
         * Disconnect is always low-key — it's a destructive action, never a happy-path CTA.
         */}
        {primary || disconnect || inlineSecondary ? (
          (() => {
            const primaryNeedsCta = status.tone !== 'ok';
            return (
              <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ pt: 0.25 }}>
                {primary ? (
                  <Button
                    size="small"
                    variant={primaryNeedsCta ? 'outlined' : 'text'}
                    color="inherit"
                    startIcon={primary.icon}
                    onClick={primary.onClick}
                    disabled={primary.disabled || primary.loading}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      ...(primaryNeedsCta
                        ? {}
                        : {
                            color: 'text.secondary',
                            px: 1,
                            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                          }),
                    }}
                  >
                    {primary.label}
                  </Button>
                ) : null}
                {inlineSecondary ? (
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    startIcon={inlineSecondary.icon}
                    onClick={inlineSecondary.onClick}
                    disabled={inlineSecondary.disabled || inlineSecondary.loading}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'text.secondary',
                      px: 1,
                      '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                    }}
                  >
                    {inlineSecondary.label}
                  </Button>
                ) : null}
                <Box sx={{ flex: 1 }} />
                {disconnect ? (
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    startIcon={disconnect.icon ?? <LogoutIcon fontSize="small" />}
                    onClick={disconnect.onClick}
                    disabled={disconnect.disabled}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'text.secondary',
                      px: 1,
                      '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                    }}
                  >
                    {disconnect.label}
                  </Button>
                ) : null}
              </Stack>
            );
          })()
        ) : null}

        {footnote ? (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55, display: 'block' }}>
            {footnote}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}

export function EncoreAccountMenu(props: {
  syncState: SyncUiState;
  syncMessage: string | null;
}): ReactElement {
  const { syncState, syncMessage } = props;
  const { effectiveDisplayName } = useEncoreLibraryExtras();
  const {
    displayName,
    googleAccessToken,
    googleEmail,
    googleSessionExpired,
    googleSignInPending,
    signOut,
    signInWithGoogle,
    spotifyConnectError,
    spotifyConnectLoopbackUrl,
    clearSpotifyConnectError,
    spotifyLinked,
    connectSpotify,
    disconnectSpotify,
    reauthorizeSpotify,
  } = useEncoreAuth();
  const { reorganizeDriveUploads, setOwnerDisplayName } = useEncoreActions();
  const { retryDriveSync } = useEncoreSync();

  const [reorganizing, setReorganizing] = useState(false);
  const [driveRetryBusy, setDriveRetryBusy] = useState(false);
  const [reorganizeMsg, setReorganizeMsg] = useState<string | null>(null);
  const [duplicateReviewGroups, setDuplicateReviewGroups] = useState<DriveDuplicateGroup[]>([]);
  const [duplicateReviewOpen, setDuplicateReviewOpen] = useState(false);
  const [recoverDataOpen, setRecoverDataOpen] = useState(false);

  const reportOrganizeResult = useCallback((result: ReorganizeDriveUploadsResult) => {
    const { performanceVideos: pv, attachments: at, dedup } = result;
    const dedupParts: string[] = [];
    if (dedup) {
      if (dedup.songsUpdated + dedup.performancesUpdated > 0) {
        dedupParts.push(
          `merged references in ${dedup.songsUpdated + dedup.performancesUpdated} row${dedup.songsUpdated + dedup.performancesUpdated === 1 ? '' : 's'}`,
        );
      }
      if (dedup.trashed > 0) {
        dedupParts.push(`moved ${dedup.trashed} duplicate file${dedup.trashed === 1 ? '' : 's'} to trash`);
      }
      if (dedup.trashErrors > 0) {
        dedupParts.push(`${dedup.trashErrors} duplicate${dedup.trashErrors === 1 ? '' : 's'} could not be trashed`);
      }
    }
    const dedupPrefix = dedupParts.length > 0 ? `${dedupParts.join(', ')}. ` : '';
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
      setReorganizeMsg(dedupPrefix ? `${dedupPrefix}Already organized.` : 'Already organized.');
    } else if (totalErrors > 0) {
      setReorganizeMsg(
        `${dedupPrefix}Videos: renamed ${pv.renamed}, ${created} shortcut${created === 1 ? '' : 's'} (${pv.errors} errors). Attachments: renamed ${at.renamed}, moved ${at.moved}, ${attShortcuts} shortcut${attShortcuts === 1 ? '' : 's'} (${at.errors} errors).`,
      );
    } else {
      const parts = [
        pv.renamed > 0
          ? `renamed ${pv.renamed} performance video${pv.renamed === 1 ? '' : 's'}`
          : null,
        at.renamed > 0 ? `renamed ${at.renamed} chart/recording file${at.renamed === 1 ? '' : 's'}` : null,
        at.moved > 0
          ? `moved ${at.moved} Encore-managed file${at.moved === 1 ? '' : 's'} to your saved folder targets`
          : null,
        created > 0 ? `created ${created} video shortcut${created === 1 ? '' : 's'}` : null,
        attShortcuts > 0
          ? `created ${attShortcuts} attachment shortcut${attShortcuts === 1 ? '' : 's'}`
          : null,
      ].filter(Boolean);
      const organizeNote =
        parts.length > 0 ? `Drive is up to date: ${parts.join(', ')}.` : 'Drive is up to date. Nothing to change.';
      setReorganizeMsg(`${dedupPrefix}${organizeNote}`);
    }
  }, []);

  const handleReorganize = useCallback(async () => {
    setReorganizing(true);
    setReorganizeMsg(null);
    try {
      const result = await reorganizeDriveUploads();
      setDuplicateReviewGroups(result.duplicateGroupsForReview);
      reportOrganizeResult(result);
    } catch (e) {
      setReorganizeMsg(`Could not reorganize: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setReorganizing(false);
    }
  }, [reorganizeDriveUploads, reportOrganizeResult]);

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

  const spotifyClientId = useMemo(
    () => (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '',
    [],
  );

  const [spotifyAccountSummary, setSpotifyAccountSummary] = useState<SpotifyCurrentUserSummary | null>(null);

  useEffect(() => {
    if (!open || !spotifyLinked || !spotifyClientId) {
      setSpotifyAccountSummary(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const token = await ensureSpotifyAccessToken(spotifyClientId);
        if (!token || cancelled) return;
        const me = await fetchSpotifyCurrentUserSummary(token);
        if (!cancelled) setSpotifyAccountSummary(me);
      } catch {
        if (!cancelled) setSpotifyAccountSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, spotifyLinked, spotifyClientId]);

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
            {googleSessionExpired && !googleAccessToken ? (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <ErrorOutlineIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                <Typography
                  variant="caption"
                  sx={{ lineHeight: 1.35, fontWeight: 600, color: 'warning.main' }}
                >
                  {LABS_DRIVE_SIGN_IN_TO_SYNC_LABEL}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, fontWeight: 500 }}>
                Account
              </Typography>
            )}
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
        {googleAccessToken ? (
          <IntegrationCard
            brandIcon={<GoogleBrandIcon sx={{ fontSize: 18 }} />}
            title="Google"
            status={{ tone: driveStatus.tone, label: driveStatus.label, icon: driveStatusIcon ?? undefined }}
            identity={googleEmail ? { label: 'Signed in as', value: googleEmail } : undefined}
            description={
              <>
                Backed up to <strong>{ENCORE_ROOT_FOLDER}</strong> in your Drive.
              </>
            }
            meta={
              driveBanner.lastSuccessfulPushAt
                ? `Last sync ${formatRelativeSyncInstant(driveBanner.lastSuccessfulPushAt)}.`
                : syncState === 'error' && syncMessage
                  ? syncMessage
                  : undefined
            }
            utilityActions={[
              ...(driveBanner.rootFolderId
                ? [
                    {
                      label: 'Open Encore folder in Drive',
                      icon: <FolderIcon fontSize="small" />,
                      href: driveFolderWebUrl(driveBanner.rootFolderId),
                    },
                  ]
                : []),
              {
                label: reorganizing ? 'Reorganizing…' : 'Reorganize Drive uploads',
                icon: reorganizing ? <RefreshIcon className="spin" fontSize="small" /> : <AutoFixHighIcon fontSize="small" />,
                onClick: () => void handleReorganize(),
              },
              {
                label: 'Recover lost data from history',
                icon: <HistoryIcon fontSize="small" />,
                onClick: () => {
                  close();
                  setRecoverDataOpen(true);
                },
              },
              ...(duplicateReviewGroups.length > 0
                ? [
                    {
                      label: 'View duplicate upload details',
                      icon: <AutoFixHighIcon fontSize="small" />,
                      onClick: () => setDuplicateReviewOpen(true),
                    },
                  ]
                : []),
            ]}
            primary={{
              label: googleSignInPending ? 'Opening Google…' : 'Sign in again',
              icon: googleSignInPending ? (
                <CircularProgress size={14} thickness={5} color="inherit" />
              ) : (
                <RefreshIcon fontSize="small" />
              ),
              loading: googleSignInPending,
              onClick: () => {
                close();
                void signInWithGoogle();
              },
            }}
            inlineSecondary={
              syncState === 'error'
                ? {
                    label: 'Retry sync',
                    icon: driveRetryBusy ? <RefreshIcon className="spin" fontSize="small" /> : <RefreshIcon fontSize="small" />,
                    loading: driveRetryBusy,
                    onClick: () => {
                      setDriveRetryBusy(true);
                      void retryDriveSync().finally(() => setDriveRetryBusy(false));
                    },
                  }
                : undefined
            }
            disconnect={{
              label: 'Disconnect',
              onClick: () => {
                close();
                signOut();
              },
            }}
            footnote={reorganizeMsg ?? undefined}
          />
        ) : googleClientConfigured && googleSessionExpired && googleEmail ? (
          <IntegrationCard
            brandIcon={<GoogleBrandIcon sx={{ fontSize: 18 }} />}
            title="Google"
            status={{ tone: 'warning', label: 'Sign in to sync', icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} /> }}
            identity={{ label: 'Signed in as', value: googleEmail }}
            description="Your Google sign-in expired. Local edits are safe; sign in again to resume Drive backup."
            primary={{
              label: googleSignInPending ? 'Opening Google…' : 'Sign in again',
              icon: googleSignInPending ? (
                <CircularProgress size={14} thickness={5} color="inherit" />
              ) : (
                <RefreshIcon fontSize="small" />
              ),
              loading: googleSignInPending,
              onClick: () => {
                close();
                void signInWithGoogle();
              },
            }}
            disconnect={{
              label: 'Disconnect',
              onClick: () => {
                close();
                signOut();
              },
            }}
          />
        ) : googleClientConfigured ? (
          <IntegrationCard
            brandIcon={<GoogleBrandIcon sx={{ fontSize: 18 }} />}
            title="Google"
            status={{ tone: 'idle', label: 'Not connected' }}
            description="Connect Google to back up your library to Drive and share read-only snapshots."
            primary={{
              label: googleSignInPending ? 'Opening Google…' : 'Sign in with Google',
              icon: googleSignInPending ? (
                <CircularProgress size={14} thickness={5} color="inherit" />
              ) : undefined,
              loading: googleSignInPending,
              onClick: () => {
                close();
                void signInWithGoogle();
              },
            }}
          />
        ) : (
          <IntegrationCard
            brandIcon={<GoogleBrandIcon sx={{ fontSize: 18 }} />}
            title="Google"
            status={{ tone: 'idle', label: 'Unavailable' }}
            description="Google sign-in is not configured for this site."
            primary={undefined}
          />
        )}

        <Box sx={{ borderTop: 1, borderColor: encoreHairline }} />

        {/* Spotify card */}
        {spotifyLinked && spotifyClientConfigured ? (
          <IntegrationCard
            brandIcon={<SpotifyBrandIcon sx={{ fontSize: 18 }} />}
            title="Spotify"
            status={{ tone: 'ok', label: 'Connected', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> }}
            identity={
              spotifyAccountSummary
                ? {
                    label: 'Signed in as',
                    value: (
                      <>
                        {spotifyAccountSummary.display_name?.trim() || 'Spotify user'}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 0.75, fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}
                        >
                          · {spotifyAccountSummary.id}
                        </Typography>
                      </>
                    ),
                    link: {
                      label: 'Open Spotify profile',
                      href: `https://open.spotify.com/user/${encodeURIComponent(spotifyAccountSummary.id)}`,
                    },
                  }
                : undefined
            }
            description="Used for playlist import, sync, and Spotify search."
            primary={{
              label: 'Sign in again',
              icon: <RefreshIcon fontSize="small" />,
              onClick: () => {
                close();
                void reauthorizeSpotify();
              },
            }}
            disconnect={{
              label: 'Disconnect',
              onClick: () => {
                close();
                disconnectSpotify();
              },
            }}
            alert={
              spotifyConnectError ? (
                <Alert severity="error" onClose={clearSpotifyConnectError} sx={{ '& .MuiAlert-message': { width: 1 } }}>
                  <Typography variant="body2" component="span" display="block">
                    {spotifyConnectError}
                  </Typography>
                  {spotifyConnectLoopbackUrl ? (
                    <Link href={spotifyConnectLoopbackUrl} sx={{ mt: 0.75, display: 'inline-block' }}>
                      Open this app on 127.0.0.1
                    </Link>
                  ) : null}
                </Alert>
              ) : undefined
            }
          />
        ) : spotifyClientConfigured ? (
          <IntegrationCard
            brandIcon={<SpotifyBrandIcon sx={{ fontSize: 18 }} />}
            title="Spotify"
            status={{ tone: 'idle', label: 'Not connected' }}
            description="Connect Spotify to import playlists and search Spotify tracks."
            primary={{
              label: 'Sign in with Spotify',
              onClick: () => {
                close();
                clearSpotifyConnectError();
                void connectSpotify();
              },
            }}
            alert={
              spotifyConnectError ? (
                <Alert severity="error" onClose={clearSpotifyConnectError} sx={{ '& .MuiAlert-message': { width: 1 } }}>
                  <Typography variant="body2" component="span" display="block">
                    {spotifyConnectError}
                  </Typography>
                  {spotifyConnectLoopbackUrl ? (
                    <Link href={spotifyConnectLoopbackUrl} sx={{ mt: 0.75, display: 'inline-block' }}>
                      Open this app on 127.0.0.1
                    </Link>
                  ) : null}
                </Alert>
              ) : undefined
            }
          />
        ) : (
          <IntegrationCard
            brandIcon={<SpotifyBrandIcon sx={{ fontSize: 18 }} />}
            title="Spotify"
            status={{ tone: 'idle', label: 'Unavailable' }}
            description="Spotify is not configured for this site."
            primary={undefined}
          />
        )}

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
      <DriveDuplicateReviewDialog
        open={duplicateReviewOpen}
        groups={duplicateReviewGroups}
        onClose={() => setDuplicateReviewOpen(false)}
      />
      <EncoreRecoverDataDialog
        open={recoverDataOpen}
        accessToken={googleAccessToken}
        onClose={() => setRecoverDataOpen(false)}
      />
    </>
  );
}
