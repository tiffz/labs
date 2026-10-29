import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, useState, type ReactElement } from 'react';

import {
  LyreflyMergeError,
  mergeLyreflyWork,
  planLyreflyWorkMerge,
  type LyreflyWorkMergePlan,
} from '../db/lyreflyMergeWorks';
import { useLyreflyProjects } from '../hooks/useLyreflyProjects';
import { lyreflyProjectHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import type { ComicProject } from '../types';

/**
 * Merge this comic into another (ADR 0031). Pick the comic it belongs to, see what it gains, then
 * confirm. The merged-away comic is archived with a pointer, never deleted.
 */
export function LyreflyMergeWorkDialog({
  source,
  open,
  onClose,
}: {
  source: ComicProject;
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const { projects } = useLyreflyProjects();
  const [targetId, setTargetId] = useState('');
  const [plan, setPlan] = useState<LyreflyWorkMergePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const targets = useMemo(
    () =>
      projects
        .filter((p) => p.id !== source.id && !p.mergedIntoId)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [projects, source.id],
  );

  // The latest pick wins: an older plan arriving late is dropped.
  const latestPick = useRef('');
  const pick = (id: string): void => {
    latestPick.current = id;
    setTargetId(id);
    setPlan(null);
    setError(null);
    if (!id) return;
    planLyreflyWorkMerge(source.id, id).then(
      (next) => {
        if (latestPick.current === id) setPlan(next);
      },
      (e: unknown) => {
        if (!(e instanceof LyreflyMergeError)) throw e;
        if (latestPick.current === id) setError(e.message);
      },
    );
  };

  const close = (): void => {
    pick('');
    onClose();
  };

  const confirm = async (): Promise<void> => {
    if (!plan) return;
    setBusy(true);
    try {
      const target = await mergeLyreflyWork(plan);
      close();
      navigateLyreflyHash(lyreflyProjectHref(target.id));
    } finally {
      setBusy(false);
    }
  };

  const targetTitle = targets.find((t) => t.id === targetId)?.title;

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth data-testid="lyrefly-merge-dialog">
      <DialogTitle>Merge {source.title || 'this comic'}</DialogTitle>
      <DialogContent>
        <TextField
          select
          fullWidth
          size="small"
          label="Into"
          value={targetId}
          onChange={(e) => pick(e.target.value)}
          sx={{ mt: 1 }}
        >
          {targets.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.title || 'Untitled'}
            </MenuItem>
          ))}
        </TextField>
        {error ? (
          <Typography variant="body2" role="alert" sx={{ mt: 2, color: 'error.main' }}>
            {error}
          </Typography>
        ) : null}
        {plan ? (
          <Typography variant="body2" sx={{ mt: 2 }} data-testid="lyrefly-merge-summary">
            {plan.summary.length
              ? `${targetTitle} gains: ${plan.summary.join(', ')}.`
              : `${source.title} has nothing to carry over.`}{' '}
            {source.title} is then archived, not deleted.
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button variant="contained" disabled={!plan || busy} onClick={() => void confirm()}>
          Merge
        </Button>
      </DialogActions>
    </Dialog>
  );
}
