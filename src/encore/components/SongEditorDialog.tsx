import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import type { EncoreSong } from '../types';
import { useEncore } from '../context/EncoreContext';
import { MarkdownPreview } from './MarkdownPreview';
import { SpotifySearchPanel } from './SpotifySearchPanel';

function newSong(): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: '',
    artist: '',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function SongEditorDialog(props: {
  open: boolean;
  song: EncoreSong | null;
  onClose: () => void;
  onSave: (song: EncoreSong) => Promise<void>;
}): React.ReactElement {
  const { open, song, onClose, onSave } = props;
  const { spotifyLinked } = useEncore();
  const [draft, setDraft] = useState<EncoreSong>(newSong());
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (open) {
      setDraft(song ? { ...song } : newSong());
      setTab('edit');
    }
  }, [open, song]);

  const applySpotify = useCallback((patch: Partial<EncoreSong>) => {
    setDraft((d) => ({ ...d, ...patch, updatedAt: new Date().toISOString() }));
  }, []);

  const handleSave = async () => {
    const now = new Date().toISOString();
    await onSave({
      ...draft,
      title: draft.title.trim() || 'Untitled',
      artist: draft.artist.trim() || 'Unknown artist',
      updatedAt: now,
      createdAt: draft.createdAt || now,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="song-editor-title">
      <DialogTitle id="song-editor-title">{song ? 'Edit song' : 'Add song'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Artist"
            value={draft.artist}
            onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
            fullWidth
          />
          <SpotifySearchPanel onApply={applySpotify} currentTrackId={draft.spotifyTrackId} spotifyLinked={spotifyLinked} />
          <TextField
            label="YouTube video ID (optional)"
            value={draft.youtubeVideoId ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, youtubeVideoId: e.target.value.trim() || undefined }))}
            fullWidth
            helperText={
              draft.youtubeVideoId
                ? `Open: https://www.youtube.com/watch?v=${encodeURIComponent(draft.youtubeVideoId)}`
                : 'From playlist import or paste the id from a watch URL.'
            }
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              label="Original key"
              value={draft.originalKey ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, originalKey: e.target.value || undefined }))}
              sx={{ flex: 1, minWidth: 120 }}
            />
            <TextField
              label="Original BPM"
              type="number"
              value={draft.originalBpm ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  originalBpm: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
              sx={{ flex: 1, minWidth: 120 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              label="Your performance key"
              value={draft.performanceKey ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, performanceKey: e.target.value || undefined }))}
              sx={{ flex: 1, minWidth: 120 }}
            />
            <TextField
              label="Your performance BPM"
              type="number"
              value={draft.performanceBpm ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  performanceBpm: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
              sx={{ flex: 1, minWidth: 120 }}
            />
          </Box>
          <TextField
            label="Sheet Music file ID (Google Drive)"
            value={draft.sheetMusicDriveFileId ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, sheetMusicDriveFileId: e.target.value || undefined }))}
            fullWidth
            helperText="Paste a Drive file ID for a PDF you already uploaded."
          />
          <TextField
            label="Backing track file ID (Google Drive)"
            value={draft.backingTrackDriveFileId ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, backingTrackDriveFileId: e.target.value || undefined }))}
            fullWidth
          />
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Practice journal (Markdown)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button size="small" variant={tab === 'edit' ? 'contained' : 'outlined'} onClick={() => setTab('edit')}>
                Edit
              </Button>
              <Button
                size="small"
                variant={tab === 'preview' ? 'contained' : 'outlined'}
                onClick={() => setTab('preview')}
              >
                Preview
              </Button>
            </Box>
            {tab === 'edit' ? (
              <TextField
                value={draft.journalMarkdown}
                onChange={(e) => setDraft((d) => ({ ...d, journalMarkdown: e.target.value }))}
                fullWidth
                multiline
                minRows={5}
                inputProps={{ 'aria-label': 'Journal markdown' }}
              />
            ) : (
              <MarkdownPreview markdown={draft.journalMarkdown} />
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => void handleSave()} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
