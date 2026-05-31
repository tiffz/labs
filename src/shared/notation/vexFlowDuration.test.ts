import { describe, expect, it } from 'vitest';
import {
  isDottedSixteenthDuration,
  sixteenthTicksToVexFlowDuration,
  vexFlowDurationToBeats,
} from './vexFlowDuration';

describe('sixteenthTicksToVexFlowDuration', () => {
  it('maps common sixteenth-grid lengths', () => {
    expect(sixteenthTicksToVexFlowDuration(1)).toBe('16');
    expect(sixteenthTicksToVexFlowDuration(2)).toBe('8');
    expect(sixteenthTicksToVexFlowDuration(3)).toBe('8d');
    expect(sixteenthTicksToVexFlowDuration(4)).toBe('q');
    expect(sixteenthTicksToVexFlowDuration(16)).toBe('w');
  });
});

describe('isDottedSixteenthDuration', () => {
  it('flags dotted grid lengths', () => {
    expect(isDottedSixteenthDuration(3)).toBe(true);
    expect(isDottedSixteenthDuration(4)).toBe(false);
  });
});

describe('vexFlowDurationToBeats', () => {
  it('converts quarter-based tokens in 4/4', () => {
    expect(vexFlowDurationToBeats('q', 4)).toBe(1);
    expect(vexFlowDurationToBeats('8', 4)).toBe(0.5);
    expect(vexFlowDurationToBeats('qd', 4)).toBe(1.5);
  });

  it('scales for compound meters', () => {
    expect(vexFlowDurationToBeats('q', 8)).toBe(2);
  });
});
