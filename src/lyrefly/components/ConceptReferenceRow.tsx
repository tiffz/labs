import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import LinkIcon from '@mui/icons-material/Link';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useState, type ReactElement } from 'react';

import type { VisualDevAsset } from '../types';
import { conceptShelfKindCaption, conceptShelfOpenUrl } from '../utils/conceptShelfUtils';

export type ConceptReferenceRowProps = {
  asset: VisualDevAsset;
  onChange: (before: VisualDevAsset, after: VisualDevAsset) => void;
  onRemove: (asset: VisualDevAsset) => void;
};

export function ConceptReferenceRow({
  asset,
  onChange,
  onRemove,
}: ConceptReferenceRowProps): ReactElement {
  const theme = useTheme();
  const openUrl = conceptShelfOpenUrl(asset);
  const [titleDraft, setTitleDraft] = useState(asset.title);
  const [notesDraft, setNotesDraft] = useState(asset.markdown ?? '');

  useEffect(() => {
    setTitleDraft(asset.title);
    setNotesDraft(asset.markdown ?? '');
  }, [asset.id, asset.markdown, asset.title]);

  const commit = (): void => {
    const nextTitle = titleDraft.trim() || asset.title;
    const nextNotes = notesDraft.trim() || undefined;
    if (nextTitle === asset.title && nextNotes === (asset.markdown ?? undefined)) return;
    onChange(asset, { ...asset, title: nextTitle, markdown: nextNotes });
  };

  const icon =
    asset.kind === 'note' ? (
      <NotesOutlinedIcon fontSize="small" />
    ) : asset.fileName ? (
      <DescriptionOutlinedIcon fontSize="small" />
    ) : (
      <LinkIcon sx={{
        fontSize: "small"
      }} />
    );

  return (
    <Box className="lyrefly-concept-ref-row" component="li">
      <span
        className="lyrefly-concept-ref-row__icon"
        style={{
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          color: theme.palette.primary.main,
        }}
      >
        {icon}
      </span>
      <Stack spacing={0.75} className="lyrefly-concept-ref-row__fields">
        <TextField
          variant="standard"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commit}
          placeholder="Label"
          fullWidth
          sx={{
            '& .MuiInput-input': {
              fontWeight: 600,
              fontSize: '0.8125rem',
            },
          }}
          slotProps={{
            htmlInput: { 'aria-label': 'Reference label' }
          }}
        />
        <Typography variant="caption" className="lyrefly-concept-ref-row__kind" sx={{
          color: "text.secondary"
        }}>
          {conceptShelfKindCaption(asset.kind)}
        </Typography>
        <TextField
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={commit}
          placeholder="Note (optional)"
          multiline
          minRows={2}
          maxRows={4}
          fullWidth
          size="small"
          sx={{ '& .MuiInputBase-root': { fontSize: '0.8125rem' } }}
        />
      </Stack>
      <Stack direction="row" spacing={0.25} className="lyrefly-concept-ref-row__actions">
        {openUrl ? (
          <IconButton
            size="small"
            component="a"
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${asset.title}`}
          >
            <OpenInNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}
        <IconButton size="small" aria-label={`Remove ${asset.title}`} onClick={() => onRemove(asset)}>
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}
