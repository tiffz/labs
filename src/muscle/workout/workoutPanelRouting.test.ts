import { describe, expect, it } from 'vitest';
import {
  isAnatomyTermsStudyTab,
  isFullBodyAtlasTab,
  shouldShowTermsLessonPanel,
  workoutPanelTitle,
} from './workoutPanelRouting';

describe('workoutPanelRouting', () => {
  it('shows terms lesson only on anatomy terms tab, not full body atlas', () => {
    expect(
      shouldShowTermsLessonPanel({
        mode: 'warmup',
        activeModuleId: 'anatomy_terms',
        atlasTabActive: false,
      }),
    ).toBe(true);
    expect(
      shouldShowTermsLessonPanel({
        mode: 'warmup',
        activeModuleId: 'anatomy_terms',
        atlasTabActive: true,
      }),
    ).toBe(false);
  });

  it('distinguishes full body atlas tab title', () => {
    expect(
      workoutPanelTitle({
        bodyView: 'full_body',
        atlasTabActive: true,
        moduleLabel: 'Language of Anatomy',
      }),
    ).toBe('Full body');
    expect(
      workoutPanelTitle({
        bodyView: 'full_body',
        atlasTabActive: false,
        moduleLabel: 'Language of Anatomy',
      }),
    ).toBe('Language of Anatomy');
  });

  it('identifies anatomy terms study tab', () => {
    expect(isAnatomyTermsStudyTab('anatomy_terms', false)).toBe(true);
    expect(isAnatomyTermsStudyTab('anatomy_terms', true)).toBe(false);
    expect(isFullBodyAtlasTab('full_body', true)).toBe(true);
  });
});
