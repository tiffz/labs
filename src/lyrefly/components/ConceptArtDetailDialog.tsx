import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type KeyboardEvent, type ReactElement } from 'react';

import { loadVisualDevBlobUrl } from '../db/lyreflyProjectMutations';
import type { VisualDevAsset } from '../types';
import { conceptShelfOpenUrl } from '../utils/conceptShelfUtils';

export type ConceptArtDetailDialogProps = {
  asset: VisualDevAsset | null;
  open: boolean;
  onClose: () => void;
  onNotesCommit: (before: VisualDevAsset, after: VisualDevAsset) => void;
  onRemove: (asset: VisualDevAsset) => void;
  showNavigationHint?: boolean;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
};

export function ConceptArtDetailDialog({
  asset,
  open,
  onClose,
  onNotesCommit,
  onRemove,
  showNavigationHint = false,
  onNavigatePrevious,
  onNavigateNext,
}: ConceptArtDetailDialogProps): ReactElement {
  const [url, setUrl] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    if (!asset || !open) {
      setUrl(null);
      return undefined;
    }
    setNotesDraft(asset.markdown ?? '');
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
  }, [asset, open]);

  const commitNotes = (): void => {
    if (!asset) return;
    const nextNotes = notesDraft.trim() || undefined;
    if (nextNotes === (asset.markdown ?? undefined)) return;
    onNotesCommit(asset, { ...asset, markdown: nextNotes });
  };

  const onDialogKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!showNavigationHint || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    event.stopPropagation();
    commitNotes();
    if (event.key === 'ArrowLeft') onNavigatePrevious?.();
    else onNavigateNext?.();
  };

  const openUrl = asset ? conceptShelfOpenUrl(asset) : null;

  return (
    <Dialog
      open={open}
      onClose={() => {
        commitNotes();
        onClose();
      }}
      onKeyDownCapture={onDialogKeyDownCapture}
      maxWidth="sm"
      fullWidth
      className="lyrefly-concept-detail-dialog"
    >
      <DialogContent className="lyrefly-concept-detail-dialog__content" sx={{ pt: 2.5 }}>
        {url ? (
          <img className="lyrefly-concept-detail-dialog__img" src={url} alt="" />
        ) : (
          <div className="lyrefly-concept-detail-dialog__placeholder" aria-hidden />
        )}
        <TextField
          label="Note"
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={commitNotes}
          placeholder="Color, mood, character, scene…"
          multiline
          minRows={3}
          maxRows={8}
          fullWidth
          size="small"
          sx={{ mt: 1.5 }}
        />
        {openUrl ? (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <a href={openUrl} target="_blank" rel="noopener noreferrer">
              Open source file
            </a>
          </Typography>
        ) : null}
        {showNavigationHint ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            ← → browse pieces
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button
          color="error"
          onClick={() => {
            if (!asset) return;
            onRemove(asset);
            onClose();
          }}
        >
          Remove from gallery
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            commitNotes();
            onClose();
          }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
