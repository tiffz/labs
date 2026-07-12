import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, useState, type ChangeEvent, type ReactElement } from 'react';

import AppTooltip from '../../shared/components/AppTooltip';
import type { ComicArtVersion, ComicProject, PageNode, PageRevision } from '../types';
import {
  applyComicArtVersion,
  captureComicArtVersion,
  deleteComicArtVersion,
  importComicArtVersionFromFiles,
  reorderArtVersion,
  setFinalArtVersion,
  updateComicArtVersion,
} from '../db/lyreflyArtVersionMutations';
import {
  artVersionSourceLabel,
  buildPageRevisionMapFromNodes,
  orderArtVersions,
  type ArtVersionViewId,
} from '../utils/artVersionUtils';
import { PAGE_IMAGE_ACCEPT } from './ArtPageGrid';
import { LyreflyComicBookPreviewDialog } from './LyreflyComicBookPreviewDialog';
import { LyreflyComicReaderDialog } from './LyreflyComicReaderDialog';
import { PublishDateChip } from './PublishDateChip';

export type ArtVersionPanelProps = {
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  artVersions: ComicArtVersion[];
  viewingVersionId: ArtVersionViewId;
  onViewingVersionChange: (versionId: ArtVersionViewId) => void;
  onProjectChange: (project: ComicProject) => void;
};

type PreviewKind = 'book' | 'scroll';

