import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAdvancementCriteria,
  formatAdvancementCleanRunsLabel,
  formatDwellCleanRunsSubline,
  formatDwellPerfectRunsSubline,
  getCleanRunStreak,
  stageAdvancementGateMet,
  isPracticingAdvancementStage,
  recordPractice,
  getExerciseProgress,
  loadProgress,
  saveProgress,
  markOnboardingSeen,
  runMeetsPerfectBar,
  runMeetsCleanBar,
  updateStageMasteryOnRecord,
  resolveRegressTargetStage,
  OVERLEARN_REGRESS_WITHOUT_FIRST_PERFECT,
  consecutiveRoughRunsOnStage,
  getCombinedMajorScaleMastery,
  findPentascaleMajorSibling,
  exerciseContributesToGlobalMasteryTotals,
  getMasteryTier,
} from './store';
import { findExercise } from '../curriculum/tiers';
import type { ScalesProgressData, PracticeRecord, ExerciseProgress } from './types';

const EXERCISE_ID = 'C-major-scale';

function fresh(): ScalesProgressData {
  // Reset between tests so localStorage state from prior runs can't leak
  // expectations across cases.
  localStorage.clear();
  return {
    version: 4,
    exercises: {},
    currentTierId: 'tier-1',
    seenOnboarding: false,
    introducedConcepts: {},
    introducedExerciseHands: {},
  };
}

/** Record consecutive perfect runs until the current stage clears (overlearning gate). */
function completeCurrentStageWithPerfectRuns(
  data: ScalesProgressData,
  exerciseId: string,
  stageId: string,
  startT = 100,
): ScalesProgressData {
  let d = data;
  let t = startT;
  for (let guard = 0; guard < 12; guard++) {
    const before = getExerciseProgress(d, exerciseId);
    d = recordPractice(d, record(stageId, 1.0, t++, exerciseId));
    const after = getExerciseProgress(d, exerciseId);
    if (after.completedStageId === stageId && after.currentStageId !== before.currentStageId) {
      return d;
    }
    if (after.currentStageId !== before.currentStageId) return d;
  }
  return d;
}

function exerciseStages() {
  const found = findExercise(EXERCISE_ID);
  if (!found) throw new Error(`Test fixture broken: ${EXERCISE_ID} not found`);
  return found.exercise.stages;
}

function record(
  stageId: string,
  accuracy: number,
  t: number = Date.now(),
  exerciseId: string = EXERCISE_ID,
): PracticeRecord {
  return {
    exerciseId,
    stageId,
    timestamp: t,
    accuracy,
    noteCount: 8,
    correctCount: Math.round(accuracy * 8),
  };
}

describe('getAdvancementCriteria', () => {
  beforeEach(() => fresh());

  it('requires 2 pitch-perfect runs on free-tempo stages', () => {
    const stages = exerciseStages();
    // s1, s2: 1-octave RH/LH free; s14a, s14b: 2-octave RH/LH free
    // (the new pedagogical on-ramp).
    const freeTempoIds = ['-s1', '-s2', '-s14a', '-s14b'];
    for (const suffix of freeTempoIds) {
      const stage = stages.find(s => s.id.endsWith(suffix))!;
      expect(getAdvancementCriteria(stage)).toEqual({ threshold: 1.0, runs: 2 });
    }
  });

  it('uses standard 3 @ 90% bar for tempo stages without subdivision', () => {
    const stages = exerciseStages();
    // s3-s8 are 1-octave straight-note tempo stages.
    for (const num of [3, 4, 5, 6, 7, 8]) {
      const stage = stages.find(s => s.id.endsWith(`-s${num}`))!;
      expect(getAdvancementCriteria(stage)).toEqual({ threshold: 0.9, runs: 3 });
    }
  });

  it('loosens to 3 @ 85% on subdivision stages', () => {
    const stages = exerciseStages();
    // s9-s14 are 1-octave subdivision stages (eighth/triplet/sixteenth).
    for (const num of [9, 10, 11, 12, 13, 14]) {
      const stage = stages.find(s => s.id.endsWith(`-s${num}`))!;
      expect(getAdvancementCriteria(stage)).toEqual({ threshold: 0.85, runs: 3 });
    }
  });

  it('loosens to 3 @ 85% on intermediate 2-octave stages', () => {
    const stages = exerciseStages();
    // s14c, s14d, s14e: 2-octave hands-separate / together at slow tempo
    // (the new metronome on-ramp). s15-s17: 2-octave both-hands stages
    // before the mastery gate.
    const intermediateTwoOctIds = ['-s14c', '-s14d', '-s14e', '-s15', '-s16', '-s17'];
    for (const suffix of intermediateTwoOctIds) {
      const stage = stages.find(s => s.id.endsWith(suffix))!;
      expect(getAdvancementCriteria(stage)).toEqual({ threshold: 0.85, runs: 3 });
    }
  });

  it('snaps the final mastery-gate stage back to 3 @ 90%', () => {
    const stages = exerciseStages();
    const finalStage = stages[stages.length - 1];
    expect(getAdvancementCriteria(finalStage, true)).toEqual({ threshold: 0.9, runs: 3 });
  });

  it('uses 3 @ 85% for both-hand pentascale metronome including final fluent gate', () => {
    const p7 = findExercise('C-pentascale-major')!.exercise.stages.find(s => s.id.endsWith('-p7'))!;
    expect(p7.hand).toBe('both');
    expect(getAdvancementCriteria(p7, true, 'pentascale-major')).toEqual({ threshold: 0.85, runs: 3 });
  });
});

describe('formatAdvancementCleanRunsLabel', () => {
  it('caps the numerator at required runs', () => {
    expect(formatAdvancementCleanRunsLabel(11, 3)).toBe('3/3');
    expect(formatAdvancementCleanRunsLabel(2, 3)).toBe('2/3');
  });
});

