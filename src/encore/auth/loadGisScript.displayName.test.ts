import { describe, expect, it } from 'vitest';
import { friendlyGoogleDisplayName, type GoogleUserProfile } from './loadGisScript';

function p(overrides: Partial<GoogleUserProfile> & Pick<GoogleUserProfile, 'email'>): GoogleUserProfile {
  return {
    email: overrides.email,
    given_name: overrides.given_name ?? null,
    name: overrides.name ?? null,
  };
}

describe('friendlyGoogleDisplayName', () => {
  it('prefers given_name', () => {
    expect(friendlyGoogleDisplayName(p({ email: 'x@y.com', given_name: 'Tiff', name: 'Tiff Zhang' }))).toBe('Tiff');
  });

  it('uses first word of name when given_name missing', () => {
    expect(friendlyGoogleDisplayName(p({ email: 'x@y.com', given_name: null, name: 'Sam River' }))).toBe('Sam');
  });

  it('title-cases email local part as last resort', () => {
    expect(friendlyGoogleDisplayName(p({ email: 'zhangtiff@gmail.com', given_name: null, name: null }))).toBe(
      'Zhangtiff',
    );
  });
});
