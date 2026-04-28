/**
 * Play a calibration pip and estimate round-trip delay (ms) from pip to mic onset
 * via the same energy detection family as the pitch loop.
 */

const DEFAULT_PIP_FREQUENCY = 1320;

export interface CalibrationPipSchedule {
  /** Resolved wall clock when the pip is expected to be audible (estimate). */
  pipExpectedWallMs: number;
}

function rmsBuffer(buf: Float32Array): number {
  let acc = 0;
  for (let i = 0; i < buf.length; i++) acc += buf[i] * buf[i];
  return Math.sqrt(acc / buf.length);
}

/**
 * Play a short sine pip starting at ctx.currentTime + delaySec.
 */
export function scheduleCalibrationPip(
  ctx: AudioContext,
  delaySec = 0.12,
): CalibrationPipSchedule {
  const t0 = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(DEFAULT_PIP_FREQUENCY, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.45, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.065);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.07);
  const pipExpectedWallMs = performance.now() + delaySec * 1000;
  return { pipExpectedWallMs };
}

/**
 * Estimate ambient RMS from the mic before the pip.
 */
async function measureNoiseFloor(analyser: AnalyserNode, buf: Float32Array, durationMs: number): Promise<number> {
  const start = performance.now();
  const samples: number[] = [];
  while (performance.now() - start < durationMs) {
    analyser.getFloatTimeDomainData(buf);
    samples.push(rmsBuffer(buf));
    await new Promise<void>((r) => {
      requestAnimationFrame(() => r());
    });
  }
  return samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
}

/**
 * Measure round-trip style delay: ms from expected pip audibility to first strong onset on mic.
 * Headphones prevent acoustic coupling — caller should use manual latency instead.
 */
export async function measureRoundTripLatencyMs(
  ctx: AudioContext,
  micStream: MediaStream,
): Promise<number | null> {
  if (ctx.state === 'suspended') await ctx.resume();

  const src = ctx.createMediaStreamSource(micStream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);

  const buf = new Float32Array(analyser.fftSize);
  const noise = await measureNoiseFloor(analyser, buf, 140);

  const schedule = scheduleCalibrationPip(ctx, 0.12);
  const detectionStart = schedule.pipExpectedWallMs - 15;

  const deadline = performance.now() + 750;
  while (performance.now() < deadline) {
    analyser.getFloatTimeDomainData(buf);
    const rms = rmsBuffer(buf);
    const now = performance.now();
    if (
      now >= detectionStart
      && rms > Math.max(noise * 4.5, 0.012)
      && rms > noise + 0.008
    ) {
      src.disconnect();
      analyser.disconnect();
      return Math.max(0, now - schedule.pipExpectedWallMs);
    }
    await new Promise<void>((r) => {
      requestAnimationFrame(() => r());
    });
  }

  src.disconnect();
  analyser.disconnect();
  return null;
}

/**
 * Used by tests: find onset sample index in offline PCM after warmup.
 */
export function findOnsetIndexInPcm(
  pcm: Float32Array,
  sampleRate: number,
  opts?: {
    warmupMs?: number;
    threshold?: number;
    stepSamples?: number;
  },
): number | null {
  const warmupMs = opts?.warmupMs ?? 30;
  const threshold = opts?.threshold ?? 0.02;
  const stepSamples = opts?.stepSamples ?? 64;
  const warmupSamples = Math.floor((warmupMs / 1000) * sampleRate);
  const history: number[] = [];
  const historyMax = 5;
  let i = Math.max(0, warmupSamples);
  for (; i + stepSamples <= pcm.length; i += stepSamples) {
    let sum = 0;
    const end = i + stepSamples;
    for (let j = i; j < end; j++) sum += pcm[j] * pcm[j];
    const r = Math.sqrt(sum / stepSamples);
    history.push(r);
    if (history.length > historyMax) history.shift();
    if (history.length < 3) continue;
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    if (r > avg * 3 && r > threshold) {
      return i;
    }
  }
  return null;
}
