import { afterEach, describe, expect, it } from 'vitest';

import {
  clearZineboxStackMembershipRemoval,
  listZineboxDeletedStackTombstones,
  listZineboxStackMembershipRemovalTombstones,
  recordZineboxStackDeletion,
  recordZineboxStackMembershipRemoval,
  stackMembershipTombstoneId,
  zineboxDeletedStackIdsFromRemote,
  zineboxRemovedStackMembershipIdsFromRemote,
} from './zineboxDriveStackTombstones';

const DELETED_STACKS_KEY = 'zinebox_drive_deleted_stacks_v1';
const MEMBERSHIP_REMOVALS_KEY = 'zinebox_drive_stack_membership_removals_v1';

afterEach(() => {
  window.localStorage.removeItem(DELETED_STACKS_KEY);
  window.localStorage.removeItem(MEMBERSHIP_REMOVALS_KEY);
});

describe('zineboxDriveStackTombstones', () => {
  it('records and clears stack membership removals', () => {
    recordZineboxStackMembershipRemoval('stack-1', 'comic-a');
    expect(listZineboxStackMembershipRemovalTombstones()).toHaveLength(1);
    expect(stackMembershipTombstoneId('stack-1', 'comic-a')).toBe('stack-1::comic-a');

    clearZineboxStackMembershipRemoval('stack-1', 'comic-a');
    expect(listZineboxStackMembershipRemovalTombstones()).toHaveLength(0);
  });

  it('merges remote stack tombstones into local storage', () => {
    recordZineboxStackMembershipRemoval('stack-1', 'comic-a');
    const ids = zineboxRemovedStackMembershipIdsFromRemote([
      { id: 'stack-1::comic-b', removedAt: '2026-01-02T00:00:00.000Z' },
    ]);
    expect(ids.has('stack-1::comic-a')).toBe(true);
    expect(ids.has('stack-1::comic-b')).toBe(true);
    expect(listZineboxStackMembershipRemovalTombstones()).toHaveLength(2);
  });

  it('records dissolved stack ids', () => {
    recordZineboxStackDeletion('stack-1');
    expect(listZineboxDeletedStackTombstones()).toEqual([
      expect.objectContaining({ id: 'stack-1' }),
    ]);
    const ids = zineboxDeletedStackIdsFromRemote(undefined);
    expect(ids.has('stack-1')).toBe(true);
  });
});
