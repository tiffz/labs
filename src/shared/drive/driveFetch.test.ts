import { describe, expect, it } from 'vitest';
import {
  etagFromDriveResponse,
  formatDriveRequestFailure,
  pickPreferredDriveListFileId,
  summarizeDriveApiErrorBody,
} from './driveFetch';

describe('summarizeDriveApiErrorBody', () => {
  it('parses Drive v3 JSON error message', () => {
    const body = JSON.stringify({
      error: {
        errors: [{ message: 'Insufficient Permission', reason: 'insufficientPermissions' }],
        message: 'Insufficient Permission',
      },
    });
    expect(summarizeDriveApiErrorBody(body)).toBe('Insufficient Permission');
  });

  it('falls back to plain text', () => {
    expect(summarizeDriveApiErrorBody('not json')).toBe('not json');
  });
});

describe('etagFromDriveResponse', () => {
  it('reads ETag header when present', () => {
    const res = new Response(null, { headers: { ETag: '"abc123"' } });
    expect(etagFromDriveResponse(res)).toBe('"abc123"');
  });
});

describe('formatDriveRequestFailure', () => {
  it('appends scope hint for 403 insufficient auth', () => {
    const body = JSON.stringify({
      error: { errors: [{ message: 'Insufficient Permission' }] },
    });
    const msg = formatDriveRequestFailure('GET', '/files', 403, body);
    expect(msg).toContain('Insufficient Permission');
    expect(msg).toMatch(/sign in/i);
  });

  it('appends session hint for 401', () => {
    const msg = formatDriveRequestFailure('GET', '/files', 401, '{"error":{"message":"Invalid Credentials"}}');
    expect(msg).toContain('401');
    expect(msg).toMatch(/sign(ing)? in/i);
  });
});

describe('pickPreferredDriveListFileId', () => {
  it('returns preferred id when it is still in the list', () => {
    expect(
      pickPreferredDriveListFileId(
        [
          { id: 'older', modifiedTime: '2025-01-02T00:00:00.000Z' },
          { id: 'stable', modifiedTime: '2020-01-01T00:00:00.000Z' },
        ],
        'stable',
      ),
    ).toBe('stable');
  });

  it('picks most recently modified when preferred is missing or not listed', () => {
    expect(
      pickPreferredDriveListFileId(
        [
          { id: 'a', modifiedTime: '2025-01-01T00:00:00.000Z' },
          { id: 'b', modifiedTime: '2026-02-01T00:00:00.000Z' },
        ],
        undefined,
      ),
    ).toBe('b');
    expect(
      pickPreferredDriveListFileId(
        [
          { id: 'a', modifiedTime: '2025-01-01T00:00:00.000Z' },
          { id: 'b', modifiedTime: '2026-02-01T00:00:00.000Z' },
        ],
        'gone',
      ),
    ).toBe('b');
  });

  it('returns undefined for empty input', () => {
    expect(pickPreferredDriveListFileId(undefined, 'x')).toBeUndefined();
    expect(pickPreferredDriveListFileId([], 'x')).toBeUndefined();
  });
});
