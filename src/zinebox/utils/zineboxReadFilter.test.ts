import { describe, expect, it } from 'vitest';

import type { ZineboxReadStatus } from '../types';
import { comicMatchesReadFilter } from './zineboxReadFilter';

function comic(readStatus: ZineboxReadStatus) {
  return { readStatus };
}

describe('comicMatchesReadFilter', () => {
  it('shows all comics when filter is all', () => {
    expect(comicMatchesReadFilter(comic('unread'), 'all')).toBe(true);
    expect(comicMatchesReadFilter(comic('finished'), 'all')).toBe(true);
  });

  it('matches unread only', () => {
    expect(comicMatchesReadFilter(comic('unread'), 'unread')).toBe(true);
    expect(comicMatchesReadFilter(comic('in_progress'), 'unread')).toBe(false);
    expect(comicMatchesReadFilter(comic('finished'), 'unread')).toBe(false);
  });

  it('matches started or finished as read', () => {
    expect(comicMatchesReadFilter(comic('unread'), 'read')).toBe(false);
    expect(comicMatchesReadFilter(comic('in_progress'), 'read')).toBe(true);
    expect(comicMatchesReadFilter(comic('finished'), 'read')).toBe(true);
  });
});
