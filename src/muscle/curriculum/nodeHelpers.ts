import type { ArtisticContext, MuscleMemoryNode, MuscleRegion, PrimitiveShape } from '../types/node';

export function node(
  partial: Omit<MuscleMemoryNode, 'artisticContext'> & { artisticContext: ArtisticContext },
): MuscleMemoryNode {
  return partial;
}

export function bone(
  id: string,
  name: string,
  region: MuscleRegion,
  shape: PrimitiveShape,
  ctx: ArtisticContext,
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
    artisticContext: ctx,
    ...extras,
  });
}

export function muscle(
  id: string,
  name: string,
  region: MuscleRegion,
  layerDepth: 0 | 1 | 2,
  shape: PrimitiveShape,
  ctx: ArtisticContext,
  extras: Partial<MuscleMemoryNode> = {},
): MuscleMemoryNode {
  return node({
    id,
    name,
    type: 'muscle',
    region,
    layerDepth,
    isSurfaceForm: true,
    primitiveShape: shape,
    artisticContext: ctx,
    ...extras,
  });
}

export function joint(
  id: string,
  name: string,
  region: MuscleRegion,
  jointType: MuscleMemoryNode['jointType'],
  ctx: ArtisticContext,
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
    artisticContext: ctx,
    ...extras,
  });
}
