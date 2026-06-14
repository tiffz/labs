import { useCallback, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CircularProgress from '@mui/material/CircularProgress';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { labsDriveFolderUrl } from '../../shared/drive/labsDriveFolderUrl';
import { applyGestureDuplicateDedup } from '../drive/gestureDuplicateDedup';
import {
  summarizeDuplicateScan,
  type GestureDuplicateGroup,
  type GestureDuplicateScanResult,
} from '../drive/gestureDuplicateDetection';

type GestureOrganizeDuplicatesDialogProps = {
  open: boolean;
  scan: GestureDuplicateScanResult | null;
  onClose: () => void;
  onComplete: (message: string) => void;
  onError: (message: string) => void;
};

function groupsByCollection(groups: GestureDuplicateGroup[]): Map<string, GestureDuplicateGroup[]> {
  const map = new Map<string, GestureDuplicateGroup[]>();
  for (const group of groups) {
    const list = map.get(group.packId) ?? [];
    list.push(group);
    map.set(group.packId, list);
  }
  return map;
}

export default function GestureOrganizeDuplicatesDialog({
  open,
  scan,
  onClose,
  onComplete,
  onError,
}: GestureOrganizeDuplicatesDialogProps): React.ReactElement {
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(
    () => (scan ? groupsByCollection(scan.groups) : new Map<string, GestureDuplicateGroup[]>()),
    [scan],
  );

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleConfirm = useCallback(async () => {
    if (!scan || scan.duplicateFileCount === 0) {
      onClose();
      return;
    }
    setBusy(true);
    onError('');
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      const result = await applyGestureDuplicateDedup(token, scan.groups);
      if (result.trashed === 0 && result.trashErrors > 0) {
        onError('Could not move duplicates to Drive trash. Try again or remove them in Drive.');
        return;
      }
      const base = `Moved ${result.trashed} duplicate photo${result.trashed === 1 ? '' : 's'} to Google Drive trash.`;
      const err =
        result.trashErrors > 0
          ? ` ${result.trashErrors} could not be trashed; check Drive manually.`
          : '';
      onComplete(`${base}${err}`);
      onClose();
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError(e.message);
      } else {
        onError(e instanceof Error ? e.message : 'Could not organize collections.');
      }
    } finally {
      setBusy(false);
    }
  }, [onClose, onComplete, onError, scan]);

  const hasDuplicates = (scan?.duplicateFileCount ?? 0) > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="gesture-organize-duplicates-title"
    >
      <DialogTitle id="gesture-organize-duplicates-title">Organize collections</DialogTitle>
      <DialogContent>
        {!scan ? (
          <Typography variant="body2" color="text.secondary">
            Scanning collections…
          </Typography>
        ) : !hasDuplicates ? (
          <Typography variant="body2" color="text.secondary">
            {summarizeDuplicateScan(scan)}
          </Typography>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {summarizeDuplicateScan(scan)} Review below, or open a collection in Drive first. Duplicates move to
              Drive trash (~30 days) and references here point at the copy we keep.
            </Typography>
            {[...grouped.entries()].map(([packId, packGroups]) => {
              const sample = packGroups[0];
              if (!sample) return null;
              const dupCount = packGroups.reduce((sum, g) => sum + g.fileIdsToTrash.length, 0);
              const folderUrl = labsDriveFolderUrl(sample.driveFolderId);
              return (
                <Stack key={packId} spacing={0.75}>
                  <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} flexWrap="wrap">
                    <Typography variant="subtitle2">{sample.packName}</Typography>
                    {folderUrl ? (
                      <Link
                        href={folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}
                      >
                        Open in Drive
                        <OpenInNewIcon sx={{ fontSize: 14 }} aria-hidden />
                      </Link>
                    ) : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {dupCount} duplicate{dupCount === 1 ? '' : 's'} in this collection
                  </Typography>
                  {packGroups.map((group) => (
                    <Typography key={group.key} variant="body2" component="div" sx={{ pl: 1, borderLeft: 2, borderColor: 'divider' }}>
                      <strong>{group.members[0]?.name ?? 'Photo'}</strong>
                      {' · '}
                      {group.members.length} copies
                      {' · '}
                      keeping {group.canonicalFileId.slice(0, 8)}…
                    </Typography>
                  ))}
                </Stack>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={busy}>
          {hasDuplicates ? 'Cancel' : 'Close'}
        </Button>
        {hasDuplicates ? (
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirm()}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" aria-hidden /> : undefined}
          >
            {busy ? 'Organizing…' : 'Move duplicates to trash'}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
