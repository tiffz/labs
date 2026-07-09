import AddLinkIcon from '@mui/icons-material/AddLink';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import type { VisualDevAsset } from '../types';
import { createVisualDevAsset, deleteVisualDevAsset, loadVisualDevBlobUrl } from '../db/lyreflyProjectMutations';

export type VisualDevPanelProps = {
  projectId: string;
  assets: VisualDevAsset[];
};

function AssetThumb({ asset }: { asset: VisualDevAsset }): ReactElement | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (asset.kind === 'link' || asset.kind === 'note') return undefined;
    let cancelled = false;
    let objectUrl: string | null = null;
    void loadVisualDevBlobUrl(asset.id).then((loaded) => {
      if (cancelled) return;
      objectUrl = loaded;
      setUrl(loaded);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id, asset.kind]);

  if (asset.kind === 'link') {
    return (
      <Typography variant="caption" color="primary.main" sx={{ wordBreak: 'break-all' }}>
        {asset.url}
      </Typography>
    );
  }
  if (asset.kind === 'note') {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
        {asset.markdown}
      </Typography>
    );
  }
  if (!url) {
    return (
      <Box
        sx={{
          aspectRatio: '4 / 3',
          borderRadius: 1,
          bgcolor: alpha('#fff', 0.04),
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <ImageOutlinedIcon fontSize="small" color="disabled" />
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={url}
      alt={asset.title}
      sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 1 }}
    />
  );
}

export function VisualDevPanel({ projectId, assets }: VisualDevPanelProps): ReactElement {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [busy, setBusy] = useState(false);

  const onPickImages = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const kind = file.name.toLowerCase().includes('sketch') ? 'sketch' : 'image';
        await createVisualDevAsset(projectId, { kind, title: file.name.replace(/\.[^.]+$/, ''), file });
      }
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }, [projectId]);

  const onAddLink = async (): Promise<void> => {
    if (!linkUrl.trim()) return;
    setBusy(true);
    try {
      await createVisualDevAsset(projectId, {
        kind: 'moodboard',
        title: linkTitle.trim() || 'Moodboard link',
        url: linkUrl.trim(),
      });
      setLinkTitle('');
      setLinkUrl('');
    } finally {
      setBusy(false);
    }
  };

  const onAddNote = async (): Promise<void> => {
    if (!noteBody.trim()) return;
    setBusy(true);
    try {
      await createVisualDevAsset(projectId, {
        kind: 'note',
        title: noteTitle.trim() || 'Idea note',
        markdown: noteBody.trim(),
      });
      setNoteTitle('');
      setNoteBody('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2} className="lyrefly-visual-dev-panel" data-testid="lyrefly-visual-dev-panel">
      <Typography variant="overline" sx={{ letterSpacing: '0.12em', opacity: 0.72 }}>
        Concept shelf
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button
          size="small"
          variant="outlined"
          startIcon={<ImageOutlinedIcon />}
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload art
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void onPickImages(e)}
        />
      </Stack>

      <Stack spacing={1} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Moodboard or reference link
        </Typography>
        <TextField size="small" label="Title" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
        <TextField size="small" label="URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        <Button size="small" variant="text" startIcon={<AddLinkIcon />} disabled={busy || !linkUrl.trim()} onClick={() => void onAddLink()}>
          Add link
        </Button>
      </Stack>

      <Stack spacing={1} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Quick note
        </Typography>
        <TextField size="small" label="Title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
        <TextField
          size="small"
          label="Ideas"
          multiline
          minRows={3}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
        />
        <Button size="small" variant="text" startIcon={<NotesOutlinedIcon />} disabled={busy || !noteBody.trim()} onClick={() => void onAddNote()}>
          Save note
        </Button>
      </Stack>

      {assets.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sketches, thumbnails, and moodboard links live here while you explore the story.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {assets.map((asset) => (
            <Box
              key={asset.id}
              className="lyrefly-visual-dev-card"
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.14),
                bgcolor: alpha(theme.palette.background.paper, 0.6),
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {asset.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {asset.kind.replace('_', ' ')}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label={`Remove ${asset.title}`}
                  onClick={() => void deleteVisualDevAsset(asset)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Box sx={{ mt: 1 }}>
                <AssetThumb asset={asset} />
              </Box>
              {asset.url ? (
                <Button
                  size="small"
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 1, textTransform: 'none' }}
                >
                  Open link
                </Button>
              ) : null}
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
