import { memo, useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import InlinePackName from './InlinePackName';
import InlinePackSourceLink from './InlinePackSourceLink';
import InlinePackTags from './InlinePackTags';
import PackDriveFolderLink from './PackDriveFolderLink';
import PackPreviewStrip from './PackPreviewStrip';
import { GESTURE_COMPACT_PREVIEW_THUMB_WIDTH } from '../media/gestureMediaPolicy';
import { useLiveQuery } from 'dexie-react-hooks';
import { topLevelSubfolderCounts } from '../drive/gestureCollectionPaths';
import { isIncompleteUploadPack } from '../drive/gestureUploadActivity';
import { gestureDb } from '../db/gestureDb';
import { usePackCollectionDrop } from '../hooks/usePackCollectionDrop';
import type { GestureCollectionUploadHandle } from '../hooks/useGestureCollectionUpload';
import type { GesturePack } from '../types';

type PackCollectionCardProps = {
  pack: GesturePack;
  driveFileIds: string[];
  photoCount: number;
  drawnCount: number;
  mode: 'manage' | 'select';
  selected?: boolean;
  disabled?: boolean;
  upload?: GestureCollectionUploadHandle;
  dropEnabled?: boolean;
  allTags?: string[];
  /** Practice grid: hide tag pills when tag filters already show them. */
  suppressTags?: boolean;
  /** When false, preview strips only read cache (inactive tab). */
  previewFetchEnabled?: boolean;
  onToggleSelect?: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
  onRenamed?: (pack: GesturePack) => void;
  onUpdated?: (pack: GesturePack) => void;
  onError?: (message: string) => void;
  /** Collections tab: practice-style card selection for merge. */
  mergeMode?: boolean;
  mergeSelected?: boolean;
  onToggleMergeSelect?: () => void;
  /** Denser manage cards (2-up preview). */
  compactManage?: boolean;
};

function PackCollectionCard({
  pack,
  driveFileIds,
  photoCount,
  drawnCount,
  mode,
  selected = false,
  disabled,
  upload,
  dropEnabled = false,
  allTags = [],
  suppressTags = false,
  previewFetchEnabled = true,
  onToggleSelect,
  onRefresh,
  onDelete,
  onRenamed,
  onUpdated,
  onError,
  mergeMode = false,
  mergeSelected = false,
  onToggleMergeSelect,
  compactManage = false,
}: PackCollectionCardProps): React.ReactElement {
  const needsRefresh = photoCount === 0;
  const uploadInterrupted = isIncompleteUploadPack(pack, photoCount);
  const isUploading = pack.uploadStatus === 'uploading';
  const uploadDone = Math.max(photoCount, pack.uploadedFileCount ?? 0);
  const uploadTotal = pack.expectedFileCount ?? 0;
  const uploadPct =
    isUploading && uploadTotal > 0 ? Math.min(100, Math.round((uploadDone / uploadTotal) * 100)) : 0;
  const drawnPct = photoCount > 0 ? Math.round((drawnCount / photoCount) * 100) : 0;
  const showUploadProgress = isUploading && uploadTotal > 0;
  const showDrawnProgress = !isUploading && !needsRefresh && photoCount > 0 && drawnCount > 0;
  const metadataDisabled = Boolean(disabled && isUploading);
  const showSelectTags =
    mode === 'select' && !suppressTags && pack.tags && pack.tags.length > 0;

  const canAcceptDrop =
    dropEnabled &&
    mode === 'manage' &&
    !mergeMode &&
    Boolean(upload) &&
    !isUploading &&
    !disabled;
  const { dragActive, handlers: dropHandlers } = usePackCollectionDrop({
    enabled: canAcceptDrop,
    packId: pack.id,
    upload,
  });

  const previewLimit = mode === 'select' || compactManage || mergeMode ? 2 : 4;
  const previewThumbWidth =
    previewLimit === 2 ? GESTURE_COMPACT_PREVIEW_THUMB_WIDTH : undefined;

  const [foldersOpen, setFoldersOpen] = useState(false);
  const packFileNames = useLiveQuery(
    () =>
      foldersOpen && mode === 'manage' && !mergeMode
        ? gestureDb.packFiles
            .where('packId')
            .equals(pack.id)
            .toArray()
            .then((rows) => rows.map((row) => row.name))
        : [],
    [foldersOpen, mergeMode, mode, pack.id],
    undefined,
  );
  const subfolderSummary = topLevelSubfolderCounts(packFileNames ?? []);

  const metaLine = isUploading
    ? `Uploading… ${uploadDone} of ${uploadTotal || '?'}`
    : uploadInterrupted
      ? `Upload stopped · ${photoCount} on Drive`
      : needsRefresh
        ? 'No photos loaded yet'
        : `${photoCount} photo${photoCount === 1 ? '' : 's'} · ${drawnCount} drawn`;

  const body = (
    <>
      <PackPreviewStrip
        driveFileIds={driveFileIds}
        limit={previewLimit}
        previewFetchEnabled={previewFetchEnabled}
        thumbWidth={previewThumbWidth}
      />
      <div className="gesture-collection-card-body">
        <div className="gesture-collection-card-title-row">
          <div className="gesture-collection-card-title-main">
            {mode === 'manage' && !mergeMode ? (
              <InlinePackName
                pack={pack}
                onRenamed={onRenamed}
                onError={onError}
                disabled={metadataDisabled}
              />
            ) : mode === 'manage' && mergeMode ? (
              <Typography component="h3" className="gesture-collection-card-title">
                {pack.name}
              </Typography>
            ) : (
              <Typography component="h3" className="gesture-collection-card-title">
                {pack.name}
              </Typography>
            )}
          </div>
          {mode === 'manage' && !mergeMode ? <PackDriveFolderLink pack={pack} /> : null}
        </div>
        {mode === 'manage' && !mergeMode ? (
          <InlinePackSourceLink
            pack={pack}
            onUpdated={onUpdated}
            onError={onError}
            disabled={metadataDisabled}
          />
        ) : null}
        {mode === 'manage' && !mergeMode ? (
          <InlinePackTags
            pack={pack}
            allTags={allTags}
            onUpdated={onUpdated}
            onError={onError}
            disabled={metadataDisabled}
          />
        ) : showSelectTags ? (
          <div className="gesture-collection-card-tag-row" aria-label="Tags">
            {pack.tags!.map((tag) => (
              <span key={tag} className="gesture-collection-card-tag">{tag}</span>
            ))}
          </div>
        ) : null}
        <div className="gesture-collection-card-stats-row">
          <Typography className="gesture-collection-card-meta" variant="body2">
            {metaLine}
          </Typography>
          {showUploadProgress ? (
            <div
              className="gesture-collection-card-progress gesture-collection-card-progress--upload gesture-collection-card-progress--inline"
              role="progressbar"
              aria-valuenow={uploadPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Uploading ${uploadDone} of ${uploadTotal}`}
            >
              <div className="gesture-collection-card-progress-fill" style={{ width: `${uploadPct}%` }} />
            </div>
          ) : null}
          {showDrawnProgress ? (
            <div
              className="gesture-collection-card-progress gesture-collection-card-progress--drawn gesture-collection-card-progress--inline"
              role="progressbar"
              aria-valuenow={drawnPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${drawnCount} of ${photoCount} drawn`}
            >
              <div className="gesture-collection-card-progress-fill" style={{ width: `${drawnPct}%` }} />
            </div>
          ) : null}
        </div>
        {mode === 'manage' && !mergeMode && subfolderSummary.length > 0 ? (
          <details
            className="gesture-collection-card-folders"
            onToggle={(e) => setFoldersOpen(e.currentTarget.open)}
          >
            <summary>Folders ({subfolderSummary.length})</summary>
            <ul>
              {subfolderSummary.map((row) => (
                <li key={row.name}>
                  {row.name} · {row.count} photo{row.count === 1 ? '' : 's'}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      {(mode === 'select' && selected) || (mergeMode && mergeSelected) ? (
        <div className="gesture-collection-card-selected" aria-hidden="true">
          <CheckCircleIcon fontSize="small" />
        </div>
      ) : null}
    </>
  );

  if (mode === 'select') {
    const selectDisabled = disabled || needsRefresh;
    return (
      <div
        className={`gesture-collection-card gesture-collection-card--selectable${selected ? ' is-selected' : ''}${selectDisabled ? ' is-disabled' : ''}`}
        role="button"
        tabIndex={selectDisabled ? -1 : 0}
        aria-pressed={selected}
        aria-disabled={selectDisabled || undefined}
        aria-label={`${selected ? 'Deselect' : 'Select'} ${pack.name}`}
        data-pack-id={pack.id}
        onClick={() => {
          if (!selectDisabled) onToggleSelect?.();
        }}
        onKeyDown={(e) => {
          if (selectDisabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleSelect?.();
          }
        }}
      >
        <div className="gesture-collection-card-shell gesture-collection-card-shell--select">
          {body}
        </div>
      </div>
    );
  }

  if (mode === 'manage' && mergeMode) {
    const mergeDisabled = disabled || isUploading || needsRefresh;
    return (
      <div
        className={`gesture-collection-card gesture-collection-card--selectable${mergeSelected ? ' is-selected' : ''}${mergeDisabled ? ' is-disabled' : ''}`}
        role="button"
        tabIndex={mergeDisabled ? -1 : 0}
        aria-pressed={mergeSelected}
        aria-disabled={mergeDisabled || undefined}
        aria-label={`${mergeSelected ? 'Deselect' : 'Select'} ${pack.name} for merge`}
        data-pack-id={pack.id}
        onClick={() => {
          if (!mergeDisabled) onToggleMergeSelect?.();
        }}
        onKeyDown={(e) => {
          if (mergeDisabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleMergeSelect?.();
          }
        }}
      >
        <div className="gesture-collection-card-shell gesture-collection-card-shell--select">
          {body}
        </div>
      </div>
    );
  }

  return (
    <article
      className={`gesture-collection-card gesture-collection-card--manage${dragActive ? ' is-drop-target' : ''}${isUploading ? ' is-uploading' : ''}`}
      data-pack-id={pack.id}
      aria-label={canAcceptDrop ? `Drop photos to add to ${pack.name}` : undefined}
      {...(canAcceptDrop ? dropHandlers : {})}
    >
      <div className="gesture-collection-card-shell">
        {body}
        <div className="gesture-collection-card-footer">
          <Button
            variant={needsRefresh ? 'outlined' : 'text'}
            size="small"
            className="gesture-collection-card-action"
            startIcon={<RefreshIcon fontSize="inherit" />}
            onClick={onRefresh}
            disabled={disabled}
          >
            Refresh photos
          </Button>
          <Button
            variant="text"
            size="small"
            className="gesture-collection-card-action gesture-collection-card-action--danger"
            startIcon={<DeleteOutlineIcon fontSize="inherit" />}
            onClick={onDelete}
            disabled={disabled}
          >
            Remove…
          </Button>
        </div>
      </div>
    </article>
  );
}

function tagsEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every((tag, index) => tag === right[index]);
}

function arePackCollectionCardPropsEqual(
  a: PackCollectionCardProps,
  b: PackCollectionCardProps,
): boolean {
  if (a.pack.id !== b.pack.id) return false;
  if (a.photoCount !== b.photoCount || a.drawnCount !== b.drawnCount) return false;
  if (a.selected !== b.selected || a.disabled !== b.disabled || a.mode !== b.mode) return false;
  if (a.suppressTags !== b.suppressTags || a.dropEnabled !== b.dropEnabled) return false;
  if (a.previewFetchEnabled !== b.previewFetchEnabled) return false;
  if (a.mergeSelected !== b.mergeSelected || a.mergeMode !== b.mergeMode) return false;
  if (a.compactManage !== b.compactManage) return false;
  if (a.pack.name !== b.pack.name) return false;
  if (a.pack.sourceUrl !== b.pack.sourceUrl) return false;
  if (!tagsEqual(a.pack.tags, b.pack.tags)) return false;
  if (a.pack.uploadStatus !== b.pack.uploadStatus) return false;
  if (a.pack.uploadedFileCount !== b.pack.uploadedFileCount) return false;
  if (a.pack.expectedFileCount !== b.pack.expectedFileCount) return false;
  if (a.driveFileIds.join(',') !== b.driveFileIds.join(',')) return false;
  return true;
}

export default memo(PackCollectionCard, arePackCollectionCardPropsEqual);
