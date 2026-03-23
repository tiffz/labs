import { analyzeBeat, type BeatAnalysisResult } from './beatAnalyzer';

export interface AnalysisProgress {
  stage: string;
  progress: number;
}

export function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function extractAudioFromVideo(
  videoUrl: string,
  audioContext: AudioContext,
  timeoutMs: number = 60000
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const video = document.createElement('video');

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        video.pause();
        video.src = '';
        reject(new Error('Video audio extraction timed out.'));
      }
    }, timeoutMs);

    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;

    video.onloadedmetadata = async () => {
      if (resolved) return;
      try {
        const duration = video.duration;
        if (!isFinite(duration) || duration <= 0) {
          throw new Error('Could not determine video duration.');
        }
        const sampleRate = audioContext.sampleRate;
        const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
        const source = (offlineContext as unknown as AudioContext).createMediaElementSource(video);
        source.connect(offlineContext.destination);
        await video.play();
        const rendered = await offlineContext.startRendering();
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          video.pause();
          resolve(rendered);
        }
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          video.pause();
          reject(error);
        }
      }
    };

    video.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        reject(new Error('Failed to load video file.'));
      }
    };

    video.src = videoUrl;
  });
}

function decodeAudioDataWithTimeout(
  audioContext: AudioContext,
  arrayBuffer: ArrayBuffer,
  timeoutMs: number = 30000
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Audio decoding timed out.'));
      }
    }, timeoutMs);

    audioContext.decodeAudioData(
      arrayBuffer,
      (buffer) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve(buffer);
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          reject(new Error(`Audio decoding failed: ${error?.message || 'Unknown error'}`));
        }
      }
    );
  });
}

async function decodeMediaAsAudio(file: File, audioContext: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  await yieldToMainThread();
  return decodeAudioDataWithTimeout(audioContext, arrayBuffer);
}

export async function decodeMediaToBuffer(params: {
  file: File;
  mediaType: 'audio' | 'video';
  mediaUrl: string;
  audioContext: AudioContext;
  onProgress?: (progress: AnalysisProgress) => void;
}): Promise<AudioBuffer> {
  const { file, mediaType, mediaUrl, audioContext, onProgress } = params;
  onProgress?.({ stage: 'Loading audio', progress: 0 });
  await yieldToMainThread();

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (mediaType === 'video') {
    onProgress?.({ stage: 'Extracting audio from video...', progress: 2 });
    await yieldToMainThread();
    try {
      return await decodeMediaAsAudio(file, audioContext);
    } catch {
      onProgress?.({ stage: 'Trying alternate extraction method...', progress: 3 });
      await yieldToMainThread();
      return extractAudioFromVideo(mediaUrl, audioContext);
    }
  }

  onProgress?.({ stage: 'Decoding audio...', progress: 2 });
  await yieldToMainThread();
  return decodeMediaAsAudio(file, audioContext);
}

export async function runBeatAnalysisPipeline(
  params: {
    file: File;
    mediaType: 'audio' | 'video';
    mediaUrl: string;
    audioContext: AudioContext;
    onProgress?: (progress: AnalysisProgress) => void;
  }
): Promise<{ buffer: AudioBuffer; result: BeatAnalysisResult }> {
  const { file, mediaType, mediaUrl, audioContext, onProgress } = params;
  const buffer = await decodeMediaToBuffer({
    file,
    mediaType,
    mediaUrl,
    audioContext,
    onProgress,
  });

  const result = await analyzeBeat(buffer, (stage, progress) => {
    onProgress?.({ stage, progress });
  });

  return { buffer, result };
}
