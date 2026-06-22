import { describe, expect, it } from 'vitest';
import {
  encoreMediaQueueSubtitle,
  encoreMediaQueueTakeHint,
  ENCORE_QUEUE_UP_NEXT_LABEL,
} from './encoreMediaQueueDisplay';

describe('encoreMediaQueueSubtitle', () => {
  it('strips audio extensions from take filenames', () => {
    expect(encoreMediaQueueSubtitle('Someone Else\'s Game.m4a')).toBe("Someone Else's Game");
  });

  it('returns null when subtitle matches title', () => {
    expect(encoreMediaQueueSubtitle('Like Your Own', 'Like Your Own')).toBeNull();
  });

  it('returns date suffix when subtitle repeats the song title', () => {
    expect(encoreMediaQueueSubtitle('Meet Me On The Moon - May 23', 'Meet Me On The Moon')).toBe(
      'May 23',
    );
  });
});

describe('encoreMediaQueueTakeHint', () => {
  it('labels recording dates consistently', () => {
    expect(encoreMediaQueueTakeHint('Georgia on my coast - Mar 31', 'Georgia On My Coast')).toBe(
      'Take · Mar 31',
    );
    expect(encoreMediaQueueTakeHint('Meet Me On The Moon - May 23', 'Meet Me On The Moon')).toBe(
      'Take · May 23',
    );
  });

  it('hides bare numbers and title-only filenames', () => {
    expect(encoreMediaQueueTakeHint('Someone Else\'s Game.m4a', "Someone Else's Game")).toBeNull();
    expect(encoreMediaQueueTakeHint('The House I Left Behind - 3', 'The House I Left Behind')).toBeNull();
  });
});

describe('ENCORE_QUEUE_UP_NEXT_LABEL', () => {
  it('is sentence case for the upcoming section', () => {
    expect(ENCORE_QUEUE_UP_NEXT_LABEL).toBe('Up next');
  });
});
