import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import AppTooltip from '../../../shared/components/AppTooltip';

export interface SectionControlsRowProps {
  currentTime: number;
  hasSelection: boolean;
  selectionLabel: string;
  activeSelectionCount: number;
  selectedSectionCount: number;
  referenceSelectedCount: number;
  snapToMeasuresEnabled: boolean;
  nudgeUnit: 'measure' | 'beat';
  onSplitAtCurrentTime?: () => void;
  onCombineSections?: () => void;
  onSaveReferenceSelection?: () => void;
  onDeleteSelection?: () => void;
  onExtendSelection?: (direction: 'start' | 'end', delta: number) => void;
  onClearSelection?: () => void;
  onToggleSnapToMeasures?: (enabled: boolean) => void;
  onToggleNudgeUnit?: (unit: 'measure' | 'beat') => void;
}

/**
 * Bottom action row under the playback bar. Pure controlled component;
 * all state lives in the parent.
 */
export default function SectionControlsRow({
  currentTime,
  hasSelection,
  selectionLabel,
  activeSelectionCount,
  selectedSectionCount,
  referenceSelectedCount,
  snapToMeasuresEnabled,
  nudgeUnit,
  onSplitAtCurrentTime,
  onCombineSections,
  onSaveReferenceSelection,
  onDeleteSelection,
  onExtendSelection,
  onClearSelection,
  onToggleSnapToMeasures,
  onToggleNudgeUnit,
}: SectionControlsRowProps) {
  return (
    <div className="section-controls-row">
      <div className="section-actions">
        {onSplitAtCurrentTime && (
          <AppTooltip
            title={
              hasSelection
                ? `Split at current timestamp (${currentTime.toFixed(1)}s)`
                : `Split song at current timestamp (${currentTime.toFixed(1)}s)`
            }
          >
            <button
              className="section-action-btn icon-only"
              aria-label="Split at current timestamp"
              onClick={onSplitAtCurrentTime}
            >
              <span className="material-symbols-outlined">content_cut</span>
            </button>
          </AppTooltip>
        )}
        {hasSelection && (
          <>
            <span className="section-actions-label">{selectionLabel}:</span>
            {activeSelectionCount >= 2 && onCombineSections && (
              <AppTooltip title="Combine selected sections">
                <button
                  className="section-action-btn icon-only"
                  aria-label="Combine selected sections"
                  onClick={onCombineSections}
                >
                  <span className="material-symbols-outlined">merge</span>
                </button>
              </AppTooltip>
            )}
            {onSaveReferenceSelection && referenceSelectedCount > 0 && (
              <AppTooltip title="Save selected analysis range as practice section">
                <button
                  className="section-action-btn icon-only"
                  aria-label="Save selection as practice section"
                  onClick={onSaveReferenceSelection}
                >
                  <span className="material-symbols-outlined">save</span>
                </button>
              </AppTooltip>
            )}
            {onDeleteSelection && selectedSectionCount > 0 && (
              <AppTooltip title="Delete selected practice sections">
                <button
                  className="section-action-btn icon-only danger"
                  aria-label="Delete selected sections"
                  onClick={onDeleteSelection}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </AppTooltip>
            )}
            {onExtendSelection && (
              <div className="section-nudge-controls">
                <span className="nudge-label">Nudge:</span>
                {onToggleNudgeUnit && (
                  <div className="nudge-unit-toggle">
                    <button
                      className={`nudge-unit-btn${nudgeUnit === 'beat' ? ' active' : ''}`}
                      onClick={() => onToggleNudgeUnit('beat')}
                      type="button"
                    >
                      Beat
                    </button>
                    <button
                      className={`nudge-unit-btn${nudgeUnit === 'measure' ? ' active' : ''}`}
                      onClick={() => onToggleNudgeUnit('measure')}
                      type="button"
                    >
                      Measure
                    </button>
                  </div>
                )}
                <AppTooltip title={`Extend start 1 ${nudgeUnit} earlier`}>
                  <button
                    className="nudge-btn has-tooltip"
                    aria-label={`Extend start 1 ${nudgeUnit} earlier`}
                    onClick={() => onExtendSelection('start', -1)}
                  >
                    <span className="material-symbols-outlined">first_page</span>
                  </button>
                </AppTooltip>
                <AppTooltip title={`Shrink start 1 ${nudgeUnit} later`}>
                  <button
                    className="nudge-btn has-tooltip"
                    aria-label={`Shrink start 1 ${nudgeUnit} later`}
                    onClick={() => onExtendSelection('start', 1)}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </AppTooltip>
                <span className="nudge-divider">|</span>
                <AppTooltip title={`Shrink end 1 ${nudgeUnit} earlier`}>
                  <button
                    className="nudge-btn has-tooltip"
                    aria-label={`Shrink end 1 ${nudgeUnit} earlier`}
                    onClick={() => onExtendSelection('end', -1)}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                </AppTooltip>
                <AppTooltip title={`Extend end 1 ${nudgeUnit} later`}>
                  <button
                    className="nudge-btn has-tooltip"
                    aria-label={`Extend end 1 ${nudgeUnit} later`}
                    onClick={() => onExtendSelection('end', 1)}
                  >
                    <span className="material-symbols-outlined">last_page</span>
                  </button>
                </AppTooltip>
              </div>
            )}
            {onToggleSnapToMeasures && (
              <FormControlLabel
                className="section-checkbox-row inline compact mui"
                control={
                  <Checkbox
                    size="small"
                    checked={snapToMeasuresEnabled}
                    onChange={(event) => onToggleSnapToMeasures(event.target.checked)}
                  />
                }
                label={<span className="section-checkbox-label">Snap to measures</span>}
              />
            )}
            <AppTooltip title="Deselect all sections">
              <button
                className="section-action-btn deselect icon-only"
                aria-label="Deselect all sections"
                onClick={onClearSelection}
              >
                <span className="material-symbols-outlined">deselect</span>
              </button>
            </AppTooltip>
          </>
        )}
      </div>
    </div>
  );
}
