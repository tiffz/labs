import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import Typography from '@mui/material/Typography';
type CollectionDropZoneProps = {
  compact?: boolean;
  dragActive?: boolean;
  uploadActive?: boolean;
};

/** Visual drop target — drag handlers live on the Collections tab panel. */
export default function CollectionDropZone({
  compact = false,
  dragActive = false,
  uploadActive = false,
}: CollectionDropZoneProps): React.ReactElement {
  return (
    <div
      className={`gesture-drop-zone${compact ? ' gesture-drop-zone--compact' : ''}${dragActive ? ' is-drag-active' : ''}${uploadActive ? ' is-upload-active' : ''}`}
      aria-hidden="true"
    >
      <CloudUploadOutlinedIcon className="gesture-drop-zone-icon" aria-hidden />
      {uploadActive ? (
        <>
          <Typography className="gesture-drop-zone-title">Upload in progress</Typography>
          {!compact ? (
            <Typography className="gesture-drop-zone-copy" variant="body2">
              Progress is shown above. You can keep browsing collections while photos upload.
            </Typography>
          ) : null}
        </>
      ) : (
        <>
          <Typography className="gesture-drop-zone-title">
            {dragActive ? 'Drop to upload' : compact ? 'Drop folder or photos' : 'Drop a folder or photos here'}
          </Typography>
          {!compact ? (
            <Typography className="gesture-drop-zone-copy" variant="body2">
              Folder name becomes the collection title. Or use Add to pick files manually.
            </Typography>
          ) : null}
        </>
      )}
    </div>
  );
}
