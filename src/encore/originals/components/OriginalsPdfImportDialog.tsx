import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';
import { compilePdfLinesToChordPro, extractPdfLines } from '../pdf/extractPdfLines';

export type OriginalsPdfImportDialogProps = {
  open: boolean;
  onClose: () => void;
  onImported: (chordPro: string) => void;
};

export function OriginalsPdfImportDialog({
  open,
  onClose,
  onImported,
}: OriginalsPdfImportDialogProps): ReactElement {
  const [lines, setLines] = useState<string[]>([]);
  const [mode, setMode] = useState<'chords_first' | 'lyrics_first'>('chords_first');
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    try {
      const extracted = await extractPdfLines(file);
      setLines(extracted);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import PDF chart</DialogTitle>
      <DialogContent>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        {error ? (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        ) : null}
        {lines.length > 0 ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Line pairing
            </Typography>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <FormControlLabel value="chords_first" control={<Radio />} label="Line 1 = chords, line 2 = lyrics" />
              <FormControlLabel value="lyrics_first" control={<Radio />} label="Line 1 = lyrics, line 2 = chords" />
            </RadioGroup>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Preview: {lines.slice(0, 4).join(' / ')}
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={lines.length === 0}
          onClick={() => onImported(compilePdfLinesToChordPro(lines, mode))}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}
