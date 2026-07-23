import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { LABS_DRIVE_SIGN_IN_TO_SYNC_LABEL } from '../../shared/drive/labsDriveSyncMessages';
import { LabsAccountDisplayNameSection } from '../../shared/google/LabsAccountDisplayNameSection';
import { LabsAccountIntegrationCard } from '../../shared/google/LabsAccountIntegrationCard';
import { LabsAccountMenu } from '../../shared/google/LabsAccountMenu';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
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
 * Encore account menu, built on the shared {@link LabsAccountMenu} slots:
 * display-name identity, Google + Spotify integration cards
 * ({@link LabsAccountIntegrationCard}), and Encore's privacy footer.
 * Copy contract: `src/encore/COPY_STYLE.md` § Account integrations.
 */
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

  const [menuOpen, setMenuOpen] = useState(false);
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

  const [driveBanner, setDriveBanner] = useState<{
    rootFolderId: string | null;
    lastSuccessfulPushAt: string | null;
  }>({ rootFolderId: null, lastSuccessfulPushAt: null });

  useEffect(() => {
    if (!menuOpen || !googleAccessToken) {
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
  }, [menuOpen, googleAccessToken, syncState]);

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
    if (!menuOpen || !spotifyLinked || !spotifyClientId) {
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
  }, [menuOpen, spotifyLinked, spotifyClientId]);

  const googleClientConfigured = useMemo(
    () => Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim()),
    [],
  );

  // Status pill colors / labels
  const driveStatus = !googleAccessToken
    ? { tone: 'idle' as const, label: 'Not connected' }
    : syncState === 'syncing'
      ? { tone: 'info' as const, label: 'Syncing…' }
      : syncState === 'error'
        ? { tone: 'error' as const, label: 'Sync error' }
        : syncState === 'conflict'
          ? { tone: 'warning' as const, label: 'Conflict' }
          : syncState === 'deferred'
            ? { tone: 'warning' as const, label: 'Not backed up' }
            : driveBanner.lastSuccessfulPushAt
              ? { tone: 'ok' as const, label: 'Backed up' }
              : { tone: 'idle' as const, label: 'Setting up' };

  const driveStatusIcon = (() => {
    if (driveStatus.tone === 'ok') return <CheckCircleIcon sx={{ fontSize: 14 }} />;
    if (driveStatus.tone === 'error') return <ErrorOutlineIcon sx={{ fontSize: 14 }} />;
    return null;
  })();

  const renderGoogleCard = (close: () => void): ReactElement =>
    googleAccessToken ? (
      <LabsAccountIntegrationCard
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
          syncState === 'deferred'
            ? 'Changes on this device are not backed up yet. Review to resolve.'
            : driveBanner.lastSuccessfulPushAt
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
          syncState === 'error' || syncState === 'deferred'
            ? {
                label: syncState === 'deferred' ? 'Review changes' : 'Retry sync',
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
      <LabsAccountIntegrationCard
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
      <LabsAccountIntegrationCard
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
      <LabsAccountIntegrationCard
        brandIcon={<GoogleBrandIcon sx={{ fontSize: 18 }} />}
        title="Google"
        status={{ tone: 'idle', label: 'Unavailable' }}
        description="Google sign-in is not configured for this site."
        primary={undefined}
      />
    );

  const renderSpotifyCard = (close: () => void): ReactElement =>
    spotifyLinked && spotifyClientConfigured ? (
      <LabsAccountIntegrationCard
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
                      sx={{
                        color: "text.secondary",
                        ml: 0.75,
                        fontFamily: 'ui-monospace, monospace',
                        fontWeight: 500
                      }}>
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
              <Typography variant="body2" component="span" sx={{
                display: "block"
              }}>
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
      <LabsAccountIntegrationCard
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
              <Typography variant="body2" component="span" sx={{
                display: "block"
              }}>
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
      <LabsAccountIntegrationCard
        brandIcon={<SpotifyBrandIcon sx={{ fontSize: 18 }} />}
        title="Spotify"
        status={{ tone: 'idle', label: 'Unavailable' }}
        description="Spotify is not configured for this site."
        primary={undefined}
      />
    );

  return (
    <>
      <LabsAccountMenu
        appId="encore"
        googleClientConfigured={googleClientConfigured}
        alwaysShowMenu
        ids={{ menu: 'encore-account-menu', button: 'encore-account-menu-button' }}
        appearance={{
          menuPaperSx: {
            width: 400,
            maxWidth: 'calc(100vw - 24px)',
            mt: 1.25,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: 8,
          },
        }}
        onOpenChange={setMenuOpen}
        renderTrigger={({ triggerProps }) => (
          <Button
            {...triggerProps}
            size="small"
            color="inherit"
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
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                minWidth: 0
              }}>
              <AccountCircleIcon sx={{ opacity: 0.85, flexShrink: 0, fontSize: 24 }} />
              <Stack
                spacing={0.375}
                sx={{
                  alignItems: "flex-start",
                  minWidth: 0,
                  textAlign: 'left'
                }}>
                {effectiveDisplayName ? (
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                    Hi, {effectiveDisplayName}
                  </Typography>
                ) : null}
                {googleSessionExpired && !googleAccessToken ? (
                  <Stack direction="row" spacing={0.5} sx={{
                    alignItems: "center"
                  }}>
                    <ErrorOutlineIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                    <Typography
                      variant="caption"
                      sx={{ lineHeight: 1.35, fontWeight: 600, color: 'warning.main' }}
                    >
                      {LABS_DRIVE_SIGN_IN_TO_SYNC_LABEL}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      lineHeight: 1.35,
                      fontWeight: 500
                    }}>
                    Account
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Button>
        )}
        identitySlot={
          <Box sx={{ mb: 1.5 }}>
            <LabsAccountDisplayNameSection
              effectiveName={effectiveDisplayName ?? null}
              providerName={displayName ?? null}
              onSave={async (name) => {
                await setOwnerDisplayName(name);
              }}
              usageHint="Used in the app header and on shared snapshots."
            />
          </Box>
        }
        integrationsSlot={({ close }) => (
          <>
            {renderGoogleCard(close)}
            <Box sx={{ borderTop: 1, borderColor: encoreHairline }} />
            {renderSpotifyCard(close)}
          </>
        )}
        footer={
          <Box
            sx={{
              px: 3,
              py: 2.25,
              borderTop: 1,
              borderColor: encoreHairline,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
            }}
          >
            <Stack direction="row" spacing={1.25} sx={{
              alignItems: "flex-start"
            }}>
              <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.125 }} aria-hidden />
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  lineHeight: 1.65,
                  letterSpacing: '-0.008em'
                }}>
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
        }
      />
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
