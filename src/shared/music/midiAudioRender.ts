import type { MidiNoteEvent } from './midiBuilder';

interface RenderMidiAudioOptions {
  bpm: number;
  totalTicks?: number;
  ticksPerQuarter?: number;
  sampleRate?: number;
  gainScale?: number;
}

function midiToFrequency(midi: number): number {
  return 440 * (2 ** ((midi - 69) / 12));
}

export async function renderMidiEventsToAudioBuffer(
  events: MidiNoteEvent[],
  options: RenderMidiAudioOptions,
): Promise<AudioBuffer> {
  const ticksPerQuarter = options.ticksPerQuarter ?? 480;
  const sampleRate = options.sampleRate ?? 44100;
  const gainScale = options.gainScale ?? 0.18;
  const secondsPerTick = (60 / Math.max(1, options.bpm)) / ticksPerQuarter;
  const maxTickFromEvents = events.reduce(
    (max, event) => Math.max(max, event.startTick + event.durationTicks),
    0
  );
  const totalTicks = Math.max(options.totalTicks ?? 0, maxTickFromEvents, 1);
  const durationSeconds = Math.max(0.3, totalTicks * secondsPerTick + 0.15);
  const frameCount = Math.ceil(durationSeconds * sampleRate);
  const ctx = new OfflineAudioContext(2, frameCount, sampleRate);

  events.forEach((event) => {
    const start = Math.max(0, event.startTick * secondsPerTick);
    const duration = Math.max(0.03, event.durationTicks * secondsPerTick);
    const end = Math.min(durationSeconds, start + duration);
    if (end <= start) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const velocity = Math.max(0.03, Math.min(1, event.velocity / 127));
    const noteGain = velocity * gainScale;
    const isPercussion = event.channel === 9;
    osc.type = isPercussion ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(
      isPercussion ? Math.max(50, Math.min(380, midiToFrequency(event.midi) * 0.45)) : midiToFrequency(event.midi),
      start
    );

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(noteGain, start + 0.01);
    const releaseStart = Math.max(start + 0.02, end - 0.04);
    gain.gain.setValueAtTime(noteGain, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.005);
  });

  return ctx.startRendering();
}
