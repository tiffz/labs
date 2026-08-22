import { useCallback, useState } from 'react';
import {
  describeDriveWriteFailure,
  type DriveWriteFailure,
} from '../../../shared/drive/describeDriveWriteFailure';

/**
 * Remember why a Drive backup failed, per take, for this session.
 *
 * Shared by both take surfaces — the Record-takes workspace and the dense chip rows — because they
 * still hold separate copies of the upload call, and this is exactly the kind of thing that drifts
 * when each keeps its own. Both previously ended in `catch {}`, so a failed upload left the take
 * looking merely "on this device": true, indistinguishable from being signed out, and quietly one
 * device away from gone.
 *
 * Deliberately NOT persisted. Storing it would add a synced field, a merge-policy entry and a
 * tombstone question, to record something that stops being true on the next successful retry. The
 * durable signal already exists and is honest — no `driveFileId` means not backed up. This supplies
 * the reason and whether a retry is worth offering.
 */
export type DriveBackupFailures = {
  /** The failure for a take, or null when its last attempt succeeded or none was made. */
  get: (takeId: string) => DriveWriteFailure | null;
  /** Classify and remember a thrown upload error. */
  record: (takeId: string, error: unknown) => void;
  /** Forget a take's failure after a successful upload. */
  clear: (takeId: string) => void;
};

export function useDriveBackupFailures(): DriveBackupFailures {
  const [failures, setFailures] = useState<Record<string, DriveWriteFailure>>({});

  const record = useCallback((takeId: string, error: unknown) => {
    setFailures((prev) => ({ ...prev, [takeId]: describeDriveWriteFailure(error) }));
  }, []);

  const clear = useCallback((takeId: string) => {
    setFailures((prev) => {
      if (!(takeId in prev)) return prev;
      const next = { ...prev };
      delete next[takeId];
      return next;
    });
  }, []);

  const get = useCallback((takeId: string) => failures[takeId] ?? null, [failures]);

  return { get, record, clear };
}
