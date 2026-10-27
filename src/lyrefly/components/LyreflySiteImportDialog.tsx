import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRef, useState, type ReactElement } from 'react';

import { fetchSiteCatalog } from '../import/lyreflySiteCatalog';
import {
  applyLyreflySiteImport,
  planLyreflySiteImport,
  type SiteImportPlan,
  type SiteImportResult,
} from '../import/lyreflySiteImport';

/** The owner's comic sites, offered as one-tap choices. Any Gatsby comics site works. */
const SUGGESTED_SITES = ['tiffatiel.com', 'slantofrain.com'];

type Step =
  | { kind: 'pick' }
  | { kind: 'reading' }
  | { kind: 'preview'; plan: SiteImportPlan }
  | { kind: 'importing'; plan: SiteImportPlan; label: string }
  | { kind: 'done'; result: SiteImportResult };

export type LyreflySiteImportDialogProps = {
  open: boolean;
  onClose: () => void;
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function PlanSummary({ plan }: { plan: SiteImportPlan }): ReactElement {
  const count = (action: string) => plan.comics.filter((c) => c.action === action).length;
  const created = count('create');
  const existing = count('update') + count('link');
  const deleted = count('skip-deleted');
  const newPublications = plan.comics.reduce((n, c) => n + (c.action === 'create' ? 0 : c.newPublications), 0);
  const newAccounts = plan.accounts.filter((a) => a.isNew).length;
  const newSeries = [...plan.series.values()].filter((s) => s.isNew);

  return (
    <ul className="lyrefly-import__summary" data-testid="lyrefly-import-summary">
      {created > 0 ? (
        <li>
          <strong>{plural(created, 'comic')}</strong> with pages, covers and publications
        </li>
      ) : null}
      {existing > 0 ? (
        <li>
          {plural(existing, 'comic')} already here
          {newPublications > 0 ? `, ${plural(newPublications, 'new publication')} to add` : ', nothing to add'}
        </li>
      ) : null}
      {deleted > 0 ? <li>{plural(deleted, 'comic')} you deleted, left out</li> : null}
      {newSeries.length > 0 ? <li>Series: {newSeries.map((s) => s.title).join(', ')}</li> : null}
      {newAccounts > 0 ? <li>{plural(newAccounts, 'account')}</li> : null}
    </ul>
  );
}

export function LyreflySiteImportDialog({ open, onClose }: LyreflySiteImportDialogProps): ReactElement {
  const [site, setSite] = useState('');
  const [personaName, setPersonaName] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [error, setError] = useState<string | null>(null);
  // Bumped on every read and on close, so a read that finishes late cannot reopen a stale preview.
  const readToken = useRef(0);

  const reset = (): void => {
    setStep({ kind: 'pick' });
    setError(null);
  };

  const close = (): void => {
    if (step.kind === 'importing') return;
    readToken.current += 1;
    onClose();
    reset();
    setSite('');
  };

  const read = async (target: string): Promise<void> => {
    const token = ++readToken.current;
    setSite(target);
    setError(null);
    setStep({ kind: 'reading' });
    try {
      const catalog = await fetchSiteCatalog(target);
      const name = catalog.personaName ?? '';
      const plan = await planLyreflySiteImport(catalog, name || catalog.host);
      if (token !== readToken.current) return;
      setPersonaName(name);
      setStep({ kind: 'preview', plan });
    } catch (e) {
      if (token !== readToken.current) return;
      setError(e instanceof Error ? e.message : 'Could not read that site.');
      setStep({ kind: 'pick' });
    }
  };

  const runImport = async (plan: SiteImportPlan): Promise<void> => {
    setError(null);
    try {
      // Re-plan with the confirmed pen name: it decides which persona the comics are credited to.
      const confirmed =
        personaName.trim() && personaName.trim() !== plan.persona.name
          ? await planLyreflySiteImport(plan.catalog, personaName.trim())
          : plan;
      setStep({ kind: 'importing', plan: confirmed, label: 'Starting…' });
      const result = await applyLyreflySiteImport(confirmed, {
        onProgress: (label) => setStep({ kind: 'importing', plan: confirmed, label }),
      });
      setStep({ kind: 'done', result });
    } catch (e) {
      // Comics that finished are complete and keyed by the site. Re-plan so the preview shows what
      // is left, and running the import again finishes the rest.
      setError(e instanceof Error ? `${e.message} Run the import again to finish.` : 'Import stopped.');
      setStep({ kind: 'preview', plan: await planLyreflySiteImport(plan.catalog, personaName.trim() || plan.persona.name) });
    }
  };

  const nothingToDo =
    step.kind === 'preview' &&
    step.plan.comics.every((c) => c.action === 'skip-deleted' || (c.action !== 'create' && c.newPublications === 0)) &&
    step.plan.accounts.every((a) => !a.isNew);

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs" data-testid="lyrefly-import-dialog">
      <DialogTitle>Import from a website</DialogTitle>
      <DialogContent>
        {step.kind === 'pick' || step.kind === 'reading' ? (
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {SUGGESTED_SITES.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  variant="outlined"
                  onClick={() => void read(s)}
                  disabled={step.kind === 'reading'}
                />
              ))}
            </Stack>
            <TextField
              size="small"
              label="Or paste a site address"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && site.trim()) void read(site.trim());
              }}
              disabled={step.kind === 'reading'}
            />
            {step.kind === 'reading' ? <LinearProgress aria-label="Reading the site" /> : null}
          </Stack>
        ) : null}

        {step.kind === 'preview' || step.kind === 'importing' ? (
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField
              size="small"
              label="Credit these comics to"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              disabled={step.kind === 'importing'}
              helperText={step.plan.persona.isNew ? 'New pen name' : 'Pen name you already have'}
            />
            <PlanSummary plan={step.plan} />
            {step.kind === 'importing' ? (
              <div className="lyrefly-import__progress" role="status">
                <LinearProgress />
                <span>{step.label}</span>
              </div>
            ) : null}
          </Stack>
        ) : null}

        {step.kind === 'done' ? (
          <p className="lyrefly-import__done" role="status" data-testid="lyrefly-import-done">
            {[
              step.result.created ? `Added ${plural(step.result.created, 'comic')}.` : '',
              step.result.updated + step.result.linked
                ? `Updated ${plural(step.result.updated + step.result.linked, 'comic')}.`
                : '',
              step.result.skippedDeleted ? `Left out ${plural(step.result.skippedDeleted, 'deleted comic')}.` : '',
            ]
              .filter(Boolean)
              .join(' ') || 'Everything was already here.'}
          </p>
        ) : null}

        {error ? (
          <Typography className="lyrefly-import__error" role="alert" color="error" variant="body2">
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        {step.kind === 'done' ? (
          <Button onClick={close} variant="contained">
            Done
          </Button>
        ) : (
          <>
            <Button onClick={step.kind === 'preview' ? reset : close} disabled={step.kind === 'importing'}>
              {step.kind === 'preview' ? 'Back' : 'Cancel'}
            </Button>
            {step.kind === 'preview' || step.kind === 'importing' ? (
              <Button
                variant="contained"
                disabled={step.kind === 'importing' || nothingToDo || !personaName.trim()}
                onClick={() => step.kind === 'preview' && void runImport(step.plan)}
                data-testid="lyrefly-import-confirm"
              >
                {nothingToDo ? 'Nothing new' : 'Import'}
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={step.kind === 'reading' || !site.trim()}
                onClick={() => void read(site.trim())}
              >
                Read site
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
