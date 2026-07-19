import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactElement } from 'react';

import AppTooltip from '../../shared/components/AppTooltip';
import type { ComicArtVersion, ComicProject, PageNode, PageRevision } from '../types';
import {
  applyComicArtVersion,
  captureComicArtVersion,
  deleteComicArtVersion,
  importComicArtVersionFromFiles,
  reorderArtVersion,
  resetLyreflyPageArt,
  setFinalArtVersion,
  updateComicArtVersion,
} from '../db/lyreflyArtVersionMutations';
import {
  lyreflyVersionShareUrl,
  publishLyreflyVersionShare,
} from '../drive/lyreflyVersionShareSnapshot';
import {
  buildPageRevisionMapFromNodes,
  orderArtVersions,
  type ArtVersionViewId,
} from '../utils/artVersionUtils';
import { PAGE_IMAGE_ACCEPT } from './ArtPageGrid';
import { LyreflyVersionPreviewDialog } from './LyreflyVersionPreviewDialog';
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

type PreviewTab = 'book' | 'scroll';

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('book');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [stripMenuAnchor, setStripMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteArtToo, setDeleteArtToo] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetConfirmTitle, setResetConfirmTitle] = useState('');
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

  useEffect(() => {
    if (!selectedVersion) {
      setLabelDraft('');
      setNotesDraft('');
      return;
    }
    setLabelDraft(selectedVersion.label);
    setNotesDraft(selectedVersion.notes ?? '');
  }, [selectedVersion]);

  const openPreview = (kind: PreviewTab): void => {
    setPreviewTab(kind);
    setPreviewOpen(true);
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
        `Matched ${result.matchedPageCount} page${result.matchedPageCount === 1 ? '' : 's'} as "${result.version.label}". Your latest page picks were not changed.${extra}`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const onApplyToPicks = async (): Promise<void> => {
    if (!selectedVersion) return;
    setMenuAnchor(null);
    setBusy(true);
    try {
      await applyComicArtVersion(selectedVersion, pageNodes);
      onViewingVersionChange('current');
      setStatus(`Applied "${selectedVersion.label}" to your latest page picks.`);
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
      const next = await deleteComicArtVersion(project, selectedVersion.id, {
        deleteAssociatedArt: deleteArtToo,
      });
      onProjectChange(next);
      onViewingVersionChange('current');
      setStatus(
        deleteArtToo
          ? `Removed "${selectedVersion.label}" and deleted its uploaded art.`
          : `Removed "${selectedVersion.label}". Page art on the grid was kept.`,
      );
      setDeleteArtToo(false);
    } finally {
      setBusy(false);
    }
  };

  const onResetAllPages = async (): Promise<void> => {
    setResetOpen(false);
    setResetStep(1);
    setResetConfirmTitle('');
    setBusy(true);
    try {
      const next = await resetLyreflyPageArt(project);
      onProjectChange(next);
      onViewingVersionChange('current');
      setStatus('Removed all pages and versions. Upload a new page set to start over.');
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

  const onCommitInlineLabel = async (): Promise<void> => {
    if (!selectedVersion) return;
    const trimmed = labelDraft.trim();
    if (!trimmed || trimmed === selectedVersion.label) return;
    setBusy(true);
    try {
      await updateComicArtVersion(selectedVersion, { label: trimmed });
    } finally {
      setBusy(false);
    }
  };

  const onCommitNotes = async (): Promise<void> => {
    if (!selectedVersion) return;
    const trimmed = notesDraft.trim();
    if (trimmed === (selectedVersion.notes ?? '').trim()) return;
    setBusy(true);
    try {
      await updateComicArtVersion(selectedVersion, { notes: trimmed || undefined });
    } finally {
      setBusy(false);
    }
  };

  const onPublishShare = async (): Promise<void> => {
    if (!selectedVersion) return;
    setMenuAnchor(null);
    setBusy(true);
    setStatus(null);
    try {
      const result = await publishLyreflyVersionShare(project, selectedVersion, pageNodes, revisions);
      await updateComicArtVersion(selectedVersion, {
        shareEnabled: true,
        shareSnapshotDriveFileId: result.fileId,
      });
      const url = lyreflyVersionShareUrl(result.fileId);
      try {
        await navigator.clipboard.writeText(url);
        setStatus(
          result.warning
            ? `Share link copied, but guests may not be able to open it yet: ${result.warning}`
            : 'Share link copied to clipboard.',
        );
      } catch {
        setStatus(result.warning ? `Share published with warning: ${result.warning}` : `Share link: ${url}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not publish share link.');
    } finally {
      setBusy(false);
    }
  };

  const onCopyShareLink = async (): Promise<void> => {
    if (!selectedVersion?.shareSnapshotDriveFileId) return;
    setMenuAnchor(null);
    const url = lyreflyVersionShareUrl(selectedVersion.shareSnapshotDriveFileId);
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Share link copied to clipboard.');
    } catch {
      setStatus(`Share link: ${url}`);
    }
  };

  const onDisableShare = async (): Promise<void> => {
    if (!selectedVersion) return;
    setMenuAnchor(null);
    setBusy(true);
    try {
      await updateComicArtVersion(selectedVersion, {
        shareEnabled: false,
        shareSnapshotDriveFileId: undefined,
      });
      setStatus(`Sharing disabled for "${selectedVersion.label}". The old link will stop working after Drive permissions change.`);
    } finally {
      setBusy(false);
    }
  };

  const canUploadSet = pageNodes.length > 0;
  const canSnapshot = currentPickCount > 0;
  const selectedIndex = selectedVersion
    ? (project.artVersionIds ?? []).indexOf(selectedVersion.id)
    : -1;
  const resetTitleMatches = resetConfirmTitle.trim() === project.title.trim();
  const viewingLatest = viewingVersionId === 'current';

  return (
    <Box className="lyrefly-version-panel" data-testid="lyrefly-art-versions">
      <div className="lyrefly-version-panel__header">
        <Typography component="h3" className="lyrefly-section-eyebrow">
          Comic versions
        </Typography>
        <div className="lyrefly-version-panel__toolbar">
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
          <AppTooltip title="Snapshot latest page picks" placement="top">
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
          <AppTooltip title="More version actions" placement="top">
            <span>
              <button
                type="button"
                className="lyrefly-version-strip__action lyrefly-version-strip__action--icon"
                disabled={busy || pageNodes.length === 0}
                aria-label="More version actions"
                onClick={(event) => setStripMenuAnchor(event.currentTarget)}
              >
                <MoreVertIcon fontSize="small" aria-hidden />
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
      </div>
      <div className="lyrefly-version-strip" role="tablist" aria-label="Comic versions">
        <button
          type="button"
          role="tab"
          aria-selected={viewingLatest}
          className={[
            'lyrefly-version-strip__chip',
            viewingLatest ? 'lyrefly-version-strip__chip--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid="lyrefly-art-version-current"
          disabled={busy}
          onClick={() => onViewingVersionChange('current')}
        >
          <span className="lyrefly-version-strip__chip-label">Latest</span>
          <span className="lyrefly-version-strip__chip-meta">{currentPickCount}p live</span>
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
              <span className="lyrefly-version-strip__chip-label">
                {version.label}
                {isFinal ? <StarIcon className="lyrefly-version-strip__chip-final" aria-label="Final" /> : null}
              </span>
              <span className="lyrefly-version-strip__chip-meta">
                {pageCount}p{version.shareEnabled ? ' · shared' : ''}
              </span>
            </button>
          );
        })}
      </div>
      {viewingLatest ? (
        <p className="lyrefly-version-panel__latest-hint">
          Latest picks — edits on the page grid below apply here. Snapshot or upload set to save a named version.
        </p>
      ) : selectedVersion ? (
        <section className="lyrefly-version-detail" aria-label={`Details for ${selectedVersion.label}`}>
          <div className="lyrefly-version-detail__head">
            <TextField
              variant="standard"
              size="small"
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              onBlur={() => void onCommitInlineLabel()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void onCommitInlineLabel();
                }
              }}
              disabled={busy}
              className="lyrefly-version-detail__label"
              slotProps={{
                htmlInput: {
                  'aria-label': `Version label for ${selectedVersion.label}`,
                  'data-testid': 'lyrefly-art-version-inline-label',
                }
              }}
            />
            <div className="lyrefly-version-detail__actions">
              <AppTooltip title="Preview book and scroll" placement="top">
                <span>
                  <IconButton
                    size="small"
                    aria-label={`Preview ${selectedVersion.label}`}
                    disabled={busy}
                    onClick={() => openPreview('book')}
                  >
                    <PreviewOutlinedIcon fontSize="small" />
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
            </div>
          </div>

          <div className="lyrefly-version-detail__meta">
            <div className="lyrefly-art-version-card__date-row">
              <span className="lyrefly-publish-card__date-label">Completed</span>
              <PublishDateChip
                isoValue={selectedVersion.completedAt ?? new Date().toISOString()}
                ariaLabel={`Completed date for ${selectedVersion.label}`}
                disabled={busy}
                onCommit={(iso) => void updateComicArtVersion(selectedVersion, { completedAt: iso })}
              />
            </div>
            <span className="lyrefly-version-detail__meta-sep" aria-hidden>
              ·
            </span>
            <span className="lyrefly-version-detail__meta-item">
              {Object.keys(selectedVersion.pageRevisions).length} pages in this version
            </span>
            {project.finalArtVersionId === selectedVersion.id ? (
              <>
                <span className="lyrefly-version-detail__meta-sep" aria-hidden>
                  ·
                </span>
                <span className="lyrefly-version-detail__meta-item lyrefly-version-detail__meta-item--accent">
                  Final for export
                </span>
              </>
            ) : null}
            {selectedVersion.shareEnabled ? (
              <>
                <span className="lyrefly-version-detail__meta-sep" aria-hidden>
                  ·
                </span>
                <span className="lyrefly-version-detail__meta-item">Shared</span>
              </>
            ) : null}
          </div>

          <label className="lyrefly-version-detail__notes-field">
            <span className="lyrefly-version-detail__notes-label">Notes</span>
            <textarea
              className="lyrefly-version-detail__notes-input"
              value={notesDraft}
              disabled={busy}
              rows={3}
              placeholder="Rough thumbnails, pencil pass, sent to editor…"
              data-testid="lyrefly-art-version-notes"
              onChange={(event) => setNotesDraft(event.target.value)}
              onBlur={() => void onCommitNotes()}
            />
          </label>
        </section>
      ) : null}
      {status ? (
        <Typography variant="body2" className="lyrefly-version-panel__status" aria-live="polite" sx={{
          color: "text.secondary"
        }}>
          {status}
        </Typography>
      ) : null}
      <Menu anchorEl={stripMenuAnchor} open={Boolean(stripMenuAnchor)} onClose={() => setStripMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setStripMenuAnchor(null);
            setResetStep(1);
            setResetConfirmTitle('');
            setResetOpen(true);
          }}
        >
          Remove all pages and start over…
        </MenuItem>
      </Menu>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => void onApplyToPicks()}>Use as latest page picks</MenuItem>
        <MenuItem disabled={selectedIndex <= 0} onClick={() => void onReorder('earlier')}>
          Move earlier
        </MenuItem>
        <MenuItem
          disabled={selectedIndex < 0 || selectedIndex >= (project.artVersionIds?.length ?? 0) - 1}
          onClick={() => void onReorder('later')}
        >
          Move later
        </MenuItem>
        <MenuItem onClick={() => void onPublishShare()}>
          {selectedVersion?.shareEnabled ? 'Update share link' : 'Publish share link…'}
        </MenuItem>
        {selectedVersion?.shareSnapshotDriveFileId ? (
          <MenuItem onClick={() => void onCopyShareLink()}>
            <LinkOutlinedIcon fontSize="small" sx={{ mr: 1 }} aria-hidden />
            Copy share link
          </MenuItem>
        ) : null}
        {selectedVersion?.shareEnabled ? (
          <MenuItem onClick={() => void onDisableShare()}>Disable sharing</MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setDeleteArtToo(false);
            setDeleteOpen(true);
          }}
        >
          Remove version…
        </MenuItem>
      </Menu>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Remove version?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            Remove &ldquo;{selectedVersion?.label}&rdquo;? This only deletes the saved version bookmark unless you also
            remove its art below.
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteArtToo}
                onChange={(event) => setDeleteArtToo(event.target.checked)}
              />
            }
            label="Also delete art revisions uploaded for this version"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => void onDeleteVersion()}>
            Remove version
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setResetStep(1);
          setResetConfirmTitle('');
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{resetStep === 1 ? 'Remove all pages?' : 'Confirm removal'}</DialogTitle>
        <DialogContent>
          {resetStep === 1 ? (
            <DialogContentText>
              This removes every page, revision, and saved version for &ldquo;{project.title}&rdquo;. You will need to
              upload art again. This cannot be undone.
            </DialogContentText>
          ) : (
            <Stack spacing={1.25} sx={{ pt: 0.5 }}>
              <DialogContentText>
                Type the comic title <strong>{project.title}</strong> to confirm.
              </DialogContentText>
              <TextField
                size="small"
                label="Comic title"
                value={resetConfirmTitle}
                onChange={(event) => setResetConfirmTitle(event.target.value)}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResetOpen(false);
              setResetStep(1);
              setResetConfirmTitle('');
            }}
          >
            Cancel
          </Button>
          {resetStep === 1 ? (
            <Button color="error" onClick={() => setResetStep(2)}>
              Continue
            </Button>
          ) : (
            <Button
              color="error"
              variant="contained"
              disabled={busy || !resetTitleMatches}
              onClick={() => void onResetAllPages()}
            >
              Remove all pages
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <LyreflyVersionPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        project={project}
        pageNodes={pageNodes}
        revisions={revisions}
        artVersions={artVersions}
        initialVersionId={viewingVersionId}
        initialTab={previewTab}
      />
    </Box>
  );
}
