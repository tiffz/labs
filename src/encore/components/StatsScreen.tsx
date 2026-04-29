import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import { useEncore } from '../context/EncoreContext';

export function StatsScreen(): React.ReactElement {
  const { songs, performances } = useEncore();

  const { mostLoved, timeToShine, byVenue } = useMemo(() => {
    const countBySong = new Map<string, number>();
    const lastBySong = new Map<string, string>();
    for (const p of performances) {
      countBySong.set(p.songId, (countBySong.get(p.songId) ?? 0) + 1);
      const prev = lastBySong.get(p.songId);
      if (!prev || p.date > prev) lastBySong.set(p.songId, p.date);
    }
    const songTitle = (id: string) => songs.find((s) => s.id === id);

    const mostLoved = [...countBySong.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, n]) => ({ id, n, song: songTitle(id) }));

    const today = new Date().toISOString().slice(0, 10);
    const timeToShine = songs
      .map((s) => ({
        song: s,
        last: lastBySong.get(s.id) ?? '0000-00-00',
        count: countBySong.get(s.id) ?? 0,
      }))
      .filter((row) => row.last < today || row.count === 0)
      .sort((a, b) => a.last.localeCompare(b.last))
      .slice(0, 8);

    const venueMap = new Map<string, typeof performances>();
    for (const p of performances) {
      const k = p.venueTag || 'Unknown';
      const list = venueMap.get(k) ?? [];
      list.push(p);
      venueMap.set(k, list);
    }
    const byVenue = [...venueMap.entries()].sort((a, b) => b[1].length - a[1].length);

    return { mostLoved, timeToShine, byVenue };
  }, [songs, performances]);

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        pb: { xs: 10, md: 3 },
        maxWidth: { xs: 1, md: 960, lg: 1200 },
        mx: 'auto',
        width: 1,
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        Insights
      </Typography>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
        Most performed
      </Typography>
      {mostLoved.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Log performances from the Library tab to see counts here.
        </Typography>
      )}
      {mostLoved.map((row) => (
        <Card key={row.id} variant="outlined" sx={{ mb: 1 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography fontWeight={600}>{row.song?.title ?? 'Unknown song'}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.n} performances
            </Typography>
          </CardContent>
        </Card>
      ))}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
        Time to shine
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Songs you have not performed recently (or ever).
      </Typography>
      {timeToShine.map((row) => (
        <Card key={row.song.id} variant="outlined" sx={{ mb: 1 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography fontWeight={600}>{row.song.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              Last: {row.last === '0000-00-00' ? 'never' : row.last}
            </Typography>
          </CardContent>
        </Card>
      ))}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
        By venue
      </Typography>
      {byVenue.map(([venue, list]) => (
        <Card key={venue} variant="outlined" sx={{ mb: 1 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography fontWeight={600}>{venue}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {list.length} logs
            </Typography>
            {list
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((p) => {
                const s = songs.find((x) => x.id === p.songId);
                return (
                  <Typography key={p.id} variant="caption" display="block">
                    {p.date} · {s?.title ?? p.songId}
                  </Typography>
                );
              })}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