export function ArtVersionPanel({
  project,
  pageNodes,
  revisions,
  artVersions,
  viewingVersionId,
  onViewingVersionChange,
  onProjectChange,
}: ArtVersionPanelProps): ReactElement {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [previewVersion, setPreviewVersion] = useState<ComicArtVersion | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [scrollOpen, setScrollOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');

  const orderedVersions = useMemo(
    () => orderArtVersions(project, artVersions),
    [artVersions, project],
  );
  const selectedVersion = useMemo(
    () => orderedVersions.find((version) => version.id === viewingVersionId),
    [orderedVersions, viewingVersionId],
  );
  const currentPickCount = useMemo(
    () => Object.keys(buildPageRevisionMapFromNodes(pageNodes)).length,
    [pageNodes],
  );

  const openPreview = (version: ComicArtVersion, kind: PreviewKind): void => {
    setPreviewVersion(version);
    if (kind === 'book') setBookOpen(true);
    else setScrollOpen(true);
  };

  const onSnapshot = async (): Promise<void> => {
    setBusy(true);
    setStatus(null);
    try {
      const { project: next, version } = await captureComicArtVersion(project, pageNodes, revisions);
      onProjectChange(next);
      onViewingVersionChange(version.id);
      setStatus('Snapshot saved from the page picks shown below.');
    } finally {
      setBusy(false);
    }
  };

  const onUploadInput = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await importComicArtVersionFromFiles(project, pageNodes, files);
      onProjectChange(result.project);
      onViewingVersionChange(result.version.id);
      const extra =
        result.skippedFileCount > 0
          ? ` ${result.skippedFileCount} file${result.skippedFileCount === 1 ? '' : 's'} did not match a page on the grid.`
          : '';
      setStatus(
        `Matched ${result.matchedPageCount} page${result.matchedPageCount === 1 ? '' : 's'} as "${result.version.label}". Your current page picks were not changed.${extra}`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const onApplyToPicks = async (): Promise<void> => {
    if (!selectedVersion) return;
    setBusy(true);
    try {
      await applyComicArtVersion(selectedVersion, pageNodes);
      onViewingVersionChange('current');
      setStatus(`Applied "${selectedVersion.label}" to your current page picks.`);
    } finally {
      setBusy(false);
    }
  };

  const onToggleFinal = async (): Promise<void> => {
    if (!selectedVersion) return;
    setBusy(true);
    try {
      const isFinal = project.finalArtVersionId === selectedVersion.id;
      const next = await setFinalArtVersion(project, isFinal ? undefined : selectedVersion.id);
      onProjectChange(next);
    } finally {
      setBusy(false);
    }
  };

  const onDeleteVersion = async (): Promise<void> => {
    if (!selectedVersion) return;
    setDeleteOpen(false);
    setBusy(true);
    try {
      const next = await deleteComicArtVersion(project, selectedVersion.id);
      onProjectChange(next);
      onViewingVersionChange('current');
      setStatus(`Removed version "${selectedVersion.label}". Page art on the grid was not deleted.`);
    } finally {
      setBusy(false);
    }
  };

  const onReorder = async (direction: 'earlier' | 'later'): Promise<void> => {
    if (!selectedVersion) return;
    setMenuAnchor(null);
    setBusy(true);
    try {
      const next = await reorderArtVersion(project, selectedVersion.id, direction);
      onProjectChange(next);
    } finally {
      setBusy(false);
    }
  };

  const onSaveEdit = async (): Promise<void> => {
    if (!selectedVersion) return;
    setBusy(true);
    try {
      await updateComicArtVersion(selectedVersion, { label: labelDraft, notes: notesDraft });
      setEditOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const previewRevisionMap = previewVersion?.pageRevisions;
  const canUploadSet = pageNodes.length > 0;
  const canSnapshot = currentPickCount > 0;
  const selectedIndex = selectedVersion
    ? (project.artVersionIds ?? []).indexOf(selectedVersion.id)
    : -1;

  return (
    <Box className="lyrefly-art-versions" data-testid="lyrefly-art-versions">
      <Typography component="h3" className="lyrefly-section-eyebrow">
        Comic versions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.5, maxWidth: '44rem' }}>
        Switch versions to preview older page sets on the grid below. Upload set imports a folder by page name; snapshot
        saves today&apos;s picks.
      </Typography>

      <div className="lyrefly-version-strip" role="tablist" aria-label="Comic versions">
        <button
          type="button"
          role="tab"
          aria-selected={viewingVersionId === 'current'}
          className={[
            'lyrefly-version-strip__chip',
            viewingVersionId === 'current' ? 'lyrefly-version-strip__chip--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid="lyrefly-art-version-current"
          disabled={busy}
          onClick={() => onViewingVersionChange('current')}
        >
          Current picks
        </button>
        {orderedVersions.map((version) => {
          const isFinal = project.finalArtVersionId === version.id;
          const pageCount = Object.keys(version.pageRevisions).length;
          return (
            <button
              key={version.id}
              type="button"
              role="tab"
              aria-selected={viewingVersionId === version.id}
              className={[
                'lyrefly-version-strip__chip',
                viewingVersionId === version.id ? 'lyrefly-version-strip__chip--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-testid={`lyrefly-art-version-${version.id}`}
              disabled={busy}
              onClick={() => onViewingVersionChange(version.id)}
            >
              <span className="lyrefly-version-strip__chip-label">{version.label}</span>
              <span className="lyrefly-version-strip__chip-meta">
                {pageCount}p{isFinal ? ' · final' : ''}
              </span>
            </button>
          );
        })}
        <span className="lyrefly-version-strip__spacer" aria-hidden />
        <AppTooltip title="Upload a page set from a folder" placement="top">
          <span>
            <button
              type="button"
              className="lyrefly-version-strip__action"
              disabled={busy || !canUploadSet}
              data-testid="lyrefly-art-version-upload"
              onClick={() => uploadInputRef.current?.click()}
            >
              <UploadFileOutlinedIcon fontSize="small" aria-hidden />
              <span>Upload set</span>
            </button>
          </span>
        </AppTooltip>
        <AppTooltip title="Snapshot current page picks" placement="top">
          <span>
            <button
              type="button"
              className="lyrefly-version-strip__action"
              disabled={busy || !canSnapshot}
              data-testid="lyrefly-art-version-snapshot"
              onClick={() => void onSnapshot()}
            >
              <CameraAltOutlinedIcon fontSize="small" aria-hidden />
              <span>Snapshot</span>
            </button>
          </span>
        </AppTooltip>
        <input
          ref={uploadInputRef}
          type="file"
          accept={PAGE_IMAGE_ACCEPT}
          multiple
          hidden
          onChange={(e) => void onUploadInput(e)}
        />
      </div>

      {selectedVersion ? (
        <Stack
          direction="row"
          spacing={0.75}
          flexWrap="wrap"
          useFlexGap
          alignItems="center"
          className="lyrefly-version-strip__details"
        >
          <Typography variant="caption" color="text.secondary" className="lyrefly-version-strip__source">
            {artVersionSourceLabel(selectedVersion.source)}
          </Typography>
          <div className="lyrefly-art-version-card__date-row lyrefly-version-strip__date">
            <span className="lyrefly-publish-card__date-label">Completed</span>
            <PublishDateChip
              isoValue={selectedVersion.completedAt ?? new Date().toISOString()}
              ariaLabel={`Completed date for ${selectedVersion.label}`}
              disabled={busy}
              onCommit={(iso) => void updateComicArtVersion(selectedVersion, { completedAt: iso })}
            />
          </div>
          {selectedVersion.notes?.trim() ? (
            <Typography variant="caption" color="text.secondary" className="lyrefly-version-strip__notes">
              {selectedVersion.notes.trim()}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={0.25} className="lyrefly-version-strip__icon-actions">
            <AppTooltip title="Book preview" placement="top">
              <span>
                <IconButton
                  size="small"
                  aria-label={`Book preview for ${selectedVersion.label}`}
                  disabled={busy}
                  onClick={() => openPreview(selectedVersion, 'book')}
                >
                  <MenuBookOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </AppTooltip>
            <AppTooltip title="Scroll preview" placement="top">
              <span>
                <IconButton
                  size="small"
                  aria-label={`Scroll preview for ${selectedVersion.label}`}
                  disabled={busy}
                  onClick={() => openPreview(selectedVersion, 'scroll')}
                >
                  <ViewAgendaOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </AppTooltip>
            <AppTooltip
              title={
                project.finalArtVersionId === selectedVersion.id
                  ? 'Clear final version'
                  : 'Mark as final version for export'
              }
              placement="top"
            >
              <span>
                <IconButton
                  size="small"
                  aria-label={
                    project.finalArtVersionId === selectedVersion.id
                      ? `Clear final mark for ${selectedVersion.label}`
                      : `Mark ${selectedVersion.label} as final`
                  }
                  disabled={busy}
                  onClick={() => void onToggleFinal()}
                >
                  {project.finalArtVersionId === selectedVersion.id ? (
                    <StarIcon fontSize="small" />
                  ) : (
                    <StarBorderIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </AppTooltip>
            <AppTooltip title="More actions" placement="top">
              <span>
                <IconButton
                  size="small"
                  aria-label={`More actions for ${selectedVersion.label}`}
                  onClick={(event) => setMenuAnchor(event.currentTarget)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </span>
            </AppTooltip>
          </Stack>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => void onApplyToPicks()}>
            Apply to current picks
          </Button>
        </Stack>
      ) : null}

      {status ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} aria-live="polite">
          {status}
        </Typography>
      ) : null}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            if (!selectedVersion) return;
            setLabelDraft(selectedVersion.label);
            setNotesDraft(selectedVersion.notes ?? '');
            setEditOpen(true);
          }}
        >
          Edit label and notes
        </MenuItem>
        <MenuItem disabled={selectedIndex <= 0} onClick={() => void onReorder('earlier')}>
          Move earlier
        </MenuItem>
        <MenuItem
          disabled={selectedIndex < 0 || selectedIndex >= (project.artVersionIds?.length ?? 0) - 1}
          onClick={() => void onReorder('later')}
        >
          Move later
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setDeleteOpen(true);
          }}
        >
          Remove version…
        </MenuItem>
      </Menu>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit version</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <TextField
              label="Label"
              size="small"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              fullWidth
            />
            <TextField
              label="Notes"
              size="small"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder="Rough thumbnails, pencil pass, convention-ready…"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy || !labelDraft.trim()} onClick={() => void onSaveEdit()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Remove version?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove &ldquo;{selectedVersion?.label}&rdquo;? Page art on the grid is not deleted. Only this saved
            version bookmark goes away.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => void onDeleteVersion()}>
            Remove version
          </Button>
        </DialogActions>
      </Dialog>

      <LyreflyComicBookPreviewDialog
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        project={project}
        pageNodes={pageNodes}
        revisions={revisions}
        revisionByPageId={previewRevisionMap}
        titleSuffix={previewVersion?.label}
      />
      <LyreflyComicReaderDialog
        open={scrollOpen}
        onClose={() => setScrollOpen(false)}
        project={project}
        pageNodes={pageNodes}
        revisions={revisions}
        revisionByPageId={previewRevisionMap}
        titleSuffix={previewVersion?.label}
      />
    </Box>
  );
}
