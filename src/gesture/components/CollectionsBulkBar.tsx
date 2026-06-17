import type { ReactElement } from 'react';

type CollectionsBulkBarProps = {
  selectedCount: number;
  visibleCount: number;
  busy?: boolean;
  mergeEnabled: boolean;
  mergeHint?: string | null;
  refreshEnabled: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onMerge: () => void;
  onAddTags: () => void;
  onSetSource: () => void;
  onRefresh: () => void;
  onDelete: () => void;
};

export default function CollectionsBulkBar({
  selectedCount,
  visibleCount,
  busy,
  mergeEnabled,
  mergeHint,
  refreshEnabled,
  onSelectAll,
  onClearSelection,
  onMerge,
  onAddTags,
  onSetSource,
  onRefresh,
  onDelete,
}: CollectionsBulkBarProps): ReactElement {
  const interactionDisabled = Boolean(busy);

  return (
    <div className="gesture-collections-bulk-bar" role="group" aria-label="Bulk collection actions">
      <div className="gesture-collections-bulk-meta">
        <span className="gesture-selection-bar-count">
          {selectedCount} selected
          {visibleCount > 0 ? ` · ${visibleCount} shown` : ''}
        </span>
        <span className="gesture-selection-bar-actions gesture-collections-bulk-meta-actions">
          <button
            type="button"
            className="gesture-selection-bar-btn"
            disabled={interactionDisabled}
            onClick={onSelectAll}
          >
            Select all
          </button>
          <button
            type="button"
            className="gesture-selection-bar-btn"
            disabled={interactionDisabled}
            onClick={onClearSelection}
          >
            Clear selection
          </button>
        </span>
      </div>
      <div className="gesture-collections-bulk-actions">
        <button
          type="button"
          className="gesture-selection-bar-btn"
          disabled={interactionDisabled}
          onClick={onAddTags}
        >
          Add tags…
        </button>
        <button
          type="button"
          className="gesture-selection-bar-btn"
          disabled={interactionDisabled}
          onClick={onSetSource}
        >
          Set source…
        </button>
        <button
          type="button"
          className="gesture-selection-bar-btn"
          disabled={interactionDisabled || !refreshEnabled}
          onClick={onRefresh}
        >
          Refresh
        </button>
        <button
          type="button"
          className="gesture-selection-bar-btn gesture-selection-bar-btn--danger"
          disabled={interactionDisabled}
          onClick={onDelete}
        >
          Remove…
        </button>
        <button
          type="button"
          className="gesture-selection-bar-btn gesture-selection-bar-btn--primary"
          disabled={interactionDisabled || !mergeEnabled}
          title={mergeHint ?? undefined}
          onClick={onMerge}
        >
          Merge…
        </button>
      </div>
    </div>
  );
}
