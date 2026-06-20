import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useMuscleStore } from '../../store/useMuscleStore';

export default function CanvasViewControls() {
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const clearFocus = useMuscleStore((s) => s.clearFocus);
  const resetCameraView = useMuscleStore((s) => s.resetCameraView);

  return (
    <div className="muscle-canvas-view-controls" aria-label="3D view shortcuts">
      <button
        type="button"
        className="muscle-canvas-view-controls__btn muscle-canvas-view-controls__btn--icon"
        onClick={resetCameraView}
        aria-label="Center view"
        title="Center view"
      >
        <CenterFocusStrongOutlinedIcon fontSize="small" aria-hidden />
      </button>
      {focusedNodeId ? (
        <button
          type="button"
          className="muscle-canvas-view-controls__btn muscle-canvas-view-controls__btn--icon"
          onClick={clearFocus}
          aria-label="Show all structures (Esc)"
          title="Show all (Esc)"
        >
          <VisibilityOutlinedIcon fontSize="small" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
