import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import AppTooltip from '../../shared/components/AppTooltip';

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
  /** Device-local NSFW preview visibility — separate from tag chips. */
  nsfwTaggedCount?: number;
  showNsfwCollections?: boolean;
  onShowNsfwCollectionsChange?: (show: boolean) => void;
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
  nsfwTaggedCount = 0,
  showNsfwCollections = false,
  onShowNsfwCollectionsChange,
}: GestureTagFilterBarProps): ReactElement | null {
  const showSelectionActions =
    selectionHint &&
    (onSelectAllShown != null ||
      onDeselectAllShown != null ||
      selectionPrimaryAction != null ||
      onClearSelection != null);

  const showNsfwToggle = nsfwTaggedCount > 0 && onShowNsfwCollectionsChange != null;

  if (tags.length === 0 && !showSelectionActions && !showNsfwToggle) return null;

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
      {showNsfwToggle ? (
        <div className="gesture-tag-filter-row gesture-tag-filter-row--nsfw">
          <AppTooltip
            title="Stored on this device only. NSFW-tagged collections stay in your library; previews blur until you turn this on."
            placement="top"
          >
            <button
              type="button"
              className={`gesture-tag-filter-chip gesture-tag-filter-chip--nsfw${showNsfwCollections ? ' is-active' : ' is-off'}`}
              aria-pressed={showNsfwCollections}
              aria-label={
                showNsfwCollections
                  ? 'Show NSFW previews, currently on'
                  : 'Show NSFW previews, currently off'
              }
              onClick={() => onShowNsfwCollectionsChange(!showNsfwCollections)}
            >
              <span className="gesture-tag-filter-chip-icon" aria-hidden="true">
                {showNsfwCollections ? (
                  <VisibilityIcon sx={{ fontSize: 15 }} />
                ) : (
                  <VisibilityOffIcon sx={{ fontSize: 15 }} />
                )}
              </span>
              <span className="gesture-tag-filter-chip-label">Show NSFW</span>
            </button>
          </AppTooltip>
        </div>
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