describe('formatDwellCleanRunsSubline', () => {
  it('labels run progress explicitly (not note counts)', () => {
    expect(formatDwellCleanRunsSubline(89, 2, 3, 'advancement')).toBe('89% · 2/3 clean runs');
    expect(formatDwellCleanRunsSubline(89, 11, 3, 'stage')).toBe('89% · 3/3 on this level');
  });
});

describe('formatDwellPerfectRunsSubline', () => {
  it('labels perfect-run progress explicitly', () => {
    expect(formatDwellPerfectRunsSubline(100, 2, 4, 'advancement')).toBe('100% · 2/4 perfect runs');
  });
});

describe('isPracticingAdvancementStage', () => {
  it('is false when the practiced stage is not currentStageId', () => {
    const stageId = `${EXERCISE_ID}-s1`;
    const progress: ExerciseProgress = {
      exerciseId: EXERCISE_ID,
      completedStageId: stageId,
      currentStageId: `${EXERCISE_ID}-s4`,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    expect(isPracticingAdvancementStage(progress, stageId)).toBe(false);
    expect(isPracticingAdvancementStage(progress, `${EXERCISE_ID}-s4`)).toBe(true);
  });
});

describe('getCleanRunStreak', () => {
  function makeProgress(history: PracticeRecord[]): ExerciseProgress {
    return {
      exerciseId: EXERCISE_ID,
      completedStageId: null,
      currentStageId: `${EXERCISE_ID}-s3`,
      history,
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
  }

  it('counts only consecutive runs at-or-above the threshold on the given stage', () => {
    const stageId = `${EXERCISE_ID}-s3`;
    const progress = makeProgress([
      record(stageId, 0.95, 100),
      record(stageId, 0.92, 90),
      record(stageId, 0.7,  80),
      record(stageId, 0.95, 70),
    ]);
    expect(getCleanRunStreak(progress, stageId)).toBe(2);
  });

  it('breaks the streak when another stage appears between same-stage runs', () => {
    // Newest-first: after a clean s3 run, practicing s4 breaks the s3 prefix;
    // the older s3 clean no longer counts toward "consecutive on this stage".
    const a = `${EXERCISE_ID}-s3`;
    const b = `${EXERCISE_ID}-s4`;
    const progress = makeProgress([
      record(a, 0.95, 100),
      record(b, 0.5,  90),
      record(a, 0.92, 80),
    ]);
    expect(getCleanRunStreak(progress, a)).toBe(1);
  });

  it('returns 0 when the most recent run on this stage was below the bar', () => {
    const stageId = `${EXERCISE_ID}-s3`;
    const progress = makeProgress([
      record(stageId, 0.6,  100),
      record(stageId, 0.95, 90),
    ]);
    expect(getCleanRunStreak(progress, stageId)).toBe(0);
  });
});

describe('recordPractice advancement', () => {
  beforeEach(() => fresh());

  it('advances a free-tempo stage after 2 perfect runs', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s1 = stages[0];

    data = recordPractice(data, record(s1.id, 1.0, 100));
    expect(getExerciseProgress(data, EXERCISE_ID).currentStageId).toBe(s1.id);
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBeNull();

    data = recordPractice(data, record(s1.id, 1.0, 200));
    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.completedStageId).toBe(s1.id);
    expect(after.currentStageId).toBe(stages[1].id);
  });

  it('counts one pitch-perfect free-tempo row as streak 1 (warmup hit before scored run)', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s1 = stages[0];
    data = recordPractice(data, record(s1.id, 1.0, 100));
    expect(getCleanRunStreak(getExerciseProgress(data, EXERCISE_ID), s1.id)).toBe(1);
    expect(getExerciseProgress(data, EXERCISE_ID).currentStageId).toBe(s1.id);
  });

  it('does not count free-tempo warmup rows toward the 2-run advancement gate', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s1 = stages[0];
    const warmup = (ts: number): PracticeRecord => ({
      exerciseId: EXERCISE_ID,
      stageId: s1.id,
      timestamp: ts,
      accuracy: 1,
      noteCount: 8,
      correctCount: 8,
      purpose: 'warmup',
    });
    data = recordPractice(data, warmup(10));
    data = recordPractice(data, warmup(20));
    data = recordPractice(data, record(s1.id, 1.0, 100));
    let ep = getExerciseProgress(data, EXERCISE_ID);
    expect(ep.completedStageId).toBeNull();
    expect(getCleanRunStreak(ep, s1.id)).toBe(1);

    data = recordPractice(data, record(s1.id, 1.0, 200));
    ep = getExerciseProgress(data, EXERCISE_ID);
    expect(ep.completedStageId).toBe(s1.id);
    expect(ep.currentStageId).toBe(stages[1].id);
  });

  it('does not advance free-tempo on 99% accuracy (must be pitch-perfect)', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s1 = stages[0];

    data = recordPractice(data, record(s1.id, 0.99, 100));
    data = recordPractice(data, record(s1.id, 0.99, 200));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBeNull();
  });

  it('advances a tempo stage after overlearning perfect streak', () => {
    let data = fresh();
    const stages = exerciseStages();
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[1].id,
      currentStageId: stages[2].id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
      stageMastery: {},
    };

    data = recordPractice(data, record(stages[2].id, 0.92, 100));
    data = recordPractice(data, record(stages[2].id, 0.91, 200));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[1].id);

    data = completeCurrentStageWithPerfectRuns(data, EXERCISE_ID, stages[2].id, 300);
    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.completedStageId).toBe(stages[2].id);
    expect(after.currentStageId).toBe(stages[3].id);
  });

  it('does not advance when a different stage breaks the same-stage prefix (even with older perfect runs)', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s2 = stages[1];
    const s3 = stages[2];
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: s2.id,
      currentStageId: s3.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };

    data = recordPractice(data, record(s3.id, 1.0, 100));
    data = recordPractice(data, record(s2.id, 1.0, 200));
    data = recordPractice(data, record(s3.id, 1.0, 300));
    data = recordPractice(data, record(s3.id, 1.0, 400));
    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.completedStageId).toBe(s3.id);
    expect(after.currentStageId).toBe(stages[3].id);
  });

  it('does not advance until required perfect streak is met', () => {
    let data = fresh();
    const stages = exerciseStages();
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[1].id,
      currentStageId: stages[2].id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };

    data = recordPractice(data, record(stages[2].id, 1.0, 100));
    data = recordPractice(data, record(stages[2].id, 0.85, 200));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[1].id);

    data = recordPractice(data, record(stages[2].id, 1.0, 300));
    data = recordPractice(data, record(stages[2].id, 1.0, 400));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[2].id);
  });

  it('advances a subdivision stage with perfect runs (overlearning gate)', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s9 = stages.find(s => s.id.endsWith('-s9'))!;
    // Park progress at s9.
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[7].id,
      currentStageId: s9.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };

    data = completeCurrentStageWithPerfectRuns(data, EXERCISE_ID, s9.id, 100);
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(s9.id);
  });

  it('treats cross-session history as part of the same overlearning streak', () => {
    // Regression: the user can pass a stage by completing a clean run at
    // the end of one session and two more in the next. History persists
    // in localStorage, so yesterday's clean run is the first member of
    // today's trailing window. The rule is strict-consecutive *across
    // sessions* — not "3 in this session". The Session UI surfaces this
    // via the streak-carryover chip (separate concern), but the rule is
    // unchanged and locked here.
    let data = fresh();
    const stages = exerciseStages();
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[1].id,
      currentStageId: stages[2].id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };

    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    const today = Date.now();

    // Day 1: one clean run.
    data = recordPractice(data, record(stages[2].id, 1.0, yesterday));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[1].id);

    data = recordPractice(data, record(stages[2].id, 1.0, today));
    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.completedStageId).toBe(stages[2].id);
    expect(after.currentStageId).toBe(stages[3].id);
  });

  it('streak-off-by-one regression: two perfect records advance when overlearning target is 2', () => {
    let data = fresh();
    const stages = exerciseStages();
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[1].id,
      currentStageId: stages[2].id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };

    data = recordPractice(data, record(stages[2].id, 1.0, 100));
    let after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.history).toHaveLength(1);
    expect(after.stageMastery?.[stages[2].id]?.currentPerfectStreak).toBe(1);
    expect(after.completedStageId).toBe(stages[1].id);

    data = recordPractice(data, record(stages[2].id, 1.0, 200));
    after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.history).toHaveLength(2);
    expect(after.completedStageId).toBe(stages[2].id);
    expect(after.currentStageId).toBe(stages[3].id);
  });

  it('does not flag needsReview when a drill record dips below the shaky threshold', () => {
    // Drill is voluntary perfectionism — a single off run during polish
    // mustn't demote a hard-won "Mastered" back to "Due for review". The
    // record still gets appended to history (so getExerciseProficiency
    // sees it) but the lifecycle flags are left alone.
    let data = fresh();
    const stages = exerciseStages();
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[stages.length - 1].id,
      currentStageId: stages[stages.length - 1].id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };

    const drillRecord: PracticeRecord = {
      ...record(stages[stages.length - 1].id, 0.5, 100),
      purpose: 'drill',
    };
    data = recordPractice(data, drillRecord);

    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.needsReview).toBe(false);
    expect(after.reviewStageId).toBeNull();
    expect(after.history).toHaveLength(1);
    expect(after.history[0].purpose).toBe('drill');
  });

  it('does not clear an existing needsReview flag via a clean drill record', () => {
    // Mirror image of the previous test: drill records also can't fix a
    // pending review. Review lifecycle is for regular practice; a
    // perfect drill round on the flagged stage should leave the flag
    // alone so the user still gets the review reminder next session.
    let data = fresh();
    const stages = exerciseStages();
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[2].id,
      currentStageId: stages[2].id,
      history: [],
      needsReview: true,
      reviewStageId: stages[2].id,
      lastPracticedAt: null,
    };

    const drillRecord: PracticeRecord = {
      ...record(stages[2].id, 1.0, 100),
      purpose: 'drill',
    };
    data = recordPractice(data, drillRecord);

    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.needsReview).toBe(true);
    expect(after.reviewStageId).toBe(stages[2].id);
  });

  it('clears the final mastery-gate stage with consecutive perfect runs', () => {
    let data = fresh();
    const stages = exerciseStages();
    const last = stages[stages.length - 1];
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[stages.length - 2].id,
      currentStageId: last.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };

    data = recordPractice(data, record(last.id, 0.86, 100));
    data = recordPractice(data, record(last.id, 0.86, 200));
    data = recordPractice(data, record(last.id, 0.86, 300));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[stages.length - 2].id);

    data = completeCurrentStageWithPerfectRuns(data, EXERCISE_ID, last.id, 400);
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(last.id);
  });
});

