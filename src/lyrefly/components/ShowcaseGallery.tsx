import { useEffect } from 'react';
import type { ReactElement } from 'react';

import { lyreflyDb } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { useLyreflyProjects } from '../hooks/useLyreflyProjects';
import { createBlankComicProject, createBlankScriptDocument, type ComicProject } from '../types';

export type ShowcaseGalleryProps = {
  onOpenProject: (projectId: string) => void;
  onOpenScript: (projectId: string) => void;
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
  script.markdown =
    '<ul><li>Page 1<ul><li>Opening<ul><li>Courier receives a sealed package.</li></ul></li></ul></li><li>Page 2<ul><li>Chase<ul><li>Neon alleys, pursuit.</li></ul></li></ul></li></ul>';
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
  onOpenProject,
  onOpenScript,
}: {
  project: ComicProject;
  onOpenProject: (id: string) => void;
  onOpenScript: (id: string) => void;
}): ReactElement {
  return (
    <li className="lyrefly-shelf__item">
      <article className="lyrefly-shelf__comic">
        <button
          type="button"
          className="lyrefly-shelf__open"
          onClick={() => onOpenProject(project.id)}
          aria-label={`Open ${project.title}`}
        >
          <div className="lyrefly-shelf__cover-wrap">
            <div className="lyrefly-shelf__cover" aria-hidden />
            <div className="lyrefly-shelf__ledge" aria-hidden />
          </div>
          <div className="lyrefly-shelf__info">
            <h2 className="lyrefly-shelf__title">{project.title}</h2>
            {project.subtitle ? <p className="lyrefly-shelf__subtitle">{project.subtitle}</p> : null}
            <div className="lyrefly-shelf__meta">
              <span className={`lyrefly-shelf__status lyrefly-shelf__status--${project.status}`}>
                {statusLabel(project.status)}
              </span>
              {project.pageCount != null ? (
                <span className="lyrefly-shelf__pages">{project.pageCount} pages</span>
              ) : null}
            </div>
          </div>
        </button>
        {project.modules.script ? (
          <button
            type="button"
            className="lyrefly-shelf__quick-link"
            onClick={() => onOpenScript(project.id)}
          >
            Continue script
          </button>
        ) : null}
      </article>
    </li>
  );
}

export function ShowcaseGallery({ onOpenProject, onOpenScript }: ShowcaseGalleryProps): ReactElement {
  const { projects, projectsHydrated } = useLyreflyProjects();

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

  if (!projectsHydrated) {
    return (
      <div className="lyrefly-studio lyrefly-studio--loading" aria-busy="true" aria-label="Loading showcase">
        <p className="lyrefly-studio__loading">Loading showcase…</p>
      </div>
    );
  }

  const empty = projects.length === 0;

  return (
    <section className="lyrefly-studio" data-testid="lyrefly-showcase">
      <header className="lyrefly-studio__masthead">
        <p className="lyrefly-studio__eyebrow">Your studio</p>
        <h1 className="lyrefly-studio__title">Showcase</h1>
        <p className="lyrefly-studio__lede">
          {empty
            ? 'A shelf for finished comics and works in progress.'
            : `${projects.length} comic${projects.length === 1 ? '' : 's'} on your shelf.`}
        </p>
      </header>

      {empty ? (
        <div className="lyrefly-studio__empty">
          <p>Start with a blank comic: brainstorm, script, draw, and publish at your own pace.</p>
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
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpenProject={onOpenProject}
                onOpenScript={onOpenScript}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
