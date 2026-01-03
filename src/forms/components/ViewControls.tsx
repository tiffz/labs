import type { ViewSettings } from '../types';

interface ViewControlsProps {
  viewSettings: ViewSettings;
  onViewChange: (settings: Partial<ViewSettings>) => void;
}

function ViewControls({ viewSettings, onViewChange }: ViewControlsProps) {
  return (
    <div className="view-controls-overlay">
      <button
        className={`view-control-btn ${viewSettings.showIntersections ? 'active' : ''}`}
        onClick={() => onViewChange({ showIntersections: !viewSettings.showIntersections })}
        title={viewSettings.showIntersections ? 'Hide intersections' : 'Show intersections'}
      >
        <span className="material-symbols-outlined">
          {viewSettings.showIntersections ? 'visibility' : 'visibility_off'}
        </span>
      </button>
    </div>
  );
}

export default ViewControls;
