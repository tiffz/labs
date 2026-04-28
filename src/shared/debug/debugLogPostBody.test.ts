import { describe, expect, it } from 'vitest';
import { parseDebugLogPostBody } from './debugLogPostBody';

describe('parseDebugLogPostBody', () => {
  it('expands batched ServerLogger body', () => {
    const entries = parseDebugLogPostBody({
      logs: [
        { timestamp: '2020-01-01T00:00:00.000Z', app: 'PIANO', level: 'info', message: 'a' },
        { timestamp: '2020-01-01T00:00:01.000Z', app: 'PIANO', level: 'error', message: 'b', data: 'stack' },
      ],
    });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ app: 'PIANO', level: 'info', message: 'a' });
    expect(entries[1]).toMatchObject({ app: 'PIANO', level: 'error', message: 'b', data: 'stack' });
  });

  it('accepts single-object early-hook shape', () => {
    const entries = parseDebugLogPostBody({
      timestamp: '2020-01-01T00:00:00.000Z',
      level: 'error',
      message: 'early window.onerror',
      data: JSON.stringify({ message: 'x' }),
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ level: 'error', message: 'early window.onerror' });
    expect(entries[0]?.app).toBeUndefined();
  });

  it('returns empty for invalid shapes', () => {
    expect(parseDebugLogPostBody(null)).toEqual([]);
    expect(parseDebugLogPostBody({})).toEqual([]);
    expect(parseDebugLogPostBody({ logs: [] })).toEqual([]);
    expect(parseDebugLogPostBody({ logs: [null, 1, {}] })).toEqual([]);
  });
});