const PENTA_ID = 'C-pentascale-major';

function pentascaleTimedRecord(
  stageId: string,
  parts: {
    perfect: number;
    early?: number;
    late?: number;
    wrongPitch?: number;
    missed?: number;
    t?: number;
  },
): PracticeRecord {
  const early = parts.early ?? 0;
  const late = parts.late ?? 0;
  const wrongPitch = parts.wrongPitch ?? 0;
  const missed = parts.missed ?? 0;
  const perfect = parts.perfect;
  const total = perfect + early + late + wrongPitch + missed;
  const accuracy = total > 0 ? perfect / total : 0;
  return {
    exerciseId: PENTA_ID,
    stageId,
    timestamp: parts.t ?? Date.now(),
    accuracy,
    noteCount: total,
    correctCount: perfect,
    breakdown: { perfect, early, late, wrongPitch, missed },
  };
}

describe('pentascale tempo clean bar', () => {
  beforeEach(() => fresh());

  const penta = findExercise(PENTA_ID);
  if (!penta) throw new Error(`Test fixture broken: ${PENTA_ID} not found`);
  const p4 = penta.exercise.stages.find(s => s.id === `${PENTA_ID}-p4`)!;
  const p4Idx = penta.exercise.stages.findIndex(s => s.id === p4.id);
  const isFinalP4 = p4Idx === penta.exercise.stages.length - 1;

  it('runMeetsCleanBar accepts one early/late with all pitches right', () => {
    const r = pentascaleTimedRecord(p4.id, { perfect: 8, early: 1, late: 0 });
    expect(r.accuracy).toBeLessThan(0.9);
    expect(runMeetsCleanBar(r, 'pentascale-major', p4, isFinalP4)).toBe(true);
  });

  it('runMeetsCleanBar rejects any wrong pitch', () => {
    const r = pentascaleTimedRecord(p4.id, { perfect: 8, wrongPitch: 1 });
    expect(runMeetsCleanBar(r, 'pentascale-major', p4, isFinalP4)).toBe(false);
  });

  it('runMeetsCleanBar rejects two timing slips', () => {
    const r = pentascaleTimedRecord(p4.id, { perfect: 7, early: 1, late: 1 });
    expect(runMeetsCleanBar(r, 'pentascale-major', p4, isFinalP4)).toBe(false);
  });

  it('getCleanRunStreak counts pentascale timing-lenient cleans', () => {
    const stageId = p4.id;
    const progress: ExerciseProgress = {
      exerciseId: PENTA_ID,
      completedStageId: null,
      currentStageId: stageId,
      history: [
        pentascaleTimedRecord(stageId, { perfect: 8, early: 1, t: 300 }),
        pentascaleTimedRecord(stageId, { perfect: 8, late: 1, t: 200 }),
      ],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    expect(getCleanRunStreak(progress, stageId)).toBe(2);
  });

  it('stageAdvancementGateMet is true when overlearning streak is satisfied', () => {
    const stageId = p4.id;
    const progress: ExerciseProgress = {
      exerciseId: PENTA_ID,
      completedStageId: penta.exercise.stages[2].id,
      currentStageId: p4.id,
      history: [
        pentascaleTimedRecord(stageId, { perfect: 8, t: 200 }),
        pentascaleTimedRecord(stageId, { perfect: 8, t: 100 }),
      ],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
      stageMastery: {
        [stageId]: {
          attemptCount: 2,
          firstPerfectAtAttempt: 1,
          requiredPerfectStreak: 2,
          currentPerfectStreak: 2,
        },
      },
    };
    expect(
      stageAdvancementGateMet(progress, stageId, 'pentascale-major', p4, false),
    ).toBe(true);
  });

  it('stageAdvancementGateMet is false when mastery streak looks met but latest run is sub-perfect', () => {
    const stageId = p4.id;
    const progress: ExerciseProgress = {
      exerciseId: PENTA_ID,
      completedStageId: penta.exercise.stages[2].id,
      currentStageId: p4.id,
      history: [
        pentascaleTimedRecord(stageId, { perfect: 7, early: 1, t: 200 }),
        pentascaleTimedRecord(stageId, { perfect: 8, t: 100 }),
      ],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
      stageMastery: {
        [stageId]: {
          attemptCount: 3,
          firstPerfectAtAttempt: 1,
          requiredPerfectStreak: 2,
          currentPerfectStreak: 2,
        },
      },
    };
    expect(
      stageAdvancementGateMet(progress, stageId, 'pentascale-major', p4, false),
    ).toBe(false);
  });

  it('does not advance curriculum when cleans are on a stage that is not current', () => {
    let data = fresh();
    const stages = penta.exercise.stages;
    const p3 = stages[2];
    const p4 = stages[3];
    data.exercises[PENTA_ID] = {
      exerciseId: PENTA_ID,
      completedStageId: p3.id,
      currentStageId: p4.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    for (let t = 0; t < 3; t++) {
      data = recordPractice(data, pentascaleTimedRecord(p3.id, { perfect: 8, early: 1, t: 100 + t }));
    }
    const after = getExerciseProgress(data, PENTA_ID);
    expect(after.currentStageId).toBe(p4.id);
    expect(after.completedStageId).toBe(p3.id);
  });

  it('advances pentascale metronome stage after overlearning perfect streak', () => {
    let data = fresh();
    const stages = penta.exercise.stages;
    const p3 = stages[2];
    data.exercises[PENTA_ID] = {
      exerciseId: PENTA_ID,
      completedStageId: p3.id,
      currentStageId: p4.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
      stageMastery: {},
    };
    data = completeCurrentStageWithPerfectRuns(data, PENTA_ID, p4.id, 100);
    const after = getExerciseProgress(data, PENTA_ID);
    expect(after.completedStageId).toBe(p4.id);
    expect(after.currentStageId).toBe(stages[p4Idx + 1].id);
  });

  it('does not count warmup rows toward three pentascale metronome cleans', () => {
    let data = fresh();
    const stages = penta.exercise.stages;
    const p3 = stages[2];
    data.exercises[PENTA_ID] = {
      exerciseId: PENTA_ID,
      completedStageId: p3.id,
      currentStageId: p4.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    const warmup = (ts: number): PracticeRecord => ({
      exerciseId: PENTA_ID,
      stageId: p4.id,
      timestamp: ts,
      accuracy: 1,
      noteCount: 9,
      correctCount: 9,
      purpose: 'warmup',
    });
    data = recordPractice(data, warmup(10));
    data = recordPractice(data, warmup(20));
    data = recordPractice(data, {
      exerciseId: PENTA_ID,
      stageId: p4.id,
      timestamp: 100,
      accuracy: 1,
      noteCount: 9,
      correctCount: 9,
    });
    const ep = getExerciseProgress(data, PENTA_ID);
    expect(ep.completedStageId).toBe(p3.id);
    expect(ep.stageMastery?.[p4.id]?.currentPerfectStreak).toBe(1);
  });

  it('clears pentascale final stage (last level) while currentStageId stays there', () => {
    let data = fresh();
    const stages = penta.exercise.stages;
    const prev = stages.at(-2)!;
    const last = stages.at(-1)!;
    expect(last.id.endsWith('-p9')).toBe(true);
    data.exercises[PENTA_ID] = {
      exerciseId: PENTA_ID,
      completedStageId: prev.id,
      currentStageId: last.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    let ep = getExerciseProgress(data, PENTA_ID);
    expect(ep.completedStageId).toBe(prev.id);
    expect(ep.currentStageId).toBe(last.id);

    data = completeCurrentStageWithPerfectRuns(data, PENTA_ID, last.id, 100);
    ep = getExerciseProgress(data, PENTA_ID);
    expect(ep.completedStageId).toBe(last.id);
    expect(ep.currentStageId).toBe(last.id);
  });
});

describe('pentascale both-hand metronome accuracy gate', () => {
  it('runMeetsCleanBar passes at 86% with multiple timing slips on BH stage', () => {
    const p7 = findExercise('D-pentascale-major')!.exercise.stages.find(s => s.id.endsWith('-p7'))!;
    expect(p7.hand).toBe('both');
    const r: PracticeRecord = {
      exerciseId: 'D-pentascale-major',
      stageId: p7.id,
      timestamp: 1,
      accuracy: 0.86,
      noteCount: 50,
      correctCount: 43,
      breakdown: { perfect: 43, early: 4, late: 3, wrongPitch: 0, missed: 0 },
    };
    expect(runMeetsCleanBar(r, 'pentascale-major', p7, true)).toBe(true);
  });

  it('runMeetsCleanBar fails below 85% on BH pentascale metronome', () => {
    const p7 = findExercise('D-pentascale-major')!.exercise.stages.find(s => s.id.endsWith('-p7'))!;
    const r: PracticeRecord = {
      exerciseId: 'D-pentascale-major',
      stageId: p7.id,
      timestamp: 1,
      accuracy: 0.84,
      noteCount: 50,
      correctCount: 42,
      breakdown: { perfect: 42, early: 4, late: 4, wrongPitch: 0, missed: 0 },
    };
    expect(runMeetsCleanBar(r, 'pentascale-major', p7, true)).toBe(false);
  });
});

describe('Tier-0 pentascale spiral stage shapes', () => {
  it('uses quarter subdivisions through the fluent gate for every key', () => {
    const c = findExercise('C-pentascale-major')!;
    const d = findExercise('D-pentascale-major')!;
    expect(c.exercise.stages.find(s => s.id.endsWith('-p4'))?.subdivision).toBe('none');
    expect(d.exercise.stages.find(s => s.id.endsWith('-p4'))?.subdivision).toBe('none');
    expect(d.exercise.stages.find(s => s.id.endsWith('-p7'))?.subdivision).toBe('none');
  });

  it('ramps eighth → triplet → sixteenth after the fluent gate', () => {
    const a = findExercise('A-pentascale-major')!;
    expect(a.exercise.stages.some(s => s.id.endsWith('-p8e'))).toBe(true);
    expect(a.exercise.stages.some(s => s.id.endsWith('-p8t'))).toBe(true);
    expect(a.exercise.stages.find(s => s.id.endsWith('-p8t'))?.bpm).toBe(72);
    expect(a.exercise.stages.some(s => s.id.endsWith('-p9'))).toBe(true);
    expect(a.exercise.stages.find(s => s.id.endsWith('-p8e'))?.subdivision).toBe('eighth');
    expect(a.exercise.stages.find(s => s.id.endsWith('-p8') && !s.id.endsWith('-p8e'))?.subdivision).toBe(
      'triplet',
    );
    expect(a.exercise.stages.find(s => s.id.endsWith('-p9'))?.subdivision).toBe('sixteenth');
  });
});

describe('reconcileProgressToCurriculum via loadProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('moves veterans resting on old A pentascale final onto first appended stage', () => {
    const aPenta = findExercise('A-pentascale-major')!;
    const p7 = aPenta.exercise.stages.find(s => s.id.endsWith('-p7'))!;
    const p8e = aPenta.exercise.stages.find(s => s.id.endsWith('-p8e'))!;
    localStorage.setItem('scales-progress', JSON.stringify({
      version: 3,
      currentTierId: 'tier-0',
      exercises: {
        'A-pentascale-major': {
          exerciseId: 'A-pentascale-major',
          completedStageId: p7.id,
          currentStageId: p7.id,
          history: [],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: '2020-01-01T00:00:00.000Z',
        },
      },
      seenOnboarding: true,
      introducedConcepts: {},
      introducedExerciseHands: {},
    }));
    const loaded = loadProgress();
    expect(loaded.exercises['A-pentascale-major']!.currentStageId).toBe(p8e.id);
    expect(loaded.exercises['A-pentascale-major']!.completedStageId).toBe(p7.id);
  });

  it('redirects just-cleared s11 learners onto moderate triplet ramp', () => {
    const major = findExercise('C-major-scale')!;
    const s11 = major.exercise.stages.find(s => s.id.endsWith('-s11'))!;
    const s11m = major.exercise.stages.find(s => s.id.endsWith('-s11m'))!;
    const s12 = major.exercise.stages.find(s => s.id.endsWith('-s12'))!;
    expect(s11m).toBeDefined();
    localStorage.setItem('scales-progress', JSON.stringify({
      version: 3,
      currentTierId: 'tier-1',
      exercises: {
        'C-major-scale': {
          exerciseId: 'C-major-scale',
          completedStageId: s11.id,
          currentStageId: s12!.id,
          history: [],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: null,
        },
      },
      seenOnboarding: true,
      introducedConcepts: {},
      introducedExerciseHands: {},
    }));
    const loaded = loadProgress();
    expect(loaded.exercises['C-major-scale']!.currentStageId).toBe(s11m!.id);
  });
});

describe('consecutiveRoughRunsOnStage', () => {
  it('counts only leading rough runs for the stage, stopping at drill or non-rough', () => {
    const stages = exerciseStages();
    const s3 = stages.find(s => s.id.endsWith('-s3'))!;
    const idx = stages.findIndex(s => s.id === s3.id);
    const isFinal = idx === stages.length - 1;
    const rough = (t: number): PracticeRecord => ({
      exerciseId: EXERCISE_ID,
      stageId: s3.id,
      timestamp: t,
      accuracy: 0.7,
      noteCount: 8,
      correctCount: 5,
    });
    const near = (t: number): PracticeRecord => ({
      exerciseId: EXERCISE_ID,
      stageId: s3.id,
      timestamp: t,
      accuracy: 0.88,
      noteCount: 8,
      correctCount: 7,
    });
    const history: PracticeRecord[] = [
      rough(400),
      rough(300),
      { ...rough(250), purpose: 'drill' },
      rough(200),
      rough(100),
    ];
    expect(
      consecutiveRoughRunsOnStage(history, s3.id, 'major-scale', s3, isFinal),
    ).toBe(2);
    const history2: PracticeRecord[] = [rough(300), rough(200), near(100)];
    expect(
      consecutiveRoughRunsOnStage(history2, s3.id, 'major-scale', s3, isFinal),
    ).toBe(2);
  });
});

describe('loadProgress migrations', () => {
  beforeEach(() => localStorage.clear());

  it('returns a fresh v4 record when storage is empty', () => {
    const loaded = loadProgress();
    expect(loaded.version).toBe(4);
    expect(loaded.seenOnboarding).toBe(false);
    expect(loaded.exercises).toEqual({});
    expect(loaded.introducedConcepts).toEqual({});
    expect(loaded.introducedExerciseHands).toEqual({});
  });

  it('migrates a v1 payload forward without wiping practice history', () => {
    // Hand-craft a "this user is mid-curriculum" v1 record and confirm
    // the migration preserves currentTierId, exercises, and history
    // while defaulting the new `seenOnboarding` flag.
    const v1Payload = {
      version: 1,
      currentTierId: 'tier-2',
      exercises: {
        'C-major-scale': {
          exerciseId: 'C-major-scale',
          completedStageId: 'C-major-scale-s8',
          currentStageId: 'C-major-scale-s9',
          history: [
            {
              exerciseId: 'C-major-scale',
              stageId: 'C-major-scale-s8',
              timestamp: 100,
              accuracy: 0.95,
              noteCount: 8,
              correctCount: 7,
            },
          ],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: '2024-01-01T00:00:00.000Z',
        },
      },
    };
    localStorage.setItem('scales-progress', JSON.stringify(v1Payload));

    const migrated = loadProgress();
    expect(migrated.version).toBe(4);
    expect(migrated.currentTierId).toBe('tier-2');
    expect(migrated.seenOnboarding).toBe(false);
    const ex = migrated.exercises['C-major-scale'];
    expect(ex).toBeDefined();
    expect(ex.completedStageId).toBe('C-major-scale-s8');
    expect(ex.history).toHaveLength(1);
    expect(ex.history[0].accuracy).toBe(0.95);
  });

  it('migrates an empty v2 payload to v3 with empty introduction maps', () => {
    const v2Payload = {
      version: 2,
      currentTierId: 'tier-0',
      exercises: {},
      seenOnboarding: true,
    };
    localStorage.setItem('scales-progress', JSON.stringify(v2Payload));

    const loaded = loadProgress();
    expect(loaded.version).toBe(4);
    expect(loaded.seenOnboarding).toBe(true);
    expect(loaded.introducedConcepts).toEqual({});
    expect(loaded.introducedExerciseHands).toEqual({});
  });

  it('migrates a v2 payload with mid-curriculum history, backfilling concept and hand flags', () => {
    // The user has cleared C-major s1 (RH free), s2 (LH free), s3 (RH
    // slow click), and s5 (BH slow click). The migration should
    // backfill the freeTempo / metronome / handsTogether / thumbUnder
    // concepts plus all three hands for the C-major exercise, while
    // leaving moderateTempo / fromMemory / subdivision / 2-octave flags
    // untouched.
    const v2Payload = {
      version: 2,
      currentTierId: 'tier-1',
      exercises: {
        'C-major-scale': {
          exerciseId: 'C-major-scale',
          completedStageId: 'C-major-scale-s5',
          currentStageId: 'C-major-scale-s6',
          history: [
            { exerciseId: 'C-major-scale', stageId: 'C-major-scale-s5', timestamp: 400, accuracy: 0.95, noteCount: 8, correctCount: 8 },
            { exerciseId: 'C-major-scale', stageId: 'C-major-scale-s3', timestamp: 300, accuracy: 0.95, noteCount: 8, correctCount: 8 },
            { exerciseId: 'C-major-scale', stageId: 'C-major-scale-s2', timestamp: 200, accuracy: 1.0, noteCount: 8, correctCount: 8 },
            { exerciseId: 'C-major-scale', stageId: 'C-major-scale-s1', timestamp: 100, accuracy: 1.0, noteCount: 8, correctCount: 8 },
          ],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: '2024-01-03T00:00:00.000Z',
        },
      },
      seenOnboarding: true,
    };
    localStorage.setItem('scales-progress', JSON.stringify(v2Payload));

    const loaded = loadProgress();
    expect(loaded.version).toBe(4);
    expect(loaded.introducedConcepts.freeTempo).toBe(true);
    expect(loaded.introducedConcepts.metronome).toBe(true);
    expect(loaded.introducedConcepts.handsTogether).toBe(true);
    expect(loaded.introducedConcepts.thumbUnder).toBe(true);
    expect(loaded.introducedConcepts.moderateTempo).toBeUndefined();
    expect(loaded.introducedConcepts.fromMemory).toBeUndefined();
    expect(loaded.introducedConcepts.eighthSubdivision).toBeUndefined();
    expect(loaded.introducedConcepts.twoOctaves).toBeUndefined();
    expect(loaded.introducedExerciseHands['C-major-scale']).toEqual({
      right: true,
      left: true,
      both: true,
    });
  });

  it('migrates a v2 payload that has cleared all of Tier 1 with the right flag set', () => {
    // The user has progressed through every stage of C major up to the
    // Fluent gate (s8) and through the eighth-note onboarding (s9). The
    // 2-octave on-ramp (s14a+) is still untouched.
    const stageIds = [
      's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9',
    ];
    const v2Payload = {
      version: 2,
      currentTierId: 'tier-1',
      exercises: {
        'C-major-scale': {
          exerciseId: 'C-major-scale',
          completedStageId: 'C-major-scale-s9',
          currentStageId: 'C-major-scale-s10',
          history: stageIds.map((sid, i) => ({
            exerciseId: 'C-major-scale',
            stageId: `C-major-scale-${sid}`,
            timestamp: 1000 + i * 100,
            accuracy: 0.95,
            noteCount: 8,
            correctCount: 7,
          })),
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: '2024-02-01T00:00:00.000Z',
        },
      },
      seenOnboarding: true,
    };
    localStorage.setItem('scales-progress', JSON.stringify(v2Payload));

    const loaded = loadProgress();
    expect(loaded.version).toBe(4);
    // All single-octave concepts should be set.
    expect(loaded.introducedConcepts.freeTempo).toBe(true);
    expect(loaded.introducedConcepts.metronome).toBe(true);
    expect(loaded.introducedConcepts.handsTogether).toBe(true);
    expect(loaded.introducedConcepts.moderateTempo).toBe(true);
    expect(loaded.introducedConcepts.fromMemory).toBe(true);
    expect(loaded.introducedConcepts.targetTempo).toBe(true);
    expect(loaded.introducedConcepts.eighthSubdivision).toBe(true);
    expect(loaded.introducedConcepts.thumbUnder).toBe(true);
    // 2-octave content untouched.
    expect(loaded.introducedConcepts.twoOctaves).toBeUndefined();
    expect(loaded.introducedConcepts.triplets).toBeUndefined();
    expect(loaded.introducedConcepts.sixteenths).toBeUndefined();
    expect(loaded.introducedExerciseHands['C-major-scale']).toEqual({
      right: true,
      left: true,
      both: true,
    });
  });

  it('round-trips a v3 payload preserving seenOnboarding=true and introduction flags', () => {
    const v3Payload: ScalesProgressData = {
      version: 3,
      currentTierId: 'tier-1',
      exercises: {},
      seenOnboarding: true,
      introducedConcepts: { freeTempo: true, thumbUnder: true },
      introducedExerciseHands: { 'C-major-scale': { right: true } },
    };
    saveProgress(v3Payload);
    const loaded = loadProgress();
    expect(loaded.seenOnboarding).toBe(true);
    expect(loaded.introducedConcepts.freeTempo).toBe(true);
    expect(loaded.introducedConcepts.thumbUnder).toBe(true);
    expect(loaded.introducedExerciseHands['C-major-scale']).toEqual({ right: true });
  });

  it('returns a fresh default for a future version (forward-incompatible)', () => {
    const futurePayload = {
      version: 999,
      currentTierId: 'tier-9',
      exercises: {},
      seenOnboarding: true,
    };
    localStorage.setItem('scales-progress', JSON.stringify(futurePayload));
    const loaded = loadProgress();
    expect(loaded.version).toBe(4);
    expect(loaded.currentTierId).not.toBe('tier-9');
    expect(loaded.seenOnboarding).toBe(false);
  });

  it('returns a fresh default when the stored payload is corrupted', () => {
    localStorage.setItem('scales-progress', '{not valid json');
    const loaded = loadProgress();
    expect(loaded.version).toBe(4);
    expect(loaded.exercises).toEqual({});
  });

  it('markOnboardingSeen flips the flag idempotently', () => {
    const before: ScalesProgressData = {
      version: 3,
      currentTierId: 'tier-1',
      exercises: {},
      seenOnboarding: false,
      introducedConcepts: {},
      introducedExerciseHands: {},
    };
    const after = markOnboardingSeen(before);
    expect(after.seenOnboarding).toBe(true);
    // Already-seen → identity, not a fresh object.
    expect(markOnboardingSeen(after)).toBe(after);
  });
});

describe('combined major scale + pentascale mastery', () => {
  it('resolves the tier-0 pentascale sibling for a major-scale exercise', () => {
    const major = findExercise('C-major-scale')!.exercise;
    const penta = findPentascaleMajorSibling(major);
    expect(penta?.id).toBe('C-pentascale-major');
  });

  it('excludes paired pentascale-major from global mastery totals', () => {
    const penta = findExercise('C-pentascale-major')!.exercise;
    const major = findExercise('C-major-scale')!.exercise;
    expect(exerciseContributesToGlobalMasteryTotals(penta)).toBe(false);
    expect(exerciseContributesToGlobalMasteryTotals(major)).toBe(true);
  });

  it('surfaces pentascale-only completion as fluent on the combined major row', () => {
    const major = findExercise('C-major-scale')!.exercise;
    const penta = findExercise('C-pentascale-major')!.exercise;
    const lastPentaStageId = penta.stages[penta.stages.length - 1]!.id;
    const data: ScalesProgressData = {
      version: 4,
      currentTierId: 'tier-1',
      exercises: {
        'C-pentascale-major': {
          exerciseId: 'C-pentascale-major',
          completedStageId: lastPentaStageId,
          currentStageId: lastPentaStageId,
          history: [],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: Date.now(),
        },
      },
      seenOnboarding: false,
      introducedConcepts: {},
      introducedExerciseHands: {},
    };
    const pentaEp = getExerciseProgress(data, 'C-pentascale-major');
    expect(getMasteryTier(pentaEp, penta)).toBe('mastered');

    const c = getCombinedMajorScaleMastery(data, major);
    expect(c.tier).toBe('fluent');
    expect(c.started).toBe(true);
    expect(c.levelsDone).toBe(penta.stages.length);
    expect(c.totalLevels).toBe(penta.stages.length + major.stages.length);
  });
});

describe('overlearning', () => {
  it('runMeetsPerfectBar requires accuracy >= 1', () => {
    expect(runMeetsPerfectBar(record(`${EXERCISE_ID}-s3`, 1.0))).toBe(true);
    expect(runMeetsPerfectBar(record(`${EXERCISE_ID}-s3`, 0.99))).toBe(false);
  });

  it('runMeetsPerfectBar rejects timing slips even when accuracy rounds high', () => {
    const r: PracticeRecord = {
      ...record(`${EXERCISE_ID}-s3`, 0.94),
      breakdown: { perfect: 17, early: 1, late: 0, wrongPitch: 0, missed: 0 },
    };
    expect(runMeetsPerfectBar(r)).toBe(false);
  });

  it('clamps required streak between 2 and 5 based on first perfect attempt', () => {
    let progress: ExerciseProgress = {
      exerciseId: EXERCISE_ID,
      completedStageId: null,
      currentStageId: `${EXERCISE_ID}-s3`,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    const stageId = `${EXERCISE_ID}-s3`;
    for (let i = 0; i < 6; i++) {
      const u = updateStageMasteryOnRecord(progress, record(stageId, 0.8, i), stageId);
      progress = { ...progress, stageMastery: u.stageMastery };
    }
    const u = updateStageMasteryOnRecord(progress, record(stageId, 1.0, 99), stageId);
    progress = { ...progress, stageMastery: u.stageMastery };
    expect(progress.stageMastery?.[stageId]?.firstPerfectAtAttempt).toBe(7);
    expect(progress.stageMastery?.[stageId]?.requiredPerfectStreak).toBe(5);
  });

  it('auto-regresses after ten attempts without a perfect run', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s3 = stages[2];
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[1].id,
      currentStageId: s3.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
      stageMastery: {},
    };
    for (let t = 0; t < OVERLEARN_REGRESS_WITHOUT_FIRST_PERFECT; t++) {
      data = recordPractice(data, record(s3.id, 0.85, t));
    }
    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.currentStageId).toBe(stages[1].id);
    expect(after.pendingRegressNotice?.fromStageId).toBe(s3.id);
  });

  it('resolveRegressTargetStage prefers guided sibling when regressing from beat-only s12', () => {
    const stages = exerciseStages();
    const s12Idx = stages.findIndex(s => s.id.endsWith('-s12') && !s.id.endsWith('-s12g'));
    const target = resolveRegressTargetStage(stages, s12Idx);
    expect(target?.id.endsWith('-s12g')).toBe(true);
  });

  it('does not advance bridge moderate triplet on sub-perfect accuracy', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s11m = stages.find(s => s.id.endsWith('-s11m') && !s.id.endsWith('-s11mg'))!;
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages.find(s => s.id.endsWith('-s11mg'))!.id,
      currentStageId: s11m.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    data = recordPractice(data, record(s11m.id, 0.94, 100));
    data = recordPractice(data, record(s11m.id, 0.94, 200));
    data = recordPractice(data, record(s11m.id, 0.94, 300));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(
      stages.find(s => s.id.endsWith('-s11mg'))!.id,
    );
    expect(getExerciseProgress(data, EXERCISE_ID).currentStageId).toBe(s11m.id);
  });

  it('does not advance beat-only triplet on sub-perfect accuracy even with three tries', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s11 = stages.find(s => s.id.endsWith('-s11') && !s.id.endsWith('-s11m') && !s.id.endsWith('-s11g'))!;
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages.find(s => s.id.endsWith('-s11g'))!.id,
      currentStageId: s11.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    data = recordPractice(data, record(s11.id, 0.94, 100));
    data = recordPractice(data, record(s11.id, 0.94, 200));
    data = recordPractice(data, record(s11.id, 0.94, 300));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(
      stages.find(s => s.id.endsWith('-s11g'))!.id,
    );
    expect(getExerciseProgress(data, EXERCISE_ID).currentStageId).toBe(s11.id);
  });

  it('does not advance guided triplet on a single 94% run', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s11g = stages.find(s => s.id.endsWith('-s11g'))!;
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages.find(s => s.id.endsWith('-s10'))!.id,
      currentStageId: s11g.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    data = recordPractice(data, record(s11g.id, 0.94, 100));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(
      stages.find(s => s.id.endsWith('-s10'))!.id,
    );
  });

  it('does not advance standard tempo stage on a single 94% run', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s3 = stages[2];
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[1].id,
      currentStageId: s3.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    data = recordPractice(data, record(s3.id, 0.94, 100));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[1].id);
  });

  it('advances guided subdivision stage with three clean runs at 85%', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s11g = stages.find(s => s.id.endsWith('-s11g'))!;
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages.find(s => s.id.endsWith('-s10'))!.id,
      currentStageId: s11g.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };
    data = recordPractice(data, record(s11g.id, 0.86, 100));
    data = recordPractice(data, record(s11g.id, 0.87, 200));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(
      stages.find(s => s.id.endsWith('-s10'))!.id,
    );
    data = recordPractice(data, record(s11g.id, 0.88, 300));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(s11g.id);
    expect(getExerciseProgress(data, EXERCISE_ID).currentStageId.endsWith('-s11')).toBe(true);
    expect(getExerciseProgress(data, EXERCISE_ID).currentStageId.endsWith('-s11g')).toBe(false);
  });

  it('reconcileProgress redirects beat-only triplet to guided scaffold', () => {
    localStorage.setItem('scales-progress', JSON.stringify({
      version: 4,
      currentTierId: 'tier-1',
      exercises: {
        'C-major-scale': {
          exerciseId: 'C-major-scale',
          completedStageId: 'C-major-scale-s10',
          currentStageId: 'C-major-scale-s11',
          history: [],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: null,
          stageMastery: {},
        },
      },
      seenOnboarding: true,
      introducedConcepts: {},
      introducedExerciseHands: {},
      progressUpdatedAt: new Date().toISOString(),
    }));
    const loaded = loadProgress();
    expect(loaded.exercises['C-major-scale']!.currentStageId).toBe('C-major-scale-s11g');
  });
});
