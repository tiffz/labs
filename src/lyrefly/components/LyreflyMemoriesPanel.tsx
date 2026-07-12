import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type ChangeEvent, type ReactElement } from 'react';

import type { ComicArchiveBinder, ComicProject, PressMemorabiliaEntry } from '../types';
import {
  addPressMemorabiliaEntry,
  deletePressMemorabiliaEntry,
  ensureLyreflyArchive,
} from '../db/lyreflyProjectMutations';
import { inferMemoryTitleFromUrl, normalizeMemoryUrl } from '../utils/inferMemoryTitleFromUrl';
import { parsePublishDateText } from '../utils/publishDateUtils';

export type LyreflyMemoriesPanelProps = {
  project: ComicProject;
  archive: ComicArchiveBinder | null;
  archiveHydrated: boolean;
  onArchiveChange: (archive: ComicArchiveBinder) => void;
};

function formatMemoryDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function MemoryCard({
  entry,
  onDelete,
}: {
  entry: PressMemorabiliaEntry;
  onDelete: (entryId: string) => void;
}): ReactElement {
  const when = formatMemoryDate(entry.occurredAt);
  const titleBody = entry.url ? (
    <a
      className="lyrefly-memory-card__title-link"
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      title={entry.url}
    >
      {entry.title}
      <OpenInNewIcon className="lyrefly-memory-card__external" fontSize="inherit" aria-hidden />
    </a>
  ) : (
    entry.title
  );

  return (
    <article className="lyrefly-memory-card" data-testid={`lyrefly-memory-${entry.id}`}>
      <IconButton
        size="small"
        aria-label={`Delete memory ${entry.title}`}
        onClick={() => onDelete(entry.id)}
        className="lyrefly-memory-card__delete"
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
      <Typography component="h4" className="lyrefly-memory-card__title">
        {titleBody}
      </Typography>
      {when ? (
        <div className="lyrefly-memory-card__date-row">
          <span className="lyrefly-publish-card__date-label">When</span>
          <span className="lyrefly-memory-card__date">{when}</span>
        </div>
      ) : null}
      {entry.markdown.trim() ? (
        <Typography component="p" className="lyrefly-memory-card__body">
          {entry.markdown.trim()}
        </Typography>
      ) : null}
    </article>
  );
}

export function LyreflyMemoriesPanel({
  project,
  archive,
  archiveHydrated,
  onArchiveChange,
}: LyreflyMemoriesPanelProps): ReactElement {
  const [localArchive, setLocalArchive] = useState<ComicArchiveBinder | null>(archive);
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocalArchive(archive);
  }, [archive]);

  useEffect(() => {
    if (!archiveHydrated) return;
    if (localArchive) return;
    void ensureLyreflyArchive(project).then((binder) => {
      setLocalArchive(binder);
      onArchiveChange(binder);
    });
  }, [archiveHydrated, localArchive, onArchiveChange, project]);

  const persistArchive = (next: ComicArchiveBinder): void => {
    setLocalArchive(next);
    onArchiveChange(next);
  };

  const closeAddMenu = (): void => {
    setAddAnchor(null);
    setUrl('');
    setTitle('');
    setTitleTouched(false);
    setNotes('');
    setOccurredOn('');
  };

  const onUrlChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextUrl = event.target.value;
    setUrl(nextUrl);
    if (titleTouched) return;
    const inferred = inferMemoryTitleFromUrl(nextUrl);
    if (inferred) setTitle(inferred);
  };

  const resolvedTitle = (): string => title.trim() || inferMemoryTitleFromUrl(url);

  const onAddMemory = async (): Promise<void> => {
    const memoryTitle = resolvedTitle();
    if (!memoryTitle) return;
    setBusy(true);
    try {
      const binder = localArchive ?? (await ensureLyreflyArchive(project));
      const occurredAt = occurredOn.trim() ? parsePublishDateText(occurredOn) ?? undefined : undefined;
      const normalizedUrl = normalizeMemoryUrl(url);
      const updated = await addPressMemorabiliaEntry(binder, {
        title: memoryTitle,
        markdown: notes.trim(),
        url: normalizedUrl,
        occurredAt,
      });
      persistArchive(updated);
      closeAddMenu();
    } finally {
      setBusy(false);
    }
  };

  const onDeleteMemory = async (entryId: string): Promise<void> => {
    if (!localArchive) return;
    const updated = await deletePressMemorabiliaEntry(localArchive, entryId);
    persistArchive(updated);
  };

  const entries = localArchive?.pressEntries ?? [];
  const addOpen = Boolean(addAnchor);
  const canSave = Boolean(resolvedTitle());

  return (
    <Box className="lyrefly-memories" data-testid="lyrefly-memories">
      <Typography component="h3" className="lyrefly-section-eyebrow">
        Memories
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        className="lyrefly-panel-helper"
        sx={{ mb: 1.25, lineHeight: 1.55, maxWidth: '40rem' }}
      >
        Press mentions, fan mail, classroom captions, and other moments worth keeping with this comic.
      </Typography>

      <ul className="lyrefly-publish-grid lyrefly-memories__grid">
        {entries.map((entry) => (
          <li key={entry.id} className="lyrefly-publish-grid__item">
            <MemoryCard entry={entry} onDelete={(id) => void onDeleteMemory(id)} />
          </li>
        ))}
        <li className="lyrefly-publish-grid__item">
          <button
            type="button"
            className="lyrefly-publish-card lyrefly-publish-card--add"
            aria-haspopup="menu"
            aria-expanded={addOpen}
            data-testid="lyrefly-memory-add"
            onClick={(event) => setAddAnchor(event.currentTarget)}
          >
            <AddIcon fontSize="small" aria-hidden />
            <span>Add</span>
          </button>
        </li>
      </ul>

      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" className="lyrefly-memories__empty-hint">
          No memories saved yet. Use Add to capture press, fan mail, or classroom moments.
        </Typography>
      ) : null}

      <Menu
        anchorEl={addAnchor}
        open={addOpen}
        onClose={closeAddMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { className: 'lyrefly-memory-add-menu', sx: { width: 'min(24rem, 92vw)', p: 1.5 } } }}
        data-testid="lyrefly-memory-add-menu"
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', mb: 1 }}
        >
          New memory
        </Typography>
        <Stack spacing={1}>
          <TextField
            label="URL (optional)"
            value={url}
            onChange={onUrlChange}
            size="small"
            fullWidth
            placeholder="https://…"
          />
          <TextField
            label="Title"
            value={title}
            onChange={(e) => {
              setTitleTouched(true);
              setTitle(e.target.value);
            }}
            size="small"
            fullWidth
            placeholder="Class caption results, fan mail, press feature…"
          />
          <TextField
            label="When (optional)"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            size="small"
            fullWidth
            placeholder="YYYY-MM-DD"
          />
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={3}
            placeholder="Quotes, who sent it, what happened…"
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 0.5 }}>
            <Button size="small" variant="text" onClick={closeAddMenu}>
              Cancel
            </Button>
            <Button size="small" variant="contained" disabled={busy || !canSave} onClick={() => void onAddMemory()}>
              Save
            </Button>
          </Stack>
        </Stack>
      </Menu>
    </Box>
  );
}
