import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HistoryIcon from '@mui/icons-material/History';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { PortfolioHistoryRecoveryEntry } from '../drive/labsPortfolioDriveHistoryRecovery';

type Phase = 'scanning' | 'results' | 'restoring' | 'done' | 'error';

export type LabsPortfolioDriveHistoryRecoverDialogProps = {
  open: boolean;
  onClose: () => void;
  busy?: boolean;
  scanHistory: () => Promise<{
    entries: PortfolioHistoryRecoveryEntry[];
    revisionsScanned: number;
    revisionsSkipped: number;
  }>;
  restoreSelected: (ids: string[]) => Promise<{ restoredCount: number }>;
  entityNoun?: string;
};

function formatRevisionDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function LabsPortfolioDriveHistoryRecoverDialog(
  props: LabsPortfolioDriveHistoryRecoverDialogProps,
): ReactElement {
  const { open, onClose, busy = false, scanHistory, restoreSelected, entityNoun = 'item' } = props;
  const [phase, setPhase] = useState<Phase>('scanning');
  const [entries, setEntries] = useState<PortfolioHistoryRecoveryEntry[]>([]);
  const [revisionsScanned, setRevisionsScanned] = useState(0);
  const [revisionsSkipped, setRevisionsSkipped] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [restoredCount, setRestoredCount] = useState(0);

  const runScan = useCallback(async () => {
    setPhase('scanning');
    setError(null);
    try {
      const result = await scanHistory();
      setEntries(result.entries);
      setRevisionsScanned(result.revisionsScanned);
      setRevisionsSkipped(result.revisionsSkipped);
      setSelected(new Set(result.entries.map((e) => e.id)));
      setPhase('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [scanHistory]);

  useEffect(() => {
    if (open) void runScan();
  }, [open, runScan]);

  const selectedCount = selected.size;
  const allSelected = entries.length > 0 && selectedCount === entries.length;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(entries.map((e) => e.id)));
  }, [allSelected, entries]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRestore = useCallback(async () => {
    if (selectedCount === 0) return;
    setPhase('restoring');
    setError(null);
    try {
      const result = await restoreSelected([...selected]);
      setRestoredCount(result.restoredCount);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [restoreSelected, selected, selectedCount]);

  const scanSummary = useMemo(() => {
    const parts = [`Scanned ${revisionsScanned} Drive version${revisionsScanned === 1 ? '' : 's'}`];
    if (revisionsSkipped > 0) parts.push(`${revisionsSkipped} skipped`);
    return parts.join(' · ');
  }, [revisionsScanned, revisionsSkipped]);

  return (
    <Dialog open={open} onClose={() => !busy && phase !== 'restoring' && onClose()} fullWidth maxWidth="sm">
      <DialogTitle id="portfolio-recover-title">
        <Stack direction="row" spacing={1} alignItems="center">
          <HistoryIcon fontSize="small" aria-hidden />
          <span>Recover from Drive history</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {phase === 'scanning' ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={28} aria-label="Scanning Drive history" />
            <Typography variant="body2" color="text.secondary">
              Scanning older versions of your backup…
            </Typography>
          </Stack>
        ) : null}

        {phase === 'error' && error ? (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        ) : null}

        {phase === 'results' ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {scanSummary}. Select {entityNoun}s that disappeared after a bad sync to merge them back — nothing
              you still have locally will be overwritten.
            </Typography>
            {entries.length === 0 ? (
              <Typography variant="body2">No missing {entityNoun}s found in Drive history.</Typography>
            ) : (
              <>
                <FormControlLabel
                  control={<Checkbox checked={allSelected} onChange={toggleAll} />}
                  label={`Select all (${entries.length})`}
                  sx={{ mb: 0.5 }}
                />
                <List dense disablePadding>
                  {entries.map((entry) => (
                    <ListItem key={entry.id} disablePadding sx={{ display: 'block' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selected.has(entry.id)}
                            onChange={() => toggleOne(entry.id)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{entry.label}</Typography>
                            {entry.lastSeenModifiedTime ? (
                              <Typography variant="caption" color="text.secondary">
                                Last in backup {formatRevisionDate(entry.lastSeenModifiedTime)}
                              </Typography>
                            ) : null}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </>
        ) : null}

        {phase === 'restoring' ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={28} aria-label="Restoring selected items" />
            <Typography variant="body2" color="text.secondary">
              Merging selected {entityNoun}s…
            </Typography>
          </Stack>
        ) : null}

        {phase === 'done' ? (
          <Alert severity="success">
            Restored {restoredCount} {entityNoun}{restoredCount === 1 ? '' : 's'} from Drive history.
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy || phase === 'restoring'}>
          {phase === 'done' ? 'Close' : 'Cancel'}
        </Button>
        {phase === 'results' && entries.length > 0 ? (
          <Button variant="contained" disabled={busy || selectedCount === 0} onClick={() => void handleRestore()}>
            Restore selected ({selectedCount})
          </Button>
        ) : null}
        {phase === 'error' ? (
          <Button variant="contained" onClick={() => void runScan()}>
            Retry scan
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
