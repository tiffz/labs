import { classifyDriveCopyFailure } from '../../shared/drive/copyDriveFileToMyDrive';
import { driveCreateShortcut } from '../../shared/drive/driveFetch';
import {
  describeDriveFileImportRejection,
  executeDriveFileImport,
  planDriveFileImport,
} from '../../shared/drive/importDriveFile';
import { ensureOriginalsDriveLayout } from './drive/originalsSharded';
import { isOriginalsTakeMediaFile } from './originalsSongFileDrag';
import type { OriginalAudioTake } from './types';

export type OriginalTakeDriveImportResult =
  | { ok: true; take: OriginalAudioTake; via: 'reference' | 'copy' }
  | { ok: false; message: string };

const WHAT = 'an audio or video file';

/**
 * Turn a pasted Google Drive link into a take, by the shared rule (ADR 0029): a file the user owns
 * is referenced where it is, a file someone else owns is copied into the Originals audio folder.
 *
 * Nothing is returned until the take is safe to store. A copy finishes first, so a failed or
 * abandoned copy leaves no take pointing at a stranger's file. The source still exists in Drive
 * while it runs, so unlike a device recording there is no unique work to protect locally.
 *
 * A reference never edits the original. Encore adds a shortcut in its own audio folder so the take
 * shows up in the Encore tree, the same as performance videos; that write is best-effort.
 */
export async function importOriginalTakeFromDrive(
  raw: string,
  opts: {
    accessToken: string;
    existingTakes: readonly OriginalAudioTake[];
    /** Broader read access for builds whose session cannot read a friend's file. User gesture only. */
    requestReadAccess?: () => Promise<string>;
  }
): Promise<OriginalTakeDriveImportResult> {
  const planned = await planDriveFileImport(opts.accessToken, raw, {
    accepts: ({ name, mimeType }) =>
      isOriginalsTakeMediaFile({ name, type: mimeType ?? '' }),
  });
  if (!planned.ok)
    return {
      ok: false,
      message: describeDriveFileImportRejection(planned.reason, WHAT),
    };
  const { plan } = planned;

  if (
    plan.kind === 'reference' &&
    opts.existingTakes.some((t) => t.driveFileId === plan.fileId)
  ) {
    return { ok: false, message: 'That file is already one of these takes.' };
  }

  const layout = await ensureOriginalsDriveLayout(opts.accessToken);
  let result;
  try {
    result = await executeDriveFileImport(plan, {
      accessToken: opts.accessToken,
      parentFolderId: layout.audioFolderId,
      requestReadAccess: opts.requestReadAccess,
    });
  } catch (error) {
    const reason = classifyDriveCopyFailure(error);
    return {
      ok: false,
      message:
        reason === 'no-access' || reason === 'not-found'
          ? "Couldn't read that file to copy it. Check that this Google account can open the link."
          : "Couldn't copy that file to your Drive. Check your connection and Drive storage, then try again.",
    };
  }

  if (result.via === 'reference') {
    try {
      await driveCreateShortcut(
        opts.accessToken,
        plan.name,
        layout.audioFolderId,
        result.fileId
      );
    } catch {
      // Organisation only: the take plays from the original either way, so a missing shortcut must
      // not cost the user the take they just added.
    }
  }

  const take: OriginalAudioTake = {
    id: crypto.randomUUID(),
    label: result.name || plan.name,
    timestamp: Date.now(),
    source: 'imported',
    driveFileId: result.fileId,
  };
  if (plan.mimeType) take.mimeType = plan.mimeType;
  return {
    ok: true,
    take,
    via: result.via === 'reference' ? 'reference' : 'copy',
  };
}
