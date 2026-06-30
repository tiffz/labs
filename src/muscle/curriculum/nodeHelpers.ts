import type { MuscleMemoryNode, MuscleRegion, StructureDetails } from '../types/node';
import { getStructureDetails } from './structureDetailsCatalog';

export function node(
  partial: Omit<MuscleMemoryNode, 'details'> & { details?: StructureDetails },
): MuscleMemoryNode {
  const details = partial.details ?? getStructureDetails(partial.id, partial.name);
  return { ...partial, details };
}

export function bone(
  id: string,
  name: string,
  region: MuscleRegion,
  shape: PrimitiveShape,
  extras: Partial<MuscleMemoryNode> = {},
): MuscleMemoryNode {
  return node({
    id,
    name,
    type: 'bone',
    region,
    layerDepth: 3,
    isSurfaceForm: extras.isSurfaceForm ?? true,
    primitiveShape: shape,
    ...extras,
  });
}

export function muscle(
  id: string,
  name: string,
  region: MuscleRegion,
  layerDepth: 0 | 1 | 2,
  shape: PrimitiveShape,
  extras: Partial<MuscleMemoryNode> = {},
): MuscleMemoryNode {
  return node({
    id,
    name,
    type: 'muscle',
    region,
    layerDepth,
    isSurfaceForm: extras.isSurfaceForm ?? true,
    primitiveShape: shape,
    ...extras,
  });
}

export function joint(
  id: string,
  name: string,
  region: MuscleRegion,
  jointType: MuscleMemoryNode['jointType'],
  extras: Partial<MuscleMemoryNode> = {},
): MuscleMemoryNode {
  return node({
    id,
    name,
    type: 'joint',
    region,
    layerDepth: 3,
    isSurfaceForm: false,
    jointType,
    primitiveShape: 'sphere',
    ...extras,
  });
}

type PrimitiveShape = MuscleMemoryNode['primitiveShape'];