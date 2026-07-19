import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { useLabsBlockingJobs } from '../../shared/jobs/LabsBlockingJobContext';
import { labsDriveFolderUrl } from '../../shared/drive/labsDriveFolderUrl';
import { applyGestureDuplicateDedup } from '../drive/gestureDuplicateDedup';
import { linkPackFolderFromInput } from '../drive/linkPackFolder';
import { linkUnlinkedReferencePackFolders } from '../drive/gestureDiscoverUnlinkedPacks';
import {
  summarizeDuplicateScan,
  type GestureDuplicateGroup,
} from '../drive/gestureDuplicateDetection';
import { summarizeUnlinkedFolders, type GestureOrganizeScanResult } from '../drive/gestureOrganizeScan';

type GestureOrganizeDuplicatesDialogProps = {
  open: boolean;
  scan: GestureOrganizeScanResult | null;
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
  const { withBlockingJob } = useLabsBlockingJobs();
  const [busyAction, setBusyAction] = useState<'link' | 'dedup' | 'paste' | null>(null);
  const [folderInput, setFolderInput] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusyAction(null);
      setFolderInput('');
      setDialogError(null);
    }
  }, [open]);

  const busy = busyAction !== null;

  const duplicateScan = scan?.duplicates ?? null;
  const unlinkedFolders = useMemo(() => scan?.unlinkedFolders ?? [], [scan?.unlinkedFolders]);

  const grouped = useMemo(
    () =>
      duplicateScan
        ? groupsByCollection(duplicateScan.groups)
        : new Map<string, GestureDuplicateGroup[]>(),
    [duplicateScan],
  );

  const handleClose = () => {
    if (!busy) onClose();
  };

  const finishSuccess = useCallback(
    (message: string) => {
      onComplete(message);
      onClose();
    },
    [onClose, onComplete],
  );

  const reportFailure = useCallback(
    (message: string) => {
      setDialogError(message);
      onError(message);
    },
    [onError],
  );

  const handleLinkUnlinked = useCallback(async () => {
    if (!scan || unlinkedFolders.length === 0) return;
    setBusyAction('link');
    setDialogError(null);
    try {
      await withBlockingJob(
        `Linking ${unlinkedFolders.length} collection${unlinkedFolders.length === 1 ? '' : 's'}…`,
        async () => {
          const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
          const result = await linkUnlinkedReferencePackFolders(token, unlinkedFolders);
          finishSuccess(
            `Added ${result.linkedCount} collection${result.linkedCount === 1 ? '' : 's'} (${result.photoCount} photo${result.photoCount === 1 ? '' : 's'}).`,
          );
        },
      );
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        reportFailure(e.message);
      } else {
        reportFailure(e instanceof Error ? e.message : 'Could not link folders from Drive.');
      }
    } finally {
      setBusyAction(null);
    }
  }, [finishSuccess, reportFailure, scan, unlinkedFolders, withBlockingJob]);

  const handlePasteLink = useCallback(async () => {
    if (!folderInput.trim()) return;
    setBusyAction('paste');
    setDialogError(null);
    try {
      await withBlockingJob('Linking Drive folder…', async () => {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const result = await linkPackFolderFromInput(token, folderInput);
        setFolderInput('');
        finishSuccess(
          `Linked “${result.pack.name}” with ${result.imageCount} photo${result.imageCount === 1 ? '' : 's'}.`,
        );
      });
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        reportFailure(e.message);
      } else {
        reportFailure(e instanceof Error ? e.message : 'Could not link folder.');
      }
    } finally {
      setBusyAction(null);
    }
  }, [finishSuccess, folderInput, reportFailure, withBlockingJob]);

  const handleConfirmDedup = useCallback(async () => {
    if (!duplicateScan || duplicateScan.duplicateFileCount === 0) return;
    setBusyAction('dedup');
    setDialogError(null);
    try {
      await withBlockingJob('Moving duplicate photos to Drive trash…', async () => {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const result = await applyGestureDuplicateDedup(token, duplicateScan.groups);
        if (result.trashed === 0 && result.trashErrors > 0) {
          reportFailure('Could not move duplicates to Drive trash. Try again or remove them in Drive.');
          return;
        }
        const base = `Moved ${result.trashed} duplicate photo${result.trashed === 1 ? '' : 's'} to Google Drive trash.`;
        const err =
          result.trashErrors > 0
            ? ` ${result.trashErrors} could not be trashed; check Drive manually.`
            : '';
        finishSuccess(`${base}${err}`);
      });
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        reportFailure(e.message);
      } else {
        reportFailure(e instanceof Error ? e.message : 'Could not organize collections.');
      }
    } finally {
      setBusyAction(null);
    }
  }, [duplicateScan, finishSuccess, reportFailure, withBlockingJob]);

  const hasDuplicates = (duplicateScan?.duplicateFileCount ?? 0) > 0;
  const hasUnlinked = unlinkedFolders.length > 0;
  const hasWork = hasDuplicates || hasUnlinked;

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
        {dialogError ? (
          <Typography variant="body2" color="error" sx={{ mb: dialogError && scan ? 1.5 : 0 }}>
            {dialogError}
          </Typography>
        ) : null}
        {!scan ? (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Preparing results…
          </Typography>
        ) : !hasWork ? (
          <Stack spacing={2}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {summarizeUnlinkedFolders(unlinkedFolders)}{' '}
              {duplicateScan ? summarizeDuplicateScan(duplicateScan) : ''}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Manually added folders must sit directly inside Reference Packs on Drive (not inside another
              collection). If one is missing, paste its folder link below.
            </Typography>
            <TextField
              label="Drive folder link"
              placeholder="https://drive.google.com/drive/folders/…"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              fullWidth
              size="small"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && folderInput.trim()) void handlePasteLink();
              }}
            />
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            {hasUnlinked ? (
              <Stack spacing={1}>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {summarizeUnlinkedFolders(unlinkedFolders)} Link them to show up in Collections.
                </Typography>
                <List dense disablePadding>
                  {unlinkedFolders.map((folder) => {
                    const folderUrl = labsDriveFolderUrl(folder.driveFolderId);
                    return (
                      <ListItem key={folder.driveFolderId} disableGutters sx={{ py: 0.25 }}>
                        <ListItemText
                          primary={folder.name}
                          secondary={
                            folderUrl ? (
                              <Link
                                href={folderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="caption"
                                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}
                              >
                                Open in Drive
                                <OpenInNewIcon sx={{ fontSize: 12 }} aria-hidden />
                              </Link>
                            ) : null
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Stack>
            ) : null}

            {hasDuplicates ? (
              <Stack spacing={2}>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {summarizeDuplicateScan(duplicateScan!)} Review below, or open a collection in Drive first.
                  Duplicates move to Drive trash (~30 days) and references here point at the copy we keep.
                </Typography>
                {[...grouped.entries()].map(([packId, packGroups]) => {
                  const sample = packGroups[0];
                  if (!sample) return null;
                  const dupCount = packGroups.reduce((sum, g) => sum + g.fileIdsToTrash.length, 0);
                  const folderUrl = labsDriveFolderUrl(sample.driveFolderId);
                  return (
                    <Stack key={packId} spacing={0.75}>
                      <Stack
                        direction="row"
                        sx={{
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: 1,
                          flexWrap: "wrap"
                        }}>
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
                      <Typography variant="caption" sx={{
                        color: "text.secondary"
                      }}>
                        {dupCount} duplicate{dupCount === 1 ? '' : 's'} in this collection
                      </Typography>
                      {packGroups.map((group) => (
                        <Typography
                          key={group.key}
                          variant="body2"
                          component="div"
                          sx={{ pl: 1, borderLeft: 2, borderColor: 'divider' }}
                        >
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
            ) : duplicateScan ? (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {summarizeDuplicateScan(duplicateScan)}
              </Typography>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={handleClose} disabled={busy}>
          {hasWork ? 'Cancel' : 'Close'}
        </Button>
        {!hasWork && folderInput.trim() ? (
          <Button variant="contained" onClick={() => void handlePasteLink()} disabled={busy}>
            Link folder
          </Button>
        ) : null}
        {hasUnlinked ? (
          <Button variant="contained" onClick={() => void handleLinkUnlinked()} disabled={busy}>
            {`Link ${unlinkedFolders.length} folder${unlinkedFolders.length === 1 ? '' : 's'}`}
          </Button>
        ) : null}
        {hasDuplicates ? (
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirmDedup()}
            disabled={busy}
          >
            Move duplicates to trash
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
