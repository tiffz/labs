import { describe, expect, it } from 'vitest';
import { defaultSkillMatrix } from '../progress/types';
import type { SightProfile } from '../types';
import {
  challengeCountsTowardProgress,
  pickPracticeChallenge,
  recordChallengeResult,
  PASSES_TO_ADVANCE,
} from './practiceChallenge';

function testProfile(partial: Partial<SightProfile> & Pick<SightProfile, 'level'>): SightProfile {
  return {
    challengesCompleted: 0,
    passesAtLevel: 0,
    skillMatrix: defaultSkillMatrix(partial.level),
    recentReps: [],
    activeFocus: null,
    dailyQueue: null,
    ...partial,
  };
}

describe('pickPracticeChallenge', () => {
  it('returns isolated flashcard at level 1', () => {
    const round = pickPracticeChallenge(testProfile({ level: 1 }), 42);
    expect(round.challenge.kind).toBe('flashcard-isolated');
    expect(round.level).toBe(1);
  });

  it('returns adjacent contextual intro at level 12', () => {
    const round = pickPracticeChallenge(
      testProfile({ level: 12 }),
      0,
      12,
    );
    expect(round.level).toBe(12);
    expect(round.challenge.kind).toBe('contextual');
    if (round.challenge.kind === 'contextual') {
      expect(round.challenge.display).toBe('adjacent');
    }
  });

  it('returns bridge challenges at level 19', () => {
    const round = pickPracticeChallenge(
      testProfile({ level: 19, challengesCompleted: 10, passesAtLevel: 2 }),
      7,
      19,
    );
    expect(round.challenge.kind).toBe('bridge');
  });

  it('returns albers flashcard at level 8', () => {
    const round = pickPracticeChallenge(
      testProfile({ level: 8 }),
      3,
      8,
    );
    expect(round.challenge.kind).toBe('flashcard-albers');
  });

  it('picks an explicit practice level when requested', () => {
    const round = pickPracticeChallenge(
      testProfile({ level: 12 }),
      0,
      2,
    );
    expect(round.level).toBe(2);
    expect(round.challenge.kind).toBe('flashcard-isolated');
  });

  it('does not advance profile when challenge is below working level', () => {
    const profile = testProfile({ level: 12, peakLevel: 12, challengesCompleted: 10, passesAtLevel: 6 });
    const updated = recordChallengeResult(profile, true, { challengeLevel: 3 });
    expect(updated.level).toBe(12);
    expect(updated.passesAtLevel).toBe(6);
    expect(updated.challengesCompleted).toBe(11);
  });

  it('counts passes when restudying at the working level below peak', () => {
    const profile = testProfile({ level: 15, peakLevel: 16, passesAtLevel: 2 });
    const updated = recordChallengeResult(profile, true, { challengeLevel: 15 });
    expect(updated.level).toBe(15);
    expect(updated.passesAtLevel).toBe(3);
  });

  it('advances to peak after pass gate when restudying', () => {
    const profile = testProfile({
      level: 15,
      peakLevel: 16,
      passesAtLevel: PASSES_TO_ADVANCE - 1,
    });
    const updated = recordChallengeResult(profile, true, { challengeLevel: 15 });
    expect(updated.level).toBe(16);
    expect(updated.peakLevel).toBe(16);
    expect(updated.passesAtLevel).toBe(0);
  });

  it('advances profile when passing at current level', () => {
    const profile = testProfile({
      level: 12,
      passesAtLevel: PASSES_TO_ADVANCE - 1,
    });
    const updated = recordChallengeResult(profile, true, { challengeLevel: 12 });
    expect(updated.level).toBe(13);
    expect(updated.passesAtLevel).toBe(0);
  });

  it('challengeCountsTowardProgress is false for stale session below working level', () => {
    expect(challengeCountsTowardProgress(12, 3)).toBe(false);
    expect(challengeCountsTowardProgress(12, 12)).toBe(true);
  });

  it('levels up on the 7th pass at the current profile level', () => {
    let profile = testProfile({ level: 1 });
    for (let i = 0; i < PASSES_TO_ADVANCE - 1; i++) {
      profile = recordChallengeResult(profile, true, { challengeLevel: profile.level });
      expect(profile.level).toBe(1);
    }
    profile = recordChallengeResult(profile, true, { challengeLevel: profile.level });
    expect(profile.level).toBe(2);
    expect(profile.passesAtLevel).toBe(0);
  });

  it('does not level up when challengeLevel is below profile (stale session)', () => {
    const profile = testProfile({
      level: 2,
      passesAtLevel: PASSES_TO_ADVANCE - 1,
    });
    const updated = recordChallengeResult(profile, true, { challengeLevel: 1 });
    expect(updated.level).toBe(2);
    expect(updated.passesAtLevel).toBe(PASSES_TO_ADVANCE - 1);
  });

  it('does not increment passes when browsing a lower session level', () => {
    const profile = testProfile({ level: 12, passesAtLevel: 3 });
    const updated = recordChallengeResult(profile, true, { challengeLevel: 5 });
    expect(updated.level).toBe(12);
    expect(updated.passesAtLevel).toBe(3);
    expect(updated.challengesCompleted).toBe(1);
  });
});
