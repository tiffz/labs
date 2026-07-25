import { describe, expect, it } from 'vitest';
import { computeLabsDebugTier, LABS_DEBUG_OWNER_IDENTITY_KEY } from './labsDebugAccess';
import { ENCORE_GOOGLE_IDENTITY_STORAGE_KEY } from '../google/encoreGoogleTokenStorage';

/**
 * The debug tier decides what a `?debug` visitor may see/do. The security-shaped invariant: an
 * anonymous production visitor gets read-only `diagnostics` and NEVER the `full` tier (destructive
 * actions, god-mode, data dumps). Owner-signed-in or localhost gets `full`. See ADR 0026.
 */
describe('computeLabsDebugTier', () => {
  it('is off without ?debug regardless of dev/owner', () => {
    expect(computeLabsDebugTier({ debugRequested: false, isDev: true, ownerSignedIn: true })).toBe('off');
    expect(computeLabsDebugTier({ debugRequested: false, isDev: false, ownerSignedIn: false })).toBe('off');
  });

  it('localhost (dev) with ?debug is always full', () => {
    expect(computeLabsDebugTier({ debugRequested: true, isDev: true, ownerSignedIn: false })).toBe('full');
  });

  it('prod + ?debug + owner signed in is full', () => {
    expect(computeLabsDebugTier({ debugRequested: true, isDev: false, ownerSignedIn: true })).toBe('full');
  });

  it('prod + ?debug + anonymous is diagnostics only — never full (the security invariant)', () => {
    const tier = computeLabsDebugTier({ debugRequested: true, isDev: false, ownerSignedIn: false });
    expect(tier).toBe('diagnostics');
    expect(tier).not.toBe('full');
  });
});

describe('owner-identity key', () => {
  it('matches the canonical google-token-storage key (no silent drift)', () => {
    // ownerSignedIn re-declares the key to avoid a debug->google module edge; if the canonical
    // key is renamed without updating the debug copy, owner debug silently drops to diagnostics.
    expect(LABS_DEBUG_OWNER_IDENTITY_KEY).toBe(ENCORE_GOOGLE_IDENTITY_STORAGE_KEY);
  });
});
