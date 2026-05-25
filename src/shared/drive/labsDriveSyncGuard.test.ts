import { describe, expect, it } from 'vitest';
import { labsDriveAutoPushAllowed } from './labsDriveSyncGuard';

describe('labsDriveAutoPushAllowed', () => {
  it('blocks auto-push when pull failed and no manual backup', () => {
    expect(labsDriveAutoPushAllowed(false, false)).toBe(false);
  });

  it('allows auto-push after successful pull', () => {
    expect(labsDriveAutoPushAllowed(true, false)).toBe(true);
  });

  it('allows auto-push after manual backup without prior pull', () => {
    expect(labsDriveAutoPushAllowed(false, true)).toBe(true);
  });
});
