import { describe, expect, it } from 'vitest';

import { createBlankComicProject } from '../types';
import { inferredWorkflowStage, isWorkflowStageComplete } from './lyreflyWorkflowCompletion';

describe('lyreflyWorkflowCompletion', () => {
  it('starts at brainstorm when empty', () => {
    const project = createBlankComicProject();
    expect(inferredWorkflowStage(project)).toBe('brainstorm');
  });

  it('advances when brainstorm has content', () => {
    const project = createBlankComicProject();
    project.brainstormHtml = '<p>Notes</p>';
    expect(isWorkflowStageComplete(project, 'brainstorm')).toBe(true);
    expect(inferredWorkflowStage(project)).toBe('script');
  });

  it('respects manual stage completion override', () => {
    const project = createBlankComicProject();
    project.stageCompletion = { brainstorm: true };
    expect(isWorkflowStageComplete(project, 'brainstorm')).toBe(true);
  });
});
