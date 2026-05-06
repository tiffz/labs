import EditIcon from '@mui/icons-material/Edit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { SpotifyBrandIcon } from '../components/EncoreBrandIcon';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { fetchSpotifyPlaylistSummary } from '../spotify/spotifyApi';
import { encoreMediaLinkRowSx } from '../theme/encoreUiTokens';
import { EncoreBrandTextField } from './EncoreBrandTextField';

const chipEditIconBtnSx = {
  color: 'text.secondary',
  p: 0.25,
  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
} as const;

/**
 * Default sync action tooltip when the action is enabled. Practice uses two-way merge semantics
 * here; callers with different commit semantics (e.g. saved-search "rewrite from filters") can
 * pass `syncReadyTooltip` to override.
 */
const DEFAULT_SYNC_READY_TOOLTIP =
  'Imports the playlist and merges obvious matches, then rewrites it from your Encore Spotify tracks. Pauses for review when unsure; needs playlist-edit access and a playlist you can change.' as const;

export type EncoreSynchronizableSpotifyPlaylistPanelProps = {
  sectionTitle: string;
  helpContent: ReactNode;
  spotifyClientId: string;
  /** Persisted playlist id (trimmed). */
  savedPlaylistId: string;
  playlistField: string;
  onPlaylistFieldChange: (value: string) => void;
  onSavePlaylistId: () => void | Promise<void>;
  /** Resolved id for Spotify links + sync gating (saved or parsed from field). */
  resolvedPlaylistId: string;
  onSync: () => void;
  syncBusy: boolean;
  pullBusy?: boolean;
  spotifyLinked: boolean;
  clientIdConfigured: boolean;
  error?: string | null;
  /** Extra controls trailing the chip (e.g. repertoire-only actions). */
  extraActions?: ReactNode;
  /** Optional alert below the row (info / missing client id). */
  announcement?: ReactNode;
  /**
   * When true, the section label matches filter/toolbar copy (e.g. repertoire list) instead of a
   * card-style subtitle.
   */
  inlineSectionTitle?: boolean;
  /**
   * Tooltip body for the Sync button when it's enabled. Disabled-state tooltips (missing client
   * id, not linked, no playlist) are computed automatically — only override this if your sync
   * has different commit semantics from the default Practice "merge then rewrite".
   */
  syncReadyTooltip?: ReactNode;
};

