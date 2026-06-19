import type { ZineboxComic, ZineboxReadStatus } from '../types';

export type ZineboxCoverReadSummary = {
  readStatus: ZineboxReadStatus;
  progressPercentage: number;
};

export function summarizeComicCoverRead(comic: ZineboxComic): ZineboxCoverReadSummary {
  return {
    readStatus: comic.readStatus,
    progressPercentage: comic.progressPercentage,
  };
}

/** Stack cover shows unread if any issue is unread; else in-progress with average progress. */
export function summarizeStackCoverRead(
  comics: readonly ZineboxComic[],
): ZineboxCoverReadSummary {
  if (comics.length === 0) {
    return { readStatus: 'unread', progressPercentage: 0 };
  }
  if (comics.some((comic) => comic.readStatus === 'unread')) {
    return { readStatus: 'unread', progressPercentage: 0 };
  }
  const inProgress = comics.filter((comic) => comic.readStatus === 'in_progress');
  if (inProgress.length > 0) {
    const progressPercentage = Math.round(
      inProgress.reduce((sum, comic) => sum + comic.progressPercentage, 0) / inProgress.length,
    );
    return { readStatus: 'in_progress', progressPercentage };
  }
  return { readStatus: 'finished', progressPercentage: 100 };
}

export function zineboxComicOpenAriaLabel(
  title: string,
  readStatus: ZineboxReadStatus,
  progressPercentage: number,
): string {
  const base = `Open ${title}`;
  if (readStatus === 'unread') return `${base}, unread`;
  if (readStatus === 'in_progress') {
    return `${base}, ${Math.round(progressPercentage)}% read`;
  }
  return base;
}

export function zineboxStackIssueCountLabel(count: number): string {
  return count === 1 ? '1 zine' : `${count} zines`;
}
