import { describe, expect, it } from 'vitest';
import { createBlankOriginalSong } from './types';
import { inferredWorkflowStage, isStageComplete, toggleStageCompletion } from './originalsWorkflowCompletion';

describe('originalsWorkflowCompletion', () => {
  it('starts at brainstorm for blank song', () => {
    const song = createBlankOriginalSong();
    expect(inferredWorkflowStage(song)).toBe('brainstorm');
  });

  it('manual completion overrides heuristics', () => {
    const song = createBlankOriginalSong();
    const done = toggleStageCompletion(song, 'brainstorm');
    expect(isStageComplete(done, 'brainstorm')).toBe(true);
  });

  it('advances inferred stage when brainstorm is complete', () => {
    const song = {
      ...createBlankOriginalSong(),
      brainstormHtml: '<p>Some idea</p>',
    };
    expect(inferredWorkflowStage(song)).toBe('write');
  });
});
