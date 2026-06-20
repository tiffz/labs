import { getNodesForRegion } from '../curriculum';
import type { MuscleRegion } from '../types/node';

/** Curriculum node ids in a region that have no entry in the region manifest. */
export function curriculumIdsMissingFromManifest(
  region: MuscleRegion,
  manifestNodeIds: ReadonlySet<string>,
): string[] {
  return getNodesForRegion(region)
    .filter((node) => !node.atlasOnly)
    .map((node) => node.id)
    .filter((id) => !manifestNodeIds.has(id));
}
