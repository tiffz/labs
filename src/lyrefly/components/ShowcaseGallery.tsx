import { useEffect } from 'react';
import type { ReactElement } from 'react';

import { lyreflyDb } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { useLyreflyProjects } from '../hooks/useLyreflyProjects';
import { useLyreflyShelfPreviews, workflowStageShelfLabel } from '../hooks/useLyreflyShelfPreviews';
import { createBlankComicProject, createBlankScriptDocument, type ComicProject } from '../types';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { LyreflyShelfCover } from './LyreflyShelfCover';

export type ShowcaseGalleryProps = {
  onOpenProject: (projectId: string) => void;
  onOpenProfile: (projectId: string) => void;
};

async function seedDemoProjectIfEmpty(): Promise<void> {
  const count = await lyreflyDb.projects.count();
  if (count > 0) return;
  const project = createBlankComicProject();
  project.title = 'Midnight Courier';
  project.subtitle = '8-page sci-fi zine';
  project.status = 'wip';
  project.brainstormHtml = '<p>Neon alleys, sealed packages, and a courier who never looks back.</p>';
  const script = createBlankScriptDocument(project.id);
  script.id = project.scriptDocumentId;
  await lyreflyDb.transaction('rw', lyreflyDb.projects, lyreflyDb.scriptDocuments, async () => {
    await lyreflyDb.projects.put(project);
    await lyreflyDb.scriptDocuments.put(script);
  });
  notifyLyreflyLocalChange({ immediate: true });
}

function statusLabel(status: ComicProject['status']): string {
  if (status === 'wip') return 'In progress';
  if (status === 'finished') return 'Finished';
  if (status === 'archived') return 'Archived';
  return 'Draft';
}

function ProjectCard({
  project,
  coverRevisionId,
  conceptAssetId,
  workflowStage,
  onOpen,
}: {
  project: ComicProject;
  coverRevisionId?: string;
  conceptAssetId?: string;
  workflowStage: LyreflyWorkflowStage;
  onOpen: (id: string) => void;
}): ReactElement {
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
            <h2 className="lyrefly-shelf__title">{project.title}</h2>
            {project.subtitle ? <p className="lyrefly-shelf__subtitle">{project.subtitle}</p> : null}
            <div className="lyrefly-shelf__meta">
              <span className={`lyrefly-shelf__status lyrefly-shelf__status--${project.status}`}>
                {statusLabel(project.status)}
              </span>
              <span className="lyrefly-shelf__stage">{workflowStageShelfLabel(workflowStage)}</span>
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('e2eSeed') === '1') {
      void seedDemoProjectIfEmpty();
    }
  }, []);

  const handleNewProject = async (): Promise<void> => {
    const project = createBlankComicProject();
    const script = createBlankScriptDocument(project.id);
    script.id = project.scriptDocumentId;
    await lyreflyDb.transaction('rw', lyreflyDb.projects, lyreflyDb.scriptDocuments, async () => {
      await lyreflyDb.projects.put(project);
      await lyreflyDb.scriptDocuments.put(script);
    });
    notifyLyreflyLocalChange();
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

      {empty ? (
        <div className="lyrefly-studio__empty">
          <p>Your shelf is waiting for its first comic. Start blank and move at your own pace.</p>
          <button type="button" className="lyrefly-studio__cta" onClick={() => void handleNewProject()}>
            New comic
          </button>
        </div>
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
            {projects.map((project) => {
              const preview = previewByProject.get(project.id);
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  coverRevisionId={preview?.coverRevisionId}
                  conceptAssetId={preview?.conceptAssetId}
                  workflowStage={preview?.workflowStage ?? 'brainstorm'}
                  onOpen={handleOpenComic}
                />
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
