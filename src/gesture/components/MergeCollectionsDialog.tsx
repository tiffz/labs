import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { useLabsBlockingJobs } from '../../shared/jobs/LabsBlockingJobContext';
import {
  mergeCollectionsIntoNewParent,
  mergedSourceUrlFromPacks,
  mergedSourceUrlsDifferFromPacks,
  mergedTagsFromPacks,
  suggestMergedCollectionFolderName,
  type MergeCollectionsProgress,
} from '../drive/gestureMergeCollections';
import { displayPackSourceUrl } from '../drive/gesturePackSourceUrl';
import type { GesturePack } from '../types';

interface MergeCollectionsDialogProps {
  open: boolean;
  packs: GesturePack[];
  busy?: boolean;
  onClose: () => void;
  onComplete: (message: string) => void;
  onError: (message: string | null) => void;
}

function mergeStatusLabel(progress: MergeCollectionsProgress | null): string {
  if (!progress) return 'Connecting to Google Drive…';

  switch (progress.phase) {
    case 'creating-folder':
      return 'Creating collection folder on Drive…';
    case 'moving-folders':
      return `Moving “${progress.packName}” (${progress.packIndex + 1} of ${progress.packTotal})…`;
    case 'indexing':
      return 'Syncing merged collection…';
    case 'cleaning-up':
      return 'Updating library…';
    default:
      return 'Merging collections…';
  }
}

function mergeProgressValue(progress: MergeCollectionsProgress | null): number | undefined {
  if (progress?.phase === 'moving-folders' && progress.packTotal > 0) {
    return ((progress.packIndex + 1) / progress.packTotal) * 100;
  }
  return undefined;
}

