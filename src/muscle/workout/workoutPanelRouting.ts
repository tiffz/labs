import type { BodyView, MuscleRegion, WorkoutMode } from '../types/node';

/** True when the Language of Anatomy module tab is active (not Full body atlas explore). */
export function isAnatomyTermsStudyTab(
  activeModuleId: MuscleRegion,
  atlasTabActive: boolean,
): boolean {
  return activeModuleId === 'anatomy_terms' && !atlasTabActive;
}

export function shouldShowTermsLessonPanel(input: {
  mode: WorkoutMode;
  activeModuleId: MuscleRegion;
  atlasTabActive: boolean;
}): boolean {
  return input.mode === 'warmup' && isAnatomyTermsStudyTab(input.activeModuleId, input.atlasTabActive);
}

export function workoutPanelTitle(input: {
  bodyView: BodyView;
  atlasTabActive: boolean;
  moduleLabel: string;
}): string {
  if (input.bodyView === 'full_body' && input.atlasTabActive) return 'Full body';
  return input.moduleLabel;
}

export function isFullBodyAtlasTab(bodyView: BodyView, atlasTabActive: boolean): boolean {
  return bodyView === 'full_body' && atlasTabActive;
}
