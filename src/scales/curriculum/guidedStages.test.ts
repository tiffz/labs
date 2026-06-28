import { describe, expect, it } from 'vitest';
import { buildStages } from './stages';
import {
  guidedStageIdForBeatOnly,
  isBeatOnlySubdivisionStage,
  isGuidedSubdivisionStage,
  redirectCurrentStageToGuidedScaffold,
  reviewStageForSubdivisionShaky,
} from './guidedStages';

describe('guidedStages', () => {
  const stages = buildStages('C-major-scale');

  it('maps beat-only triplet stages to guided siblings', () => {
    expect(guidedStageIdForBeatOnly('C-major-scale-s11')).toBe('C-major-scale-s11g');
    expect(guidedStageIdForBeatOnly('C-major-scale-s11m')).toBe('C-major-scale-s11mg');
    expect(guidedStageIdForBeatOnly('C-major-scale-s12')).toBe('C-major-scale-s12g');
  });

  it('redirects current beat-only triplet to guided when scaffold not cleared', () => {
    expect(
      redirectCurrentStageToGuidedScaffold(stages, 'C-major-scale-s10', 'C-major-scale-s11'),
    ).toBe('C-major-scale-s11g');
  });

  it('keeps beat-only stage when guided scaffold is already completed', () => {
    expect(
      redirectCurrentStageToGuidedScaffold(stages, 'C-major-scale-s11g', 'C-major-scale-s11'),
    ).toBe('C-major-scale-s11');
  });

  it('treats bridge moderate triplet as perfect-streak with full click grid', () => {
    const s11mg = stages.find(s => s.id.endsWith('-s11mg'))!;
    const s11m = stages.find(s => s.id.endsWith('-s11m'))!;
    expect(isGuidedSubdivisionStage(s11mg)).toBe(true);
    expect(isBeatOnlySubdivisionStage(s11mg)).toBe(false);
    expect(isGuidedSubdivisionStage(s11m)).toBe(false);
    expect(isBeatOnlySubdivisionStage(s11m)).toBe(true);
    expect(s11m.clickMode).toBe('subdivision');
  });

  it('prefers guided stage for shaky review on beat-only subdivisions', () => {
    expect(
      reviewStageForSubdivisionShaky(stages, 'C-major-scale-s11', 'shaky'),
    ).toBe('C-major-scale-s11g');
    expect(
      reviewStageForSubdivisionShaky(stages, 'C-major-scale-s11', 'stale'),
    ).toBe('C-major-scale-s11');
  });
});