export default function MergeCollectionsDialog({
  open,
  packs,
  busy,
  onClose,
  onComplete,
  onError,
}: MergeCollectionsDialogProps): React.ReactElement {
  const { startBlockingJob } = useLabsBlockingJobs();
  const mergeJobRef = useRef<ReturnType<typeof startBlockingJob> | null>(null);
  const [folderName, setFolderName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState<MergeCollectionsProgress | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const mergedSourceUrl = useMemo(() => mergedSourceUrlFromPacks(packs), [packs]);
  const sourceUrlsDiffer = useMemo(() => mergedSourceUrlsDifferFromPacks(packs), [packs]);

  useEffect(() => {
    if (!open) return;
    setFolderName(suggestMergedCollectionFolderName(packs));
    setSelectedTags(mergedTagsFromPacks(packs));
    setMerging(false);
    setMergeProgress(null);
    setInlineError(null);
  }, [open, packs]);

  const removeTag = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((entry) => entry !== tag));
  }, []);

  const handleClose = useCallback(() => {
    if (busy || merging) return;
    onClose();
  }, [busy, merging, onClose]);

  const handleMerge = useCallback(async () => {
    if (packs.length < 2 || merging) return;
    if (!folderName.trim()) {
      const message = 'Enter a name for the new collection.';
      setInlineError(message);
      onError(message);
      return;
    }

    setMerging(true);
    setMergeProgress(null);
    setInlineError(null);
    onError(null);
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      const result = await mergeCollectionsIntoNewParent(token, {
        sourcePackIds: packs.map((pack) => pack.id),
        parentFolderName: folderName,
        tags: selectedTags,
        onProgress: setMergeProgress,
      });
      onComplete(
        `Created "${result.folderName}" with ${packs.length} collection${packs.length === 1 ? '' : 's'} (${result.filesMoved} photo${result.filesMoved === 1 ? '' : 's'}).`,
      );
      onClose();
    } catch (e) {
      const message =
        e instanceof LabsGoogleInteractiveAuthRequiredError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Merge failed.';
      setInlineError(message);
      onError(message);
    } finally {
      setMerging(false);
      setMergeProgress(null);
    }
  }, [folderName, merging, onClose, onComplete, onError, packs, selectedTags]);

  const disabled = busy || merging;
  const statusLabel = merging ? mergeStatusLabel(mergeProgress) : null;

  useEffect(() => {
    if (!merging) {
      mergeJobRef.current?.end();
      mergeJobRef.current = null;
      return;
    }
    const label = mergeStatusLabel(mergeProgress);
    const progressValue = mergeProgressValue(mergeProgress);
    const progress = progressValue != null ? progressValue / 100 : null;
    if (!mergeJobRef.current) {
      mergeJobRef.current = startBlockingJob(label);
    } else {
      mergeJobRef.current.updateLabel(label);
    }
    mergeJobRef.current.updateProgress(progress);
  }, [mergeProgress, merging, startBlockingJob]);

  useEffect(
    () => () => {
      mergeJobRef.current?.end();
    },
    [],
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      className="gesture-merge-dialog"
      aria-labelledby="gesture-merge-dialog-title"
    >
      <DialogTitle id="gesture-merge-dialog-title">
        Merge {packs.length} collections
      </DialogTitle>
      <DialogContent className="gesture-merge-dialog-content">
        {inlineError ? (
          <Typography className="gesture-merge-dialog-error" role="alert" variant="body2">
            {inlineError}
          </Typography>
        ) : null}

        <Typography className="gesture-merge-dialog-lede" variant="body2">
          A new folder on Google Drive holds each collection as its own subfolder. Original
          collections are removed from the app after photos move.
        </Typography>

        <section className="gesture-merge-dialog-section" aria-labelledby="gesture-merge-name-label">
          <Typography component="h2" id="gesture-merge-name-label" className="gesture-practice-label">
            New collection
          </Typography>
          <TextField
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
            placeholder="Folder name"
            slotProps={{
              htmlInput: { 'aria-label': 'New collection folder name' }
            }}
          />
        </section>

        <section className="gesture-merge-dialog-section" aria-labelledby="gesture-merge-subfolders-label">
          <Typography component="h2" id="gesture-merge-subfolders-label" className="gesture-practice-label">
            Subfolders ({packs.length})
          </Typography>
          <Typography className="gesture-merge-dialog-hint" variant="body2">
            Each collection name becomes a subfolder inside the new collection.
          </Typography>
          <div className="gesture-merge-name-chips" role="list">
            {packs.map((pack) => (
              <span key={pack.id} className="gesture-merge-name-chip" role="listitem" title={pack.name}>
                {pack.name}
              </span>
            ))}
          </div>
        </section>

        <section className="gesture-merge-dialog-section" aria-labelledby="gesture-merge-tags-label">
          <Typography component="h2" id="gesture-merge-tags-label" className="gesture-practice-label">
            Tags
          </Typography>
          {selectedTags.length > 0 ? (
            <div className="gesture-inline-tags gesture-merge-dialog-tags">
              {selectedTags.map((tag) => (
                <span key={tag} className="gesture-pack-tag-chip">
                  {tag}
                  <button
                    type="button"
                    className="gesture-pack-tag-remove"
                    aria-label={`Remove tag ${tag}`}
                    disabled={disabled}
                    onClick={() => removeTag(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <Typography className="gesture-merge-dialog-hint" variant="body2">
              No tags from the selected collections.
            </Typography>
          )}
        </section>

        {mergedSourceUrl ? (
          <section className="gesture-merge-dialog-section" aria-labelledby="gesture-merge-source-label">
            <Typography component="h2" id="gesture-merge-source-label" className="gesture-practice-label">
              Source link
            </Typography>
            <div className="gesture-merge-source-row">
              <a
                className="gesture-merge-source-link"
                href={mergedSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {displayPackSourceUrl(mergedSourceUrl)}
              </a>
            </div>
            {sourceUrlsDiffer ? (
              <Typography className="gesture-merge-dialog-hint" variant="body2">
                Collections had different links — the first is kept.
              </Typography>
            ) : null}
          </section>
        ) : null}

        {merging ? (
          <Typography className="gesture-merge-dialog-hint" variant="body2" role="status">
            {statusLabel}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={disabled}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleMerge()}
          disabled={disabled || packs.length < 2}
          startIcon={merging ? <CircularProgress size={16} color="inherit" aria-hidden /> : undefined}
        >
          {merging ? 'Merging…' : 'Merge'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
