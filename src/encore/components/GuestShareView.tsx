import MicIcon from '@mui/icons-material/Mic';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPublicDriveJson } from '../drive/bootstrapFolders';
import {
  guestSnapshotErrorKindFromUnknown,
  guestSnapshotErrorMessage,
  shouldShowGuestSnapshotDevSetup,
  type GuestSnapshotErrorKind,
} from '../drive/guestSnapshotLoadError';
import type { PublicSnapshot } from '../types';
import { orderSnapshotSongsByLatestPerformanceDesc } from '../drive/publicSnapshotSort';
import { isPublicDriveGuestFetchConfigured } from '../../shared/drive/buildPublicDriveAltMediaUrl';
import { GuestSnapshotDevSetupPanel } from './guest/GuestSnapshotDevSetupPanel';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../utils/encoreNoAlbumArtSurface';
import {
  encorePageKickerSx,
  encorePageTitleSx,
  encoreRadius,
  encoreShadowSurface,
  encoreShellCenteredSx,
} from '../theme/encoreUiTokens';
import { youtubeWatchUrlFromInput } from '../youtube/parseYoutubeVideoUrl';
import { pickGuestYoutubeBackingWatchUrl } from './guestYoutubeBackingWatchUrl';
import { SpotifyBrandIcon, YouTubeBrandIcon } from './EncoreBrandIcon';

function isPublicSnapshot(data: unknown): data is PublicSnapshot {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.version === 1 && Array.isArray(d.songs) && Array.isArray(d.performances);
}

/** e.g. "Tiff's Repertoire" when a display name is published with the snapshot. */
function possessiveTitle(name: string | undefined | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return 'Repertoire';
  return `${trimmed}\u2019s Repertoire`;
}

