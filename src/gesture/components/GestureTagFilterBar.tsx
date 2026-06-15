import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';

type GestureTagFilterBarProps = {
  tags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  onClear: () => void;
  /** Practice helper — e.g. "3 of 4 shown collections selected". */
  selectionHint?: string | null;
  onSelectAllShown?: () => void;
  onDeselectAllShown?: () => void;
};

export default function GestureTagFilterBar({
  tags,
  activeTags,
  onToggleTag,
  onClear,
  selectionHint,
  onSelectAllShown,
  onDeselectAllShown,
}: GestureTagFilterBarProps): ReactElement | null {
  const showSelectionActions =
    selectionHint &&
    (onSelectAllShown != null || onDeselectAllShown != null);

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
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`gesture-tag-filter-chip${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => onToggleTag(tag)}
                  >
                    {tag}
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
          </span>
        </div>
      ) : null}
    </div>
  );
}
