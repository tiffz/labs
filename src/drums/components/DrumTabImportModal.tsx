import React, { useMemo, useState } from 'react';
import { parseDrumTab, DEFAULT_PARSE_OPTIONS, type DrumTabParseOptions } from '../utils/drumTabParser';

interface DrumTabImportModalProps {
  /** The raw drum tab text that was pasted (empty for manual entry) */
  rawTabText: string;
  /** Called when user confirms the import */
  onImport: (notation: string) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/** Configuration for a drum component option */
interface ComponentOptionConfig {
  key: keyof DrumTabParseOptions;
  code: string;
  target: string;
  name: string;
  tabCode: 'BD' | 'SD' | 'HH';
}

const COMPONENT_OPTIONS: ComponentOptionConfig[] = [
  { key: 'includeBass', code: 'BD', target: 'D', name: 'Bass Drum → Dum', tabCode: 'BD' },
  { key: 'includeSnare', code: 'SD', target: 'T', name: 'Snare Drum → Tek', tabCode: 'SD' },
  { key: 'includeHiHat', code: 'HH', target: 'K', name: 'Hi-Hat → Ka', tabCode: 'HH' },
];

const DrumTabImportModal: React.FC<DrumTabImportModalProps> = ({
  rawTabText: initialTabText,
  onImport,
  onCancel,
}) => {
  const [useSimplified, setUseSimplified] = useState(true);
  const [tabText, setTabText] = useState(initialTabText);
  const [options, setOptions] = useState<DrumTabParseOptions>(DEFAULT_PARSE_OPTIONS);

  // Parse the drum tab with current options
  const parseResult = useMemo(() => parseDrumTab(tabText, options), [tabText, options]);

  const handleImport = () => {
    const notation = useSimplified ? parseResult.simplifiedNotation : parseResult.notation;
    onImport(notation);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleOptionChange = (key: keyof DrumTabParseOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentNotation = useSimplified ? parseResult.simplifiedNotation : parseResult.notation;
  const hasValidTab = tabText.trim().length > 0;

  return (
    <div className="drum-tab-import-overlay" onClick={handleOverlayClick}>
      <div className="drum-tab-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="drum-tab-import-header">
          <h2>Import Drum Tab</h2>
          <button
            className="drum-tab-import-close"
            onClick={onCancel}
            type="button"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="drum-tab-import-info">
          <span className="material-symbols-outlined">info</span>
          <span>
            Paste ASCII drum tabs from sites like{' '}
            <a href="https://www.ultimate-guitar.com/" target="_blank" rel="noopener noreferrer">
              Ultimate Guitar
            </a>
            .{' '}
            <a
              href="https://en.wikipedia.org/wiki/Drum_tablature"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more about drum tablature
            </a>
          </span>
        </div>

        <div className="drum-tab-import-content">
          {/* Tab input/preview */}
          <div className="drum-tab-import-section">
            <h3>{initialTabText ? 'Drum Tab' : 'Paste Drum Tab'}</h3>
            <div className="drum-tab-preview-container">
              <textarea
                className="drum-tab-input"
                value={tabText}
                onChange={(e) => setTabText(e.target.value)}
                placeholder="Paste your drum tab here...

Example:
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o------oo-o-----|"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Component selection */}
          <div className="drum-tab-import-section">
            <h3>Include Components</h3>
            <p className="drum-tab-section-desc">
              Select which drum sounds to include. Priority: Bass Drum → Snare → Hi-Hat
            </p>
            <div className="drum-tab-component-options">
              {COMPONENT_OPTIONS.map(({ key, code, target, name, tabCode }) => {
                const isAvailable = parseResult.componentsFound.includes(tabCode);
                return (
                  <label key={key} className={`drum-tab-component-option ${!isAvailable ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={() => handleOptionChange(key)}
                      disabled={!isAvailable}
                    />
                    <span className="drum-tab-component-label">
                      <span className="drum-tab-component-code">{code}</span>
                      <span className="drum-tab-component-arrow">→</span>
                      <span className="drum-tab-component-target">{target}</span>
                      <span className="drum-tab-component-name">{name}</span>
                      {!isAvailable && <span className="drum-tab-component-missing">(not in tab)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Pattern analysis */}
          {parseResult.uniqueMeasures.length > 0 && (
            <div className="drum-tab-import-section">
              <h3>Detected Patterns ({parseResult.uniqueMeasures.length} unique)</h3>
              <div className="drum-tab-patterns-container">
                {parseResult.uniqueMeasures.slice(0, 8).map((measure, index) => (
                  <div key={index} className="drum-tab-pattern-item">
                    <code className="drum-tab-pattern-notation">{measure.notation}</code>
                    {measure.count > 1 && (
                      <span className="drum-tab-pattern-count">×{measure.count}</span>
                    )}
                  </div>
                ))}
                {parseResult.uniqueMeasures.length > 8 && (
                  <div className="drum-tab-pattern-more">
                    +{parseResult.uniqueMeasures.length - 8} more patterns...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Output mode toggle - only show if we have results */}
          {currentNotation && (
            <div className="drum-tab-import-section">
              <h3>Import Mode</h3>
              <div className="drum-tab-mode-toggle">
                <label className="drum-tab-mode-option">
                  <input
                    type="radio"
                    name="importMode"
                    checked={useSimplified}
                    onChange={() => setUseSimplified(true)}
                  />
                  <span className="drum-tab-mode-label">
                    <strong>Simplified</strong>
                    <span className="drum-tab-mode-desc">
                      Just unique patterns (recommended for learning)
                    </span>
                  </span>
                </label>
                <label className="drum-tab-mode-option">
                  <input
                    type="radio"
                    name="importMode"
                    checked={!useSimplified}
                    onChange={() => setUseSimplified(false)}
                  />
                  <span className="drum-tab-mode-label">
                    <strong>Full</strong>
                    <span className="drum-tab-mode-desc">
                      All {parseResult.measureCount} measures including repeats
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Converted notation */}
          {hasValidTab && (
            <div className="drum-tab-import-section">
              <h3>Converted Notation</h3>
              {currentNotation ? (
                <div className="drum-tab-converted">
                  <code className="drum-tab-notation">{currentNotation}</code>
                  <div className="drum-tab-stats">
                    <span>{parseResult.measureCount} total measures</span>
                    <span className="stats-separator">•</span>
                    <span>{parseResult.uniqueMeasures.length} unique patterns</span>
                  </div>
                </div>
              ) : (
                <div className="drum-tab-error">
                  {!options.includeBass && !options.includeSnare && !options.includeHiHat
                    ? 'Please select at least one component to include.'
                    : 'Could not parse notation. Make sure your tab includes the selected drum components.'}
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <div className="drum-tab-import-section">
              <div className="drum-tab-warnings">
                {parseResult.warnings.map((warning, index) => (
                  <div key={index} className="drum-tab-warning">
                    <span className="material-symbols-outlined">warning</span>
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="drum-tab-import-footer">
          <button
            className="drum-tab-import-btn drum-tab-import-btn-cancel"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="drum-tab-import-btn drum-tab-import-btn-import"
            onClick={handleImport}
            type="button"
            disabled={!currentNotation}
          >
            Import Rhythm
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrumTabImportModal;
