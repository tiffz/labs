import type { ReactNode } from 'react';
import AppTooltip from '../../shared/components/AppTooltip';

export type BeatLibraryShellProps = {
  staleCount: number;
  staleLibraryIds: string[];
  onReanalyzeStale: (ids: string[]) => void;
  libraryQuery: string;
  onLibraryQueryChange: (query: string) => void;
  children: ReactNode;
};

export default function BeatLibraryShell({
  staleCount,
  staleLibraryIds,
  onReanalyzeStale,
  libraryQuery,
  onLibraryQueryChange,
  children,
}: BeatLibraryShellProps) {
  return (
    <div className="library-shell compact">
      <div className="library-header-row">
        <h3>Your uploads</h3>
        {staleCount > 0 ? (
          <AppTooltip
            title={`Reanalyze ${staleCount} outdated ${staleCount === 1 ? 'video' : 'videos'}`}
          >
            <button className="icon-btn subtle" onClick={() => onReanalyzeStale(staleLibraryIds)}>
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </AppTooltip>
        ) : null}
      </div>
      <div className="library-toolbar">
        <input
          className="library-search-input"
          placeholder="Search your uploads"
          value={libraryQuery}
          onChange={(event) => onLibraryQueryChange(event.target.value)}
        />
      </div>
      <div className="library-grid">{children}</div>
    </div>
  );
}
