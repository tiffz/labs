import type { ZineboxComic } from '../types';

/** Pick one unread comic from the library, or null when none remain. */
export function pickRandomUnreadComic(comics: readonly ZineboxComic[]): ZineboxComic | null {
  const unread = comics.filter((comic) => comic.readStatus === 'unread');
  if (unread.length === 0) return null;
  const index = Math.floor(Math.random() * unread.length);
  return unread[index] ?? null;
}
