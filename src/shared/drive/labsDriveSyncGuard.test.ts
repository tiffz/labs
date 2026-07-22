import { describe, expect, it } from 'vitest';
import {
  assertLabsDriveWriteAllowed,
  LabsDriveAutoPushBlockedError,
  labsDriveAutoPushAllowed,
} from './labsDriveSyncGuard';

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

describe('assertLabsDriveWriteAllowed', () => {
  it('throws a typed error when not pulled and no replace token (never-pulled device)', () => {
    expect(() =>
      assertLabsDriveWriteAllowed({
        appFolderName: 'Test App',
        autoPushAllowed: false,
        intentionalReplace: false,
      }),
    ).toThrow(LabsDriveAutoPushBlockedError);
  });

  it('permits the write when the user confirmed a replace, even before any pull', () => {
    expect(() =>
      assertLabsDriveWriteAllowed({
        appFolderName: 'Test App',
        autoPushAllowed: false,
        intentionalReplace: true,
      }),
    ).not.toThrow();
  });

  it('permits the write once auto-push is allowed (reconciling pull completed)', () => {
    expect(() =>
      assertLabsDriveWriteAllowed({
        appFolderName: 'Test App',
        autoPushAllowed: true,
        intentionalReplace: false,
      }),
    ).not.toThrow();
  });

  it('names the app folder in the blocked error message', () => {
    expect(() =>
      assertLabsDriveWriteAllowed({
        appFolderName: 'Gesture',
        autoPushAllowed: false,
        intentionalReplace: false,
      }),
    ).toThrow(/Gesture/);
  });
});
