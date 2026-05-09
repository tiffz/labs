import { afterEach, describe, expect, it } from 'vitest';
import {
  ENCORE_GUEST_SHARE_HASH_RE,
  isEncoreGuestShareHash,
  parseGuestShareSnapshotFileIdFromHash,
  syncEncoreGuestShareRobotsFromHash,
} from './guestShareRobots';

describe('guestShareRobots', () => {
  afterEach(() => {
    document.getElementById('encore-guest-share-robots')?.remove();
    window.history.replaceState(null, '', '#/');
  });

  it('matches Encore guest share hash routes', () => {
    expect(ENCORE_GUEST_SHARE_HASH_RE.test('#/share/abcXYZ')).toBe(true);
    expect(ENCORE_GUEST_SHARE_HASH_RE.test('#/share/abcXYZ?scroll=foo')).toBe(true);
    expect(ENCORE_GUEST_SHARE_HASH_RE.test('#/share/abc/extra')).toBe(false);
    expect(ENCORE_GUEST_SHARE_HASH_RE.test('#/library')).toBe(false);
    expect(ENCORE_GUEST_SHARE_HASH_RE.test('')).toBe(false);
  });

  it('isEncoreGuestShareHash accepts an explicit hash argument', () => {
    expect(isEncoreGuestShareHash('#/share/abc')).toBe(true);
    expect(isEncoreGuestShareHash('#/share/a/b')).toBe(false);
    expect(isEncoreGuestShareHash('#/library')).toBe(false);
  });

  it('parseGuestShareSnapshotFileIdFromHash matches share id', () => {
    expect(parseGuestShareSnapshotFileIdFromHash('#/share/abc')).toBe('abc');
    expect(parseGuestShareSnapshotFileIdFromHash('#/share/abc?scroll=encore-song-practice-heading')).toBe('abc');
    expect(parseGuestShareSnapshotFileIdFromHash('#/share/a/b')).toBeNull();
    expect(parseGuestShareSnapshotFileIdFromHash('#/library')).toBeNull();
  });

  it('injects robots meta on guest share hash and removes when leaving', () => {
    window.history.replaceState(null, '', '#/share/file123');
    syncEncoreGuestShareRobotsFromHash();
    const m = document.getElementById('encore-guest-share-robots') as HTMLMetaElement | null;
    expect(m).toBeTruthy();
    expect(m?.getAttribute('name')).toBe('robots');
    expect(m?.getAttribute('content')).toContain('noindex');

    window.history.replaceState(null, '', '#/library');
    syncEncoreGuestShareRobotsFromHash();
    expect(document.getElementById('encore-guest-share-robots')).toBeNull();
  });
});
