import AddIcon from '@mui/icons-material/Add';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useMemo, useState } from 'react';
import type { EncorePerformance, EncoreSong } from '../types';
import { useEncore } from '../context/EncoreContext';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { SongEditorDialog } from './SongEditorDialog';
import { PlaylistImportDialog } from './PlaylistImportDialog';

export function LibraryScreen(): React.ReactElement {
  const { songs, performances, saveSong, deleteSong, savePerformance, googleAccessToken, spotifyLinked } =
    useEncore();
  const [importOpen, setImportOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<EncoreSong | null>(null);
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(null);
  const [perfSongId, setPerfSongId] = useState<string | null>(null);

  const perfBySong = useMemo(() => {
    const m = new Map<string, EncorePerformance[]>();
    for (const p of performances) {
      const list = m.get(p.songId) ?? [];
      list.push(p);
      m.set(p.songId, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return m;
  }, [performances]);

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 2.5 },
        pb: { xs: 10, md: 3 },
        maxWidth: { xs: 720, md: 960, lg: 1200 },
        mx: 'auto',
        width: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'flex-end' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.14em' }}>
            Library
          </Typography>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mt: 0.25 }}>
            Repertoire
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignSelf: { xs: 'stretch', sm: 'center' } }}>
          <Button
            variant="outlined"
            startIcon={<QueueMusicIcon />}
            onClick={() => setImportOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            Import playlists
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingSong(null);
              setEditorOpen(true);
            }}
            sx={{ flexShrink: 0 }}
          >
            Add song
          </Button>
        </Box>
      </Box>
      {songs.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center', px: 2, lineHeight: 1.65 }}>
          No songs yet. Add one to start your library (works offline; sync runs after Google sign-in).
        </Typography>
      )}
      {songs.map((s) => (
        <Card key={s.id} variant="outlined" sx={{ mb: 2 }}>
          <CardActionArea
            onClick={() => {
              setEditingSong(s);
              setEditorOpen(true);
            }}
          >
            <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {s.albumArtUrl ? (
                <Box
                  component="img"
                  src={s.albumArtUrl}
                  alt=""
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 1.5,
                    objectFit: 'cover',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.12)',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                    flexShrink: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {s.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {s.artist}
                </Typography>
                {(s.performanceKey || s.performanceBpm) && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {[s.performanceKey, s.performanceBpm != null ? `${s.performanceBpm} BPM` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography>
                )}
                {(perfBySong.get(s.id) ?? []).slice(0, 2).map((p) => (
                  <Typography key={p.id} variant="caption" display="block" color="text.secondary">
                    {p.date} · {p.venueTag}
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </CardActionArea>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, px: 1, pb: 1 }}>
            <Button
              size="small"
              startIcon={<EventNoteIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setPerfSongId(s.id);
                setPerfEditing(null);
                setPerfOpen(true);
              }}
            >
              Log show
            </Button>
            <IconButton
              aria-label={`Delete ${s.title}`}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                void deleteSong(s.id);
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        </Card>
      ))}

      <PlaylistImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        googleAccessToken={googleAccessToken}
        spotifyLinked={spotifyLinked}
        onSaveSong={saveSong}
      />
      <SongEditorDialog
        open={editorOpen}
        song={editingSong}
        onClose={() => setEditorOpen(false)}
        onSave={saveSong}
      />
      {perfSongId && (
        <PerformanceEditorDialog
          open={perfOpen}
          performance={perfEditing}
          songId={perfSongId}
          googleAccessToken={googleAccessToken}
          onClose={() => {
            setPerfOpen(false);
            setPerfSongId(null);
          }}
          onSave={async (p) => {
            await savePerformance(p);
          }}
        />
      )}
    </Box>
  );
}
