import { useLiveQuery } from 'dexie-react-hooks';

import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import { lyreflyDb } from '../db/lyreflyDb';
import type { ComicProject, PageNode, VisualDevAsset } from '../types';
import { inferredWorkflowStage } from '../workflow/lyreflyWorkflowCompletion';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { LYREFLY_WORKFLOW_STAGES } from '../workflow/lyreflyWorkflowStages';

export type LyreflyShelfPreview = {
  /** Active revision on the cover page, when art exists. */
  coverRevisionId?: string;
  /** Newest concept-art fallback when no cover page art. */
  conceptAssetId?: string;
  workflowStage: LyreflyWorkflowStage;
  publishLogCount: number;
};

function isConceptPreviewAsset(asset: VisualDevAsset): boolean {
  return asset.kind === 'image' || asset.kind === 'sketch';
}

function isFrontCoverNode(node: PageNode): boolean {
  const name = (node.displayName ?? '').trim().toLowerCase();
  return name === 'front cover' || name === 'front' || name === 'cover';
}

function pickCoverRevisionId(project: ComicProject, pageNodes: PageNode[]): string | undefined {
  const byId = new Map(pageNodes.map((node) => [node.id, node]));
  const ordered = project.layoutOrder
    .map((id) => byId.get(id))
    .filter((node): node is PageNode => Boolean(node));

  const frontNode = ordered.find(isFrontCoverNode) ?? ordered[0];
  return frontNode?.activeRevisionId ?? undefined;
}

export function workflowStageShelfLabel(stage: LyreflyWorkflowStage): string {
  return LYREFLY_WORKFLOW_STAGES.find((step) => step.id === stage)?.label ?? stage;
}

export function useLyreflyShelfPreviews(projects: ComicProject[]): {
  previewByProject: Map<string, LyreflyShelfPreview>;
  previewsHydrated: boolean;
} {
  const key = projects
    .map((project) => project.id)
    .slice()
    .sort()
    .join(',');
  const raw = useLiveQuery(async () => {
    if (projects.length === 0) return new Map<string, LyreflyShelfPreview>();
    const idSet = new Set(projects.map((project) => project.id));

    const [pageNodes, revisions, visualAssets, scripts, archives] = await Promise.all([
      lyreflyDb.pageNodes.toArray(),
      lyreflyDb.pageRevisions.toArray(),
      lyreflyDb.visualDevAssets.toArray(),
      lyreflyDb.scriptDocuments.toArray(),
      lyreflyDb.archives.toArray(),
    ]);

    const revisionsByProject = new Map<string, number>();
    for (const revision of revisions) {
      const node = pageNodes.find((entry) => entry.id === revision.pageNodeId);
      if (!node || !idSet.has(node.projectId)) continue;
      revisionsByProject.set(node.projectId, (revisionsByProject.get(node.projectId) ?? 0) + 1);
    }

    const newestConceptByProject = new Map<string, string>();
    const visualCountByProject = new Map<string, number>();
    const sortedConcepts = visualAssets
      .filter((asset) => idSet.has(asset.projectId) && isConceptPreviewAsset(asset))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const asset of sortedConcepts) {
      visualCountByProject.set(asset.projectId, (visualCountByProject.get(asset.projectId) ?? 0) + 1);
      if (!newestConceptByProject.has(asset.projectId)) {
        newestConceptByProject.set(asset.projectId, asset.id);
      }
    }

    const scriptByProject = new Map(scripts.map((doc) => [doc.projectId, doc]));
    const archiveByProject = new Map(archives.map((archive) => [archive.projectId, archive]));
    const pageNodesByProject = new Map<string, PageNode[]>();
    for (const node of pageNodes) {
      if (!idSet.has(node.projectId)) continue;
      const list = pageNodesByProject.get(node.projectId) ?? [];
      list.push(node);
      pageNodesByProject.set(node.projectId, list);
    }

    const map = new Map<string, LyreflyShelfPreview>();
    for (const project of projects) {
      const projectNodes = pageNodesByProject.get(project.id) ?? [];
      const script = scriptByProject.get(project.id);
      const archive = archiveByProject.get(project.id);
      const workflowStage = inferredWorkflowStage(project, {
        script,
        visualDevCount: visualCountByProject.get(project.id) ?? 0,
        pageNodeCount: projectNodes.length,
        revisionCount: revisionsByProject.get(project.id) ?? 0,
        archive,
      });

      map.set(project.id, {
        coverRevisionId: pickCoverRevisionId(project, projectNodes),
        conceptAssetId: newestConceptByProject.get(project.id),
        workflowStage,
        publishLogCount: archive?.publishLog.length ?? 0,
      });
    }

    return map;
  }, [key]);

  const { value, hydrated } = resolveDexieLiveQuery(raw, new Map<string, LyreflyShelfPreview>());
  return { previewByProject: value, previewsHydrated: hydrated };
}
