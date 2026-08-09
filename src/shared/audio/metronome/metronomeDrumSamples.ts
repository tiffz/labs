import { DRUM_SAMPLE_URLS } from '../drumSampleUrls';

export type MetronomeDrumSound = 'dum' | 'tak' | 'ka';

export async function loadMetronomeDrumSamples(
  ctx: AudioContext,
): Promise<Map<MetronomeDrumSound, AudioBuffer>> {
  const samples = new Map<MetronomeDrumSound, AudioBuffer>();
  const entries: Array<[MetronomeDrumSound, string]> = [
    ['dum', DRUM_SAMPLE_URLS.dum],
    ['tak', DRUM_SAMPLE_URLS.tak],
    ['ka', DRUM_SAMPLE_URLS.ka],
  ];

  await Promise.all(
    entries.map(async ([name, url]) => {
      try {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        samples.set(name, await ctx.decodeAudioData(buf));
      } catch {
        // Drum sample failed to load — silent for this sound.
      }
    }),
  );

  return samples;
}

export function playMetronomeDrumSampleAt(
  ctx: AudioContext,
  samples: Map<MetronomeDrumSound, AudioBuffer>,
  sound: MetronomeDrumSound,
  audioTime: number,
  volume: number,
  subdivDurationSec?: number,
): void {
  const buffer = samples.get(sound);
  if (!buffer) return;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  const t = Math.max(audioTime, ctx.currentTime);
  const vol = Math.max(0, Math.min(1, volume));
  gain.gain.setValueAtTime(vol, t);

  const maxPlayDur = subdivDurationSec != null ? subdivDurationSec * 0.92 : buffer.duration;
  if (buffer.duration > maxPlayDur && maxPlayDur > 0.03) {
    const fadeStart = t + Math.max(0, maxPlayDur - 0.015);
    gain.gain.setValueAtTime(vol, fadeStart);
    gain.gain.linearRampToValueAtTime(0, t + maxPlayDur);
  }

  source.connect(gain);
  gain.connect(ctx.destination);
  // Release the nodes when the one-shot finishes. The click path (`clickService.playClickSampleAt`)
  // and `AudioPlayer.playBuffer` both do this; these two did not, so at 120 BPM with 16th
  // subdivisions ~8 node pairs per second stayed wired to `destination` — ~29k an hour.
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
  source.start(t);
  if (buffer.duration > maxPlayDur) {
    source.stop(t + maxPlayDur);
  }
}
