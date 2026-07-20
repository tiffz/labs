import { usePlaybackWakeLock } from '../../shared/audio/usePlaybackWakeLock';

/**
 * Keeps the screen awake while Stanza transport is playing (phone practice sessions).
 * Thin app wrapper over shared {@link usePlaybackWakeLock}.
 */
export function useStanzaPlaybackWakeLock(isPlaying: boolean): void {
  usePlaybackWakeLock(isPlaying);
}
