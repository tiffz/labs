import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

export interface MetronomeWizardProps {
  open: boolean;
  onClose: () => void;
  getMediaTime: () => number;
  onSave: (bpm: number, anchorMediaTime: number) => void;
}

const TAP_TARGET = 8;

export default function MetronomeWizard({ open, onClose, getMediaTime, onSave }: MetronomeWizardProps) {
  const [taps, setTaps] = useState<number[]>([]);
  const [nudgeMs, setNudgeMs] = useState(0);

  const reset = useCallback(() => {
    setTaps([]);
    setNudgeMs(0);
  }, []);

  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setTaps([]);
      setNudgeMs(0);
    }
    prevOpen.current = open;
  }, [open]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleTap = useCallback(() => {
    setTaps((prev) => {
      if (prev.length >= TAP_TARGET) return prev;
      return [...prev, getMediaTime()];
    });
  }, [getMediaTime]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [contenteditable=true]')) return;
      e.preventDefault();
      handleTap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleTap]);

  const bpmFromTaps = (): number | null => {
    if (taps.length < 2) return null;
    const deltas: number[] = [];
    for (let i = 1; i < taps.length; i++) {
      const d = taps[i]! - taps[i - 1]!;
      if (d > 0.05) deltas.push(d);
    }
    if (deltas.length === 0) return null;
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const bpm = 60 / mean;
    if (!Number.isFinite(bpm) || bpm < 40 || bpm > 280) return null;
    return Math.round(bpm * 10) / 10;
  };

  const anchorSec = (): number | null => {
    if (taps.length === 0) return null;
    return taps[0]! + nudgeMs / 1000;
  };

  const bpm = bpmFromTaps();
  const anchor = anchorSec();

  const applySave = () => {
    if (bpm === null || anchor === null) return;
    onSave(bpm, anchor);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" aria-labelledby="stanza-metronome-wizard-title">
      <DialogTitle id="stanza-metronome-wizard-title">Calibrate metronome</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Saving calibration enables the metronome for this song: we store tempo and where the first downbeat falls so
          the click lines up with the recording. Tap Space eight times in time with the music while playback is
          running, then fine-tune with Earlier / Later (20&nbsp;ms).
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Taps: {taps.length} / {TAP_TARGET}
          {bpm !== null ? ` · BPM ≈ ${bpm}` : ''}
        </Typography>
        <Button variant="outlined" sx={{ mb: 2 }} onClick={handleTap} disabled={taps.length >= TAP_TARGET} aria-label="Register tap beat">
          Tap beat
        </Button>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Button variant="outlined" onClick={() => setNudgeMs((n) => n - 20)} aria-label="Nudge metronome 20 milliseconds earlier">
            Earlier (−20&nbsp;ms)
          </Button>
          <Button variant="outlined" onClick={() => setNudgeMs((n) => n + 20)} aria-label="Nudge metronome 20 milliseconds later">
            Later (+20&nbsp;ms)
          </Button>
          <Button variant="text" onClick={reset} aria-label="Reset tap sequence">
            Reset taps
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Nudge offset: {nudgeMs >= 0 ? '+' : ''}
          {nudgeMs} ms
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" disabled={bpm === null || anchor === null} onClick={applySave}>
          Save calibration
        </Button>
      </DialogActions>
    </Dialog>
  );
}