export function EncoreSynchronizableSpotifyPlaylistPanel(props: EncoreSynchronizableSpotifyPlaylistPanelProps): ReactElement {
  const {
    sectionTitle,
    helpContent,
    spotifyClientId,
    savedPlaylistId,
    playlistField,
    onPlaylistFieldChange,
    onSavePlaylistId,
    resolvedPlaylistId,
    onSync,
    syncBusy,
    pullBusy = false,
    spotifyLinked,
    clientIdConfigured,
    error = null,
    extraActions,
    announcement,
    inlineSectionTitle = false,
    syncReadyTooltip = DEFAULT_SYNC_READY_TOOLTIP,
  } = props;

  const busy = syncBusy || pullBusy;
  /**
   * Surface *why* sync is disabled instead of leaving the user staring at a greyed-out button.
   * Order matches the gating order in the disabled prop below so the tooltip never lies.
   */
  const syncTooltip: ReactNode = !clientIdConfigured
    ? 'Set VITE_SPOTIFY_CLIENT_ID to enable Spotify sync'
    : !spotifyLinked
      ? 'Connect Spotify in the Account menu first'
      : !resolvedPlaylistId
        ? 'Paste a Spotify playlist URL or id first'
        : syncReadyTooltip;
  const [editing, setEditing] = useState(() => !savedPlaylistId.trim());

  useEffect(() => {
    if (!savedPlaylistId.trim()) setEditing(true);
  }, [savedPlaylistId]);

  const showSummary = Boolean(savedPlaylistId.trim()) && !editing;

  const [playlistName, setPlaylistName] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(false);

  useEffect(() => {
    if (!showSummary || !clientIdConfigured || !spotifyLinked) {
      setPlaylistName(null);
      return;
    }
    const id = savedPlaylistId.trim();
    let cancelled = false;
    setNameLoading(true);
    void (async () => {
      try {
        if (!spotifyClientId.trim()) {
          if (!cancelled) setPlaylistName(null);
          return;
        }
        const token = await ensureSpotifyAccessToken(spotifyClientId.trim());
        if (!token || cancelled) {
          if (!cancelled) setPlaylistName(null);
          return;
        }
        const meta = await fetchSpotifyPlaylistSummary(token, id);
        if (!cancelled) setPlaylistName(meta?.name?.trim() || null);
      } catch {
        if (!cancelled) setPlaylistName(null);
      } finally {
        if (!cancelled) setNameLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showSummary, savedPlaylistId, spotifyLinked, spotifyClientId, clientIdConfigured]);

  const handleSave = useCallback(async () => {
    await Promise.resolve(onSavePlaylistId());
    setEditing(false);
  }, [onSavePlaylistId]);

  const handleCancelEdit = useCallback(() => {
    onPlaylistFieldChange(savedPlaylistId);
    setEditing(false);
  }, [savedPlaylistId, onPlaylistFieldChange]);

  const displayTitle = playlistName || savedPlaylistId.trim() || 'Spotify playlist';

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      alignItems="center"
      gap={1}
      useFlexGap
      sx={{ rowGap: 1.25, columnGap: 1 }}
    >
      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
        <Typography
          variant={inlineSectionTitle ? 'caption' : 'subtitle2'}
          sx={
            inlineSectionTitle
              ? { fontWeight: 700, letterSpacing: '0.02em', color: 'text.secondary' }
              : { fontWeight: 800, letterSpacing: '0.04em' }
          }
        >
          {sectionTitle}
        </Typography>
        <Tooltip
          title={helpContent}
          placement="bottom-start"
          enterDelay={280}
          enterNextDelay={120}
          leaveDelay={140}
          disableInteractive={false}
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: 'background.paper',
                color: 'text.primary',
                border: 1,
                borderColor: 'divider',
                boxShadow: 3,
                maxWidth: 360,
              },
            },
            popper: {
              sx: { zIndex: (z) => z.zIndex.modal + 10 },
            },
          }}
        >
          <IconButton size="small" aria-label={`About ${sectionTitle}`} sx={{ color: 'text.secondary', p: 0.25 }}>
            <InfoOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {showSummary ? (
        <Box
          sx={{
            flex: '1 1 200px',
            minWidth: { xs: '100%', sm: 220 },
            maxWidth: { sm: 480 },
            width: 1,
          }}
        >
          <Box
            sx={(t) => ({
              ...encoreMediaLinkRowSx(t, false),
              width: 1,
              maxWidth: '100%',
              boxSizing: 'border-box',
              alignItems: 'center',
              flexWrap: 'nowrap',
              gap: 0.25,
              py: 0.5,
              pl: 0.875,
              pr: 0.375,
              transition: 'background-color 120ms ease, border-color 120ms ease',
              ...(resolvedPlaylistId
                ? {
                    '&:hover': {
                      borderColor: alpha(t.palette.primary.main, 0.22),
                      bgcolor: alpha(t.palette.primary.main, 0.04),
                    },
                  }
                : {}),
            })}
          >
            <Box
              component={resolvedPlaylistId ? 'a' : 'div'}
              href={
                resolvedPlaylistId
                  ? `https://open.spotify.com/playlist/${encodeURIComponent(resolvedPlaylistId)}`
                  : undefined
              }
              target={resolvedPlaylistId ? '_blank' : undefined}
              rel={resolvedPlaylistId ? 'noreferrer' : undefined}
              aria-label={
                resolvedPlaylistId ? `Open playlist ${displayTitle} in Spotify` : undefined
              }
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                flex: '1 1 auto',
                minWidth: 0,
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 0.75,
                mr: 0.125,
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              <SpotifyBrandIcon sx={{ fontSize: 18, flexShrink: 0, opacity: 0.88 }} aria-hidden />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, lineHeight: 1.35, color: 'text.primary' }}
                  noWrap
                  title={displayTitle}
                >
                  {nameLoading ? 'Loading…' : displayTitle}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.35 }}
                  noWrap
                >
                  Spotify playlist
                </Typography>
              </Box>
            </Box>
            {/*
             * Sync lives inside the chip as a quiet icon button (paired with Edit) instead of
             * a separate prominent button. Keeping it next to the chip it operates on makes
             * the relationship obvious and lets the chip itself be the visual centerpiece of
             * the row. The verbose "what does Sync do" copy is delivered via the tooltip
             * (`syncTooltip`) — disabled-state reasons surface there too, so the icon never
             * leaves the user staring at a greyed-out button without an explanation.
             */}
            <Tooltip title={syncBusy ? 'Syncing…' : syncTooltip}>
              <span>
                <IconButton
                  size="small"
                  aria-label={syncBusy ? 'Syncing playlist' : 'Sync playlist'}
                  onClick={onSync}
                  disabled={busy || !spotifyLinked || !resolvedPlaylistId || !clientIdConfigured}
                  sx={chipEditIconBtnSx}
                >
                  <SyncIcon
                    sx={{
                      fontSize: 17,
                      ...(syncBusy && {
                        animation: 'encoreSpotifySyncSpin 0.9s linear infinite',
                        '@keyframes encoreSpotifySyncSpin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' },
                        },
                      }),
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Edit playlist">
              <span>
                <IconButton
                  size="small"
                  aria-label="Edit playlist URL or id"
                  onClick={() => setEditing(true)}
                  disabled={busy}
                  sx={chipEditIconBtnSx}
                >
                  <EditIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      ) : (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          useFlexGap
          sx={{
            flex: '1 1 200px',
            minWidth: { xs: '100%', sm: 220 },
            maxWidth: { sm: 480 },
          }}
        >
          <EncoreBrandTextField
            brand="spotify"
            size="small"
            label="Playlist URL or id"
            placeholder="https://open.spotify.com/playlist/…"
            value={playlistField}
            onChange={(e) => onPlaylistFieldChange(e.target.value)}
            disabled={busy}
            sx={{ flex: '1 1 auto', minWidth: { xs: '100%', sm: 160 } }}
          />
          <Tooltip title="Save playlist">
            <span>
              <IconButton
                size="small"
                color="primary"
                aria-label="Save playlist"
                onClick={() => void handleSave()}
                disabled={busy}
                sx={{ flexShrink: 0 }}
              >
                <CheckIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Cancel">
            <span>
              <IconButton
                size="small"
                aria-label="Cancel editing playlist"
                onClick={handleCancelEdit}
                disabled={busy}
                sx={{ ...chipEditIconBtnSx, flexShrink: 0 }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )}

      {extraActions}

      {announcement}

      {error ? (
        <Alert severity="error" sx={{ width: '100%', mt: announcement ? 0.5 : 0 }}>
          {error}
        </Alert>
      ) : null}
    </Stack>
  );
}
