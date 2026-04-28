import type { Stage, SubdivisionMode, Hand } from './types';

/**
 * A single rotating practice tip surfaced in the pre-start panel.
 *
 * Each tip carries optional `match` constraints — when present, the tip
 * only enters the eligibility pool for stages whose properties satisfy
 * every listed constraint. Tips with no `match` block are universal and
 * eligible for every stage.
 *
 * The `id` is what the picker hashes against — keep them stable so the
 * "same user sees the same tip within a session" invariant holds across
 * deploys.
 */
/** When the pre-start panel already shows this many “heavy” blocks, skip the rotating tip. */
export const PRACTICE_TIP_SUPPRESS_AT_COMPETING_SCORE = 3;

export interface PracticeTip {
  id: string;
  text: string;
  match?: {
    subdivision?: SubdivisionMode | SubdivisionMode[];
    /** Match stages where useTempo === this value. */
    useTempo?: boolean;
    octaves?: 1 | 2;
    /** Match stages where mutePlayback === this value. */
    mutePlayback?: boolean;
    hand?: Hand | Hand[];
  };
}

/**
 * Curated tips surfaced in the pre-start panel. Tips fall into two
 * groups:
 *
 * 1. **Universal** (no `match` block) — pedagogical principles that
 *    apply regardless of stage configuration.
 * 2. **Conditional** — only eligible when the stage matches the listed
 *    constraints (e.g. octaves: 2 tips only show on two-octave stages).
 *
 * The picker biases toward conditional matches so e.g. a sixteenth-note
 * stage gets a sixteenth-specific tip when one is available, rather
 * than being capped to universal tips.
 *
 * Callers may pass {@link PickPracticeTipOptions.competingContentScore} so
 * tips are omitted when the pre-start panel already shows stage copy,
 * fingering, video link, chips, etc.
 */
export const PRACTICE_TIPS: PracticeTip[] = [
  {
    id: 'slow-is-fast',
    text: 'Most misses are planning misses. Slow down until each note feels inevitable.',
  },
  {
    id: 'evenness-over-speed',
    text: 'Even at a modest tempo beats uneven at a fast one.',
  },
  {
    id: 'tension-kills-accuracy',
    text: 'Shoulders creeping up? Pause, shake out, then one calm pass.',
  },
  {
    id: 'consistency-over-perfection',
    text: 'Three steady passes beat one lucky perfect run.',
  },
  {
    id: 'fatigue-second-pass',
    text: 'Pass two often feels harder. A short break is allowed.',
  },
  {
    id: 'eyes-ahead',
    text: 'Read one beat ahead so your fingers aren’t surprised.',
    match: { hand: 'both' },
  },
  {
    id: 'rh-thumb-tuck',
    text: 'Let the thumb tuck under 3. Do not reach across with a locked wrist.',
    match: { hand: 'right' },
  },
  {
    id: 'lh-mirror',
    text: 'LH thumb-under lands in a different spot than RH. Mark it once, then go slow.',
    match: { hand: 'left' },
  },
  {
    id: 'two-octave-boundary',
    text: 'The octave seam is the usual slip. Watch it until it feels boring.',
    match: { octaves: 2 },
  },
  {
    id: 'tempo-drop-back',
    text: 'Stuck on one spot? Drop BPM a notch for one rebuild round.',
    match: { useTempo: true },
  },
  {
    id: 'memory-no-playback',
    text: 'No guide audio. When you hear a wrong note, stop, replay that spot slowly.',
    match: { mutePlayback: true },
  },
  {
    id: 'eighth-subdivision',
    text: 'Eighths: “1-and 2-and” out loud first, then fingers.',
    match: { subdivision: 'eighth' },
  },
  {
    id: 'triplet-grouping',
    text: 'Triplets: “1 + a, 2 + a…” with the click on each “1,” then even out “+” and “a.”',
    match: { subdivision: 'triplet' },
  },
  {
    id: 'sixteenth-chunks',
    text: 'Sixteenths: think in fours inside each beat, not the whole bar.',
    match: { subdivision: 'sixteenth' },
  },
  {
    id: 'listen-to-tonic',
    text: 'Listen for the tonic each time through. It should feel like home.',
    match: { mutePlayback: false },
  },
];

/**
 * Stable 32-bit hash for tip rotation. We avoid pulling in a hashing
 * library because we only need determinism — not cryptographic strength
 * — across `(exerciseId, stageId, sessionDay)`.
 */
function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function matches(tip: PracticeTip, stage: Stage): boolean {
  const m = tip.match;
  if (!m) return true;

  if (m.subdivision !== undefined) {
    const allowed = Array.isArray(m.subdivision) ? m.subdivision : [m.subdivision];
    if (!allowed.includes(stage.subdivision)) return false;
  }
  if (m.useTempo !== undefined && m.useTempo !== stage.useTempo) return false;
  if (m.octaves !== undefined && m.octaves !== stage.octaves) return false;
  if (m.mutePlayback !== undefined && m.mutePlayback !== stage.mutePlayback) return false;
  if (m.hand !== undefined) {
    const allowed = Array.isArray(m.hand) ? m.hand : [m.hand];
    if (!allowed.includes(stage.hand)) return false;
  }
  return true;
}

/**
 * Pick a practice tip for the given stage, deterministic on
 * `(exerciseId, stageId, sessionDay)` so the same user sees the same
 * tip across reloads within a calendar day, but variety across days.
 *
 * Conditional tips (those with a `match` block that fits the stage) are
 * preferred over universal ones. Returns `null` when nothing matches —
 * which should never happen given the universal tips, but keeps the
 * caller safe.
 */
export interface PickPracticeTipOptions {
  sessionDay?: string;
  /**
   * Rough count of other pre-start blocks (stage blurb, fingering, video,
   * subdivision chip, streak chip). At {@link PRACTICE_TIP_SUPPRESS_AT_COMPETING_SCORE}
   * or above, no tip is shown so the panel stays scannable.
   */
  competingContentScore?: number;
}

export function pickPracticeTip(
  stage: Stage,
  exerciseId: string,
  options?: PickPracticeTipOptions,
): PracticeTip | null {
  const competing = options?.competingContentScore ?? 0;
  if (competing >= PRACTICE_TIP_SUPPRESS_AT_COMPETING_SCORE) {
    return null;
  }

  const conditional = PRACTICE_TIPS.filter(
    (t) => t.match !== undefined && matches(t, stage),
  );
  const universal = PRACTICE_TIPS.filter((t) => t.match === undefined);
  const pool = conditional.length > 0 ? conditional : universal;
  if (pool.length === 0) return null;

  const sessionDay = options?.sessionDay ?? new Date().toISOString().slice(0, 10);
  const idx = hashKey(`${exerciseId}|${stage.id}|${sessionDay}`) % pool.length;
  return pool[idx];
}
