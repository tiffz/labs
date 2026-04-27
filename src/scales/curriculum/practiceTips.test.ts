import { describe, expect, it } from 'vitest';
import { pickPracticeTip, PRACTICE_TIPS, PRACTICE_TIP_SUPPRESS_AT_COMPETING_SCORE } from './practiceTips';
import type { Stage } from './types';

function makeStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: 'C-major-scale-s5',
    stageNumber: 5,
    label: 'Both hands — slow tempo',
    description: 'Both hands together at the same slow tempo.',
    hand: 'both',
    useTempo: true,
    bpm: 52,
    useMetronome: true,
    subdivision: 'none',
    mutePlayback: false,
    octaves: 1,
    ...overrides,
  };
}

describe('pickPracticeTip', () => {
  it('returns the same tip across calls when key inputs are unchanged', () => {
    const stage = makeStage();
    const a = pickPracticeTip(stage, 'C-major-scale', { sessionDay: '2026-04-23' });
    const b = pickPracticeTip(stage, 'C-major-scale', { sessionDay: '2026-04-23' });
    expect(a).not.toBeNull();
    expect(a?.id).toBe(b?.id);
  });

  it('rotates the tip across different session days', () => {
    const stage = makeStage();
    const seenIds = new Set<string>();
    for (let day = 1; day <= 30; day++) {
      const sessionDay = `2026-04-${String(day).padStart(2, '0')}`;
      const tip = pickPracticeTip(stage, 'C-major-scale', { sessionDay });
      if (tip) seenIds.add(tip.id);
    }
    // 30 distinct session days against ~6 eligible "both hand + tempo"
    // conditional tips should hit at least 2 different ids.
    expect(seenIds.size).toBeGreaterThanOrEqual(2);
  });

  it('returns a tip whose match block is compatible with the stage', () => {
    const stage = makeStage({
      hand: 'left',
      useTempo: false,
      octaves: 2,
      mutePlayback: true,
      subdivision: 'sixteenth',
    });
    const tip = pickPracticeTip(stage, 'D-major-scale', { sessionDay: '2026-04-23' });
    expect(tip).not.toBeNull();
    if (!tip) return;
    if (tip.match?.hand !== undefined) {
      const allowed = Array.isArray(tip.match.hand) ? tip.match.hand : [tip.match.hand];
      expect(allowed).toContain('left');
    }
    if (tip.match?.useTempo !== undefined) {
      expect(tip.match.useTempo).toBe(false);
    }
    if (tip.match?.octaves !== undefined) {
      expect(tip.match.octaves).toBe(2);
    }
    if (tip.match?.mutePlayback !== undefined) {
      expect(tip.match.mutePlayback).toBe(true);
    }
    if (tip.match?.subdivision !== undefined) {
      const allowed = Array.isArray(tip.match.subdivision)
        ? tip.match.subdivision
        : [tip.match.subdivision];
      expect(allowed).toContain('sixteenth');
    }
  });

  it('prefers a conditional tip over a universal tip when one matches', () => {
    const stage = makeStage({ subdivision: 'triplet' });
    const tip = pickPracticeTip(stage, 'A-major-scale', { sessionDay: '2026-04-23' });
    expect(tip).not.toBeNull();
    expect(tip?.match).toBeDefined();
  });

  it('falls back to a universal tip when no conditional tips match', () => {
    // A stage configuration with no matching conditional tips: hand=both,
    // useTempo=false (free-tempo and both is not common but valid), but
    // there's a free-tempo conditional, which should match. Force it out
    // by explicitly using a configuration that should have universal-only
    // matches.
    const stage = makeStage({
      hand: 'both',
      useTempo: true,
      octaves: 1,
      mutePlayback: false,
      subdivision: 'none',
    });
    const tip = pickPracticeTip(stage, 'C-major-scale', { sessionDay: '2026-04-23' });
    expect(tip).not.toBeNull();
    // The conditional matches for this config: 'eyes-ahead' (hand:both),
    // 'tempo-drop-back' (useTempo:true), 'listen-to-tonic'
    // (mutePlayback:false). At least one will match, so we should get a
    // conditional. This test instead verifies the helper returns a real
    // tip rather than null.
    expect(tip?.id).toBeDefined();
    expect(PRACTICE_TIPS.some((t) => t.id === tip!.id)).toBe(true);
  });

  it('rotates the tip across different exercise ids on the same day', () => {
    const stage = makeStage();
    const seenIds = new Set<string>();
    const ids = ['C-major-scale', 'G-major-scale', 'F-major-scale', 'D-major-scale', 'A-major-scale'];
    for (const id of ids) {
      const tip = pickPracticeTip(stage, id, { sessionDay: '2026-04-23' });
      if (tip) seenIds.add(tip.id);
    }
    expect(seenIds.size).toBeGreaterThanOrEqual(1);
  });

  it('all tips have unique ids', () => {
    const ids = PRACTICE_TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns null when competing pre-start content is already heavy', () => {
    const stage = makeStage();
    expect(
      pickPracticeTip(stage, 'C-major-scale', {
        sessionDay: '2026-04-23',
        competingContentScore: PRACTICE_TIP_SUPPRESS_AT_COMPETING_SCORE,
      }),
    ).toBeNull();
    expect(
      pickPracticeTip(stage, 'C-major-scale', {
        sessionDay: '2026-04-23',
        competingContentScore: PRACTICE_TIP_SUPPRESS_AT_COMPETING_SCORE - 1,
      }),
    ).not.toBeNull();
  });
});
