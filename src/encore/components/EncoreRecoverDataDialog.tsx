import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HistoryIcon from '@mui/icons-material/History';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { RecoveryCategory, SongRecoveryEntry } from '../drive/encoreDataRecovery';
import {
  applyDataRecovery,
  scanRepertoireHistoryForRecovery,
  type RecoveryScanResult,
  type RecoverySelection,
} from '../drive/encoreRecoveryRunner';

type Phase = 'scanning' | 'results' | 'restoring' | 'done' | 'error';

export type EncoreRecoverDataDialogProps = {
  open: boolean;
  /** Google access token; recovery reads Drive revision history with it. */
  accessToken: string | null;
  onClose: () => void;
};

function formatRevisionDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Build the default selection: every recoverable category ticked for every found song. */
function selectAll(entries: SongRecoveryEntry[]): RecoverySelection {
  const selection: RecoverySelection = {};
  for (const entry of entries) selection[entry.songId] = entry.deltas.map((d) => d.category);
  return selection;
}

/**
 * Recover any repertoire content lost to a bad sync (deleted songs, media/file refs, misc resources,
 * lyrics, journals, deleted performances) by scanning Drive revision history plus local pre-sync
 * snapshots. Restore goes through the non-destructive merge + an undo snapshot, so it can only *add*
 * back content you no longer have — it never overwrites or removes anything present now. Selection is
 * per song, per category, so an intentional delete is opt-in.
 */
