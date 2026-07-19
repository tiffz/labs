import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import CloseIcon from '@mui/icons-material/Close';
import { useCallback, useState, type ReactElement } from 'react';

import type { FacingSpreadPdfFormat } from '../../shared/zine';
import {
  downloadLyreflyBookSpreadPdf,
  loadLyreflyExportPages,
} from '../exports/lyreflyComicExport';
import type { ComicProject, PageNode, PageRevision } from '../types';
import { LyreflyComicBookPreview } from './LyreflyComicBookPreview';
import { LyreflyPreviewDownloadMenu } from './LyreflyPreviewDownloadMenu';

const BOOK_DOWNLOAD_OPTIONS = [
  {
    id: 'digital',
    label: 'Digital PDF (spreads)',
    hint: 'Facing pages for reading on screen',
  },
  {
    id: 'print',
    label: 'Print-ready PDF (spreads)',
    hint: 'Facing pages with blank pads for print',
  },
] as const;

export type LyreflyComicBookPreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  revisionByPageId?: Record<string, string>;
  titleSuffix?: string;
};

export function LyreflyComicBookPreviewDialog({
  open,
  onClose,
  project,
  pageNodes,
  revisions,
  revisionByPageId,
  titleSuffix,
}: LyreflyComicBookPreviewDialogProps): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(
    async (optionId: string) => {
      const format = optionId as FacingSpreadPdfFormat;
      setBusy(true);
      setError(null);
      try {
        const pages = await loadLyreflyExportPages(project, pageNodes, revisions, {
          revisionByPageId,
          strictRevisionMap: revisionByPageId !== undefined,
        });
        if (pages.length === 0) {
          setError('No page art to download yet.');
          return;
        }
        await downloadLyreflyBookSpreadPdf(project, pages, format);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Download failed.');
      } finally {
        setBusy(false);
      }
    },
    [pageNodes, project, revisionByPageId, revisions],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      aria-labelledby="lyrefly-book-preview-title"
      data-testid="lyrefly-book-preview-dialog"
      slotProps={{
        paper: { className: 'lyrefly-book-preview-dialog' }
      }}
    >
      <DialogTitle id="lyrefly-book-preview-title" component="div">
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1
          }}>
          <Box component="h2" sx={{ m: 0, flex: 1, minWidth: 0, font: 'inherit' }}>
            Book preview{titleSuffix ? ` (${titleSuffix})` : ''}: {project.title}
          </Box>
          <LyreflyPreviewDownloadMenu
            options={BOOK_DOWNLOAD_OPTIONS}
            busy={busy}
            onSelect={(id) => void handleDownload(id)}
            ariaLabel="Download book PDF"
          />
          <IconButton aria-label="Close preview" onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        {error ? (
          <Box role="alert" sx={{ mb: 1, color: 'error.main', fontSize: '0.875rem' }}>
            {error}
          </Box>
        ) : null}
        <Box sx={{ py: 0.5 }}>
          <LyreflyComicBookPreview
            project={project}
            pageNodes={pageNodes}
            revisions={revisions}
            revisionByPageId={revisionByPageId}
            captureArrowKeys
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
