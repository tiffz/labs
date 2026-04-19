import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

export interface LaneMenuProps {
  laneMenuId: string | null;
  laneMenuAnchor: HTMLElement | null;
  onClose: () => void;
  onCloneGeneratedLane?: () => void;
  onCloneLane?: (laneId: string) => void;
  onDeleteLane?: (laneId: string) => void;
}

/**
 * Overflow menu shown from a lane's "more" button. The menu is driven entirely
 * by props from the parent; this component does not own lane state.
 */
export default function LaneMenu({
  laneMenuId,
  laneMenuAnchor,
  onClose,
  onCloneGeneratedLane,
  onCloneLane,
  onDeleteLane,
}: LaneMenuProps) {
  const canClone =
    laneMenuId === 'generated' ? !!onCloneGeneratedLane : !!onCloneLane;

  return (
    <Menu
      anchorEl={laneMenuAnchor}
      open={Boolean(laneMenuAnchor && laneMenuId)}
      onClose={onClose}
      PaperProps={{ className: 'lane-menu-paper' }}
    >
      {canClone && (
        <MenuItem
          className="lane-menu-item"
          onClick={() => {
            if (laneMenuId === 'generated') {
              onCloneGeneratedLane?.();
            } else if (laneMenuId) {
              onCloneLane?.(laneMenuId);
            }
            onClose();
          }}
        >
          <span className="material-symbols-outlined">content_copy</span>
          Clone lane
        </MenuItem>
      )}
      {laneMenuId && laneMenuId !== 'generated' && onDeleteLane && (
        <MenuItem
          className="lane-menu-item danger"
          onClick={() => {
            onDeleteLane(laneMenuId);
            onClose();
          }}
        >
          <span className="material-symbols-outlined">delete</span>
          Delete lane
        </MenuItem>
      )}
    </Menu>
  );
}
