import { classifyDriveCopyFailure } from '../../shared/drive/copyDriveFileToMyDrive';
import { driveCreateShortcut } from '../../shared/drive/driveFetch';
import {
  describeDriveFileImportRejection,
  executeDriveFileImport,
  planDriveFileImport,
  type DriveFileImportPlan,
} from '../../shared/drive/importDriveFile';
import { ensureOriginalsDriveLayout } from './drive/originalsSharded';
import { isOriginalsTakeMediaFile } from './originalsSongFileDrag';
import type { OriginalAudioTake } from './types';

const WHAT = 'an audio or video file';

/**
 * Two halves, so the user reviews before anything is written (ADR 0030):
 *
 *  1. {@link checkOriginalTakeDriveLink} runs while the link is staged. Metadata only, no writes.
 *  2. {@link commitOriginalTakeDriveLink} runs when the user confirms.
 *
 * By the shared rule (ADR 0029), a file the user owns is referenced where it is and a file someone
 * else owns is copied into the Originals audio folder. A reference never edits the original;
 * Encore only adds a shortcut in its own audio folder, best-effort, as it does for performances.
 */
export type OriginalTakeDriveCheck =
  | { ok: true; plan: DriveFileImportPlan; outcome: string }
  | { ok: false; name: string; message: string };

export async function checkOriginalTakeDriveLink(
  raw: string,
  opts: { accessToken: string; existingTakes: readonly OriginalAudioTake[] },
): Promise<OriginalTakeDriveCheck> {
  const planned = await planDriveFileImport(opts.accessToken, raw, {
    accepts: ({ name, mimeType }) => isOriginalsTakeMediaFile({ name, type: mimeType ?? '' }),
  });
  if (!planned.ok) {
    return { ok: false, name: raw, message: describeDriveFileImportRejection(planned.reason, WHAT) };
  }
  const { plan } = planned;
  if (plan.kind === 'reference' && opts.existingTakes.some((t) => t.driveFileId === plan.fileId)) {
    return { ok: false, name: plan.name, message: 'That file is already one of these takes.' };
  }
  return {
    ok: true,
    plan,
    outcome: plan.kind === 'reference' ? 'Links to your file in Drive' : 'Copies into your Drive',
  };
}

export type OriginalTakeDriveCommit =
  | { ok: true; take: OriginalAudioTake }
  | { ok: false; message: string };

/**
 * Carry out a checked link. Nothing is returned until the take is safe to store: a copy finishes
 * first, so a failed copy leaves no take pointing at a stranger's file.
 */
export async function commitOriginalTakeDriveLink(
  plan: DriveFileImportPlan,
  opts: {
    accessToken: string;
    /** Broader read access for builds whose session cannot read a friend's file. User gesture only. */
    requestReadAccess?: () => Promise<string>;
  },
): Promise<OriginalTakeDriveCommit> {
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
      await driveCreateShortcut(opts.accessToken, plan.name, layout.audioFolderId, result.fileId);
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
  return { ok: true, take };
}
