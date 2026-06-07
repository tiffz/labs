import { generateAnchorPivotChallenge } from '../generators/anchorPivot';
import { generateAlbersEqualizerChallenge } from '../generators/albersEqualizer';
import { generateBridgeChallenge } from '../generators/brokenBridge';
import { generateContextualMatchChallenge } from '../generators/contextualMatch';
import { generateFlashcardChallenge } from '../generators/flashcard';
import { generateGamutChallenge } from '../generators/gamutLandscape';
import { generateMunsellSliceChallenge } from '../generators/munsellSlice';
import { createRng, randomSeed } from '../generators/rng';
import { generateYotCastChallenge } from '../generators/yotCast';
import { getLevelConfig, maxUnlockedLevel, MAX_LEVEL } from '../levels';
import type { PracticeGenConstraints } from '../progress/types';
import type { PracticeRound, SightChallenge, SightProfile } from '../types';

const PASSES_TO_ADVANCE = 7;

export interface PickPracticeOptions {
  constraints?: PracticeGenConstraints;
}

export function challengeForLevel(
  seed: number,
  level: number,
  constraints?: PracticeGenConstraints,
): SightChallenge {
  const cfg = getLevelConfig(level);
  if (cfg.module === 'flashcard') return generateFlashcardChallenge(seed, level, constraints);
  if (cfg.module === 'contextual') return generateContextualMatchChallenge(seed, level, constraints);
  if (cfg.module === 'bridge') return generateBridgeChallenge(seed, level);
  if (cfg.module === 'gamut') return generateGamutChallenge(seed, level);
  if (cfg.module === 'anchor-pivot') return generateAnchorPivotChallenge(seed, level);
  if (cfg.module === 'albers-equalizer') return generateAlbersEqualizerChallenge(seed, level, constraints);
  if (cfg.module === 'munsell-slice') return generateMunsellSliceChallenge(seed, level, constraints);
  return generateYotCastChallenge(seed, level);
}

/**
 * Pick one practice challenge. When `practiceLevel` is set, always uses that level (no random review dip).
 * Otherwise uses the profile level with an occasional review challenge one level below.
 */
export function pickPracticeChallenge(
  profile: SightProfile,
  salt = 0,
  practiceLevel?: number,
  options?: PickPracticeOptions,
): PracticeRound {
  const maxLevel = maxUnlockedLevel(profile.level);
  const rng = createRng(randomSeed() + salt);

  let level: number;
  if (practiceLevel !== undefined) {
    level = Math.max(1, Math.min(maxLevel, Math.floor(practiceLevel)));
  } else {
    const review = maxLevel > 1 && rng() < 0.2;
    level = review ? maxLevel - 1 : maxLevel;
  }

  const seed = Math.floor(createRng(randomSeed() + salt + level * 997)() * 1_000_000);
  return {
    level,
    challenge: challengeForLevel(seed, level, options?.constraints),
  };
}

export function challengeCountsTowardProgress(
  profileLevel: number,
  challengeLevel: number,
): boolean {
  return challengeLevel >= profileLevel;
}

export function recordChallengeResult(
  profile: SightProfile,
  passed: boolean,
  options?: { challengeLevel?: number; countPass?: boolean },
): SightProfile {
  const challengeLevel = options?.challengeLevel ?? profile.level;
  const countsTowardProgress =
    options?.countPass !== false && challengeCountsTowardProgress(profile.level, challengeLevel);

  const next: SightProfile = {
    ...profile,
    challengesCompleted: profile.challengesCompleted + 1,
    passesAtLevel: countsTowardProgress
      ? passed
        ? profile.passesAtLevel + 1
        : 0
      : profile.passesAtLevel,
  };

  if (
    countsTowardProgress &&
    passed &&
    next.passesAtLevel >= PASSES_TO_ADVANCE &&
    profile.level < MAX_LEVEL
  ) {
    return {
      ...next,
      level: profile.level + 1,
      passesAtLevel: 0,
    };
  }

  return next;
}

export { PASSES_TO_ADVANCE };
