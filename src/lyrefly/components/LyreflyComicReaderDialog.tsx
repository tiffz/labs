import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import CloseIcon from '@mui/icons-material/Close';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { ComicScrollReader } from '../../shared/zine/ComicScrollReader';
import type { ComicScrollReaderPage } from '../../shared/zine/ComicScrollReader';
import {
  downloadLyreflyScrollImage,
  loadLyreflyExportPages,
  type LyreflyExportPage,
} from '../exports/lyreflyComicExport';
import type { ComicProject, PageNode, PageRevision } from '../types';
import { LyreflyPreviewDownloadMenu } from './LyreflyPreviewDownloadMenu';

const SCROLL_DOWNLOAD_OPTIONS = [
  {
    id: 'scroll-jpg',
    label: 'Vertical scroll image',
    hint: 'One long JPEG, top to bottom',
  },
] as const;

export type LyreflyComicReaderDialogProps = {
  open: boolean;
  onClose: () => void;
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  revisionByPageId?: Record<string, string>;
  titleSuffix?: string;
};

export function LyreflyComicReaderDialog({
  open,
  onClose,
  project,
  pageNodes,
  revisions,
  revisionByPageId,
  titleSuffix,
}: LyreflyComicReaderDialogProps): ReactElement {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportPages, setExportPages] = useState<LyreflyExportPage[]>([]);
  const [readerPages, setReaderPages] = useState<ComicScrollReaderPage[]>([]);
  const revisionMapKey = JSON.stringify(revisionByPageId ?? null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadLyreflyExportPages(project, pageNodes, revisions, {
      revisionByPageId,
      strictRevisionMap: revisionByPageId !== undefined,
    })
      .then((pages) => {
        if (cancelled) return;
        setExportPages(pages);
        setReaderPages(
          pages.map((page) => ({
            id: page.node.id,
            label: page.node.displayName ?? 'Page',
            imageUrl: page.dataUrl,
            isSpread: page.node.isSpread,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, pageNodes, project, revisionMapKey, revisions, revisionByPageId]);

  const handleDownload = useCallback(async () => {
    if (exportPages.length === 0) {
      setError('No page art to download yet.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await downloadLyreflyScrollImage(project, exportPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed.');
    } finally {
      setBusy(false);
    }
  }, [exportPages, project]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      aria-labelledby="lyrefly-comic-reader-title"
      data-testid="lyrefly-comic-reader-dialog"
      PaperProps={{ className: 'lyrefly-scroll-reader-dialog' }}
    >
      <DialogTitle id="lyrefly-comic-reader-title" component="div">
        <Stack direction="row" alignItems="center" gap={1}>
          <Box component="h2" sx={{ m: 0, flex: 1, minWidth: 0, font: 'inherit' }}>
            Scroll preview{titleSuffix ? ` (${titleSuffix})` : ''}: {project.title}
          </Box>
          <LyreflyPreviewDownloadMenu
            options={SCROLL_DOWNLOAD_OPTIONS}
            busy={busy}
            disabled={loading || exportPages.length === 0}
            onSelect={() => void handleDownload()}
            ariaLabel="Download scroll image"
          />
          <IconButton aria-label="Close preview" onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: '#0f0f10' }}>
        {error ? (
          <Box
            role="alert"
            sx={{ px: 2, py: 1, color: '#ffb4b4', fontSize: '0.875rem', bgcolor: '#1a1010' }}
          >
            {error}
          </Box>
        ) : null}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress aria-label="Loading preview" sx={{ color: 'rgba(255,255,255,0.7)' }} />
          </Box>
        ) : (
          <div className="comic-scroll-reader-shell comic-scroll-reader-shell--platform">
            <ComicScrollReader pages={readerPages} title={project.title} variant="platform" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
