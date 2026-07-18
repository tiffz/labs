import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import { seedLyreflyE2eProjectIfEmpty } from '../e2e/lyreflyE2eSeed';
import { useLyreflyProjects } from '../hooks/useLyreflyProjects';
import { useLyreflyShelfPreviews, workflowStageShelfLabel } from '../hooks/useLyreflyShelfPreviews';
import { createBlankComicProject, createBlankScriptDocument, type ComicProject } from '../types';
import { isLyreflyProjectArchived } from '../workflow/lyreflyProjectProgress';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { LYREFLY_WORKFLOW_STAGES } from '../workflow/lyreflyWorkflowStages';
import {
  EMPTY_LYREFLY_SHELF_FILTERS,
  filterLyreflyShelfRows,
  readLyreflyShelfViewMode,
  sortLyreflyShelfRows,
  writeLyreflyShelfViewMode,
  type LyreflyShelfFilterState,
  type LyreflyShelfRow,
  type LyreflyShelfViewMode,
} from '../utils/lyreflyShelfFilters';
import { LyreflySearchHighlight } from './LyreflySearchHighlight';
import { LyreflyShelfCover } from './LyreflyShelfCover';
import { GalleryPipelineQueue } from './SketchbookTab';
import { ShowcaseComicsTable } from './ShowcaseComicsTable';

export type ShowcaseGalleryProps = {
  onOpenProject: (projectId: string) => void;
  onOpenProfile: (projectId: string) => void;
};

async function seedDemoProjectIfEmpty(): Promise<void> {
  await seedLyreflyE2eProjectIfEmpty();
}

function ProjectCard({
  project,
  coverRevisionId,
  conceptAssetId,
  workflowStage,
  searchQuery,
  onOpen,
}: {
  project: ComicProject;
  coverRevisionId?: string;
  conceptAssetId?: string;
  workflowStage: LyreflyWorkflowStage;
  searchQuery: string;
  onOpen: (id: string) => void;
}): ReactElement {
  const archived = isLyreflyProjectArchived(project);
  return (
    <li className="lyrefly-shelf__item">
      <article className="lyrefly-shelf__comic">
        <button
          type="button"
          className="lyrefly-shelf__open"
          onClick={() => onOpen(project.id)}
          aria-label={`Open ${project.title}`}
        >
          <div className="lyrefly-shelf__cover-wrap">
            <LyreflyShelfCover
              project={project}
              coverRevisionId={coverRevisionId}
              conceptAssetId={conceptAssetId}
            />
          </div>
          <div className="lyrefly-shelf__info">
            <h2 className="lyrefly-shelf__title">
              <LyreflySearchHighlight text={project.title} query={searchQuery} />
            </h2>
            {project.subtitle ? (
              <p className="lyrefly-shelf__subtitle">
                <LyreflySearchHighlight text={project.subtitle} query={searchQuery} />
              </p>
            ) : null}
            <div className="lyrefly-shelf__meta">
              <span className="lyrefly-shelf__stage-pill">{workflowStageShelfLabel(workflowStage)}</span>
              {archived ? (
                <span className="lyrefly-shelf__status lyrefly-shelf__status--archived">Archived</span>
              ) : null}
              {project.pageCount != null ? (
                <span className="lyrefly-shelf__pages">{project.pageCount} pages</span>
              ) : null}
            </div>
          </div>
        </button>
      </article>
    </li>
  );
}

