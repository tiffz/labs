import { describe, expect, it } from 'vitest';

import type { ZineboxComic } from '../types';
import {
  summarizeStackCoverRead,
  zineboxComicOpenAriaLabel,
  zineboxStackIssueCountLabel,
} from './zineboxCoverReadSummary';

function comic(
  readStatus: ZineboxComic['readStatus'],
  progressPercentage: number,
): ZineboxComic {
  return {
    id: 'c',
    title: 'Test',
    source: 'Local',
    fileId: 'c',
    filename: 'test.pdf',
    coverThumbnailBase64: '',
    readStatus,
    progressPercentage,
  };
}

describe('summarizeStackCoverRead', () => {
  it('prefers unread when any issue is unread', () => {
    expect(
      summarizeStackCoverRead([comic('finished', 100), comic('unread', 0)]).readStatus,
    ).toBe('unread');
  });

  it('averages in-progress progress when none unread', () => {
    expect(
      summarizeStackCoverRead([
        comic('in_progress', 20),
        comic('in_progress', 60),
        comic('finished', 100),
      ]),
    ).toEqual({ readStatus: 'in_progress', progressPercentage: 40 });
  });

  it('marks finished when all issues finished', () => {
    expect(
      summarizeStackCoverRead([comic('finished', 100), comic('finished', 100)]),
    ).toEqual({ readStatus: 'finished', progressPercentage: 100 });
  });
});

describe('zineboxComicOpenAriaLabel', () => {
  it('includes unread and progress hints', () => {
    expect(zineboxComicOpenAriaLabel('Issue 1', 'unread', 0)).toBe('Open Issue 1, unread');
    expect(zineboxComicOpenAriaLabel('Issue 1', 'in_progress', 42)).toBe(
      'Open Issue 1, 42% read',
    );
    expect(zineboxComicOpenAriaLabel('Issue 1', 'finished', 100)).toBe('Open Issue 1');
  });
});

describe('zineboxStackIssueCountLabel', () => {
  it('uses plain zine count copy', () => {
    expect(zineboxStackIssueCountLabel(1)).toBe('1 zine');
    expect(zineboxStackIssueCountLabel(2)).toBe('2 zines');
  });
});
