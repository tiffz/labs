import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import {
  createBlankComicProject,
  createBlankScriptDocument,
  type ComicArtVersion,
  type ComicProject,
  type PageNode,
  type PageRevision,
} from '../types';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYGBgZGBg+A8EAAGGAQFk8kR6AAAAAElFTkSuQmCC';

function tinyPngFile(name: string): File {
  const bytes = Uint8Array.from(atob(TINY_PNG_BASE64), (char) => char.charCodeAt(0));
  return new File([bytes], name, { type: 'image/png', lastModified: Date.parse('2026-01-15T12:00:00.000Z') });
}

async function seedPage(
  project: ComicProject,
  displayName: string,
  layoutOrder: string[],
): Promise<{ project: ComicProject; node: PageNode; revision: PageRevision }> {
  const now = '2026-01-15T12:00:00.000Z';
  const node: PageNode = {
    id: crypto.randomUUID(),
    projectId: project.id,
    displayName,
    isSpread: false,
    activeRevisionId: null,
    revisionIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const revision: PageRevision = {
    id: crypto.randomUUID(),
    pageNodeId: node.id,
    label: 'v1',
    stage: 'other',
    fileName: `${displayName.replace(/\s+/g, '-').toLowerCase()}.png`,
    mimeType: 'image/png',
    width: 10,
    height: 10,
    byteSize: 100,
    importedAt: now,
    createdAt: now,
  };
  node.revisionIds = [revision.id];
  node.activeRevisionId = revision.id;
  await lyreflyDb.pageNodes.put(node);
  await lyreflyDb.pageRevisions.put(revision);
  await lyreflyDb.revisionBlobs.put({ revisionId: revision.id, blob: tinyPngFile(revision.fileName) });
  await markLyreflyDirtyRow('page_node', node.id, 'upsert', project.id);
  await markLyreflyDirtyRow('page_revision', revision.id, 'upsert', project.id);
  layoutOrder.push(node.id);
  return { project, node, revision };
}

const E2E_PROJECT_ID = 'e2e00000-0000-4000-8000-00000e2e0001';

/** Deterministic Lyrefly fixture for smoke + visual regression (`?e2eSeed=1`). */
export async function seedLyreflyE2eProjectIfEmpty(): Promise<ComicProject | null> {
  const existing = await lyreflyDb.projects.get(E2E_PROJECT_ID);
  if (existing) return existing;

  const count = await lyreflyDb.projects.count();
  if (count > 0) {
    return (await lyreflyDb.projects.toCollection().first()) ?? null;
  }

  const project = createBlankComicProject();
  project.id = E2E_PROJECT_ID;
  project.title = 'Midnight Courier';
  project.subtitle = '8-page sci-fi zine';
  project.status = 'wip';
  project.brainstormHtml = '<p>Neon alleys, sealed packages, and a courier who never looks back.</p>';
  const script = createBlankScriptDocument(project.id);
  script.id = project.scriptDocumentId;
  script.markdown = '# Midnight Courier\n\nPAGE 1\n\nA sealed package crosses neon rain.';

  const layoutOrder: string[] = [];
  const pageLabels = ['Front Cover', 'Page 1', 'Page 2', 'Page 3', 'Page 4', 'Page 5', 'Page 6', 'Back Cover'];
  const seededNodes: PageNode[] = [];
  const seededRevisions: PageRevision[] = [];

  for (const label of pageLabels) {
    const seeded = await seedPage(project, label, layoutOrder);
    seededNodes.push(seeded.node);
    seededRevisions.push(seeded.revision);
  }

  const pageRevisions = Object.fromEntries(
    seededNodes.map((node) => [node.id, node.activeRevisionId!]),
  );
  const version: ComicArtVersion = {
    id: crypto.randomUUID(),
    projectId: project.id,
    label: 'Draft 1',
    source: 'upload',
    pageRevisions,
    completedAt: '2026-01-15T12:00:00.000Z',
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
  };

  project.layoutOrder = layoutOrder;
  project.pageCount = layoutOrder.length;
  project.artVersionIds = [version.id];
  project.finalArtVersionId = version.id;

  await lyreflyDb.transaction(
    'rw',
    lyreflyDb.projects,
    lyreflyDb.scriptDocuments,
    lyreflyDb.artVersions,
    async () => {
      await lyreflyDb.projects.put(project);
      await lyreflyDb.scriptDocuments.put(script);
      await lyreflyDb.artVersions.put(version);
    },
  );
  await saveLyreflyProject(project);
  notifyLyreflyLocalChange({ immediate: true });
  return project;
}

export const LYREFLY_E2E_PROJECT_ID = E2E_PROJECT_ID;

export async function getLyreflyE2eProjectId(): Promise<string | null> {
  const project = await lyreflyDb.projects.get(E2E_PROJECT_ID);
  return project?.id ?? null;
}
