import { describe, expect, it } from 'vitest';
import {
  GuestSnapshotLoadError,
  guestSnapshotErrorKindFromUnknown,
  shouldShowGuestSnapshotDevSetup,
} from './guestSnapshotLoadError';

describe('guestSnapshotLoadError', () => {
  it('classifies typed errors', () => {
    expect(guestSnapshotErrorKindFromUnknown(new GuestSnapshotLoadError('dev_missing_api_key'))).toBe(
      'dev_missing_api_key',
    );
  });

  it('classifies legacy MISSING_API_KEY codes', () => {
    const err = new Error('missing') as Error & { code: string };
    err.code = 'MISSING_API_KEY';
    expect(guestSnapshotErrorKindFromUnknown(err)).toBe('dev_missing_api_key');
  });

  it('shows dev setup only in dev for missing key kind', () => {
    expect(shouldShowGuestSnapshotDevSetup('dev_missing_api_key')).toBe(import.meta.env.DEV);
    expect(shouldShowGuestSnapshotDevSetup('not_configured')).toBe(false);
    expect(shouldShowGuestSnapshotDevSetup('generic')).toBe(false);
  });
});
