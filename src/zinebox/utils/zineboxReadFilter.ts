import type { ZineboxReadStatus } from '../types';

export type ZineboxLibraryReadFilter = 'all' | 'unread' | 'read';

export function comicMatchesReadFilter(
  comic: { readStatus: ZineboxReadStatus },
  filter: ZineboxLibraryReadFilter,
): boolean {
  if (filter === 'unread') return comic.readStatus === 'unread';
  if (filter === 'read') return comic.readStatus !== 'unread';
  return true;
}
