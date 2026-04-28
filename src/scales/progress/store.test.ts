import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAdvancementCriteria,
  getCleanRunStreak,
  recordPractice,
  getExerciseProgress,
  loadProgress,
  saveProgress,
  markOnboardingSeen,
  runMeetsCleanBar,
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
    version: 3,
    exercises: {},
    currentTierId: 'tier-1',
    seenOnboarding: false,
    introducedConcepts: {},
    introducedExerciseHands: {},
  };
}

function exerciseStages() {
  const found = findExercise(EXERCISE_ID);
  if (!found) throw new Error(`Test fixture broken: ${EXERCISE_ID} not found`);
  return found.exercise.stages;
}

function record(stageId: string, accuracy: number, t: number = Date.now()): PracticeRecord {
  return {
    exerciseId: EXERCISE_ID,
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

  it('does not advance free-tempo on 99% accuracy (must be pitch-perfect)', () => {
    let data = fresh();
    const stages = exerciseStages();
    const s1 = stages[0];

    data = recordPractice(data, record(s1.id, 0.99, 100));
    data = recordPractice(data, record(s1.id, 0.99, 200));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBeNull();
  });

  it('advances a tempo stage after 3 runs ≥ 90%', () => {
    let data = fresh();
    const stages = exerciseStages();
    // Start at s3 (a tempo stage) by manually advancing past free-tempo.
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[1].id,
      currentStageId: stages[2].id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };

    data = recordPractice(data, record(stages[2].id, 0.92, 100));
    data = recordPractice(data, record(stages[2].id, 0.91, 200));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[1].id);

    data = recordPractice(data, record(stages[2].id, 0.95, 300));
    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.completedStageId).toBe(stages[2].id);
    expect(after.currentStageId).toBe(stages[3].id);
  });

  it('does not advance when a different stage breaks the same-stage prefix (even with older clean runs)', () => {
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

    data = recordPractice(data, record(s3.id, 0.95, 100));
    data = recordPractice(data, record(s2.id, 0.95, 200));
    data = recordPractice(data, record(s3.id, 0.95, 300));
    data = recordPractice(data, record(s3.id, 0.95, 400));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(s2.id);

    data = recordPractice(data, record(s3.id, 0.95, 500));
    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.completedStageId).toBe(s3.id);
    expect(after.currentStageId).toBe(stages[3].id);
  });

  it('does not advance a tempo stage when one of the last 3 runs falls below 90%', () => {
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

    data = recordPractice(data, record(stages[2].id, 0.95, 100));
    data = recordPractice(data, record(stages[2].id, 0.85, 200));
    data = recordPractice(data, record(stages[2].id, 0.95, 300));
    // Last 3 include the 0.85 → still below the 90% bar.
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[1].id);

    // Two more clean runs flush the stale 0.85 out of the trailing window.
    data = recordPractice(data, record(stages[2].id, 0.95, 400));
    data = recordPractice(data, record(stages[2].id, 0.95, 500));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[2].id);
  });

  it('advances a subdivision stage at 85% (looser than the 90% global bar)', () => {
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

    data = recordPractice(data, record(s9.id, 0.86, 100));
    data = recordPractice(data, record(s9.id, 0.87, 200));
    data = recordPractice(data, record(s9.id, 0.85, 300));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(s9.id);
  });

  it('treats cross-session history as part of the same 3-in-a-row window', () => {
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
    data = recordPractice(data, record(stages[2].id, 0.95, yesterday));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[1].id);

    // Day 2: a second clean run still doesn't advance — only 2 in window.
    data = recordPractice(data, record(stages[2].id, 0.95, today));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[1].id);

    // Day 2: third clean run completes the cross-session streak — advance.
    data = recordPractice(data, record(stages[2].id, 0.95, today + 1000));
    const after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.completedStageId).toBe(stages[2].id);
    expect(after.currentStageId).toBe(stages[3].id);
  });

  it('streak-off-by-one regression: 1 record -> streak=1, 2 records -> no advance', () => {
    // Before the SessionScreen finishedRef guard, every natural-completion
    // run would dispatch FINISH_EXERCISE twice, append two identical
    // PracticeRecords, and the slice(0, 3) advancement window would see
    // [r, r, r2] after only TWO real attempts — the user-reported "2/3
    // streak after the first clean run" and the "advanced after 3 passes
    // period not 3 in a row" issues are the same defect. This test is at
    // the store layer (not the dispatch layer where the actual fix lives)
    // but it's a backstop: even if the guard regresses, N real attempts
    // -> N history records -> the streak/advance math stays honest.
    // Anything different means upstream is double-recording.
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

    // Single 95% run -> exactly 1 history record, exactly 1 clean run.
    // This is the exact case the user reported as "shows 2/3 instead of
    // 1/3 after the first clean run".
    data = recordPractice(data, record(stages[2].id, 0.95, 100));
    let after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.history).toHaveLength(1);
    expect(getCleanRunStreak(after, stages[2].id)).toBe(1);
    expect(after.completedStageId).toBe(stages[1].id);

    // Two 95% runs -> 2 history records, streak=2, still NOT advanced.
    // (Pre-fix this would have been 4 records and the slice(0, 3) gate
    // would have triggered advancement here.)
    data = recordPractice(data, record(stages[2].id, 0.95, 200));
    after = getExerciseProgress(data, EXERCISE_ID);
    expect(after.history).toHaveLength(2);
    expect(getCleanRunStreak(after, stages[2].id)).toBe(2);
    expect(after.completedStageId).toBe(stages[1].id);
    expect(after.currentStageId).toBe(stages[2].id);
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

  it('keeps the strict 90% bar on the final mastery-gate stage', () => {
    let data = fresh();
    const stages = exerciseStages();
    const last = stages[stages.length - 1];
    // Park progress at the final stage.
    data.exercises[EXERCISE_ID] = {
      exerciseId: EXERCISE_ID,
      completedStageId: stages[stages.length - 2].id,
      currentStageId: last.id,
      history: [],
      needsReview: false,
      reviewStageId: null,
      lastPracticedAt: null,
    };

    // 3 clean runs at 86% — would have advanced any other 2-octave stage.
    data = recordPractice(data, record(last.id, 0.86, 100));
    data = recordPractice(data, record(last.id, 0.86, 200));
    data = recordPractice(data, record(last.id, 0.86, 300));
    expect(getExerciseProgress(data, EXERCISE_ID).completedStageId).toBe(stages[stages.length - 2].id);

    // Same 3 runs at 90% clear the gate.
    data = recordPractice(data, record(last.id, 0.9, 400));
    data = recordPractice(data, record(last.id, 0.9, 500));
    data = recordPractice(data, record(last.id, 0.9, 600));
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

  it('advances pentascale metronome stage after three timing-lenient cleans', () => {
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
    data = recordPractice(data, pentascaleTimedRecord(p4.id, { perfect: 8, early: 1, t: 100 }));
    data = recordPractice(data, pentascaleTimedRecord(p4.id, { perfect: 8, late: 1, t: 200 }));
    expect(getExerciseProgress(data, PENTA_ID).completedStageId).toBe(p3.id);

    data = recordPractice(data, pentascaleTimedRecord(p4.id, { perfect: 8, early: 1, t: 300 }));
    const after = getExerciseProgress(data, PENTA_ID);
    expect(after.completedStageId).toBe(p4.id);
    expect(after.currentStageId).toBe(stages[p4Idx + 1].id);
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
    data = recordPractice(data, pentascaleTimedRecord(last.id, { perfect: 10, early: 1, t: 100 }));
    data = recordPractice(data, pentascaleTimedRecord(last.id, { perfect: 10, late: 1, t: 200 }));
    let ep = getExerciseProgress(data, PENTA_ID);
    expect(ep.completedStageId).toBe(prev.id);
    expect(ep.currentStageId).toBe(last.id);

    data = recordPractice(data, pentascaleTimedRecord(last.id, { perfect: 10, early: 1, t: 300 }));
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
  it('keeps quarter clicks on early keys and introduces eighths on D', () => {
    const c = findExercise('C-pentascale-major')!;
    const d = findExercise('D-pentascale-major')!;
    expect(c.exercise.stages.find(s => s.id.endsWith('-p4'))?.subdivision).toBe('none');
    expect(d.exercise.stages.find(s => s.id.endsWith('-p4'))?.subdivision).toBe('eighth');
    expect(d.exercise.stages.find(s => s.id.endsWith('-p7'))?.subdivision).toBe('eighth');
  });

  it('appends triplet and sixteenth both-hands stages on A', () => {
    const a = findExercise('A-pentascale-major')!;
    expect(a.exercise.stages.some(s => s.id.endsWith('-p8'))).toBe(true);
    expect(a.exercise.stages.some(s => s.id.endsWith('-p9'))).toBe(true);
    expect(a.exercise.stages.find(s => s.id.endsWith('-p8'))?.subdivision).toBe('triplet');
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
    const p8 = aPenta.exercise.stages.find(s => s.id.endsWith('-p8'))!;
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
    expect(loaded.exercises['A-pentascale-major']!.currentStageId).toBe(p8.id);
    expect(loaded.exercises['A-pentascale-major']!.completedStageId).toBe(p7.id);
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

  it('returns a fresh v3 record when storage is empty', () => {
    const loaded = loadProgress();
    expect(loaded.version).toBe(3);
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
    expect(migrated.version).toBe(3);
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
    expect(loaded.version).toBe(3);
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
    expect(loaded.version).toBe(3);
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
    expect(loaded.version).toBe(3);
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
    expect(loaded.version).toBe(3);
    expect(loaded.currentTierId).not.toBe('tier-9');
    expect(loaded.seenOnboarding).toBe(false);
  });

  it('returns a fresh default when the stored payload is corrupted', () => {
    localStorage.setItem('scales-progress', '{not valid json');
    const loaded = loadProgress();
    expect(loaded.version).toBe(3);
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
      version: 3,
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
