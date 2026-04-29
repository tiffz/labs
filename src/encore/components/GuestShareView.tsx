import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { fetchPublicDriveJson } from '../drive/bootstrapFolders';
import type { PublicSnapshot } from '../types';

function isPublicSnapshot(data: unknown): data is PublicSnapshot {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.version === 1 && Array.isArray(d.songs) && Array.isArray(d.performances);
}

export function GuestShareView({ fileId }: { fileId: string }): React.ReactElement {
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [snap, setSnap] = useState<PublicSnapshot | null>(null);

  useEffect(() => {
    const key = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim();
    if (!key) {
      setState('error');
      setMessage(
        'This shared view needs VITE_GOOGLE_API_KEY (Drive API, referrer-restricted) to read the public snapshot file.'
      );
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchPublicDriveJson(fileId, key);
        if (cancelled) return;
        if (!isPublicSnapshot(data)) {
          setState('error');
          setMessage('Snapshot file is not valid.');
          return;
        }
        setSnap(data);
        setState('ready');
      } catch (e) {
        if (cancelled) return;
        setState('error');
        setMessage(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (state === 'loading') {
    return (
      <Box className="encore-app-shell flex items-center justify-center p-8">
        <CircularProgress aria-label="Loading shared repertoire" />
      </Box>
    );
  }

  if (state === 'error' || !snap) {
    return (
      <Box className="encore-app-shell p-6 max-w-lg mx-auto">
        <Typography variant="h6" component="h1" gutterBottom>
          Could not open share
        </Typography>
        <Typography color="text.secondary">{message}</Typography>
      </Box>
    );
  }

  return (
    <Box className="encore-app-shell p-4 pb-10 max-w-lg mx-auto">
      <Typography variant="h5" component="h1" gutterBottom>
        Shared repertoire
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Updated {new Date(snap.generatedAt).toLocaleString()}
      </Typography>
      {snap.songs.map((s) => (
        <Card key={s.id} variant="outlined" sx={{ mb: 1.5 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {s.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {s.artist}
            </Typography>
            {(s.performanceKey || s.performanceBpm) && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {[s.performanceKey, s.performanceBpm != null ? `${s.performanceBpm} BPM` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            )}
            {(s.spotifyTrackId || s.youtubeVideoId) && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {s.spotifyTrackId && (
                  <a
                    href={`https://open.spotify.com/track/${encodeURIComponent(s.spotifyTrackId)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Spotify
                  </a>
                )}
                {s.spotifyTrackId && s.youtubeVideoId ? ' · ' : null}
                {s.youtubeVideoId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(s.youtubeVideoId)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    YouTube
                  </a>
                )}
              </Typography>
            )}
            {snap.performances.filter((p) => p.songId === s.id).length > 0 && (
              <Box sx={{ mt: 1 }}>
                {snap.performances
                  .filter((p) => p.songId === s.id)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((p) => (
                    <Typography key={p.id} variant="caption" display="block">
                      {p.date} · {p.venueTag}
                    </Typography>
                  ))}
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
