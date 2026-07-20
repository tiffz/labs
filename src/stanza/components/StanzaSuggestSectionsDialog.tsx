import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { detectSections } from '../../shared/beat/sectionDetector';
import { sectionsToSuggestedMarkers } from '../../shared/beat/suggestSectionMarkers';
import { decodeStanzaLocalBlobForPlayback } from '../audio/decodeStanzaLocalBlob';
import type { StanzaMarker } from '../db/stanzaDb';
import { ensureMarkerIds } from '../utils/segments';

export interface StanzaSuggestSectionsDialogProps {
  open: boolean;
  onClose: () => void;
  localAudioBlob: Blob;
  localSongTitle: string;
  mediaUrl: string;
  isLocalVideo: boolean;
  songDurationSec: number;
  bpm?: number;
  existingMarkerCount: number;
  onApplyMarkers: (markers: StanzaMarker[]) => void;
}

function formatSectionTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function StanzaSuggestSectionsDialog({
  open,
  onClose,
  localAudioBlob,
  localSongTitle,
  mediaUrl,
  isLocalVideo,
  songDurationSec,
  bpm,
  existingMarkerCount,
  onApplyMarkers,
}: StanzaSuggestSectionsDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Array<{ time: number; label: string }> | null>(null);

  const runDetection = useCallback(async () => {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const buffer = await decodeStanzaLocalBlobForPlayback({
        blob: localAudioBlob,
        title: localSongTitle,
        mediaUrl,
        isVideo: isLocalVideo,
      });
      const result = await detectSections(buffer, [], {
        bpm: bpm && bpm > 0 ? bpm : 120,
        musicStartTime: 0,
      });
      const suggested = sectionsToSuggestedMarkers(result.sections);
      if (suggested.length === 0) {
        setError('No section boundaries detected. Add markers manually or analyze tempo first.');
        return;
      }
      setPreview(suggested);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [bpm, isLocalVideo, localAudioBlob, localSongTitle, mediaUrl]);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setError(null);
      setBusy(false);
      return;
    }
    void runDetection();
  }, [open, runDetection]);

  const apply = () => {
    if (!preview?.length) return;
    const markers = ensureMarkerIds(
      preview.map((row) => ({
        id: crypto.randomUUID(),
        time: row.time,
        label: row.label,
      })),
    );
    onApplyMarkers(markers);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="stanza-suggest-sections-title">
      <DialogTitle id="stanza-suggest-sections-title">Suggest sections</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Stanza analyzes your upload and proposes section boundaries. Review before inserting. Existing markers
          {existingMarkerCount > 0 ? ` (${existingMarkerCount})` : ''} are kept. New splits land at detected
          boundaries.
        </Typography>
        {busy ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} aria-label="Analyzing audio for sections" />
          </Box>
        ) : null}
        {error ? (
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        ) : null}
        {preview?.length ? (
          <List dense disablePadding>
            {preview.map((row) => (
              <ListItem key={`${row.time}-${row.label}`} disableGutters>
                <ListItemText
                  primary={row.label}
                  secondary={`${formatSectionTime(row.time)} · ${songDurationSec > 0 ? `${Math.round((row.time / songDurationSec) * 100)}%` : ''}`}
                />
              </ListItem>
            ))}
          </List>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {error ? (
          <Button onClick={() => void runDetection()} disabled={busy}>
            Retry
          </Button>
        ) : null}
        <Button variant="contained" onClick={apply} disabled={!preview?.length || busy}>
          Insert markers
        </Button>
      </DialogActions>
    </Dialog>
  );
}
