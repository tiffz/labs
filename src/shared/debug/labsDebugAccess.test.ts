import { describe, expect, it } from 'vitest';
import { computeLabsDebugTier } from './labsDebugAccess';

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
