export type TimingJudgment =
  | 'perfect'
  | 'early'
  | 'late'
  | 'wrong_pitch'
  | 'missed';

export interface PracticeNoteResult {
  noteId: string;
  expectedPitches: number[];
  playedPitches: number[];
  timingOffsetMs: number;
  pitchCorrect: boolean;
  timing: TimingJudgment;
}

export interface PracticeRun {
  startTime: number;
  endTime: number;
  results: PracticeNoteResult[];
  accuracy: number;
}

export interface PracticeSession {
  scoreId: string;
  runs: PracticeRun[];
}
