import { describe, expect, it } from 'vitest';

import { createBlankComicProject } from '../types';
import {
  inferredWorkflowStage,
  isWorkflowStageComplete,
  isWorkflowStageCompleteDirect,
  toggleWorkflowStageCompletion,
} from './lyreflyWorkflowCompletion';

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

  it('marks earlier stages complete when a later stage has content', () => {
    const project = createBlankComicProject();
    expect(isWorkflowStageCompleteDirect(project, 'brainstorm')).toBe(false);
    expect(isWorkflowStageComplete(project, 'brainstorm', { pageNodeCount: 3 })).toBe(true);
    expect(isWorkflowStageComplete(project, 'script', { pageNodeCount: 3 })).toBe(true);
    expect(isWorkflowStageComplete(project, 'thumbs', { pageNodeCount: 3 })).toBe(true);
    expect(isWorkflowStageComplete(project, 'art', { pageNodeCount: 3 })).toBe(true);
    expect(inferredWorkflowStage(project, { pageNodeCount: 3 })).toBe('publish');
  });

  it('cascades prior stageCompletion when marking a later stage complete', () => {
    const project = createBlankComicProject();
    const next = toggleWorkflowStageCompletion(project, 'art');
    expect(next.stageCompletion?.brainstorm).toBe(true);
    expect(next.stageCompletion?.script).toBe(true);
    expect(next.stageCompletion?.thumbs).toBe(true);
    expect(next.stageCompletion?.art).toBe(true);
  });
});
