import type { GestureDriveEnvelopeV1 } from './gestureDriveEnvelope';
import type { GestureDriveMergeOptions } from './gestureDriveMerge';
import {
  getTombstonedFileIds,
  getTombstonedFolderIds,
  unionGestureDriveTombstones,
} from './gestureDriveTombstones';

/** Union remote tombstones into local storage, then build merge filter sets. */
export function prepareGestureDriveMerge(envelope: GestureDriveEnvelopeV1 | null): GestureDriveMergeOptions {
  if (envelope) {
    unionGestureDriveTombstones({
      deletedDriveFolderIds: envelope.deletedDriveFolderIds,
      deletedDriveFileIds: envelope.deletedDriveFileIds,
    });
  }
  return {
    tombstonedFolderIds: getTombstonedFolderIds(),
    tombstonedFileIds: getTombstonedFileIds(),
  };
}
