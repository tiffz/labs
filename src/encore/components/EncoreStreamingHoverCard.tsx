import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { fetchSpotifyTrack } from '../spotify/spotifyApi';
import type { EncoreMediaSource } from '../types';

/**
 * Streaming sources this hover card can resolve metadata for. A subset of
 * {@link EncoreMediaSource} (drive links don't have a streaming preview API).
 */
export type EncoreStreamingHoverCardKind = Extract<EncoreMediaSource, 'spotify' | 'youtube'>;

type ResolvedMeta = {
  title: string;
  subtitle: string;
};

const spotifyMetaCache = new Map<string, ResolvedMeta>();
const youtubeMetaCache = new Map<string, ResolvedMeta>();

async function fetchYoutubeOembedMeta(watchUrl: string): Promise<ResolvedMeta | null> {
  const cached = youtubeMetaCache.get(watchUrl);
  if (cached) return cached;
  try {
    const u = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`;
    const res = await fetch(u, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: string; author_name?: string };
    const title = typeof j.title === 'string' ? j.title.trim() : '';
    if (!title) return null;
    const subtitle =
      typeof j.author_name === 'string' && j.author_name.trim() ? j.author_name.trim() : 'YouTube';
    const meta = { title, subtitle };
    youtubeMetaCache.set(watchUrl, meta);
    return meta;
  } catch {
    return null;
  }
}

async function fetchSpotifyTrackMeta(
  clientId: string,
  spotifyLinked: boolean,
  trackId: string,
): Promise<ResolvedMeta | null> {
  const key = trackId.trim();
  if (!key) return null;
  const cached = spotifyMetaCache.get(key);
  if (cached) return cached;
  if (!spotifyLinked || !clientId) return null;
  try {
    const token = await ensureSpotifyAccessToken(clientId);
    if (!token) return null;
    const t = await fetchSpotifyTrack(token, key);
    const artists = t.artists?.map((a) => a.name).filter(Boolean).join(', ') ?? '';
    const title = t.name?.trim() || 'Spotify track';
    const meta = { title, subtitle: artists || 'Spotify' };
    spotifyMetaCache.set(key, meta);
    return meta;
  } catch {
    return null;
  }
}

export type EncoreStreamingHoverCardProps = {
  kind: EncoreStreamingHoverCardKind;
  spotifyTrackId?: string | null;
  youtubeWatchUrl?: string | null;
  /** When set (e.g. song title/artist), shown until remote metadata resolves. */
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  clientId: string;
  spotifyLinked: boolean;
  children: ReactNode;
};

/**
 * Wraps a Spotify or YouTube media control; on hover, opens a small card with
 * resolved track/video title and artist/channel when available.
 */
export function EncoreStreamingHoverCard(props: EncoreStreamingHoverCardProps): ReactElement {
  const {
    kind,
    spotifyTrackId,
    youtubeWatchUrl,
    fallbackTitle = '',
    fallbackSubtitle = '',
    clientId,
    spotifyLinked,
    children,
  } = props;

  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [meta, setMeta] = useState<ResolvedMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const openTimerRef = useRef(0);
  const closeTimerRef = useRef(0);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    openTimerRef.current = 0;
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = 0;
  }, []);

  const openPopover = useCallback((el: HTMLElement) => {
    setAnchorEl(el);
  }, []);

  const scheduleOpen = useCallback(
    (el: HTMLElement) => {
      clearOpenTimer();
      clearCloseTimer();
      openTimerRef.current = window.setTimeout(() => openPopover(el), 380);
    },
    [clearCloseTimer, clearOpenTimer, openPopover],
  );

  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setAnchorEl(null);
      setMeta(null);
      setLoading(false);
    }, 220);
  }, [clearCloseTimer, clearOpenTimer]);

  useEffect(() => {
    if (!anchorEl) return;
    const track = spotifyTrackId?.trim() ?? '';
    const ytUrl = youtubeWatchUrl?.trim() ?? '';
    let cancelled = false;

    if (kind === 'youtube' && ytUrl) {
      const cached = youtubeMetaCache.get(ytUrl);
      if (cached) {
        setMeta(cached);
        return;
      }
      setLoading(true);
      void (async () => {
        const m = await fetchYoutubeOembedMeta(ytUrl);
        if (cancelled) return;
        setMeta(m);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    if (kind === 'spotify' && track) {
      const cached = spotifyMetaCache.get(track);
      if (cached) {
        setMeta(cached);
        return;
      }
      setLoading(true);
      void (async () => {
        const m = await fetchSpotifyTrackMeta(clientId, spotifyLinked, track);
        if (cancelled) return;
        setMeta(m);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    setMeta(null);
    setLoading(false);
    return undefined;
  }, [anchorEl, kind, spotifyTrackId, youtubeWatchUrl, clientId, spotifyLinked]);

  const open = Boolean(anchorEl);
  const title = meta?.title?.trim() || fallbackTitle.trim() || (kind === 'spotify' ? 'Spotify track' : 'YouTube video');
  const subtitle = meta?.subtitle?.trim() || fallbackSubtitle.trim();

  return (
    <>
      <Box
        component="span"
        onMouseEnter={(e) => scheduleOpen(e.currentTarget)}
        onMouseLeave={scheduleClose}
        sx={{
          display: 'inline-flex',
          maxWidth: '100%',
          verticalAlign: 'middle',
          borderRadius: 1,
          cursor: 'default',
        }}
      >
        {children}
      </Box>
      <Popover
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
        slotProps={{
          paper: {
            onMouseEnter: clearCloseTimer,
            onMouseLeave: scheduleClose,
            sx: {
              mt: 0.75,
              px: 1.25,
              py: 1,
              maxWidth: 320,
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
              boxShadow: theme.shadows[3],
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          {loading ? <CircularProgress size={18} sx={{ mt: 0.25, flexShrink: 0 }} /> : null}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35, wordBreak: 'break-word' }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.4 }}>
                {subtitle}
              </Typography>
            ) : null}
            {!subtitle && !loading && kind === 'spotify' && !spotifyLinked ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.4 }}>
                Connect Spotify to load track details.
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
