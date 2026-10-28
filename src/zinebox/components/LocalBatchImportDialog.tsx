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
import { stagedSourceName, type LabsStagedUploadSource } from '../../shared/upload/stagedUploads';
import { useLabsStagedUploads } from '../../shared/upload/useLabsStagedUploads';
import { importLocalPdfFiles } from '../drive/importLocalPdfs';
import type { LocalFilesScanResult } from '../drive/scanLocalFilesForImport';
import { scanLocalFilesForImport } from '../drive/scanLocalFilesForImport';
import type { ZineboxImportBatchMetadata } from '../drive/zineboxImportMetadata';
import ZineboxTagsAutocomplete from './ZineboxTagsAutocomplete';

const NO_PDFS = 'No PDF files were found. Try again with .pdf files.';

/**
 * The batch's check (ADR 0030): which PDFs are new and which are already in the library. Writes
 * nothing; "Import" is the confirm.
 */
async function inspectLocalPdfBatch(source: LabsStagedUploadSource) {
  const name = stagedSourceName(source);
  if (source.kind !== 'batch') return { ok: false as const, name, message: NO_PDFS };
  try {
    const plan = await scanLocalFilesForImport(source.files);
    if (plan.totalPdfCount === 0) return { ok: false as const, name, message: NO_PDFS };
    return {
      ok: true as const,
      name,
      mimeType: 'application/pdf',
      sizeBytes: null,
      outcome: `${plan.newCount} new`,
      plan,
    };
  } catch (e) {
    return { ok: false as const, name, message: e instanceof Error ? e.message : 'Could not scan those files.' };
  }
}

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
  /* The picked PDFs stage as one batch: the review is about the batch, not each file. */
  const staged = useLabsStagedUploads<LocalFilesScanResult>({ inspect: inspectLocalPdfBatch });
  const { stageBatch, clear: clearStaged } = staged;
  const batch = staged.items[0];
  const scan = batch?.status === 'ready' ? batch.plan : null;
  const scanBusy = batch?.status === 'checking';
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
    clearStaged();
    if (!open) {
      setSource('Local');
      setTags([]);
      setBusy(false);
      return;
    }
    onErrorRef.current(null);
    stageBatch('PDFs', files);
  }, [files, filesKey, open, stageBatch, clearStaged]);

  /* A batch with nothing to import closes the dialog and says why, as it always has. */
  const refusal = batch?.status === 'rejected' ? batch.message : null;
  useEffect(() => {
    if (!refusal) return;
    onErrorRef.current(refusal);
    onCloseRef.current();
  }, [refusal]);

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
      await staged.confirm(async () => {
        const result = await importLocalPdfFiles(scan.files, metadata, {
          skipDedup: true,
          onProgress: (progress) => reportBlockingJobItemProgress(job, progress),
        });
        const skippedNote =
          result.skipped > 0 ? ` Skipped ${result.skipped} already in your library.` : '';
        onComplete(`Added ${result.imported} PDF${result.imported === 1 ? '' : 's'}.${skippedNote}`);
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not import those PDFs.');
    } finally {
      job.end();
      setBusy(false);
    }
  }, [metadata, onClose, onComplete, onError, scan, staged, startBlockingJob]);

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
