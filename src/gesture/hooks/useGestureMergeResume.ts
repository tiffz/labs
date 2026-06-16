import { useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { gestureDb } from '../db/gestureDb';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { resumeIncompleteMerges } from '../drive/gestureMergeCollections';
import { GESTURE_EMPTY_PACKS } from './gestureLiveQueryEmpty';

/** On load, auto-resume interrupted merges when signed in to Drive. */
export function useGestureMergeResume(
  enabled: boolean,
  onMessage: (message: string) => void,
  onError: (message: string | null) => void,
): void {
  const inFlightRef = useRef(false);
  const attemptedRef = useRef(false);
  const packsRaw = useLiveQuery(() => gestureDb.packs.toArray(), [], undefined);
  const packs = packsRaw ?? GESTURE_EMPTY_PACKS;
  const hasIncomplete = packs.some((pack) => pack.mergeStatus === 'incomplete');

  const run = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const token = await readGestureDriveAccessToken();
      if (!token) return;
      const messages = await resumeIncompleteMerges(token);
      if (messages.length > 0) {
        const failures = messages.filter((msg) => msg.includes('still incomplete'));
        if (failures.length > 0) {
          onError(failures.join(' '));
        }
        const successes = messages.filter((msg) => !msg.includes('still incomplete'));
        if (successes.length > 0) {
          onMessage(successes.join(' '));
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, onError, onMessage]);

  useEffect(() => {
    if (!enabled || !hasIncomplete || attemptedRef.current) return;
    attemptedRef.current = true;
    void run();
  }, [enabled, hasIncomplete, run]);
}
