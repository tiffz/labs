import type { VoicePackLoader } from './voicePackLoader';

/** Schedule a counting voice clip on an existing AudioContext (rhythm playback path). */
export function scheduleVoiceSampleOnContext(
  ctx: AudioContext,
  voicePack: VoicePackLoader,
  sampleId: string,
  audioTime: number,
  volume: number,
  subdivDurationSec: number,
  trackSource?: (source: AudioBufferSourceNode) => void,
): void {
  if (subdivDurationSec < 0.05) return;

  const buffer = voicePack.getSample(sampleId);
  if (!buffer) return;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const sampleDur = buffer.duration;
  const maxPlayDur = subdivDurationSec * 0.92;
  if (sampleDur > maxPlayDur && maxPlayDur > 0.03) {
    source.playbackRate.value = Math.min(sampleDur / maxPlayDur, 2.0);
  }

  const rate = source.playbackRate.value;
  const rateCompensation = rate > 1.05 ? Math.min(Math.sqrt(rate), 1.5) : 1;
  const vol = Math.max(0, Math.min(1, volume * rateCompensation));

  const gain = ctx.createGain();
  const t = Math.max(audioTime, ctx.currentTime);
  gain.gain.setValueAtTime(vol, t);

  const effectiveDur = sampleDur / rate;
  if (effectiveDur > maxPlayDur) {
    const fadeStart = t + Math.max(0, maxPlayDur - 0.015);
    gain.gain.setValueAtTime(vol, fadeStart);
    gain.gain.linearRampToValueAtTime(0, t + maxPlayDur);
  }

  source.connect(gain);
  gain.connect(ctx.destination);

  trackSource?.(source);
  source.start(t);
  if (effectiveDur > maxPlayDur) {
    source.stop(t + maxPlayDur);
  }
}
