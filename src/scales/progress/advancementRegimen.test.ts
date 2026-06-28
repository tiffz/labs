import { describe, expect, it } from 'vitest';
import { buildPentascaleStages, buildStages } from '../curriculum/stages';
import type { PracticeRecord } from './types';
import {
  getGuidedThresholdCriteria,
  resolveAdvancementRegimen,
  runAdvancementOutcome,
  runMeetsGuidedThresholdBar,
  runMeetsPerfectBar,
  runOutcomeTier,
  runQualifiesForAdvancement,
} from './advancementRegimen';

function record(
  accuracy: number,
  breakdown: PracticeRecord['breakdown'],
): PracticeRecord {
  return {
    exerciseId: 'test',
    stageId: 'test',
    timestamp: 0,
    accuracy,
    noteCount: 10,
    correctCount: Math.round(accuracy * 10),
    breakdown,
  };
}

describe('advancementRegimen', () => {
  const fullStages = buildStages('C-major-scale');
  const pentaStages = buildPentascaleStages('C-pentascale-major');
  const s3 = fullStages.find(s => s.id.endsWith('-s3'))!;
  const s11g = fullStages.find(s => s.id.endsWith('-s11g'))!;
  const p7 = pentaStages.find(s => s.id.endsWith('-p7'))!;
  const p8g = pentaStages.find(s => s.id.endsWith('-p8g'))!;

  it('uses perfect-streak for standard metronome stages', () => {
    expect(resolveAdvancementRegimen(s3, false, 'major-scale').kind).toBe('perfect-streak');
    expect(resolveAdvancementRegimen(p7, true, 'pentascale-major').kind).toBe('perfect-streak');
  });

  it('uses guided-threshold for subdivision scaffold stages', () => {
    const regimen = resolveAdvancementRegimen(s11g, false, 'major-scale');
    expect(regimen.kind).toBe('guided-threshold');
    expect(regimen.threshold).toBe(0.85);
    expect(regimen.runs).toBe(3);
  });

  it('does not treat 94% as qualifying on perfect-streak stages', () => {
    const r = record(0.94, { perfect: 17, early: 1, late: 0, wrongPitch: 0, missed: 0 });
    const regimen = resolveAdvancementRegimen(s3, false, 'major-scale');
    expect(runQualifiesForAdvancement(r, regimen, 'major-scale', s3, false)).toBe(false);
    expect(runAdvancementOutcome(r, regimen, 'major-scale', s3, false)).toBe('near');
    expect(runOutcomeTier(r, 'major-scale', s3, false)).toBe('near');
  });

  it('treats 94% as qualifying on guided-threshold stages at 85%', () => {
    const r = record(0.94, { perfect: 17, early: 1, late: 0, wrongPitch: 0, missed: 0 });
    const regimen = resolveAdvancementRegimen(s11g, false, 'major-scale');
    expect(runMeetsGuidedThresholdBar(r, regimen, 'major-scale', s11g, false)).toBe(true);
    expect(runAdvancementOutcome(r, regimen, 'major-scale', s11g, false)).toBe('qualifying');
  });

  it('requires literal perfection for runMeetsPerfectBar', () => {
    expect(runMeetsPerfectBar(record(1, {
      perfect: 18, early: 0, late: 0, wrongPitch: 0, missed: 0,
    }))).toBe(true);
    expect(runMeetsPerfectBar(record(0.99, {
      perfect: 17, early: 1, late: 0, wrongPitch: 0, missed: 0,
    }))).toBe(false);
  });

  it('getGuidedThresholdCriteria matches documented scaffold bars', () => {
    expect(getGuidedThresholdCriteria(s11g, false, 'major-scale')).toEqual({
      threshold: 0.85,
      runs: 3,
    });
    expect(getGuidedThresholdCriteria(p8g, false, 'pentascale-major')).toEqual({
      threshold: 0.85,
      runs: 3,
    });
  });
});
