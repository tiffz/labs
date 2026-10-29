import { useMemo, type ReactElement } from 'react';

import { useLyreflyProjects } from '../hooks/useLyreflyProjects';
import { useLyreflyShelfPreviews } from '../hooks/useLyreflyShelfPreviews';
import { lyreflyProjectStageHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import { buildLyreflyShelfRows, type LyreflyShelfRow } from '../utils/lyreflyShelfFilters';
import { lyreflyWorkbenchColumns } from '../utils/lyreflyWorkbenchColumns';
import { LyreflyShelfCover } from './LyreflyShelfCover';

function WorkbenchCard({ row }: { row: LyreflyShelfRow }): ReactElement {
  const { project } = row;
  return (
    <li>
      <button
        type="button"
        className="lyrefly-board__card"
        onClick={() => navigateLyreflyHash(lyreflyProjectStageHref(project.id, row.workflowStage))}
        aria-label={`Open ${project.title}`}
      >
        <span className="lyrefly-board__cover">
          <LyreflyShelfCover
            project={project}
            coverRevisionId={row.coverRevisionId}
            conceptAssetId={row.conceptAssetId}
          />
        </span>
        <span className="lyrefly-board__card-text">
          <span className="lyrefly-board__card-title">{project.title}</span>
          {project.pageCount != null ? (
            <span className="lyrefly-board__card-meta">{project.pageCount} pages</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/** Comics still being made, by the step each one has reached. The shelf is for finished work. */
export function LyreflyWorkbenchBoard(): ReactElement {
  const { projects, projectsHydrated } = useLyreflyProjects();
  const { previewByProject, previewsHydrated } = useLyreflyShelfPreviews(projects);

  const columns = useMemo(
    () => lyreflyWorkbenchColumns(buildLyreflyShelfRows(projects, previewByProject)),
    [projects, previewByProject],
  );

  if (!projectsHydrated || !previewsHydrated) {
    return (
      <div className="lyrefly-studio lyrefly-studio--loading" aria-busy="true" aria-label="Loading your workbench">
        <p className="lyrefly-studio__loading">Loading your workbench…</p>
      </div>
    );
  }

  const total = columns.reduce((n, column) => n + column.rows.length, 0);

  return (
    <section className="lyrefly-studio" data-testid="lyrefly-workbench-board">
      <header className="lyrefly-studio__masthead">
        <h1 className="lyrefly-studio__title">Workbench</h1>
        <p className="lyrefly-studio__lede">
          {total === 0
            ? 'Nothing in progress. Start a comic from your shelf or sketchbook.'
            : `${total} comic${total === 1 ? '' : 's'} in progress.`}
        </p>
      </header>
      {total === 0 ? null : (
        <div className="lyrefly-board">
          {columns.map((column) => (
            <section
              key={column.stage}
              className="lyrefly-board__column"
              aria-labelledby={`lyrefly-board-${column.stage}`}
              data-testid={`lyrefly-board-${column.stage}`}
            >
              <h2 className="lyrefly-board__column-title" id={`lyrefly-board-${column.stage}`}>
                {column.label}
                <span className="lyrefly-board__count">{column.rows.length}</span>
              </h2>
              {column.rows.length === 0 ? null : (
                <ul className="lyrefly-board__list">
                  {column.rows.map((row) => (
                    <WorkbenchCard key={row.project.id} row={row} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
