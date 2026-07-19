import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ensureZineboxGoogleDriveAccess } from '../drive/zineboxGoogleDriveAccess';
import { LabsGoogleInteractiveAuthRequiredError } from '../../shared/google/labsGoogleDriveAccess';
import { useLabsBlockingJobs } from '../../shared/jobs/LabsBlockingJobContext';
import { reportBlockingJobItemProgress } from '../../shared/jobs/labsBlockingJobItemProgress';
import { importScannedDriveFolderPdfs } from '../drive/importDriveFolderPdfs';
import { formatZineboxDriveImportError } from '../drive/zineboxDriveImportErrors';
import type { DriveFolderScanResult } from '../drive/scanDriveFolderForImport';
import { scanDriveFolderForImport } from '../drive/scanDriveFolderForImport';
import type { ZineboxImportBatchMetadata } from '../drive/zineboxImportMetadata';
import ZineboxTagsAutocomplete from './ZineboxTagsAutocomplete';

type DriveFolderImportDialogProps = {
  open: boolean;
  folderInput: string;
  /** Token from the Review import click — avoids a second sign-in prompt. */
  accessToken: string | null;
  tagSuggestions: readonly string[];
  onClose: () => void;
  onComplete: (summary: string) => void;
  onError: (message: string | null) => void;
};

