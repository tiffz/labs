import { getNodeById } from './index';
import {
  collectNodeIdsFromGroup,
  getStudyGroupsForModule,
  isStudyGroupNodeRef,
  STUDY_GROUPS_BY_MODULE,
  type StudyGroup,
} from './studyGroups';
import type { MuscleRegion } from '../types/node';

function walkGroups(
  groups: readonly StudyGroup[],
  nodeId: string,
  minMembers: number,
  best: { group: StudyGroup; size: number } | null,
): { group: StudyGroup; size: number } | null {
  let result = best;
  for (const group of groups) {
    const ids = collectNodeIdsFromGroup(group);
    if (ids.includes(nodeId) && ids.length >= minMembers) {
      if (!result || ids.length < result.size) {
        result = { group, size: ids.length };
      }
    }
    const nested = group.children.filter((c): c is StudyGroup => !isStudyGroupNodeRef(c));
    result = walkGroups(nested, nodeId, minMembers, result);
  }
  return result;
}

/** Smallest study group (≥ minMembers) containing this node — used for group-first hover and focus. */
export function findMultiMemberStudyGroupForNode(
  nodeId: string,
  options?: { moduleId?: MuscleRegion; minMembers?: number },
): StudyGroup | undefined {
  const minMembers = options?.minMembers ?? 2;
  const allModules = Object.keys(STUDY_GROUPS_BY_MODULE) as MuscleRegion[];
  const node = getNodeById(nodeId);
  const moduleOrder: MuscleRegion[] = options?.moduleId
    ? [options.moduleId]
    : node
      ? [node.region, ...allModules.filter((id) => id !== node.region)]
      : allModules;

  let best: { group: StudyGroup; size: number } | null = null;
  for (const moduleId of moduleOrder) {
    best = walkGroups(getStudyGroupsForModule(moduleId), nodeId, minMembers, best);
  }
  return best?.group;
}

export function collectStudyGroupIdsForNode(
  nodeId: string,
  options?: { moduleId?: MuscleRegion; minMembers?: number },
): string[] | null {
  const group = findMultiMemberStudyGroupForNode(nodeId, options);
  if (!group) return null;
  return collectNodeIdsFromGroup(group);
}
