import { useCallback, useState } from 'react';
import { decodeMediaToBuffer } from '../../shared/beat/decodeMediaForBeat';
import { detectSongKeyFromBuffer, musicKeyFromDetected } from '../../shared/beat/detectSongKey';
import type { MusicKey } from '../../shared/music/musicInputConstants';

export interface UseStanzaSongKeyDetectionParams {
  canAnalyze: boolean;
  localAudioBlob: Blob | undefined;
  localSongTitle: string;
  mediaUrl: string;
  isLocalVideo: boolean;
  onPersistOriginalKey?: (key: MusicKey) => void;
  getAudioContext: () => AudioContext;
}

/** Local-file key detection for Stanza (uploaded audio/video only). */
export function useStanzaSongKeyDetection(params: UseStanzaSongKeyDetectionParams) {
  const {
    canAnalyze,
    localAudioBlob,
    localSongTitle,
    mediaUrl,
    isLocalVideo,
    onPersistOriginalKey,
    getAudioContext,
  } = params;

  const [keyDetectBusy, setKeyDetectBusy] = useState(false);
  const [keyDetectError, setKeyDetectError] = useState<string | null>(null);

  const runDetectOriginalKey = useCallback(async () => {
    if (!localAudioBlob || !canAnalyze) return;
    setKeyDetectError(null);
    setKeyDetectBusy(true);
    try {
      const file = new File([localAudioBlob], localSongTitle || 'stanza-audio', {
        type: localAudioBlob.type || (isLocalVideo ? 'video/mp4' : 'audio/mpeg'),
      });
      const buffer = await decodeMediaToBuffer({
        file,
        mediaType: isLocalVideo ? 'video' : 'audio',
        mediaUrl,
        audioContext: getAudioContext(),
      });
      const detected = await detectSongKeyFromBuffer(buffer);
      onPersistOriginalKey?.(musicKeyFromDetected(detected));
    } catch (e) {
      console.error('[Stanza] Key detection failed', e);
      setKeyDetectError(e instanceof Error ? e.message : 'Key detection failed');
    } finally {
      setKeyDetectBusy(false);
    }
  }, [canAnalyze, getAudioContext, isLocalVideo, localAudioBlob, localSongTitle, mediaUrl, onPersistOriginalKey]);

  return {
    keyDetectBusy,
    keyDetectError,
    setKeyDetectError,
    runDetectOriginalKey,
  };
}
