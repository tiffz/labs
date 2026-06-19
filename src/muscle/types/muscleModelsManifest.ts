import manifestJson from '../../../public/muscle/models/manifest.json';

export type MuscleManifestMesh = {
  nodeId: string;
  triangleCount?: number;
};

export type MuscleManifestRegion = {
  source?: string;
  procedural?: boolean;
  glbUrl: string;
  meshes?: MuscleManifestMesh[];
};

export type MuscleModelsManifest = {
  version: number;
  regions: Record<string, MuscleManifestRegion>;
};

export const muscleModelsManifest = manifestJson as MuscleModelsManifest;
