import manifestJson from '../../../../public/muscle/models/manifest.json';

type MuscleManifestWithRevision = typeof manifestJson & { assetRevision?: string };

const manifest = manifestJson as MuscleManifestWithRevision;

/** Append manifest revision so drei GLTF cache refreshes after Z-Anatomy re-exports. */
export function muscleRegionGlbUrl(baseUrl: string): string {
  const rev = manifest.assetRevision ?? String(manifest.version);
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}v=${rev}`;
}
