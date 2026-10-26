import AudioFileOutlinedIcon from '@mui/icons-material/AudioFileOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkIcon from '@mui/icons-material/Link';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import { useState, type ReactElement } from 'react';
import {
  STAGED_UPLOAD_SUMMARY_THRESHOLD,
  formatStagedUploadSize,
  readyStagedUploads,
  stagedUploadSummary,
  type LabsStagedUpload,
} from './stagedUploads';
import type { LabsStagedUploadsController } from './useLabsStagedUploads';

export type LabsStagedUploadPanelProps<TPlan> = {
  staged: LabsStagedUploadsController<TPlan>;
  /** Commit the ready items (the app writes them). Errors should be shown by the caller. */
  onConfirm: () => void;
  /** Button label for `count` ready items, e.g. `count === 1 ? 'Add take' : \`Add ${count} takes\``. */
  confirmLabel: (count: number) => string;
  /** Region name for assistive tech. Defaults to "Ready to add". */
  title?: string;
  /** A commit error to show under the list (plain language, what to do next). */
  error?: string | null;
  /** Noun for the summary line when many items are staged ("photo" → "312 photos"). */
  itemNoun?: string;
  /** Outer spacing for the host layout (the panel itself has no margin). */
  sx?: SxProps<Theme>;
};


function RowIcon<TPlan>({ item }: { item: LabsStagedUpload<TPlan> }): ReactElement {
  const sx = { fontSize: 20, color: 'text.secondary' } as const;
  if (item.status === 'checking') return <CircularProgress size={16} aria-hidden />;
  const mime = item.status === 'ready' ? (item.mimeType ?? '') : '';
  if (mime.startsWith('audio/')) return <AudioFileOutlinedIcon sx={sx} aria-hidden />;
  if (mime.startsWith('video/')) return <MovieOutlinedIcon sx={sx} aria-hidden />;
  if (mime.startsWith('image/')) return <ImageOutlinedIcon sx={sx} aria-hidden />;
  if (item.source.kind === 'link') return <LinkIcon sx={sx} aria-hidden />;
  if (item.source.kind === 'batch') return <FolderOutlinedIcon sx={sx} aria-hidden />;
  return <DescriptionOutlinedIcon sx={sx} aria-hidden />;
}

/** The outcome every ready item shares, or none when they differ. */
function commonOutcome<TPlan>(items: readonly LabsStagedUpload<TPlan>[]): string | null {
  const outcomes = new Set(items.flatMap((i) => (i.status === 'ready' ? [i.outcome] : [])));
  return outcomes.size === 1 ? [...outcomes][0]! : null;
}

function rowCaption<TPlan>(item: LabsStagedUpload<TPlan>): string {
  if (item.status === 'checking') return 'Checking…';
  if (item.status === 'rejected') return item.message;
  return [item.outcome, formatStagedUploadSize(item.sizeBytes)].filter(Boolean).join(' · ');
}

/**
 * The review step every upload goes through (ADR 0030): what was picked, dropped or pasted, what
 * will happen to each item, and one button that does it. Render it where the items will land, and
 * only while something is staged.
 *
 * Class hook: `.labs-staged-upload-panel`. Colours come from the MUI theme, so each app's palette
 * applies without an `appearance` prop.
 */
export function LabsStagedUploadPanel<TPlan>({
  staged,
  onConfirm,
  confirmLabel,
  title = 'Ready to add',
  error,
  itemNoun = 'file',
  sx,
}: LabsStagedUploadPanelProps<TPlan>): ReactElement | null {
  const [showAll, setShowAll] = useState(false);
  if (staged.items.length === 0) return null;
  const readyCount = readyStagedUploads(staged.items).length;
  const summarise = staged.items.length > STAGED_UPLOAD_SUMMARY_THRESHOLD && !showAll;

  return (
    <Box
      component="section"
      aria-label={title}
      className="labs-staged-upload-panel"
      sx={[
        { border: 1, borderColor: 'divider', borderRadius: 2, p: { xs: 1.25, sm: 1.5 }, minWidth: 0 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {summarise ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {stagedUploadSummary(staged.items, itemNoun)}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {commonOutcome(staged.items)}
            </Typography>
          </Box>
          <Button size="small" color="inherit" onClick={() => setShowAll(true)}>
            Show all
          </Button>
        </Stack>
      ) : (
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {staged.items.map((item) => (
          <Stack component="li" key={item.id} direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <RowIcon item={item} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap title={item.name} sx={{ fontWeight: 600 }}>
                {item.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: 'block', color: item.status === 'rejected' ? 'error.main' : 'text.secondary' }}
              >
                {rowCaption(item)}
              </Typography>
            </Box>
            <IconButton
              size="small"
              aria-label={`Remove ${item.name}`}
              disabled={staged.committing}
              onClick={() => staged.remove(item.id)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      )}
      {error ? (
        <Typography variant="caption" role="alert" sx={{ display: 'block', mt: 1, color: 'error.main' }}>
          {error}
        </Typography>
      ) : null}
      <Stack direction="row" useFlexGap sx={{ justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
        <Button size="small" color="inherit" disabled={staged.committing} onClick={staged.clear}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          disableElevation
          disabled={!staged.canConfirm || staged.committing}
          onClick={onConfirm}
        >
          {staged.committing ? 'Adding…' : confirmLabel(Math.max(readyCount, 1))}
        </Button>
      </Stack>
    </Box>
  );
}
