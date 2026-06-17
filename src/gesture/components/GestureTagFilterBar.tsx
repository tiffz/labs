import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';

type GestureTagFilterBarProps = {
  tags: string[];
  /** Collections per tag (normalized tag keys). */
  tagCounts?: ReadonlyMap<string, number>;
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  onClear: () => void;
  /** Practice helper — e.g. "3 of 4 shown collections selected". */
  selectionHint?: string | null;
  onSelectAllShown?: () => void;
  onDeselectAllShown?: () => void;
  /** Optional primary action in the selection row (e.g. Merge into one…). */
  selectionPrimaryAction?: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
  };
  onClearSelection?: () => void;
};

export default function GestureTagFilterBar({
  tags,
  tagCounts,
  activeTags,
  onToggleTag,
  onClear,
  selectionHint,
  onSelectAllShown,
  onDeselectAllShown,
  selectionPrimaryAction,
  onClearSelection,
}: GestureTagFilterBarProps): ReactElement | null {
  const showSelectionActions =
    selectionHint &&
    (onSelectAllShown != null ||
      onDeselectAllShown != null ||
      selectionPrimaryAction != null ||
      onClearSelection != null);

  if (tags.length === 0 && !showSelectionActions) return null;

  const activeSet = new Set(activeTags);

  return (
    <div className="gesture-tag-filter">
      {tags.length > 0 ? (
        <>
          <Typography component="h2" className="gesture-practice-label gesture-tag-filter-label">
            Tags
          </Typography>
          <div className="gesture-tag-filter-row">
            <div className="gesture-tag-filter-chips" role="group" aria-label="Filter collections by tag">
              {tags.map((tag) => {
                const active = activeSet.has(tag);
                const count = tagCounts?.get(tag) ?? 0;
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`gesture-tag-filter-chip${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    aria-label={`${tag}, ${count} collection${count === 1 ? '' : 's'}`}
                    onClick={() => onToggleTag(tag)}
                  >
                    <span className="gesture-tag-filter-chip-label">{tag}</span>
                    <span className="gesture-tag-filter-chip-count" aria-hidden="true">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeTags.length > 0 ? (
              <button type="button" className="gesture-tag-filter-clear" onClick={onClear}>
                Clear filters
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      {showSelectionActions ? (
        <div className="gesture-selection-bar" role="group" aria-label="Collection selection">
          <span className="gesture-selection-bar-count">{selectionHint}</span>
          <span className="gesture-selection-bar-actions">
            {onSelectAllShown ? (
              <button
                type="button"
                className="gesture-selection-bar-btn"
                onClick={onSelectAllShown}
              >
                Select all
              </button>
            ) : null}
            {onDeselectAllShown ? (
              <button
                type="button"
                className="gesture-selection-bar-btn"
                onClick={onDeselectAllShown}
              >
                Deselect all
              </button>
            ) : null}
            {selectionPrimaryAction ? (
              <button
                type="button"
                className="gesture-selection-bar-btn gesture-selection-bar-btn--primary"
                disabled={selectionPrimaryAction.disabled}
                onClick={selectionPrimaryAction.onClick}
              >
                {selectionPrimaryAction.label}
              </button>
            ) : null}
            {onClearSelection ? (
              <button
                type="button"
                className="gesture-selection-bar-btn"
                onClick={onClearSelection}
              >
                Cancel
              </button>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
