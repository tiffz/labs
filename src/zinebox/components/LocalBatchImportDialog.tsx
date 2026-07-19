import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLabsBlockingJobs } from '../../shared/jobs/LabsBlockingJobContext';
import { reportBlockingJobItemProgress } from '../../shared/jobs/labsBlockingJobItemProgress';
import { importLocalPdfFiles } from '../drive/importLocalPdfs';
import type { LocalFilesScanResult } from '../drive/scanLocalFilesForImport';
import { scanLocalFilesForImport } from '../drive/scanLocalFilesForImport';
import type { ZineboxImportBatchMetadata } from '../drive/zineboxImportMetadata';
import ZineboxTagsAutocomplete from './ZineboxTagsAutocomplete';

type LocalBatchImportDialogProps = {
  open: boolean;
  files: File[];
  tagSuggestions: readonly string[];
  onClose: () => void;
  onComplete: (summary: string) => void;
  onError: (message: string | null) => void;
};

export default function LocalBatchImportDialog({
  open,
  files,
  tagSuggestions,
  onClose,
  onComplete,
  onError,
}: LocalBatchImportDialogProps): React.ReactElement {
  const { startBlockingJob } = useLabsBlockingJobs();
  const [scan, setScan] = useState<LocalFilesScanResult | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [source, setSource] = useState('Local');
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  onCloseRef.current = onClose;
  onErrorRef.current = onError;

  const filesKey = useMemo(
    () => files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join('|'),
    [files],
  );

  useEffect(() => {
    if (!open) {
      setScan(null);
      setScanBusy(false);
      setSource('Local');
      setTags([]);
      setBusy(false);
      return;
    }

    let cancelled = false;
    const runScan = async () => {
      setScanBusy(true);
      onErrorRef.current(null);
      try {
        const result = await scanLocalFilesForImport(files);
        if (cancelled) return;
        if (result.totalPdfCount === 0) {
          onErrorRef.current('No PDF files were found. Try again with .pdf files.');
          onCloseRef.current();
          return;
        }
        setScan(result);
      } catch (e) {
        if (cancelled) return;
        onErrorRef.current(e instanceof Error ? e.message : 'Could not scan those files.');
        onCloseRef.current();
      } finally {
        if (!cancelled) setScanBusy(false);
      }
    };
    void runScan();
    return () => {
      cancelled = true;
    };
  }, [files, filesKey, open]);

  const metadata: ZineboxImportBatchMetadata = useMemo(
    () => ({
      source: source.trim() || 'Local',
      tags,
      useSubfolderAsSource: false,
    }),
    [source, tags],
  );

  const handleImport = useCallback(async () => {
    if (!scan || scan.newCount === 0) return;
    setBusy(true);
    onError(null);
    const newCount = scan.newCount;
    onClose();

    const job = startBlockingJob(`Importing ${newCount} PDF${newCount === 1 ? '' : 's'}…`);
    try {
      const result = await importLocalPdfFiles(scan.files, metadata, {
        skipDedup: true,
        onProgress: (progress) => reportBlockingJobItemProgress(job, progress),
      });
      const skippedNote =
        result.skipped > 0 ? ` Skipped ${result.skipped} already in your library.` : '';
      onComplete(`Added ${result.imported} PDF${result.imported === 1 ? '' : 's'}.${skippedNote}`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not import those PDFs.');
    } finally {
      job.end();
      setBusy(false);
    }
  }, [metadata, onClose, onComplete, onError, scan, startBlockingJob]);

  const interactionDisabled = scanBusy || busy;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!interactionDisabled) onClose();
      }}
      fullWidth
      maxWidth="sm"
      aria-labelledby="zinebox-local-import-title"
    >
      <DialogTitle id="zinebox-local-import-title">Review import</DialogTitle>
      <DialogContent>
        {scanBusy ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 1.5
            }}>
            Checking for duplicates…
          </Typography>
        ) : null}

        {scan && !scanBusy ? (
          <>
            <Alert severity="info" sx={{ mb: 2, py: 0.75 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                Found <strong>{scan.totalPdfCount}</strong> PDF{scan.totalPdfCount === 1 ? '' : 's'}.
                {scan.skippedCount + scan.skippedBatchCount > 0
                  ? ` ${scan.skippedCount + scan.skippedBatchCount} duplicate${
                      scan.skippedCount + scan.skippedBatchCount === 1 ? '' : 's'
                    } will be skipped.`
                  : null}
              </Typography>
            </Alert>

            {scan.newCount === 0 ? (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Everything in this batch is already in your library.
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
                  Set source and tags for {scan.newCount} new PDF{scan.newCount === 1 ? '' : 's'} before they are
                  added.
                </Typography>
                <TextField
                  label="Source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={interactionDisabled}
                  helperText="Shop or bundle name (shows as a library filter pill)."
                  sx={{ mb: 2 }}
                />
                <ZineboxTagsAutocomplete
                  value={tags}
                  suggestions={tagSuggestions}
                  onChange={setTags}
                  disabled={interactionDisabled}
                  placeholder="Shortbox, anthology, 2024…"
                />
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
        >
          {busy ? 'Importing…' : `Import ${scan?.newCount ?? 0} PDF${scan?.newCount === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
