import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactElement } from 'react';

import type { ComicProject, PageNode, PageRevision } from '../types';
import { LyreflyComicBookPreview } from './LyreflyComicBookPreview';

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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="lyrefly-book-preview-title"
      data-testid="lyrefly-book-preview-dialog"
    >
      <DialogTitle id="lyrefly-book-preview-title" sx={{ pr: 6 }}>
        Book preview{titleSuffix ? ` (${titleSuffix})` : ''}: {project.title}
        <IconButton
          aria-label="Close preview"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Box sx={{ py: 1 }}>
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