export function ShowcaseGallery({ onOpenProject, onOpenProfile }: ShowcaseGalleryProps): ReactElement {
  const { projects, projectsHydrated } = useLyreflyProjects();
  const { previewByProject } = useLyreflyShelfPreviews(projects);
  const [filters, setFilters] = useState<LyreflyShelfFilterState>(() => ({
    ...EMPTY_LYREFLY_SHELF_FILTERS,
  }));
  const [viewMode, setViewMode] = useState<LyreflyShelfViewMode>(() => readLyreflyShelfViewMode());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('e2eSeed') === '1') {
      void seedDemoProjectIfEmpty();
    }
  }, []);

  useEffect(() => {
    writeLyreflyShelfViewMode(viewMode);
  }, [viewMode]);

  const rows: LyreflyShelfRow[] = useMemo(
    () =>
      projects.map((project) => {
        const preview = previewByProject.get(project.id);
        return {
          project,
          workflowStage: preview?.workflowStage ?? 'brainstorm',
          publishLogCount: preview?.publishLogCount ?? 0,
          coverRevisionId: preview?.coverRevisionId,
          conceptAssetId: preview?.conceptAssetId,
        };
      }),
    [projects, previewByProject],
  );

  const filteredRows = useMemo(() => filterLyreflyShelfRows(rows, filters), [rows, filters]);
  const gridRows = useMemo(
    () => sortLyreflyShelfRows(filteredRows, 'updatedAt', 'desc'),
    [filteredRows],
  );

  const handleNewProject = async (): Promise<void> => {
    const project = createBlankComicProject();
    const script = createBlankScriptDocument(project.id);
    script.id = project.scriptDocumentId;
    await lyreflyDb.scriptDocuments.put(script);
    await markLyreflyDirtyRow('script', script.id, 'upsert', project.id);
    await saveLyreflyProject(project, { immediate: true });
    onOpenProject(project.id);
  };

  const handleOpenComic = (projectId: string): void => {
    const preview = previewByProject.get(projectId);
    if ((preview?.publishLogCount ?? 0) > 0) {
      onOpenProfile(projectId);
      return;
    }
    onOpenProject(projectId);
  };

  if (!projectsHydrated) {
    return (
      <div className="lyrefly-studio lyrefly-studio--loading" aria-busy="true" aria-label="Loading your comics">
        <p className="lyrefly-studio__loading">Loading your comics…</p>
      </div>
    );
  }

  const empty = projects.length === 0;

  return (
    <section className="lyrefly-studio" data-testid="lyrefly-showcase">
      <header className="lyrefly-studio__masthead">
        <h1 className="lyrefly-studio__title">Your comics</h1>
        <p className="lyrefly-studio__lede">
          {empty
            ? 'A quiet shelf for finished comics and brave works in progress.'
            : `${projects.length} comic${projects.length === 1 ? '' : 's'} on your shelf.`}
        </p>
      </header>

      <GalleryPipelineQueue />

      {empty ? (
        <div className="lyrefly-studio__empty">
          <p>Your shelf is waiting for its first comic. Start blank and move at your own pace.</p>
          <button type="button" className="lyrefly-studio__cta" onClick={() => void handleNewProject()}>
            New comic
          </button>
        </div>
      ) : (
        <>
          <div className="lyrefly-shelf-toolbar" data-testid="lyrefly-shelf-toolbar">
            <TextField
              size="small"
              label="Search"
              value={filters.query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              className="lyrefly-shelf-toolbar__search"
            />
            <TextField
              select
              size="small"
              label="Stage"
              value={filters.stage}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  stage: event.target.value as LyreflyShelfFilterState['stage'],
                }))
              }
              className="lyrefly-shelf-toolbar__select"
            >
              <MenuItem value="">All stages</MenuItem>
              {LYREFLY_WORKFLOW_STAGES.map((step) => (
                <MenuItem key={step.id} value={step.id}>
                  {step.label}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              className="lyrefly-shelf-toolbar__archived"
              control={
                <Switch
                  size="small"
                  checked={filters.showArchived}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, showArchived: event.target.checked }))
                  }
                  inputProps={{ 'aria-label': 'Show archived comics' }}
                />
              }
              label="Show archived"
            />
            <ToggleButtonGroup
              exclusive
              size="small"
              value={viewMode}
              onChange={(_, next: LyreflyShelfViewMode | null) => {
                if (next) setViewMode(next);
              }}
              aria-label="Comics layout"
              className="lyrefly-shelf-toolbar__view"
            >
              <Tooltip title="Shelf view">
                <ToggleButton value="grid" aria-label="Shelf view" data-testid="lyrefly-shelf-view-grid">
                  <GridViewIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Table view">
                <ToggleButton value="table" aria-label="Table view" data-testid="lyrefly-shelf-view-table">
                  <ViewListIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          </div>

          {filteredRows.length === 0 ? (
            <p className="lyrefly-shelf-empty-filter" data-testid="lyrefly-shelf-empty-filter">
              No comics match these filters.
            </p>
          ) : viewMode === 'table' ? (
            <ShowcaseComicsTable
              rows={filteredRows}
              searchQuery={filters.query}
              onOpen={handleOpenComic}
            />
          ) : (
            <div className="lyrefly-shelf">
              <ul className="lyrefly-shelf__grid">
                <li className="lyrefly-shelf__item lyrefly-shelf__item--add">
                  <button
                    type="button"
                    className="lyrefly-shelf__add"
                    onClick={() => void handleNewProject()}
                    aria-label="New comic"
                  >
                    <span className="lyrefly-shelf__add-icon" aria-hidden>
                      +
                    </span>
                    <span className="lyrefly-shelf__add-label">New comic</span>
                  </button>
                </li>
                {gridRows.map(
                  ({ project, coverRevisionId, conceptAssetId, workflowStage }) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      coverRevisionId={coverRevisionId}
                      conceptAssetId={conceptAssetId}
                      workflowStage={workflowStage}
                      searchQuery={filters.query}
                      onOpen={handleOpenComic}
                    />
                  ),
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
