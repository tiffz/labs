import { describe, expect, it } from 'vitest';
import { resolveDexieLiveQuery } from './resolveDexieLiveQuery';

describe('resolveDexieLiveQuery', () => {
  const empty: string[] = [];

  it('treats undefined as loading', () => {
    expect(resolveDexieLiveQuery(undefined, empty)).toEqual({
      value: empty,
      hydrated: false,
    });
  });

  it('treats an empty array as hydrated empty', () => {
    expect(resolveDexieLiveQuery([], empty)).toEqual({
      value: [],
      hydrated: true,
    });
  });

  it('passes through populated results as hydrated', () => {
    expect(resolveDexieLiveQuery(['a'], empty)).toEqual({
      value: ['a'],
      hydrated: true,
    });
  });
});
