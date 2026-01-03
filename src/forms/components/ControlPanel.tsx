import type { PlacementConfig, ViewSettings, FormType } from '../types';
import { ALL_FORM_TYPES, FORM_TYPE_LABELS } from '../utils/formGenerators';

interface ControlPanelProps {
  config: PlacementConfig;
  viewSettings: ViewSettings;
  onConfigChange: (config: Partial<PlacementConfig>) => void;
  onViewChange: (settings: Partial<ViewSettings>) => void;
  onRegenerate: () => void;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
}

function ControlPanel({
  config,
  viewSettings,
  onConfigChange,
  onViewChange,
  onRegenerate,
}: ControlPanelProps) {
  const handleFormTypeToggle = (type: FormType) => {
    const enabledTypes = config.enabledFormTypes.includes(type)
      ? config.enabledFormTypes.filter(t => t !== type)
      : [...config.enabledFormTypes, type];
    
    // Ensure at least one type is always enabled
    if (enabledTypes.length > 0) {
      onConfigChange({ enabledFormTypes: enabledTypes });
    }
  };

  return (
    <aside className="forms-sidebar">
      <header className="forms-sidebar-header">
        <h1>Form Intersections</h1>
        <p>Drawabox Practice Tool</p>
      </header>
      
      <div className="forms-sidebar-content">
        {/* Regenerate Button */}
        <button className="btn btn-primary" onClick={onRegenerate}>
          <span className="material-symbols-outlined">refresh</span>
          Generate New Scene
        </button>
        
        {/* Form Types */}
        <section className="control-section">
          <h2 className="control-section-title">Form Types</h2>
          <div className="checkbox-group">
            {ALL_FORM_TYPES.map(type => (
              <label
                key={type}
                className={`checkbox-item ${config.enabledFormTypes.includes(type) ? 'checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={config.enabledFormTypes.includes(type)}
                  onChange={() => handleFormTypeToggle(type)}
                />
                <span className="checkbox-icon">
                  <CheckIcon />
                </span>
                {FORM_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
        </section>
        
        {/* Scene Settings */}
        <section className="control-section">
          <h2 className="control-section-title">Scene Settings</h2>
          
          <div className="slider-control">
            <div className="slider-header">
              <span className="slider-label">Number of Forms</span>
              <span className="slider-value">{config.formCount}</span>
            </div>
            <input
              type="range"
              className="slider-input"
              min={3}
              max={12}
              value={config.formCount}
              onChange={(e) => onConfigChange({ formCount: parseInt(e.target.value) })}
            />
          </div>
          
        </section>
        
        {/* View Settings */}
        <section className="control-section">
          <h2 className="control-section-title">View Options</h2>
          
          <div className="slider-control">
            <div className="slider-header">
              <span className="slider-label">Form Fill Opacity</span>
              <span className="slider-value">{Math.round(viewSettings.formOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              className="slider-input"
              min={0}
              max={100}
              value={viewSettings.formOpacity * 100}
              onChange={(e) => onViewChange({ formOpacity: parseInt(e.target.value) / 100 })}
            />
          </div>
        </section>
        
        {/* About section */}
        <section className="control-section" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
            Practice visualizing how 3D forms intersect in space.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Based on the{' '}
            <a 
              href="https://drawabox.com/lesson/2/formintersections" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--primary-light)', fontWeight: 500 }}
            >
              Drawabox Form Intersections
            </a>{' '}
            exercise from Lesson 2.
          </p>
        </section>
      </div>
    </aside>
  );
}

export default ControlPanel;
