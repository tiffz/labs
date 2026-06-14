import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import InlinePackName from './InlinePackName';
import InlinePackSourceLink from './InlinePackSourceLink';
import PackPreviewStrip from './PackPreviewStrip';
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
  onToggleSelect?: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
  onRenamed?: (pack: GesturePack) => void;
  onUpdated?: (pack: GesturePack) => void;
  onError?: (message: string) => void;
};

export default function PackCollectionCard({
  pack,
  driveFileIds,
  photoCount,
  drawnCount,
  mode,
  selected = false,
  disabled,
  upload,
  dropEnabled = false,
  onToggleSelect,
  onRefresh,
  onDelete,
  onRenamed,
  onUpdated,
  onError,
}: PackCollectionCardProps): React.ReactElement {
  const needsRefresh = photoCount === 0;
  const isUploading = pack.uploadStatus === 'uploading';
  const uploadDone = pack.uploadedFileCount ?? photoCount;
  const uploadTotal = pack.expectedFileCount ?? 0;
  const uploadPct =
    isUploading && uploadTotal > 0 ? Math.min(100, Math.round((uploadDone / uploadTotal) * 100)) : 0;
  const drawnPct = photoCount > 0 ? Math.round((drawnCount / photoCount) * 100) : 0;
  const showUploadProgress = isUploading && uploadTotal > 0;
  const showDrawnProgress = !isUploading && !needsRefresh && photoCount > 0 && drawnCount > 0;
  const metadataDisabled = Boolean(disabled && isUploading);

  const canAcceptDrop =
    dropEnabled &&
    mode === 'manage' &&
    Boolean(upload) &&
    !isUploading &&
    !disabled;
  const { dragActive, handlers: dropHandlers } = usePackCollectionDrop({
    enabled: canAcceptDrop,
    packId: pack.id,
    upload,
  });

  const body = (
    <>
      <PackPreviewStrip driveFileIds={driveFileIds} limit={4} />
      <div className="gesture-collection-card-body">
        {mode === 'manage' ? (
          <>
            <InlinePackName
              pack={pack}
              onRenamed={onRenamed}
              onError={onError}
              disabled={metadataDisabled}
            />
            <InlinePackSourceLink
              pack={pack}
              onUpdated={onUpdated}
              onError={onError}
              disabled={metadataDisabled}
            />
          </>
        ) : (
          <Typography component="h3" className="gesture-collection-card-title">
            {pack.name}
          </Typography>
        )}
        <Typography className="gesture-collection-card-meta" variant="body2">
          {isUploading
            ? `Uploading… ${uploadDone} of ${uploadTotal || '?'}`
            : pack.uploadStatus === 'incomplete'
              ? `Upload stopped · ${photoCount} on Drive`
              : needsRefresh
                ? 'No photos loaded yet'
                : `${photoCount} photo${photoCount === 1 ? '' : 's'} · ${drawnCount} drawn`}
        </Typography>
        {showUploadProgress ? (
          <div
            className="gesture-collection-card-progress gesture-collection-card-progress--upload"
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
            className="gesture-collection-card-progress gesture-collection-card-progress--drawn"
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
      {mode === 'select' && selected ? (
        <div className="gesture-collection-card-selected" aria-hidden="true">
          <CheckCircleIcon fontSize="small" />
        </div>
      ) : null}
    </>
  );

  if (mode === 'select') {
    return (
      <button
        type="button"
        className={`gesture-collection-card gesture-collection-card--selectable${selected ? ' is-selected' : ''}`}
        onClick={onToggleSelect}
        disabled={disabled || needsRefresh}
        aria-pressed={selected}
        aria-label={`${selected ? 'Deselect' : 'Select'} ${pack.name}`}
      >
        <div className="gesture-collection-card-shell">{body}</div>
      </button>
    );
  }

  return (
    <article
      className={`gesture-collection-card gesture-collection-card--manage${dragActive ? ' is-drop-target' : ''}${isUploading ? ' is-uploading' : ''}`}
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
