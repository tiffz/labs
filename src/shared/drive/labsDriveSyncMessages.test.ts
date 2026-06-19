import { describe, expect, it } from 'vitest';
import {
  labsDriveSyncMessageIsTransientSuccess,
} from './labsDriveSyncMessages';

describe('labsDriveSyncMessageIsTransientSuccess', () => {
  it('treats silent pull success as transient', () => {
    expect(labsDriveSyncMessageIsTransientSuccess('Synced from Drive (merged 218 comics).')).toBe(true);
  });

  it('keeps actionable conflict copy in the menu', () => {
    expect(
      labsDriveSyncMessageIsTransientSuccess(
        'Drive backup changed on another device. Open your account menu to choose how to merge.',
      ),
    ).toBe(false);
  });

  it('keeps auth failures in the menu', () => {
    expect(labsDriveSyncMessageIsTransientSuccess('Drive sync paused. Sign in again to pull the latest from Drive.')).toBe(
      false,
    );
  });
});
