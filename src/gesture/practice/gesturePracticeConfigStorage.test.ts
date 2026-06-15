import { describe, expect, it, beforeEach } from 'vitest';
import {
  readGesturePracticeSessionConfig,
  writeGesturePracticeSessionConfig,
  type GesturePracticeSessionConfig,
} from './gesturePracticeConfigStorage';

const SAMPLE: GesturePracticeSessionConfig = {
  version: 1,
  selectedPackIds: ['pack-a', 'pack-b'],
  durationSec: 120,
  timerPreset: 120,
  customDurationSec: '90',
  prioritizeLeastDrawn: true,
  shuffle: false,
  sessionLengthMode: 'limited',
  photoLimit: '15',
  activeTagFilters: ['cats'],
};

describe('gesturePracticeConfigStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing stored', () => {
    expect(readGesturePracticeSessionConfig()).toBeNull();
  });

  it('round-trips a valid config', () => {
    writeGesturePracticeSessionConfig(SAMPLE);
    expect(readGesturePracticeSessionConfig()).toEqual(SAMPLE);
  });

  it('rejects malformed payloads', () => {
    window.localStorage.setItem('gesture-practice-session-config', JSON.stringify({ version: 2 }));
    expect(readGesturePracticeSessionConfig()).toBeNull();
  });
});
