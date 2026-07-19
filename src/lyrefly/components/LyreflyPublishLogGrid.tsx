import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState, type ChangeEvent, type ReactElement } from 'react';

import type { ComicArchiveBinder, ComicProject, PublishLogEntry } from '../types';
import {
  addPublishLogEntry,
  ensureLyreflyArchive,
  updatePublishLogEntry,
} from '../db/lyreflyProjectMutations';
import { inferPublishPlatformFromUrl } from '../utils/inferPublishPlatform';
import { dateInputValueToIso, earliestPublishDateIso, formatPublishDateDisplay, isoToDateInputValue, todayDateInputValue } from '../utils/publishDateUtils';
import { PublishDateChip } from './PublishDateChip';
import { PublishPlatformIcon } from './PublishPlatformIcon';

export type LyreflyPublishLogGridProps = {
  project: ComicProject;
  archive: ComicArchiveBinder | null;
  archiveHydrated: boolean;
  onArchiveChange: (archive: ComicArchiveBinder) => void;
};

type PublishLogCardProps = {
  entry: PublishLogEntry;
  onDateChange: (entryId: string, iso: string) => void;
};

function PublishLogCard({ entry, onDateChange }: PublishLogCardProps): ReactElement {
  return (
    <article className="lyrefly-publish-card" data-testid={`lyrefly-publish-entry-${entry.id}`}>
      {entry.url ? (
        <a
          className="lyrefly-publish-card__platform-link"
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          title={entry.url}
        >
          <span className="lyrefly-publish-card__icon" aria-hidden>
            <PublishPlatformIcon platform={entry.platform} />
          </span>
          <span className="lyrefly-publish-card__platform">{entry.platform}</span>
          <OpenInNewIcon className="lyrefly-publish-card__external" fontSize="inherit" aria-hidden />
        </a>
      ) : (
        <div className="lyrefly-publish-card__row">
          <span className="lyrefly-publish-card__icon" aria-hidden>
            <PublishPlatformIcon platform={entry.platform} />
          </span>
          <span className="lyrefly-publish-card__platform">{entry.platform}</span>
        </div>
      )}
      <div className="lyrefly-publish-card__date-row">
        <span className="lyrefly-publish-card__date-label">Published</span>
        <PublishDateChip
          isoValue={entry.publishedAt}
          ariaLabel={`Published date for ${entry.platform}`}
          onCommit={(iso) => onDateChange(entry.id, iso)}
        />
      </div>
    </article>
  );
}

export function LyreflyPublishLogGrid({
  project,
  archive,
  archiveHydrated,
  onArchiveChange,
}: LyreflyPublishLogGridProps): ReactElement {
  const [localArchive, setLocalArchive] = useState<ComicArchiveBinder | null>(archive);
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [platform, setPlatform] = useState('');
  const [platformTouched, setPlatformTouched] = useState(false);
  const [url, setUrl] = useState('');
  const [publishedDate, setPublishedDate] = useState(todayDateInputValue());
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

  const onUrlChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextUrl = event.target.value;
    setUrl(nextUrl);
    if (platformTouched) return;
    const inferred = inferPublishPlatformFromUrl(nextUrl);
    if (inferred) setPlatform(inferred.platform);
  };

  const closeAddMenu = (): void => {
    setAddAnchor(null);
    setPlatform('');
    setPlatformTouched(false);
    setUrl('');
    setPublishedDate(todayDateInputValue());
  };

  const onAddEntry = async (): Promise<void> => {
    const resolvedPlatform =
      platform.trim() || inferPublishPlatformFromUrl(url)?.platform || '';
    if (!resolvedPlatform) return;
    setBusy(true);
    try {
      const binder = localArchive ?? (await ensureLyreflyArchive(project));
      const updated = await addPublishLogEntry(binder, {
        platform: resolvedPlatform,
        publishedAt: dateInputValueToIso(publishedDate),
        url: url.trim() || undefined,
      });
      persistArchive(updated);
      closeAddMenu();
    } finally {
      setBusy(false);
    }
  };

  const onDateChange = async (entryId: string, iso: string): Promise<void> => {
    if (!localArchive) return;
    const updated = await updatePublishLogEntry(localArchive, entryId, { publishedAt: iso });
    persistArchive(updated);
  };

  const canSave = Boolean(platform.trim() || inferPublishPlatformFromUrl(url));
  const publishLog = localArchive?.publishLog;
  const entries = publishLog ?? [];
  const firstPublishedIso = useMemo(() => earliestPublishDateIso(publishLog ?? []), [publishLog]);
  const addOpen = Boolean(addAnchor);

  return (
    <Box className="lyrefly-publish-log" data-testid="lyrefly-publish-log">
      <Typography component="h3" className="lyrefly-section-eyebrow">
        Publications
      </Typography>
      {firstPublishedIso ? (
        <Typography
          variant="body2"
          className="lyrefly-profile-first-published"
          data-testid="lyrefly-first-published"
          sx={{
            color: "text.secondary"
          }}
        >
          First published {formatPublishDateDisplay(firstPublishedIso)}
        </Typography>
      ) : null}
      <ul className="lyrefly-publish-grid">
        {entries.map((entry) => (
          <li key={entry.id} className="lyrefly-publish-grid__item">
            <PublishLogCard entry={entry} onDateChange={(id, iso) => void onDateChange(id, iso)} />
          </li>
        ))}
        <li className="lyrefly-publish-grid__item">
          <button
            type="button"
            className="lyrefly-publish-card lyrefly-publish-card--add"
            aria-haspopup="menu"
            aria-expanded={addOpen}
            data-testid="lyrefly-publish-add-card"
            onClick={(event) => setAddAnchor(event.currentTarget)}
          >
            <AddIcon fontSize="small" aria-hidden />
            <span>Add</span>
          </button>
        </li>
      </ul>
      <Menu
        anchorEl={addAnchor}
        open={addOpen}
        onClose={closeAddMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { className: 'lyrefly-publish-add-menu', sx: { width: 'min(22rem, 92vw)', p: 1.5 } } }}
        data-testid="lyrefly-publish-add-menu"
      >
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
          New publication
        </Typography>
        <Stack spacing={1}>
          <TextField
            label="URL"
            value={url}
            onChange={onUrlChange}
            size="small"
            fullWidth
            placeholder="https://tapas.io/series/…"
          />
          <TextField
            label="Platform"
            value={platform}
            onChange={(e) => {
              setPlatformTouched(true);
              setPlatform(e.target.value);
            }}
            size="small"
            fullWidth
          />
          <div className="lyrefly-publish-add-menu__date">
            <span className="lyrefly-publish-card__date-label">Published</span>
            <PublishDateChip
              isoValue={dateInputValueToIso(publishedDate)}
              ariaLabel="Published date for new publication"
              onCommit={(iso) => setPublishedDate(isoToDateInputValue(iso))}
            />
          </div>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              justifyContent: "flex-end",
              pt: 0.5
            }}>
            <Button size="small" variant="text" onClick={closeAddMenu}>
              Cancel
            </Button>
            <Button size="small" variant="contained" disabled={busy || !canSave} onClick={() => void onAddEntry()}>
              Save
            </Button>
          </Stack>
        </Stack>
      </Menu>
    </Box>
  );
}
