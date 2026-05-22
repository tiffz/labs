import { getLevelConfig } from '../levels';
import type { PracticeReveal, PracticeRound, SightProfile } from '../types';
import { tagsForChallenge, telemetryFromReveal } from './repTags';
import { skillVectorForChallenge } from './skillVector';
import { updateSkillMatrix } from './skillMatrix';
import type { RepPurpose, RepRecord } from './types';
import { MAX_RECENT_REPS } from './types';

export interface BuildRepInput {
  round: PracticeRound;
  reveal: PracticeReveal;
  purpose: RepPurpose;
  passed: boolean;
}

export function buildRepRecord(input: BuildRepInput): RepRecord {
  const { round, reveal, purpose, passed } = input;
  const cfg = getLevelConfig(round.level);
  const telemetry = telemetryFromReveal(reveal, round.challenge);
  return {
    at: new Date().toISOString(),
    level: round.level,
    module: cfg.module,
    kind: round.challenge.kind,
    skillVector: skillVectorForChallenge(round.challenge, round.level),
    purpose,
    passed,
    deltaE: telemetry.deltaE,
    accuracyRating: telemetry.accuracyRating,
    overlapPct: telemetry.overlapPct,
    tags: tagsForChallenge(round.challenge),
  };
}

export function appendRepToProfile(
  profile: SightProfile,
  rep: RepRecord,
): SightProfile {
  const recentReps = [...(profile.recentReps ?? []), rep].slice(-MAX_RECENT_REPS);
  const skillMatrix = updateSkillMatrix(profile.skillMatrix, rep);
  return { ...profile, recentReps, skillMatrix };
}

export function shouldCountTowardLevelAdvance(purpose: RepPurpose, reviewMode: boolean): boolean {
  if (reviewMode) return false;
  return purpose === 'curriculum' || purpose === 'practice';
}
