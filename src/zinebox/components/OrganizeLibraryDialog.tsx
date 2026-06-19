import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import { useLabsBlockingJobs } from '../../shared/jobs/LabsBlockingJobContext';
import { applyZineboxOrganizeSuggestions } from '../organize/applyZineboxOrganize';
import type { ZineboxOrganizeScanResult } from '../organize/zineboxOrganizeSuggestions';
import type { ZineboxComic } from '../types';

type OrganizeLibraryDialogProps = {
  open: boolean;
  scan: ZineboxOrganizeScanResult | null;
  comicsById: ReadonlyMap<string, ZineboxComic>;
  onClose: () => void;
  onComplete: (summary: string) => void;
  onError: (message: string) => void;
};

function comicLabel(comicsById: ReadonlyMap<string, ZineboxComic>, comicId: string): string {
  return comicsById.get(comicId)?.title ?? comicId;
}

export default function OrganizeLibraryDialog({
  open,
  scan,
  comicsById,
  onClose,
  onComplete,
  onError,
}: OrganizeLibraryDialogProps): React.ReactElement {
  const { withBlockingJob } = useLabsBlockingJobs();
  const suggestions = scan?.suggestions;
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());
  const [selectedStacks, setSelectedStacks] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open || !suggestions) return;
    setSelectedDuplicates(new Set(suggestions.duplicates.map((row) => row.id)));
    setSelectedStacks(new Set(suggestions.stackCandidates.map((row) => row.id)));
  }, [open, suggestions]);

  const hasSuggestions =
    (suggestions?.duplicates.length ?? 0) > 0 || (suggestions?.stackCandidates.length ?? 0) > 0;

  const toggleDuplicate = (id: string) => {
    setSelectedDuplicates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStack = (id: string) => {
    setSelectedStacks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    if (!suggestions) return;
    setApplying(true);
    try {
      await withBlockingJob('Applying organize changes…', async () => {
        const report = await applyZineboxOrganizeSuggestions({
          duplicateIdsToApply: selectedDuplicates,
          stackIdsToApply: selectedStacks,
          duplicates: suggestions.duplicates,
          stackCandidates: suggestions.stackCandidates,
          comicsById,
        });
        const parts: string[] = [];
        if (report.removedDuplicates > 0) {
          parts.push(
            `removed ${report.removedDuplicates} duplicate${report.removedDuplicates === 1 ? '' : 's'}`,
          );
        }
        if (report.stacksCreated > 0) {
          parts.push(`created ${report.stacksCreated} stack${report.stacksCreated === 1 ? '' : 's'}`);
        }
        onComplete(parts.length > 0 ? `Organize: ${parts.join(', ')}.` : 'Organize: nothing changed.');
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not apply organize changes.');
    } finally {
      setApplying(false);
    }
  };

  const scanSummary = scan
    ? `Scanned ${scan.comicCount} comic${scan.comicCount === 1 ? '' : 's'} · ${suggestions?.duplicates.length ?? 0} duplicate group${(suggestions?.duplicates.length ?? 0) === 1 ? '' : 's'} · ${suggestions?.stackCandidates.length ?? 0} stack suggestion${(suggestions?.stackCandidates.length ?? 0) === 1 ? '' : 's'}`
    : null;

  return (
    <Dialog open={open} onClose={applying ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Organize library</DialogTitle>
      <DialogContent dividers>
        {scanSummary ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {scanSummary}
          </Typography>
        ) : null}

        {!hasSuggestions ? (
          <Typography variant="body2" color="text.secondary">
            No duplicates or series stacks found. We match same PDF checksum, filename, Drive file,
            or identical title within a source.
          </Typography>
        ) : null}

        {(suggestions?.duplicates.length ?? 0) > 0 ? (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Possible duplicates
            </Typography>
            <List dense disablePadding sx={{ mb: 2 }}>
              {suggestions!.duplicates.map((duplicate) => (
                <ListItem key={duplicate.id} disablePadding sx={{ alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                    <Checkbox
                      edge="start"
                      checked={selectedDuplicates.has(duplicate.id)}
                      onChange={() => toggleDuplicate(duplicate.id)}
                      inputProps={{ 'aria-label': `Apply duplicate cleanup ${duplicate.id}` }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={duplicate.reason}
                    secondary={duplicate.comicIds
                      .map((id) => {
                        const label = comicLabel(comicsById, id);
                        return id === duplicate.keepComicId ? `${label} (keep)` : label;
                      })
                      .join(' · ')}
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : null}

        {(suggestions?.stackCandidates.length ?? 0) > 0 ? (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Suggested stacks
            </Typography>
            <List dense disablePadding>
              {suggestions!.stackCandidates.map((candidate) => (
                <ListItem key={candidate.id} disablePadding sx={{ alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                    <Checkbox
                      edge="start"
                      checked={selectedStacks.has(candidate.id)}
                      onChange={() => toggleStack(candidate.id)}
                      inputProps={{ 'aria-label': `Stack ${candidate.label}` }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={candidate.label}
                    secondary={candidate.comicIds
                      .map((id) => comicLabel(comicsById, id))
                      .join(' · ')}
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={applying}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!hasSuggestions || applying}
          onClick={() => void handleApply()}
        >
          Apply selected
        </Button>
      </DialogActions>
    </Dialog>
  );
}
