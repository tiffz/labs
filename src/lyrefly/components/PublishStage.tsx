import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import type { ComicArchiveBinder, ComicProject } from '../types';
import { addPublishLogEntry, ensureLyreflyArchive } from '../db/lyreflyProjectMutations';

export type PublishStageProps = {
  project: ComicProject;
  archive: ComicArchiveBinder | null;
  archiveHydrated: boolean;
};

export function PublishStage({ project, archive, archiveHydrated }: PublishStageProps): ReactElement {
  const theme = useTheme();
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [localArchive, setLocalArchive] = useState<ComicArchiveBinder | null>(archive);

  useEffect(() => {
    setLocalArchive(archive);
  }, [archive]);

  useEffect(() => {
    if (!archiveHydrated) return;
    if (localArchive) return;
    void ensureLyreflyArchive(project).then(setLocalArchive);
  }, [archiveHydrated, localArchive, project]);

  const onAddEntry = async (): Promise<void> => {
    if (!platform.trim()) return;
    setBusy(true);
    try {
      const binder = localArchive ?? (await ensureLyreflyArchive(project));
      const updated = await addPublishLogEntry(binder, {
        platform: platform.trim(),
        publishedAt: new Date().toISOString(),
        url: url.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setLocalArchive(updated);
      setPlatform('');
      setUrl('');
      setNotes('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box className="lyrefly-publish-stage" data-testid="lyrefly-publish-stage" sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflow: 'auto' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: '40rem' }}>
        Record where this comic lives online — webtoon platforms, personal site, print distro, or convention sales.
      </Typography>

      <Stack
        spacing={2}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          border: 1,
          borderColor: alpha(theme.palette.primary.main, 0.14),
          bgcolor: alpha(theme.palette.background.paper, 0.72),
          maxWidth: 520,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Add publication
        </Typography>
        <TextField label="Platform or venue" value={platform} onChange={(e) => setPlatform(e.target.value)} size="small" />
        <TextField label="URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} size="small" />
        <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} size="small" multiline minRows={2} />
        <Button variant="contained" disabled={busy || !platform.trim()} onClick={() => void onAddEntry()}>
          Save entry
        </Button>
      </Stack>

      {!localArchive || localArchive.publishLog.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No publications logged yet.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {localArchive.publishLog.map((entry) => (
            <Box
              key={entry.id}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                border: 1,
                borderColor: alpha(theme.palette.secondary.main, 0.2),
                bgcolor: alpha(theme.palette.background.default, 0.35),
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {entry.platform}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(entry.publishedAt).toLocaleDateString()}
              </Typography>
              {entry.url ? (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <Box component="a" href={entry.url} target="_blank" rel="noopener noreferrer" color="primary.main">
                    {entry.url}
                  </Box>
                </Typography>
              ) : null}
              {entry.notes ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {entry.notes}
                </Typography>
              ) : null}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