export function GuestShareView({ fileId }: { fileId: string }): React.ReactElement {
  const theme = useTheme();
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<GuestSnapshotErrorKind | 'generic' | null>(null);
  const [snap, setSnap] = useState<PublicSnapshot | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  const guestStreamingLinkIconSx = useMemo(() => {
    const short = theme.transitions.duration.shorter;
    const iconTransition = theme.transitions.create(['filter', 'opacity', 'transform'], { duration: short });
    const fillTransition = theme.transitions.create(['fill'], { duration: short });
    const shellTransition = theme.transitions.create(['background-color'], { duration: short });
    const hoverSurface = { bgcolor: alpha(theme.palette.primary.main, 0.07) };
    const focusRing = {
      '&:focus-visible': {
        outline: `2px solid ${alpha(theme.palette.primary.main, 0.45)}`,
        outlineOffset: 2,
      },
    };
    const gray = theme.palette.text.secondary;
    const youtubeRed = '#FF0000';

    return {
      spotify: {
        p: 0.5,
        borderRadius: 1.25,
        transition: shellTransition,
        ...focusRing,
        '& .MuiSvgIcon-root': {
          fontSize: 22,
          display: 'block',
          opacity: 0.72,
          filter: 'grayscale(1)',
          transition: iconTransition,
        },
        '&:hover': {
          ...hoverSurface,
          '& .MuiSvgIcon-root': {
            filter: 'grayscale(0)',
            opacity: 1,
            transform: 'scale(1.06)',
          },
        },
      },
      /** YouTube mark is two paths; flattening filters hide the play triangle — use muted fills instead. */
      youtube: {
        p: 0.5,
        borderRadius: 1.25,
        transition: shellTransition,
        ...focusRing,
        '& .MuiSvgIcon-root': {
          fontSize: 22,
          display: 'block',
          transition: iconTransition,
          '& path:nth-of-type(1)': { fill: gray, transition: fillTransition },
          '& path:nth-of-type(2)': { fill: theme.palette.common.white, transition: fillTransition },
        },
        '&:hover': {
          ...hoverSurface,
          '& .MuiSvgIcon-root': {
            transform: 'scale(1.06)',
            '& path:nth-of-type(1)': { fill: youtubeRed },
            '& path:nth-of-type(2)': { fill: '#fff' },
          },
        },
      },
      /** Backing-track YouTube — Google Material `Mic` (filled). */
      backingYoutube: {
        p: 0.5,
        borderRadius: 1.25,
        transition: shellTransition,
        ...focusRing,
        color: gray,
        '& .MuiSvgIcon-root': {
          fontSize: 22,
          display: 'block',
          opacity: 0.72,
          transition: iconTransition,
        },
        '&:hover': {
          ...hoverSurface,
          color: theme.palette.primary.main,
          '& .MuiSvgIcon-root': {
            opacity: 1,
            transform: 'scale(1.06)',
          },
        },
      },
    };
  }, [theme]);

  const sortedSongs = useMemo((): PublicSnapshot['songs'] => {
    if (!snap) return [];
    return orderSnapshotSongsByLatestPerformanceDesc(snap.songs, snap.performances);
  }, [snap]);

  useEffect(() => {
    if (!isPublicDriveGuestFetchConfigured()) {
      setState('error');
      setErrorKind(import.meta.env.DEV ? 'dev_missing_api_key' : 'not_configured');
      setMessage(guestSnapshotErrorMessage(import.meta.env.DEV ? 'dev_missing_api_key' : 'not_configured'));
      return;
    }
    const key = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim() ?? '';
    let cancelled = false;
    setState('loading');
    setMessage(null);
    setErrorKind(null);
    void (async () => {
      try {
        const data = await fetchPublicDriveJson(fileId, key);
        if (cancelled) return;
        if (!isPublicSnapshot(data)) {
          setState('error');
          setErrorKind('generic');
          setMessage('This snapshot file is not in a format Encore recognizes.');
          return;
        }
        setSnap(data);
        setState('ready');
      } catch (e) {
        if (cancelled) return;
        setState('error');
        const kind = guestSnapshotErrorKindFromUnknown(e);
        setErrorKind(kind);
        if (kind === 'generic') {
          setMessage(e instanceof Error ? e.message : String(e));
        } else {
          setMessage(guestSnapshotErrorMessage(kind));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileId, attempt]);

  if (state === 'loading') {
    return (
      <Box className="encore-app-shell" sx={encoreShellCenteredSx}>
        <CircularProgress aria-label="Loading shared repertoire" />
      </Box>
    );
  }

  if (state === 'error' || !snap) {
    const showDevSetup = shouldShowGuestSnapshotDevSetup(errorKind);
    return (
      <Box className="encore-app-shell" sx={{ minHeight: '100dvh' }}>
        <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 8 } }}>
          <Typography variant="overline" color="primary" sx={encorePageKickerSx}>
            Encore
          </Typography>
          <Typography variant="h5" component="h1" sx={{ ...encorePageTitleSx, mb: 1 }}>
            Couldn’t open this snapshot
          </Typography>
          {showDevSetup ? (
            <>
              <Typography
                sx={{
                  color: "text.secondary",
                  lineHeight: 1.6
                }}>
                {message ?? guestSnapshotErrorMessage('dev_missing_api_key')}
              </Typography>
              <GuestSnapshotDevSetupPanel />
            </>
          ) : (
            <Typography
              sx={{
                color: "text.secondary",
                lineHeight: 1.6,
                mb: 1
              }}>
              {message ?? 'The link may have expired or been removed.'}
            </Typography>
          )}
          <Typography
            sx={{
              color: "text.secondary",
              lineHeight: 1.6,
              mb: 3,
              mt: showDevSetup ? 0 : undefined
            }}>
            If this keeps happening, ask the owner to publish the snapshot again from Encore. The link does not change.
          </Typography>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={retry}>
            Try again
          </Button>
        </Container>
      </Box>
    );
  }

  const updated = new Date(snap.generatedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Box className="encore-app-shell" sx={{ minHeight: '100dvh' }}>
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 }, pb: { xs: 8, sm: 10 } }}>
        <Typography variant="overline" color="primary" sx={encorePageKickerSx}>
          Shared
        </Typography>
        <Typography variant="h4" component="h1" sx={{ ...encorePageTitleSx, mb: 0.75 }}>
          {possessiveTitle(snap.ownerDisplayName)}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 4,
            lineHeight: 1.55
          }}>
          Updated {updated} · Read-only snapshot
        </Typography>

        <Stack spacing={1.5}>
          {sortedSongs.map((s) => {
            const songPerformances = snap.performances
              .filter((p) => p.songId === s.id)
              .sort((a, b) => b.date.localeCompare(a.date));
            const meta = s.performanceKey ?? '';
            const ytWatchUrl = youtubeWatchUrlFromInput(s.youtubeVideoId);
            const backingYtCandidate = pickGuestYoutubeBackingWatchUrl(s.backingLinks);
            const backingYtUrl =
              backingYtCandidate && backingYtCandidate !== ytWatchUrl ? backingYtCandidate : null;

            return (
              <Card
                key={s.id}
                elevation={0}
                sx={{
                  borderRadius: encoreRadius,
                  bgcolor: 'background.paper',
                  border: 'none',
                  boxShadow: encoreShadowSurface,
                  transition: theme.transitions.create(['box-shadow', 'transform'], { duration: 200 }),
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(76, 29, 149, 0.08)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', py: 2 }}>
                  {s.albumArtUrl ? (
                    <Box
                      component="img"
                      src={s.albumArtUrl}
                      alt=""
                      sx={{
                        width: 72,
                        height: 72,
                        objectFit: 'cover',
                        borderRadius: encoreRadius,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        ...encoreNoAlbumArtSurfaceSx(theme),
                        width: 72,
                        height: 72,
                        borderRadius: encoreRadius,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 30 }} aria-hidden />
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }} noWrap>
                      {s.title}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{
                      color: "text.secondary"
                    }}>
                      {s.artist}
                    </Typography>
                    {meta ? (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          display: "block",
                          mt: 0.5,
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                        {meta}
                      </Typography>
                    ) : null}
                    {s.tags && s.tags.length > 0 ? (
                      <Stack
                        direction="row"
                        useFlexGap
                        sx={{
                          gap: 0.5,
                          flexWrap: "wrap",
                          mt: 0.75
                        }}>
                        {s.tags.map((t) => (
                          <Chip
                            key={t}
                            size="small"
                            variant="outlined"
                            label={t}
                            sx={{ height: 22, fontWeight: 600 }}
                          />
                        ))}
                      </Stack>
                    ) : null}
                    {(s.spotifyTrackId || ytWatchUrl || backingYtUrl) && (
                      <Stack
                        direction="row"
                        sx={{
                          gap: 1.25,
                          alignItems: "center",
                          mt: 0.75
                        }}>
                        {s.spotifyTrackId ? (
                          <Tooltip title="Listen to the original track on Spotify">
                            <IconButton
                              component="a"
                              href={`https://open.spotify.com/track/${encodeURIComponent(s.spotifyTrackId)}`}
                              target="_blank"
                              rel="noreferrer"
                              size="small"
                              aria-label="Listen to the original track on Spotify"
                              sx={guestStreamingLinkIconSx.spotify}
                            >
                              <SpotifyBrandIcon aria-hidden />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        {ytWatchUrl ? (
                          <Tooltip title="Open the reference video on YouTube">
                            <IconButton
                              component="a"
                              href={ytWatchUrl}
                              target="_blank"
                              rel="noreferrer"
                              size="small"
                              aria-label="Open the reference video on YouTube"
                              sx={guestStreamingLinkIconSx.youtube}
                            >
                              <YouTubeBrandIcon aria-hidden />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        {backingYtUrl ? (
                          <Tooltip title="Open backing track on YouTube">
                            <IconButton
                              component="a"
                              href={backingYtUrl}
                              target="_blank"
                              rel="noreferrer"
                              size="small"
                              aria-label="Open backing track on YouTube"
                              sx={guestStreamingLinkIconSx.backingYoutube}
                            >
                              <MicIcon aria-hidden />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </Stack>
                    )}
                    {songPerformances.length > 0 && (
                      <Box sx={{ mt: 1.25 }}>
                        {songPerformances.map((p) => (
                          <Stack
                            key={p.id}
                            direction="row"
                            sx={{
                              gap: 1,
                              alignItems: "baseline",
                              flexWrap: "wrap",
                              lineHeight: 1.55
                            }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "text.secondary",
                                fontVariantNumeric: 'tabular-nums'
                              }}>
                              {p.date} · {p.venueTag}
                            </Typography>
                            {p.videoOpenUrl ? (
                              <Tooltip title="Open performance video">
                                <IconButton
                                  component="a"
                                  href={p.videoOpenUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  size="small"
                                  aria-label="Open performance video"
                                  sx={{ p: 0.125, ml: -0.25, color: 'primary.main' }}
                                >
                                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </Stack>
                        ))}
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Container>
    </Box>
  );
}
