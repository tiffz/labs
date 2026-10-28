import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';

import { ensureLyreflyGoogleDriveAccess } from '../drive/lyreflyGoogleDriveAccess';
import {
  applyLyreflyBundleImport,
  bundlePiecesToUpload,
  type LyreflyBundlePlan,
  type LyreflyBundleResult,
} from '../import/lyreflyBundleImport';

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export type LyreflyBundleImportDialogProps = {
  /** The previewed import; the dialog is open while this is set. */
  plan: LyreflyBundlePlan | null;
  onClose: () => void;
};

/** Preview a bundle, then import it on confirm (ADR 0030: nothing is written before Import). */
export function LyreflyBundleImportDialog({ plan, onClose }: LyreflyBundleImportDialogProps): ReactElement {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LyreflyBundleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const close = (): void => {
    if (busy) return;
    setResult(null);
    setError(null);
    setProgress(null);
    onClose();
  };

  const run = async (): Promise<void> => {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      // Sign in first, while the click still counts as the user's: a popup opened later is blocked.
      const token = toUpload > 0 ? await ensureLyreflyGoogleDriveAccess({ interactive: true }) : null;
      setResult(
        await applyLyreflyBundleImport(plan, {
          getAccessToken: token ? async () => token : undefined,
          onProgress: setProgress,
        }),
      );
    } catch (e) {
      // Every row is keyed and written as it lands, so a re-run finishes the rest.
      setError(e instanceof Error ? `${e.message} Import the file again to finish.` : 'Import stopped.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const created = plan?.comics.filter((c) => c.action === 'create').length ?? 0;
  const existing = (plan?.comics.length ?? 0) - created;
  const queued = plan?.comics.filter((c) => c.comic.pipelineStatus && c.comic.pipelineStatus !== 'complete').length ?? 0;
  const newIdeas = plan?.seeds.filter((s) => s.action === 'create').length ?? 0;
  const deletedIdeas = plan?.seeds.filter((s) => s.action === 'deleted').length ?? 0;
  const toUpload = plan ? bundlePiecesToUpload(plan) : 0;
  const collectionLines = (plan?.collections ?? []).flatMap(({ collection, action, pieces }) => {
    if (action === 'deleted') return [`${collection.title}: you deleted it, left out`];
    const adding = pieces.filter((p) => p.action === 'create').length;
    const missing = pieces.filter((p) => p.action === 'missing').length;
    if (adding === 0 && missing === 0) return [];
    const where = collection.status === 'archived' ? ' (archived)' : '';
    return [
      `${collection.title}${where}: ${plural(adding, 'image')} to upload` +
        (missing > 0 ? `, ${missing} not picked with the file` : ''),
    ];
  });
  const nothingNew = created === 0 && newIdeas === 0 && existing === 0 && toUpload === 0;

  return (
    <Dialog open={Boolean(plan)} onClose={close} fullWidth maxWidth="xs" data-testid="lyrefly-bundle-dialog">
      <DialogTitle>Import from {plan?.bundle.source ?? 'a file'}</DialogTitle>
      <DialogContent>
        {result ? (
          <p className="lyrefly-import__done" role="status" data-testid="lyrefly-bundle-done">
            {[
              result.comicsCreated ? `Added ${plural(result.comicsCreated, 'comic')}.` : '',
              result.comicsUpdated ? `Filled in ${plural(result.comicsUpdated, 'comic')} you already had.` : '',
              result.ideasAdded ? `Added ${plural(result.ideasAdded, 'idea')} to the Sketchbook.` : '',
              result.piecesAdded ? `Added ${plural(result.piecesAdded, 'image')} to collections.` : '',
            ]
              .filter(Boolean)
              .join(' ') || 'Everything was already here.'}
          </p>
        ) : (
          <ul className="lyrefly-import__summary" data-testid="lyrefly-bundle-summary">
            {created > 0 ? (
              <li>
                <strong>{plural(created, 'comic')}</strong>
                {queued > 0 ? `, ${queued} in your queue with their stage` : ''}
              </li>
            ) : null}
            {existing > 0 ? <li>{plural(existing, 'comic')} you already have: gaps filled, your edits kept</li> : null}
            {newIdeas > 0 ? <li>{plural(newIdeas, 'idea')} for the Sketchbook</li> : null}
            {deletedIdeas > 0 ? <li>{plural(deletedIdeas, 'idea')} you deleted, left out</li> : null}
            {collectionLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
            {nothingNew ? <li>Nothing new in this file.</li> : null}
          </ul>
        )}
        {progress ? (
          <p className="lyrefly-import__progress" role="status" data-testid="lyrefly-bundle-progress">
            {progress}
          </p>
        ) : null}
        {error ? (
          <Typography className="lyrefly-import__error" role="alert" color="error" variant="body2">
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button variant="contained" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void run()}
              disabled={busy || nothingNew}
              data-testid="lyrefly-bundle-confirm"
            >
              Import
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
