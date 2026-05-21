import { describe, expect, it } from 'vitest';
import {
  challengeCountsTowardProgress,
  pickPracticeChallenge,
  recordChallengeResult,
  PASSES_TO_ADVANCE,
} from './practiceChallenge';

describe('pickPracticeChallenge', () => {
  it('returns compare challenges at level 1', () => {
    const round = pickPracticeChallenge({ level: 1, challengesCompleted: 0, passesAtLevel: 0 }, 42);
    expect(round.challenge.kind).toBe('compare');
    expect(round.level).toBe(1);
  });

  it('returns adjacent contextual intro at level 5', () => {
    let round = pickPracticeChallenge({ level: 5, challengesCompleted: 0, passesAtLevel: 0 }, 0);
    for (let salt = 0; salt < 40; salt++) {
      round = pickPracticeChallenge({ level: 5, challengesCompleted: 0, passesAtLevel: 0 }, salt);
      if (round.level === 5) break;
    }
    expect(round.level).toBe(5);
    expect(round.challenge.kind).toBe('contextual');
    if (round.challenge.kind === 'contextual') {
      expect(round.challenge.display).toBe('adjacent');
    }
  });

  it('returns bridge challenges at level 10', () => {
    const round = pickPracticeChallenge({ level: 10, challengesCompleted: 10, passesAtLevel: 2 }, 7);
    expect(round.challenge.kind).toBe('bridge');
  });

  it('picks an explicit practice level when requested', () => {
    const round = pickPracticeChallenge(
      { level: 5, challengesCompleted: 0, passesAtLevel: 0 },
      0,
      2,
    );
    expect(round.level).toBe(2);
    expect(round.challenge.kind).toBe('compare');
  });

  it('does not advance profile when reviewing a lower level', () => {
    const profile = { level: 5, challengesCompleted: 10, passesAtLevel: 6 };
    const updated = recordChallengeResult(profile, true, { challengeLevel: 3 });
    expect(updated.level).toBe(5);
    expect(updated.passesAtLevel).toBe(6);
    expect(updated.challengesCompleted).toBe(11);
  });

  it('advances profile when passing at current level', () => {
    const profile = {
      level: 5,
      challengesCompleted: 0,
      passesAtLevel: PASSES_TO_ADVANCE - 1,
    };
    const updated = recordChallengeResult(profile, true, { challengeLevel: 5 });
    expect(updated.level).toBe(6);
    expect(updated.passesAtLevel).toBe(0);
  });

  it('challengeCountsTowardProgress is false for review levels', () => {
    expect(challengeCountsTowardProgress(5, 3)).toBe(false);
    expect(challengeCountsTowardProgress(5, 5)).toBe(true);
  });

  it('levels up on the 7th pass at the current profile level', () => {
    let profile = { level: 1, challengesCompleted: 0, passesAtLevel: 0 };
    for (let i = 0; i < PASSES_TO_ADVANCE - 1; i++) {
      profile = recordChallengeResult(profile, true, { challengeLevel: profile.level });
      expect(profile.level).toBe(1);
    }
    profile = recordChallengeResult(profile, true, { challengeLevel: profile.level });
    expect(profile.level).toBe(2);
    expect(profile.passesAtLevel).toBe(0);
  });

  it('does not level up when challengeLevel is below profile (stale session)', () => {
    const profile = {
      level: 2,
      challengesCompleted: 0,
      passesAtLevel: PASSES_TO_ADVANCE - 1,
    };
    const updated = recordChallengeResult(profile, true, { challengeLevel: 1 });
    expect(updated.level).toBe(2);
    expect(updated.passesAtLevel).toBe(PASSES_TO_ADVANCE - 1);
  });
});
