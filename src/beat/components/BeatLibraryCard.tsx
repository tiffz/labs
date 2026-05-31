import type { BeatLibraryEntry } from '../types/library';

type BeatLibraryCardProps = {
  entry: BeatLibraryEntry;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  statusLabel: string;
  previewUrl?: string;
  onSelect: () => void;
  onStartRename: () => void;
  onEditingTitleChange: (title: string) => void;
  onCommitRename: (title: string) => void;
  onCancelRename: () => void;
};

export default function BeatLibraryCard({
  entry,
  isActive,
  isEditing,
  editingTitle,
  statusLabel,
  previewUrl,
  onSelect,
  onStartRename,
  onEditingTitleChange,
  onCommitRename,
  onCancelRename,
}: BeatLibraryCardProps) {
  return (
    <div
      className={`library-card ${isActive ? 'active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isEditing) onSelect();
      }}
      onKeyDown={(event) => {
        if (!isEditing && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="library-thumb">
        {entry.sourceType === 'youtube' && entry.youtubeVideoId ? (
          <img src={`https://i.ytimg.com/vi/${entry.youtubeVideoId}/hqdefault.jpg`} alt={entry.title} />
        ) : previewUrl ? (
          <video src={`${previewUrl}#t=0.1`} muted preload="metadata" />
        ) : (
          <span className="material-symbols-outlined">movie</span>
        )}
      </div>
      <div className="library-card-meta">
        {isEditing ? (
          <input
            className="library-card-title-input"
            value={editingTitle}
            onChange={(event) => onEditingTitleChange(event.target.value)}
            onBlur={() => onCommitRename(editingTitle)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onCommitRename(editingTitle);
              }
              if (event.key === 'Escape') {
                onCancelRename();
              }
              event.stopPropagation();
            }}
            onClick={(event) => event.stopPropagation()}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        ) : (
          <span
            className="library-card-title"
            role="button"
            tabIndex={0}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onStartRename();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation();
                onStartRename();
              }
            }}
            title="Double-click to rename"
          >
            {entry.title}
          </span>
        )}
        {statusLabel ? (
          <span className={`library-status ${statusLabel === 'Outdated' ? 'stale' : 'fresh'}`}>
            {statusLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
