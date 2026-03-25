export interface LoadedClickSample {
  buffer: AudioBuffer;
}

const clickBufferCache = new Map<string, AudioBuffer>();

export async function loadClickSample(
  context: AudioContext,
  clickUrl: string,
): Promise<LoadedClickSample | null> {
  const cached = clickBufferCache.get(clickUrl);
  if (cached) return { buffer: cached };
  try {
    const response = await fetch(clickUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await context.decodeAudioData(arrayBuffer);
    clickBufferCache.set(clickUrl, buffer);
    return { buffer };
  } catch {
    return null;
  }
}

export function playClickSampleAt(
  context: AudioContext,
  sample: LoadedClickSample,
  time: number,
  volume: number,
  playbackRate: number = 1,
): void {
  const source = context.createBufferSource();
  source.buffer = sample.buffer;
  source.playbackRate.value = playbackRate;
  const gain = context.createGain();
  gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), time);
  source.connect(gain);
  gain.connect(context.destination);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
  source.start(time);
}

