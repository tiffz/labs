import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { getSyncMeta } from '../db/encoreDb';
import { driveFolderWebUrl, driveMyDriveWebUrl } from '../drive/driveWebUrls';
import { ENCORE_ROOT_FOLDER } from '../drive/constants';
import { useEncore, type SyncUiState } from '../context/EncoreContext';
import { SpotifyBrandIcon } from './EncoreBrandIcon';

function formatDriveInstant(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function EncoreAccountMenu(props: {
  syncState: SyncUiState;
  syncMessage: string | null;
}): ReactElement {
  const { syncState, syncMessage } = props;
  const {
    displayName,
    googleAccessToken,
    signOut,
    signInWithGoogle,
    spotifyLinked,
    disconnectSpotify,
    connectSpotify,
    spotifyConnectError,
    spotifyConnectLoopbackUrl,
    clearSpotifyConnectError,
  } = useEncore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
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

  const syncLabel = !googleAccessToken
    ? 'Not signed in (local library only)'
    : syncState === 'syncing'
      ? 'Syncing…'
      : syncState === 'conflict'
        ? 'Merge conflict — choose in the dialog'
        : syncState === 'error'
          ? 'Sync error'
          : 'Drive backup on';

  const close = () => setAnchorEl(null);

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
          px: 1.5,
          py: 1,
          minHeight: 40,
          maxWidth: { xs: '100%', sm: 280 },
        }}
        endIcon={<ExpandMoreIcon sx={{ opacity: 0.75, fontSize: 20 }} />}
      >
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
          <AccountCircleIcon sx={{ opacity: 0.85, flexShrink: 0, fontSize: 22 }} />
          <Stack alignItems="flex-start" sx={{ minWidth: 0, textAlign: 'left' }}>
            {displayName ? (
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                Hi, {displayName}
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
              Account and connections
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
        slotProps={{ paper: { sx: { maxWidth: 360, mt: 1 } } }}
        MenuListProps={{ 'aria-labelledby': 'encore-account-menu-button' }}
      >
        <Box sx={{ px: 2.5, py: 1.75 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            Privacy
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.45 }}>
            Your library stays in this browser. Google handles Drive backup and YouTube playlist import. Encore does not
            host your library on its servers.
          </Typography>
        </Box>
        <Divider />
        <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1.25, display: 'block', fontWeight: 700 }}>
          Google
        </Typography>
        <MenuItem
          disabled
          sx={{
            opacity: 1,
            whiteSpace: 'normal',
            alignItems: 'flex-start',
            py: 1.25,
            pointerEvents: 'none',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Drive backup
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {syncLabel}
            </Typography>
          </Box>
        </MenuItem>
        {googleAccessToken ? (
          <>
            {driveBanner.rootFolderId ? (
              <>
                <Box sx={{ px: 2, py: 1 }}>
                  <Stack spacing={0.75}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        color={
                          syncState === 'error'
                            ? 'error'
                            : syncState === 'conflict'
                              ? 'warning'
                              : syncState === 'syncing'
                                ? 'info'
                                : 'success'
                        }
                        variant="filled"
                        label={
                          syncState === 'syncing'
                            ? 'Syncing…'
                            : syncState === 'error'
                              ? 'Sync error'
                              : syncState === 'conflict'
                                ? 'Conflict'
                                : 'On My Drive'
                        }
                      />
                      {driveBanner.lastSuccessfulPushAt && syncState !== 'syncing' ? (
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                          Last backup {formatDriveInstant(driveBanner.lastSuccessfulPushAt)}
                        </Typography>
                      ) : null}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                      Your <strong>{ENCORE_ROOT_FOLDER}</strong> folder is in Google Drive.
                    </Typography>
                    {syncState === 'error' && syncMessage ? (
                      <Typography variant="caption" color="error" sx={{ lineHeight: 1.45, display: 'block' }}>
                        {syncMessage}
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
                <MenuItem
                  component="a"
                  href={driveFolderWebUrl(driveBanner.rootFolderId)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={close}
                  dense
                >
                  Open {ENCORE_ROOT_FOLDER} in Drive
                </MenuItem>
                <MenuItem
                  component="a"
                  href={driveMyDriveWebUrl()}
                  target="_blank"
                  rel="noreferrer"
                  onClick={close}
                  dense
                >
                  Open My Drive
                </MenuItem>
              </>
            ) : (
              <Box sx={{ px: 2, py: 1 }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      color={
                        syncState === 'error'
                          ? 'error'
                          : syncState === 'conflict'
                            ? 'warning'
                            : syncState === 'syncing'
                              ? 'info'
                              : 'default'
                      }
                      variant={syncState === 'idle' ? 'outlined' : 'filled'}
                      label={
                        syncState === 'syncing'
                          ? 'Setting up…'
                          : syncState === 'error'
                            ? 'Sync error'
                            : syncState === 'conflict'
                              ? 'Conflict'
                              : 'Not on Drive yet'
                      }
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: 'block' }}>
                    {syncState === 'syncing'
                      ? `Encore is creating the ${ENCORE_ROOT_FOLDER} folder and running your first backup.`
                      : syncState === 'error'
                        ? (syncMessage ?? 'Drive backup hit an error. Try again in a moment, or sign out and back in.')
                        : syncState === 'conflict'
                          ? 'Resolve the merge dialog on screen, then the folder will finish setting up.'
                          : `The ${ENCORE_ROOT_FOLDER} folder appears in My Drive after your first successful backup.`}
                  </Typography>
                  <Link href={driveMyDriveWebUrl()} target="_blank" rel="noreferrer" variant="body2" onClick={close}>
                    Open My Drive
                  </Link>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: 'block' }}>
                    After sync, look for a folder named <strong>{ENCORE_ROOT_FOLDER}</strong>. This link opens Google
                    Drive in a new tab.
                  </Typography>
                </Stack>
              </Box>
            )}
            <MenuItem
              onClick={() => {
                close();
                signOut();
              }}
            >
              Disconnect Google
            </MenuItem>
          </>
        ) : googleClientConfigured ? (
          <MenuItem
            onClick={() => {
              close();
              void signInWithGoogle();
            }}
          >
            Sign in to Google…
          </MenuItem>
        ) : (
          <MenuItem disabled>Google sign-in not configured for this site</MenuItem>
        )}
        <Divider sx={{ my: 0.5 }} />
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ px: 2, pt: 1, display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 700 }}
        >
          <SpotifyBrandIcon sx={{ fontSize: 18 }} />
          Spotify (optional)
        </Typography>
        <Box sx={{ px: 2, pb: 0.75 }}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: 'block' }}>
            Playlist import and Spotify search on song pages. Skip if you do not use Spotify.
          </Typography>
        </Box>
        {spotifyLinked ? (
          <MenuItem
            onClick={() => {
              close();
              disconnectSpotify();
            }}
          >
            Disconnect Spotify
          </MenuItem>
        ) : spotifyClientConfigured ? (
          <MenuItem
            onClick={() => {
              void connectSpotify();
            }}
          >
            Connect Spotify…
          </MenuItem>
        ) : (
          <MenuItem disabled>Spotify not configured for this site</MenuItem>
        )}
        {spotifyConnectError ? (
          <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
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
          </Box>
        ) : null}
      </Menu>
    </>
  );
}
