import { describe, expect, it, vi } from 'vitest';

import type { ZineboxComic } from '../types';
import { pickRandomUnreadComic } from './pickRandomUnreadComic';

function comic(id: string, readStatus: ZineboxComic['readStatus']): ZineboxComic {
  return {
    id,
    title: id,
    source: 'Local',
    fileId: id,
    coverThumbnailBase64: 'data:image/png;base64,',
    readStatus,
    progressPercentage: 0,
  };
}

describe('pickRandomUnreadComic', () => {
  it('returns null when every comic has been started', () => {
    expect(
      pickRandomUnreadComic([
        comic('a', 'in_progress'),
        comic('b', 'finished'),
      ]),
    ).toBeNull();
  });

  it('only picks from unread comics', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const picked = pickRandomUnreadComic([
      comic('read', 'finished'),
      comic('unread-a', 'unread'),
      comic('unread-b', 'unread'),
    ]);
    expect(picked?.id).toBe('unread-a');
    vi.restoreAllMocks();
  });
});
