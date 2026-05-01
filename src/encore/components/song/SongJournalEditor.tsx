import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { MarkdownPreview } from '../MarkdownPreview';

export type SongJournalEditorProps = {
  journalLocal: string;
  committedJournal: string;
  saving: boolean;
  onChangeLocal: (value: string) => void;
  onSave: () => void;
};

/**
 * Markdown editor + live preview for a song's practice journal. Owns no state
 * itself; the parent SongPage manages `journalLocal`/`committedJournal` because
 * those values participate in the autosave + commit-time-undo machinery.
 */
export function SongJournalEditor(props: SongJournalEditorProps): ReactElement {
  const { journalLocal, committedJournal, saving, onChangeLocal, onSave } = props;
  const dirty = journalLocal !== committedJournal;
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Practice journal
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        Markdown. Saves only when you click <strong>Save notes</strong>.
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <TextField
          value={journalLocal}
          onChange={(e) => onChangeLocal(e.target.value)}
          fullWidth
          multiline
          minRows={8}
          inputProps={{ 'aria-label': 'Practice journal markdown' }}
          sx={{ flex: 1 }}
        />
        <Box
          sx={{
            flex: 1,
            width: 1,
            minHeight: 200,
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, letterSpacing: '0.06em' }}
          >
            Preview
          </Typography>
          <MarkdownPreview markdown={journalLocal} />
        </Box>
      </Stack>
      <Stack direction="row" alignItems="center" gap={2} sx={{ mt: 2 }}>
        <Button variant="contained" size="small" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save notes'}
        </Button>
        {dirty ? (
          <Typography variant="caption" color="warning.main">
            Unsaved journal changes
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
