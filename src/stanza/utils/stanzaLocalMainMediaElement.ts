import type { MutableRefObject } from 'react';

/** Active local transport: video and audio elements are never mounted together. */
export function getStanzaLocalMainMediaElement(
  isLocalVideo: boolean,
  localAudioRef: MutableRefObject<HTMLAudioElement | null>,
  localVideoRef: MutableRefObject<HTMLVideoElement | null>,
): HTMLMediaElement | null {
  return isLocalVideo ? localVideoRef.current : localAudioRef.current;
}
