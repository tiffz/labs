import { decodeMediaToBuffer } from '../../shared/beat/decodeMediaForBeat';
import { createManagedAudioContext } from '../../shared/playback/audioContextLifecycle';

export async function decodeStanzaLocalBlobForPlayback(params: {
  blob: Blob;
  title: string;
  mediaUrl: string;
  isVideo: boolean;
}): Promise<AudioBuffer> {
  const { blob, title, mediaUrl, isVideo } = params;
  const file = new File([blob], title || 'stanza-track', {
    type: blob.type || (isVideo ? 'video/mp4' : 'audio/mpeg'),
  });
  const managed = createManagedAudioContext({ latencyHint: 'playback' });
  try {
    return await decodeMediaToBuffer({
      file,
      mediaType: isVideo ? 'video' : 'audio',
      mediaUrl,
      audioContext: managed.context,
    });
  } finally {
    managed.dispose();
  }
}
