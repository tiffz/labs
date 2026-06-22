import { describe, expect, it } from 'vitest';
import {
  eligibleOriginalsSlotsForFiles,
  eligibleOriginalsSlotsForUrlDrop,
} from './originalsSongFileDrag';

describe('originalsSongFileDrag', () => {
  it('routes audio files to demo takes and references', () => {
    const file = new File(['x'], 'demo.m4a', { type: 'audio/mp4' });
    expect(eligibleOriginalsSlotsForFiles([file])).toEqual(new Set(['demoTakes', 'references']));
  });

  it('routes PDF files to references and brainstorm', () => {
    const file = new File(['x'], 'chart.pdf', { type: 'application/pdf' });
    expect(eligibleOriginalsSlotsForFiles([file])).toEqual(new Set(['references', 'brainstormRefs']));
  });

  it('routes URL drops to link-capable groups only', () => {
    expect(eligibleOriginalsSlotsForUrlDrop()).toEqual(new Set(['references', 'brainstormRefs']));
  });
});
