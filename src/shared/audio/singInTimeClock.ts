/**
 * 4/4 subdivision clock: binary (quarter/eighth/sixteenth) and triplet eighth grids.
 * Uses AudioContext.currentTime for scheduling oscillator clicks.
 */

export type SubdivisionGrid =
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'triplet_eighth'
  | 'mixed';

export const BEATS_PER_MEASURE = 4;

export function clampBpm(bpm: number, min = 40, max = 160): number {
  return Math.max(min, Math.min(max, Math.round(bpm)));
}

/** Number of metronome pulses per measure for a uniform grid. */
export function slotsPerMeasure(grid: Exclude<SubdivisionGrid, 'mixed'>): number {
  switch (grid) {
    case 'quarter':
      return 4;
    case 'eighth':
      return 8;
    case 'sixteenth':
      return 16;
    case 'triplet_eighth':
      return 12;
    default:
      return 4;
  }
}

/** Duration of one subdivision slot in seconds. */
export function slotDurationSec(bpm: number, grid: Exclude<SubdivisionGrid, 'mixed'>): number {
  const beatSec = 60 / bpm;
  switch (grid) {
    case 'quarter':
      return beatSec;
    case 'eighth':
      return beatSec / 2;
    case 'sixteenth':
      return beatSec / 4;
    case 'triplet_eighth':
      return beatSec / 3;
    default:
      return beatSec;
  }
}

export interface ClickSchedule {
  time: number;
  isDownbeat: boolean;
  isBeat: boolean;
  /** True for non-accent subdivision (quieter pulse). */
  isSubPulse: boolean;
}

function buildUniformSchedules(
  grid: Exclude<SubdivisionGrid, 'mixed'>,
  bpm: number,
  measures: number,
  subPulse: boolean,
): ClickSchedule[] {
  const slotSec = slotDurationSec(bpm, grid);
  const totalSlots = slotsPerMeasure(grid) * measures;
  const slotPerBeat = slotsPerMeasure(grid) / BEATS_PER_MEASURE;
  const out: ClickSchedule[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const slotInMeasure = i % slotsPerMeasure(grid);
    const isDownbeat = slotInMeasure === 0;
    const isBeat = slotInMeasure % slotPerBeat === 0;
    const isSubPulse = subPulse && !isDownbeat && !isBeat;
    out.push({
      time: i * slotSec,
      isDownbeat,
      isBeat,
      isSubPulse,
    });
  }
  return out;
}

/**
 * Schedule click times (seconds from session start) for metronome playback.
 */
export function buildClickSchedule(
  grid: SubdivisionGrid,
  bpm: number,
  measures: number,
  subPulse: boolean,
): ClickSchedule[] {
  if (grid === 'mixed') {
    return buildMixedPatternSchedule(bpm, measures, subPulse);
  }
  return buildUniformSchedules(grid, bpm, measures, subPulse);
}

/**
 * Level 5: six rhythmic attacks per quarter (even slices) so two half-beat groups
 * can be felt as eighth + four sixteenth-style motion. 6 × 4 beats = 24 pulses / measure.
 */
function buildMixedPatternSchedule(bpm: number, measures: number, subPulse: boolean): ClickSchedule[] {
  const beatSec = 60 / bpm;
  const out: ClickSchedule[] = [];
  for (let m = 0; m < measures; m++) {
    for (let b = 0; b < BEATS_PER_MEASURE; b++) {
      const base = (m * BEATS_PER_MEASURE + b) * beatSec;
      for (let k = 0; k < 6; k++) {
        const t = base + k * (beatSec / 6);
        const isDownbeat = m === 0 && b === 0 && k === 0;
        const isBeat = k === 0;
        const isSubPulse = subPulse && !isDownbeat && k > 0;
        out.push({ time: t, isDownbeat, isBeat, isSubPulse });
      }
    }
  }
  return out;
}

export interface RunMetronomeLoopOptions {
  ctx: AudioContext;
  bpm: number;
  grid: SubdivisionGrid;
  measures: number;
  subPulse: boolean;
  /** Called with context time at each scheduled downbeat (timing may be loose). */
  onDownbeat?: (audioTime: number) => void;
  loopCount?: number;
}

/**
 * Schedule clicks starting at `startAudioTime`. Returns cancel function.
 */
export function scheduleMetronomeClicks(
  opts: RunMetronomeLoopOptions & { startAudioTime: number },
): () => void {
  const {
    ctx,
    bpm,
    grid,
    measures,
    subPulse,
    startAudioTime,
    onDownbeat,
    loopCount = 1,
  } = opts;
  const sched = buildClickSchedule(grid, bpm, measures, subPulse);
  const oscNodes: OscillatorNode[] = [];

  const measureWallSec = measures * BEATS_PER_MEASURE * (60 / bpm);

  const downFreq = 1040;
  const beatFreq = 660;
  const subFreq = 440;

  for (let loop = 0; loop < loopCount; loop++) {
    const loopOffsetAudio = loop * measureWallSec;
    for (let i = 0; i < sched.length; i++) {
      const ev = sched[i]!;
      const at = startAudioTime + loopOffsetAudio + ev.time;
      let freq = beatFreq;
      let vol = 0.18;
      if (ev.isDownbeat) {
        freq = downFreq;
        vol = 0.32;
      } else if (ev.isSubPulse) {
        freq = subFreq;
        vol = 0.07;
      } else if (ev.isBeat) {
        vol = 0.2;
      } else if (subPulse && !ev.isBeat) {
        freq = subFreq;
        vol = 0.08;
      }

      if (onDownbeat && ev.isDownbeat) {
        window.setTimeout(() => {
          onDownbeat(at);
        }, Math.max(0, (at - ctx.currentTime) * 1000));
      }

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.032);
      osc.connect(g).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.04);
      oscNodes.push(osc);
    }
  }

  let cancelled = false;
  return () => {
    if (cancelled) return;
    cancelled = true;
    for (const o of oscNodes) {
      try {
        o.stop();
        o.disconnect();
      } catch {
        /* noop */
      }
    }
  };
}
