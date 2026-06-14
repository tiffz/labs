import IconButton from '@mui/material/IconButton';
import AddToDriveIcon from '@mui/icons-material/AddToDrive';
import AppTooltip from '../../shared/components/AppTooltip';
import { labsDriveFolderUrl } from '../../shared/drive/labsDriveFolderUrl';
import type { GesturePack } from '../types';

type PackDriveFolderLinkProps = {
  pack: GesturePack;
};

export default function PackDriveFolderLink({
  pack,
}: PackDriveFolderLinkProps): React.ReactElement | null {
  const href = labsDriveFolderUrl(pack.driveFolderId);
  if (!href) return null;

  return (
    <AppTooltip title="Browse in Drive">
      <IconButton
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        className="gesture-pack-drive-icon-btn"
        aria-label={`Browse ${pack.name} in Google Drive (opens in new tab)`}
        onClick={(e) => e.stopPropagation()}
      >
        <AddToDriveIcon fontSize="small" aria-hidden />
      </IconButton>
    </AppTooltip>
  );
}
