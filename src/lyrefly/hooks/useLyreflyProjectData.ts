import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import { lyreflyDb } from '../db/lyreflyDb';
import type { ComicArchiveBinder, ComicProject, PageNode, PageRevision, ScriptDocument, VisualDevAsset } from '../types';
import type { LyreflyStageCompletionContext } from '../workflow/lyreflyWorkflowCompletion';

export function useLyreflyProject(projectId: string | null): {
  project: ComicProject | null;
  projectHydrated: boolean;
} {
  const raw = useLiveQuery(
    () => (projectId ? lyreflyDb.projects.get(projectId) : undefined),
    [projectId],
  );
  const { value, hydrated } = resolveDexieLiveQuery(raw, null);
  return { project: value, projectHydrated: hydrated };
}

export function useLyreflyScriptDocument(documentId: string | null): {
  script: ScriptDocument | null;
  scriptHydrated: boolean;
} {
  const raw = useLiveQuery(
    () => (documentId ? lyreflyDb.scriptDocuments.get(documentId) : undefined),
    [documentId],
  );
  const { value, hydrated } = resolveDexieLiveQuery(raw, null);
  return { script: value, scriptHydrated: hydrated };
}

export function useLyreflyVisualDevAssets(projectId: string | null): {
  assets: VisualDevAsset[];
  assetsHydrated: boolean;
} {
  const raw = useLiveQuery(
    async () => {
      if (!projectId) return [] as VisualDevAsset[];
      return lyreflyDb.visualDevAssets.where('projectId').equals(projectId).toArray();
    },
    [projectId],
  );
  const { value, hydrated } = resolveDexieLiveQuery(raw, []);
  return { assets: value, assetsHydrated: hydrated };
}

export function useLyreflyPageNodes(projectId: string | null): {
  pageNodes: PageNode[];
  pageNodesHydrated: boolean;
} {
  const raw = useLiveQuery(
    async () => {
      if (!projectId) return [] as PageNode[];
      return lyreflyDb.pageNodes.where('projectId').equals(projectId).toArray();
    },
    [projectId],
  );
  const { value, hydrated } = resolveDexieLiveQuery(raw, []);
  return { pageNodes: value, pageNodesHydrated: hydrated };
}

export function useLyreflyPageRevisions(pageNodeIds: readonly string[]): {
  revisions: PageRevision[];
  revisionsHydrated: boolean;
} {
  const key = pageNodeIds.join('\0');
  const raw = useLiveQuery(async () => {
    if (pageNodeIds.length === 0) return [] as PageRevision[];
    const rows = await lyreflyDb.pageRevisions.where('pageNodeId').anyOf([...pageNodeIds]).toArray();
    return rows;
  }, [key]);
  const { value, hydrated } = resolveDexieLiveQuery(raw, []);
  return { revisions: value, revisionsHydrated: hydrated };
}

export function useLyreflyArchive(archiveId: string | null | undefined): {
  archive: ComicArchiveBinder | null;
  archiveHydrated: boolean;
} {
  const raw = useLiveQuery(
    () => (archiveId ? lyreflyDb.archives.get(archiveId) : undefined),
    [archiveId],
  );
  const { value, hydrated } = resolveDexieLiveQuery(raw, null);
  return { archive: value, archiveHydrated: hydrated };
}

export function useLyreflyStageContext(project: ComicProject | null): LyreflyStageCompletionContext {
  const { script } = useLyreflyScriptDocument(project?.scriptDocumentId ?? null);
  const { assets } = useLyreflyVisualDevAssets(project?.id ?? null);
  const { pageNodes } = useLyreflyPageNodes(project?.id ?? null);
  const pageNodeIds = useMemo(() => pageNodes.map((n) => n.id), [pageNodes]);
  const { revisions } = useLyreflyPageRevisions(pageNodeIds);
  const { archive } = useLyreflyArchive(project?.archiveId);

  return useMemo(
    () => ({
      script,
      visualDevCount: assets.length,
      pageNodeCount: pageNodes.length,
      finalRevisionCount: revisions.filter((r) => r.stage === 'final').length,
      archive,
    }),
    [script, assets.length, pageNodes.length, revisions, archive],
  );
}