export function EncoreRecoverDataDialog(props: EncoreRecoverDataDialogProps): ReactElement {
  const { open, accessToken, onClose } = props;
  const [phase, setPhase] = useState<Phase>('scanning');
  const [scan, setScan] = useState<RecoveryScanResult | null>(null);
  const [selection, setSelection] = useState<RecoverySelection>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ songs: number; performances: number }>({ songs: 0, performances: 0 });

  const runScan = useCallback(async () => {
    if (!accessToken) {
      setError('Sign in to Google to scan Drive history.');
      setPhase('error');
      return;
    }
    setPhase('scanning');
    setError(null);
    try {
      const next = await scanRepertoireHistoryForRecovery(accessToken);
      setScan(next);
      setSelection(selectAll(next.entries));
      setPhase('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [accessToken]);

  useEffect(() => {
    if (open) void runScan();
  }, [open, runScan]);

  const entries = scan?.entries ?? [];
  const selectedCount = useMemo(
    () => Object.values(selection).reduce((acc, cats) => acc + cats.length, 0),
    [selection],
  );

  const toggleCategory = useCallback((songId: string, category: RecoveryCategory) => {
    setSelection((prev) => {
      const current = prev[songId] ?? [];
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      return { ...prev, [songId]: next };
    });
  }, []);

  const handleRestore = useCallback(async () => {
    if (!accessToken || !scan) return;
    setPhase('restoring');
    setError(null);
    try {
      const applied = await applyDataRecovery(accessToken, scan.entries, selection);
      setResult({ songs: applied.songsRestored, performances: applied.performancesRestored });
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [accessToken, scan, selection]);

  const busy = phase === 'scanning' || phase === 'restoring';
  const scannedParts = scan
    ? [
        scan.revisionsScanned > 0
          ? `${scan.revisionsScanned} Drive version${scan.revisionsScanned === 1 ? '' : 's'}`
          : null,
        scan.localSnapshotsScanned > 0
          ? `${scan.localSnapshotsScanned} local snapshot${scan.localSnapshotsScanned === 1 ? '' : 's'}`
          : null,
      ].filter((part): part is string => Boolean(part))
    : [];
  const scannedCaption = scannedParts.length > 0 ? `Scanned ${scannedParts.join(' and ')}.` : null;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="encore-recover-title"
    >
      <DialogTitle id="encore-recover-title">Recover lost data</DialogTitle>
      <DialogContent>
        {phase === 'scanning' ? (
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 2 }}>
            <CircularProgress size={20} thickness={5} />
            <Typography variant="body2" color="text.secondary">
              Scanning Drive history and local snapshots for content your library is missing…
            </Typography>
          </Stack>
        ) : null}

        {phase === 'restoring' ? (
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 2 }}>
            <CircularProgress size={20} thickness={5} />
            <Typography variant="body2" color="text.secondary">
              Restoring selected items and syncing to Drive…
            </Typography>
          </Stack>
        ) : null}

        {phase === 'error' ? (
          <Alert severity="error" sx={{ '& .MuiAlert-message': { width: 1 } }}>
            {error ?? 'Something went wrong.'}
          </Alert>
        ) : null}

        {phase === 'done' ? (
          <Alert severity="success" sx={{ '& .MuiAlert-message': { width: 1 } }}>
            {result.songs === 0 && result.performances === 0
              ? 'Nothing to restore.'
              : `Restored ${result.songs} song${result.songs === 1 ? '' : 's'}` +
                (result.performances > 0
                  ? ` and ${result.performances} performance${result.performances === 1 ? '' : 's'}`
                  : '') +
                '. They’ll sync to Drive.'}
          </Alert>
        ) : null}

        {phase === 'results' ? (
          entries.length === 0 ? (
            <Stack spacing={1} sx={{ py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                No recoverable data found in history. Your current library already has everything we can see.
              </Typography>
              {scannedCaption ? (
                <Typography variant="caption" color="text.secondary">
                  {scannedCaption}
                </Typography>
              ) : null}
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Found older versions with content your library is missing. Pick what to restore. Nothing you have now is
                changed or removed.
              </Typography>
              <Stack
                component="ul"
                spacing={0}
                sx={{ listStyle: 'none', m: 0, p: 0, border: 1, borderColor: 'divider', borderRadius: 1.5 }}
              >
                {entries.map((entry, i) => {
                  const when = formatRevisionDate(entry.sourceModifiedTime);
                  const selectedCats = selection[entry.songId] ?? [];
                  return (
                    <Box
                      key={entry.songId}
                      component="li"
                      sx={{ px: 2, py: 1.25, borderTop: i === 0 ? 0 : 1, borderColor: 'divider' }}
                    >
                      <Stack direction="row" alignItems="baseline" spacing={1}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {entry.title}
                            {entry.songMissingLocally ? (
                              <Chip
                                label="Deleted song"
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ ml: 1, height: 18, fontSize: 11 }}
                              />
                            ) : null}
                          </Typography>
                          {entry.artist ? (
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                              {entry.artist}
                            </Typography>
                          ) : null}
                        </Box>
                        {when ? (
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {when}
                          </Typography>
                        ) : null}
                      </Stack>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.75 }}>
                        {entry.deltas.map((delta) => {
                          const on = selectedCats.includes(delta.category);
                          return (
                            <Chip
                              key={delta.category}
                              label={delta.label}
                              size="small"
                              color={on ? 'primary' : 'default'}
                              variant={on ? 'filled' : 'outlined'}
                              onClick={() => toggleCategory(entry.songId, delta.category)}
                              aria-pressed={on}
                            />
                          );
                        })}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Button size="small" onClick={() => setSelection(selectAll(entries))}>
                  Select all
                </Button>
                <Button size="small" onClick={() => setSelection({})}>
                  Clear
                </Button>
              </Stack>
              {scannedCaption ? (
                <Typography variant="caption" color="text.secondary">
                  {scannedCaption}
                </Typography>
              ) : null}
            </Stack>
          )
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {phase === 'done' ? 'Close' : 'Cancel'}
        </Button>
        {phase === 'error' ? (
          <Button onClick={() => void runScan()} disabled={!accessToken}>
            Try again
          </Button>
        ) : null}
        {phase === 'results' && entries.length > 0 ? (
          <Button
            variant="contained"
            startIcon={<HistoryIcon />}
            onClick={() => void handleRestore()}
            disabled={selectedCount === 0}
          >
            Restore selected
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
