import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  readGestureLocalUiPreferences,
  writeGestureLocalUiPreferences,
} from './gestureLocalUiPreferences';

describe('gestureLocalUiPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('defaults showNsfwCollections to false', () => {
    expect(readGestureLocalUiPreferences()).toBeNull();
    const saved = writeGestureLocalUiPreferences({});
    expect(saved.showNsfwCollections).toBe(false);
  });

  it('persists showNsfwCollections on this device only', () => {
    writeGestureLocalUiPreferences({ showNsfwCollections: true });
    expect(readGestureLocalUiPreferences()?.showNsfwCollections).toBe(true);
    writeGestureLocalUiPreferences({ showNsfwCollections: false });
    expect(readGestureLocalUiPreferences()?.showNsfwCollections).toBe(false);
  });
});
