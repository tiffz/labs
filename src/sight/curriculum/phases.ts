/**
 * Seven-phase curriculum scaffolding for Color Sight Trainer.
 * Temperature (warm/cool) is a continuous axis across phases, not a one-off topic.
 */
export type CurriculumPhase =
  | 'isolated'
  | 'relational'
  | 'calibration'
  | 'harmony'
  | 'subtractive'
  | 'dimensional'
  | 'atmospheric';

export const PHASE_LABELS: Record<CurriculumPhase, string> = {
  isolated: 'Isolated dynamics',
  relational: 'Relational dynamics',
  calibration: 'Calibration lab',
  harmony: 'Creative harmony',
  subtractive: 'Subtractive lab',
  dimensional: 'Dimensional slice',
  atmospheric: 'Atmospheric cast',
};
