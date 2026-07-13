import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState, type ReactElement } from 'react';

import { ComicScrollReader } from '../../shared/zine/ComicScrollReader';
import type { ComicScrollReaderPage } from '../../shared/zine/ComicScrollReader';
import type { ComicProject, PageNode, PageRevision } from '../types';
import { loadLyreflyExportPages } from '../exports/lyreflyComicExport';

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
  const [readerPages, setReaderPages] = useState<ComicScrollReaderPage[]>([]);
  const revisionMapKey = JSON.stringify(revisionByPageId ?? null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void loadLyreflyExportPages(project, pageNodes, revisions, {
      revisionByPageId,
      strictRevisionMap: revisionByPageId !== undefined,
    })
      .then((pages) => {
        if (cancelled) return;
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="lyrefly-comic-reader-title"
      data-testid="lyrefly-comic-reader-dialog"
      PaperProps={{ className: 'lyrefly-scroll-reader-dialog' }}
    >
      <DialogTitle id="lyrefly-comic-reader-title" sx={{ pr: 6 }}>
        Scroll preview{titleSuffix ? ` (${titleSuffix})` : ''}: {project.title}
        <IconButton
          aria-label="Close preview"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: '#0f0f10' }}>
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