export default function DriveFolderImportDialog({
  open,
  folderInput,
  accessToken,
  tagSuggestions,
  onClose,
  onComplete,
  onError,
}: DriveFolderImportDialogProps): React.ReactElement {
  const { startBlockingJob } = useLabsBlockingJobs();
  const [scan, setScan] = useState<DriveFolderScanResult | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [source, setSource] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [useSubfolderAsSource, setUseSubfolderAsSource] = useState(false);
  const accessTokenRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  const scannedInputRef = useRef<string | null>(null);
  onCloseRef.current = onClose;
  onErrorRef.current = onError;
  accessTokenRef.current = accessToken;

  useEffect(() => {
    if (!open) {
      scannedInputRef.current = null;
      setScan(null);
      setScanBusy(false);
      setImportBusy(false);
      setSource('');
      setTags([]);
      setUseSubfolderAsSource(false);
      return;
    }

    const inputKey = folderInput.trim();
    if (!inputKey) return;
    if (scannedInputRef.current === inputKey) return;

    let cancelled = false;
    const runScan = async () => {
      setScanBusy(true);
      onErrorRef.current(null);
      try {
        const token =
          accessTokenRef.current ??
          (await ensureZineboxGoogleDriveAccess({
            interactive: true,
            upgradeScopes: false,
          }));
        const result = await scanDriveFolderForImport(token, folderInput);
        if (cancelled) return;
        scannedInputRef.current = inputKey;
        accessTokenRef.current = token;
        setScan(result);
        setSource(result.folderName);
        const folderLower = result.folderName.toLowerCase();
        if (folderLower.includes('shortbox')) {
          setTags(['Shortbox']);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          onErrorRef.current('Sign in with Google first (Account menu, top right).');
        } else {
          onErrorRef.current(e instanceof Error ? e.message : 'Could not scan that folder.');
        }
        onCloseRef.current();
      } finally {
        if (!cancelled) setScanBusy(false);
      }
    };
    void runScan();
    return () => {
      cancelled = true;
    };
  }, [folderInput, open]);

  const sampleNames = useMemo(() => {
    if (!scan) return [];
    return scan.files.slice(0, 5).map((f) => f.name ?? 'zine.pdf');
  }, [scan]);

  const metadata: ZineboxImportBatchMetadata = useMemo(
    () => ({
      source: source.trim(),
      tags,
      useSubfolderAsSource,
    }),
    [source, tags, useSubfolderAsSource],
  );

  const handleImport = useCallback(async () => {
    if (!scan || scan.newCount === 0) return;
    if (!metadata.source.trim() && !metadata.useSubfolderAsSource) {
      onError('Add a source label (e.g. Shortbox) or turn on subfolder sources.');
      return;
    }
    setImportBusy(true);
    onError(null);

    const token =
      accessTokenRef.current ??
      (await ensureZineboxGoogleDriveAccess({
        interactive: true,
        upgradeScopes: false,
      }));

    const folderName = scan.folderName;
    const newCount = scan.newCount;
    onClose();

    const job = startBlockingJob(`Importing from ${folderName}…`);
    try {
      const result = await importScannedDriveFolderPdfs(token, scan, metadata, (message) => {
        const match = message.match(/(\d+) of (\d+)/);
        if (match) {
          reportBlockingJobItemProgress(job, {
            current: Number.parseInt(match[1] ?? '0', 10),
            total: Number.parseInt(match[2] ?? '1', 10),
            detail: message.split('…').slice(1).join('…').trim() || undefined,
          });
          return;
        }
        job.updateLabel(message);
      });
      if (result.imported === 0 && newCount > 0) {
        onError(formatZineboxDriveImportError(new Error('No PDFs were downloaded.')));
        return;
      }
      const skippedNote =
        result.skipped > 0 ? ` Skipped ${result.skipped} already in your library.` : '';
      onComplete(
        `Added ${result.imported} PDF${result.imported === 1 ? '' : 's'} from ${result.folderName}.${skippedNote}`,
      );
    } catch (e) {
      onError(formatZineboxDriveImportError(e));
    } finally {
      job.end();
      setImportBusy(false);
    }
  }, [metadata, onClose, onComplete, onError, scan, startBlockingJob]);

  const interactionDisabled = scanBusy || importBusy;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!interactionDisabled) onClose();
      }}
      fullWidth
      maxWidth="sm"
      aria-labelledby="zinebox-drive-import-title"
    >
      <DialogTitle id="zinebox-drive-import-title">Review Drive import</DialogTitle>
      <DialogContent>
        {scanBusy ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 1.5
            }}>
            Scanning folder for PDFs…
          </Typography>
        ) : null}

        {scan && !scanBusy ? (
          <>
            <Alert severity="info" sx={{ mb: 2, py: 0.75 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                Found <strong>{scan.files.length}</strong> PDF{scan.files.length === 1 ? '' : 's'} in{' '}
                <strong>{scan.folderName}</strong>.
                {scan.skippedCount > 0
                  ? ` ${scan.skippedCount} already in your library will be skipped.`
                  : null}
              </Typography>
            </Alert>

            {scan.truncated ? (
              <Alert severity="warning" sx={{ mb: 2, py: 0.75 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  The scan hit a safety limit ({scan.rowsListed.toLocaleString()} Drive rows listed). Some PDFs in
                  very large folder trees may be missing — try importing subfolders separately.
                </Typography>
              </Alert>
            ) : null}

            {scan.newCount === 0 ? (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Everything in this folder is already in your library.
              </Typography>
            ) : (
              <>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    mb: 2,
                    lineHeight: 1.45
                  }}>
                  Set source and tags now. They apply to all {scan.newCount} new PDF
                  {scan.newCount === 1 ? '' : 's'} before download starts.
                </Typography>

                <TextField
                  label="Source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={interactionDisabled || useSubfolderAsSource}
                  helperText={
                    useSubfolderAsSource
                      ? 'Each comic uses its Drive subfolder name as source.'
                      : 'Shop or bundle name (shows as a library filter pill).'
                  }
                  sx={{ mb: 2 }}
                />

                <ZineboxTagsAutocomplete
                  value={tags}
                  suggestions={tagSuggestions}
                  onChange={setTags}
                  disabled={interactionDisabled}
                  helperText="Press Enter to add tags. Use these to filter large libraries later."
                  placeholder="Shortbox, 2024, minicomics…"
                />

                <FormControlLabel
                  sx={{
                    mt: 1.5,
                    ml: 0,
                    mr: 0,
                    alignItems: 'center',
                    '& .MuiCheckbox-root': { py: 0.25 },
                  }}
                  control={
                    <Checkbox
                      size="small"
                      checked={useSubfolderAsSource}
                      onChange={(e) => setUseSubfolderAsSource(e.target.checked)}
                      disabled={interactionDisabled}
                    />
                  }
                  label="Use each subfolder name as source"
                  slotProps={{ typography: { variant: 'body2' } }}
                />

                {sampleNames.length > 0 ? (
                  <Typography
                    variant="caption"
                    component="p"
                    sx={{
                      color: "text.secondary",
                      mt: 2
                    }}>
                    Sample files: {sampleNames.join(', ')}
                    {scan.files.length > sampleNames.length ? '…' : ''}
                  </Typography>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={interactionDisabled}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleImport()}
          disabled={interactionDisabled || !scan || scan.newCount === 0}
          data-testid="zinebox-drive-import-confirm"
        >
          {importBusy ? 'Starting…' : `Import ${scan?.newCount ?? 0} PDF${scan?.newCount === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
