import { describe, it, expect } from 'vitest';
import {
  nextDrillStreak,
  isDrillStuck,
  isRegularStuck,
  isRegularStuckGated,
  shouldSuppressRegularStuckPrompt,
} from './drillState';

describe('nextDrillStreak', () => {
  it('increments on a perfect run', () => {
    expect(nextDrillStreak(0, 1.0)).toBe(1);
    expect(nextDrillStreak(2, 1.0)).toBe(3);
  });

  it('resets to 0 on anything below perfect', () => {
    expect(nextDrillStreak(2, 0.99)).toBe(0);
    expect(nextDrillStreak(2, 0.5)).toBe(0);
    expect(nextDrillStreak(2, 0)).toBe(0);
  });

  it('treats 99.9% as not perfect (drill is intentionally strict)', () => {
    expect(nextDrillStreak(1, 0.999)).toBe(0);
  });
});

describe('isDrillStuck', () => {
  const base = { drillState: 'active' as const, drillAttempts: 0, drillStreak: 0, snoozedUntil: 8 };

  it('returns true once attempts hit the snooze threshold without any progress', () => {
    expect(isDrillStuck({ ...base, drillAttempts: 8 })).toBe(true);
    expect(isDrillStuck({ ...base, drillAttempts: 12 })).toBe(true);
  });

  it('does not fire while the user has at least one streak point', () => {
    expect(isDrillStuck({ ...base, drillAttempts: 8, drillStreak: 1 })).toBe(false);
  });

  it('does not fire below the snooze threshold', () => {
    expect(isDrillStuck({ ...base, drillAttempts: 7 })).toBe(false);
  });

  it('does not fire when drill is not active', () => {
    expect(isDrillStuck({ ...base, drillState: 'inactive', drillAttempts: 12 })).toBe(false);
    expect(isDrillStuck({ ...base, drillState: 'completed', drillAttempts: 12 })).toBe(false);
  });

  it('respects a bumped snooze threshold (Keep drilling)', () => {
    // After 8 attempts without progress, Keep drilling bumps the threshold
    // to 8+4=12. The user must reach 12 attempts before another nag.
    expect(isDrillStuck({ ...base, drillAttempts: 11, snoozedUntil: 12 })).toBe(false);
    expect(isDrillStuck({ ...base, drillAttempts: 12, snoozedUntil: 12 })).toBe(true);
  });
});

describe('isRegularStuck', () => {
  const base = {
    drillState: 'inactive' as const,
    passedThisExercise: false,
    attemptsThisStage: 0,
    consecutiveRoughOnStage: 0,
    cleanStreak: 0,
    requiredRuns: 3,
    hasFallbackStage: true,
    snoozedUntil: 6,
  };

  it('fires after enough consecutive rough runs without advancing', () => {
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 6 })).toBe(true);
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 9 })).toBe(true);
  });

  it('does not fire when the user has already passed in this session', () => {
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 9, passedThisExercise: true })).toBe(false);
  });

  it('does not fire when the user is mid-streak (>= requiredRuns)', () => {
    // The trailing window already has a clean streak that's about to
    // advance — no point suggesting they step back.
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 9, cleanStreak: 3 })).toBe(false);
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 9, cleanStreak: 4 })).toBe(false);
  });

  it('does not fire when there is no fallback stage to drop to', () => {
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 9, hasFallbackStage: false })).toBe(false);
  });

  it('does not fire while drilling', () => {
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 9, drillState: 'active' })).toBe(false);
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 9, drillState: 'completed' })).toBe(false);
  });

  it('respects a bumped snooze threshold (Stay here)', () => {
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 9, snoozedUntil: 10 })).toBe(false);
    expect(isRegularStuck({ ...base, consecutiveRoughOnStage: 10, snoozedUntil: 10 })).toBe(true);
  });
});

describe('shouldSuppressRegularStuckPrompt', () => {
  const stage = 'stage-x';

  it('suppresses when there are enough threshold+ runs in the recent window', () => {
    const history = [
      { stageId: stage, accuracy: 0.78 },
      { stageId: stage, accuracy: 0.95 },
      { stageId: stage, accuracy: 0.92 },
      { stageId: stage, accuracy: 0.91 },
    ];
    expect(shouldSuppressRegularStuckPrompt(history, stage, 0.9, 6, 3)).toBe(true);
  });

  it('suppresses when there are at least three literal perfect runs in the window', () => {
    const history = [
      { stageId: stage, accuracy: 0.78 },
      { stageId: stage, accuracy: 1 },
      { stageId: stage, accuracy: 0.7 },
      { stageId: stage, accuracy: 1 },
      { stageId: stage, accuracy: 1 },
    ];
    expect(shouldSuppressRegularStuckPrompt(history, stage, 0.9, 8, 3)).toBe(true);
  });

  it('does not suppress when recent runs are mostly below the bar', () => {
    const history = Array.from({ length: 6 }, () => ({ stageId: stage, accuracy: 0.75 }));
    expect(shouldSuppressRegularStuckPrompt(history, stage, 0.9, 6, 3)).toBe(false);
  });
});

describe('isRegularStuckGated', () => {
  const base = {
    drillState: 'inactive' as const,
    passedThisExercise: false,
    attemptsThisStage: 6,
    consecutiveRoughOnStage: 6,
    cleanStreak: 0,
    requiredRuns: 3,
    hasFallbackStage: true,
    snoozedUntil: 6,
    stageId: 'stage-x',
    threshold: 0.9,
  };

  it('returns false when suppression applies despite raw regular stuck', () => {
    const history = [
      { stageId: 'stage-x', accuracy: 0.78 },
      { stageId: 'stage-x', accuracy: 1 },
      { stageId: 'stage-x', accuracy: 1 },
      { stageId: 'stage-x', accuracy: 1 },
      { stageId: 'stage-x', accuracy: 0.78 },
      { stageId: 'stage-x', accuracy: 0.78 },
    ];
    expect(isRegularStuckGated({ ...base, history })).toBe(false);
  });

  it('returns true when raw stuck and history does not justify suppression', () => {
    const history = Array.from({ length: 6 }, () => ({ stageId: 'stage-x', accuracy: 0.75 }));
    expect(isRegularStuckGated({ ...base, history })).toBe(true);
  });
});
