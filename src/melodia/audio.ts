import type { PianoScore, ScorePart } from '../shared/music/scoreTypes';
import { midiToFrequency } from '../shared/music/scoreTypes';
import { PianoSynthesizer } from '../shared/playback/instruments/pianoSynth';
import { audiationCadenceVoicingFromTonicRootMidi, buildPitchedOnsets, midiToFreq } from './music';

export class PerformanceRecorder {
  private recorder: MediaRecorder | null = null;

  private chunks: BlobPart[] = [];

  start(stream: MediaStream): void {
    this.stop();
    this.chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    this.recorder = new MediaRecorder(stream, { mimeType: mime });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(200);
  }

  async stop(): Promise<Blob | null> {
    const rec = this.recorder;
    if (!rec || rec.state === 'inactive') {
      this.recorder = null;
      return null;
    }
    const mime = (rec.mimeType || 'audio/webm').split(';')[0] || 'audio/webm';
    await new Promise<void>((resolve) => {
      rec.addEventListener('stop', () => resolve(), { once: true });
      rec.stop();
    });
    this.recorder = null;
    if (this.chunks.length === 0) return null;
    return new Blob(this.chunks, { type: mime });
  }
}

export interface DuetPlaybackHandle {
  stop: () => void;
}

/**
 * User vocal on the left channel; simple sine “guide” tones on the right from the score.
 */
export async function playDuetReview(opts: {
  userBlob: Blob;
  score: PianoScore;
  part: ScorePart;
  transposeSemitones: number;
}): Promise<DuetPlaybackHandle> {
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  const arrayBuf = await opts.userBlob.arrayBuffer();
  const userBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));

  const t0 = ctx.currentTime + 0.05;
  const userSrc = ctx.createBufferSource();
  userSrc.buffer = userBuffer;
  const userPan = ctx.createStereoPanner();
  userPan.pan.setValueAtTime(-0.85, t0);
  const userGain = ctx.createGain();
  userGain.gain.setValueAtTime(0.9, t0);
  userSrc.connect(userGain).connect(userPan).connect(ctx.destination);
  userSrc.start(t0);

  const onsets = buildPitchedOnsets(opts.score, opts.part, opts.transposeSemitones);
  const oscNodes: OscillatorNode[] = [];
  const gainNodes: GainNode[] = [];

  for (const o of onsets) {
    const start = t0 + o.tSec;
    const end = start + Math.min(o.durSec, 1.2);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(midiToFreq(o.midi), start);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(0.85, start);
    osc.connect(g).connect(pan).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
    oscNodes.push(osc);
    gainNodes.push(g);
  }

  return {
    stop: () => {
      try {
        userSrc.stop();
      } catch {
        /* already stopped */
      }
      for (const o of oscNodes) {
        try {
          o.stop();
        } catch {
          /* */
        }
      }
      void ctx.close();
    },
  };
}

export interface GhostGuideHandle {
  stop: () => void;
}

/**
 * Schedule quiet "ghost" piano notes that mirror the written line so the
 * learner can lean on them while still actively singing. Called when the help
 * level reaches 2+ on the current exercise.
 */
export async function playGhostGuide(opts: {
  score: PianoScore;
  part: ScorePart;
  transposeSemitones: number;
  velocity?: number;
}): Promise<GhostGuideHandle> {
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  const piano = new PianoSynthesizer(ctx);
  const master = ctx.createGain();
  master.gain.value = 0.85;
  piano.connect(master);
  master.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.05;
  const onsets = buildPitchedOnsets(opts.score, opts.part, opts.transposeSemitones);
  const velocity = opts.velocity ?? 0.35;
  let last = t0;
  for (const onset of onsets) {
    const startTime = t0 + onset.tSec;
    const duration = Math.max(0.18, Math.min(onset.durSec, 1.4));
    piano.playNote({
      frequency: midiToFrequency(onset.midi),
      startTime,
      duration,
      velocity,
    });
    last = Math.max(last, startTime + duration);
  }
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      piano.dispose();
      master.disconnect();
    } catch {
      /* */
    }
    void ctx.close();
  };
  const ms = Math.max(500, Math.round((last - ctx.currentTime + 0.5) * 1000));
  window.setTimeout(stop, ms);
  return { stop };
}

/**
 * Brief V7→I tonal framing chord block anchored at lesson tonic MIDI (supports transposition).
 * Returns false when the browser refuses to start audio without a user gesture.
 */
export async function playAudiationCadence(opts: {
  tonicRootMidi: number;
  signal?: AbortSignal;
  velocity?: number;
}): Promise<boolean> {
  if (opts.signal?.aborted) return false;
  const Ctx =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  await ctx.resume();
  if (opts.signal?.aborted) {
    void ctx.close();
    return false;
  }
  if (ctx.state !== 'running') {
    void ctx.close();
    return false;
  }

  const AUDIATION_V7_SEC = 0.52;
  const AUDIATION_GAP_SEC = 0.08;
  const AUDIATION_I_SEC = 0.76;
  const velocity = opts.velocity ?? 0.52;

  try {
    const { v7midi, ionianMidi } = audiationCadenceVoicingFromTonicRootMidi(opts.tonicRootMidi);
    const piano = new PianoSynthesizer(ctx);
    const master = ctx.createGain();
    master.gain.value = 0.88;
    piano.connect(master);
    master.connect(ctx.destination);

    const t0 = ctx.currentTime + 0.04;
    const tI = t0 + AUDIATION_V7_SEC + AUDIATION_GAP_SEC;

    for (const m of v7midi) {
      if (opts.signal?.aborted) {
        piano.dispose();
        master.disconnect();
        void ctx.close();
        return false;
      }
      piano.playNote({
        frequency: midiToFrequency(m),
        startTime: t0,
        duration: AUDIATION_V7_SEC,
        velocity,
      });
    }
    for (const m of ionianMidi) {
      if (opts.signal?.aborted) {
        piano.dispose();
        master.disconnect();
        void ctx.close();
        return false;
      }
      piano.playNote({
        frequency: midiToFrequency(m),
        startTime: tI,
        duration: AUDIATION_I_SEC,
        velocity: velocity * 0.95,
      });
    }

    const tailSec = tI + AUDIATION_I_SEC - ctx.currentTime;
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, Math.max(0, Math.ceil(tailSec * 1000) + 120));
    });
    if (opts.signal?.aborted) {
      piano.dispose();
      master.disconnect();
      void ctx.close();
      return false;
    }
    piano.dispose();
    master.disconnect();
    void ctx.close();
    return true;
  } catch {
    void ctx.close();
    return false;
  }
}

/**
 * Short piano-style tonic preview (shared additive “piano” synth used elsewhere in Labs).
 * Call from a user gesture so `AudioContext.resume()` succeeds under autoplay rules.
 */
export async function playTonicPreviewHertz(frequencyHz: number): Promise<void> {
  const Ctx =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  await ctx.resume();
  const piano = new PianoSynthesizer(ctx);
  const master = ctx.createGain();
  master.gain.value = 2.05;
  piano.connect(master);
  master.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.02;
  piano.playNote({
    frequency: frequencyHz,
    startTime: t0,
    duration: 0.95,
    velocity: 1,
  });
  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      piano.dispose();
      master.disconnect();
      void ctx.close();
      resolve();
    }, 1250);
  });
}
