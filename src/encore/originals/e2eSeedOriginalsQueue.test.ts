import { describe, expect, it } from 'vitest';
import { E2E_ORIGINALS_QUEUE_A_ID, E2E_ORIGINALS_QUEUE_SONG_TITLES, isE2eOriginalsQueueRoute } from './e2eSeedOriginalsQueue';

describe('e2eSeedOriginalsQueue', () => {
  it('exports stable song titles for smokes', () => {
    expect(E2E_ORIGINALS_QUEUE_SONG_TITLES).toEqual(['E2E Queue A', 'E2E Queue B']);
    expect(E2E_ORIGINALS_QUEUE_A_ID).toBe('e2e-originals-queue-a');
  });

  it('isE2eOriginalsQueueRoute is false without harness flag', () => {
    expect(isE2eOriginalsQueueRoute()).toBe(false);
  });
});
