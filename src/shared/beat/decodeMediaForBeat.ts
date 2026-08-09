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
  timeoutMs: number = 60000,
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
  timeoutMs: number = 30000,
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
      },
    );
  });
}

async function decodeMediaAsAudio(file: File, audioContext: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  await yieldToMainThread();
  return decodeAudioDataWithTimeout(audioContext, arrayBuffer);
}

/**
 * Sample rate every Essentia rhythm algorithm assumes.
 *
 * `RhythmExtractor2013(signal, maxTempo, method, minTempo)` has **no sample-rate parameter** — the
 * rate is fixed at 44100 inside the algorithm. `PercivalBpmEstimator` takes one but defaults to
 * 44100 and we never pass it. So analysis audio MUST be at 44.1 kHz.
 */
export const BEAT_ANALYSIS_SAMPLE_RATE = 44100;

/**
 * Re-render a decoded buffer to mono at {@link BEAT_ANALYSIS_SAMPLE_RATE}.
 *
 * Two bugs this fixes, both of which corrupted every single analysis:
 *
 * 1. **Sample rate.** `decodeAudioData` resamples to the *playback* context's rate, which is the
 *    output device's rate — 48 kHz on most Macs and on every Bluetooth device. Essentia then read
 *    that 48 kHz audio as if it were 44.1 kHz, scaling every tempo by 44100/48000 = 0.91875.
 *    Measured across synthetic drum patterns: 100 BPM → 91.88, 120 → 110.25, 140 → 128.64
 *    (ratio 0.9184–0.9191). A song at 100 BPM was reported as 92, and the beat grid drifted a full
 *    beat every ~11 beats. This is why detection failed even on bare drum loops.
 * 2. **Channel selection.** Callers took `getChannelData(0)` — the *left channel only*, not a
 *    downmix. A hard-panned kick or a wide stereo mix lost transient energy before onset detection
 *    ever ran. Rendering through a mono `OfflineAudioContext` applies the spec's proper downmix.
 *
 * The repo's synthetic fixtures are all generated at exactly 44100, so the whole test suite was
 * structurally blind to (1) — see `regression/syntheticAudioGenerator.ts`.
 */
export async function toBeatAnalysisBuffer(decoded: AudioBuffer): Promise<AudioBuffer> {
  if (decoded.sampleRate === BEAT_ANALYSIS_SAMPLE_RATE && decoded.numberOfChannels === 1) {
    return decoded;
  }
  const frames = Math.max(
    1,
    Math.ceil(decoded.duration * BEAT_ANALYSIS_SAMPLE_RATE),
  );
  const offline = new OfflineAudioContext(1, frames, BEAT_ANALYSIS_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  return offline.startRendering();
}

export async function decodeMediaToBuffer(params: {
  file: File;
  mediaType: 'audio' | 'video';
  mediaUrl: string;
  audioContext: AudioContext;
  onProgress?: (progress: AnalysisProgress) => void;
  /**
   * `'analysis'` re-renders to mono at 44.1 kHz for Essentia (see {@link toBeatAnalysisBuffer}).
   *
   * Defaults to `'playback'`, which returns the buffer untouched. This decoder also feeds playback
   * and **audio export** (`stanzaAudioExport.ts`) — forcing the analysis format on those would
   * silently downmix the user's exported audio to mono and resample it.
   */
  target?: 'analysis' | 'playback';
}): Promise<AudioBuffer> {
  const { file, mediaType, mediaUrl, audioContext, onProgress, target = 'playback' } = params;
  const maybeForAnalysis = (buffer: AudioBuffer): Promise<AudioBuffer> | AudioBuffer =>
    target === 'analysis' ? toBeatAnalysisBuffer(buffer) : buffer;
  onProgress?.({ stage: 'Loading audio', progress: 0 });
  await yieldToMainThread();

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (mediaType === 'video') {
    onProgress?.({ stage: 'Extracting audio from video...', progress: 2 });
    await yieldToMainThread();
    try {
      return await maybeForAnalysis(await decodeMediaAsAudio(file, audioContext));
    } catch {
      onProgress?.({ stage: 'Trying alternate extraction method...', progress: 3 });
      await yieldToMainThread();
      return maybeForAnalysis(await extractAudioFromVideo(mediaUrl, audioContext));
    }
  }

  onProgress?.({ stage: 'Decoding audio...', progress: 2 });
  await yieldToMainThread();
  return maybeForAnalysis(await decodeMediaAsAudio(file, audioContext));
}
