import { clearUploadManifestForPack } from './gesturePackUpload';
import { clearUploadDirectoryHandle } from './gestureUploadDirectoryHandle';
import { clearUploadStagingForPack } from './gestureUploadStaging';

/** Remove local upload recovery artifacts (manifest, picker handle, staged blobs). */
export async function clearUploadRecoveryForPack(packId: string): Promise<void> {
  await clearUploadManifestForPack(packId);
  await clearUploadDirectoryHandle(packId);
  await clearUploadStagingForPack(packId);
}
