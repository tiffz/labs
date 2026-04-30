import { describe, expect, it } from 'vitest';
import { etagFromDriveResponse, formatDriveRequestFailure, summarizeDriveApiErrorBody } from './driveFetch';

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
    expect(msg).toContain('Disconnect Google');
  });

  it('appends session hint for 401', () => {
    const msg = formatDriveRequestFailure('GET', '/files', 401, '{"error":{"message":"Invalid Credentials"}}');
    expect(msg).toContain('401');
    expect(msg).toMatch(/sign(ing)? in/i);
  });
});
